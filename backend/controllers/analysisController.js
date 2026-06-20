const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const ResumeAnalysis = require('../models/ResumeAnalysis');

const {
  analyzeResumeWithAI,
  rewriteResumeWithAI,
  generateInterviewQuestionsWithAI,
} = require('../utils/aiService');

// Helper: parse resume text from a base64-encoded PDF or DOCX buffer string.
// We use memoryStorage on the upload endpoint (no disk writes),
// so the client sends back the base64 buffer for every operation.
const parseResumeFromBase64 = async (base64Buffer, mimeType = 'application/pdf') => {
  if (!base64Buffer) return '';
  try {
    const buffer = Buffer.from(base64Buffer, 'base64');

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }

    const pdfData = await pdfParse(buffer);
    return pdfData.text || '';
  } catch {
    return '';
  }
};

const buildResumeContextFromAnalysis = (analysis) => {
  if (!analysis) return '';

  const lines = [
    Array.isArray(analysis.strengths) && analysis.strengths.length
      ? `Strengths: ${analysis.strengths.join(', ')}`
      : '',
    Array.isArray(analysis.weaknesses) && analysis.weaknesses.length
      ? `Weaknesses: ${analysis.weaknesses.join(', ')}`
      : '',
    Array.isArray(analysis.missingSkills) && analysis.missingSkills.length
      ? `Missing skills: ${analysis.missingSkills.join(', ')}`
      : '',
    Array.isArray(analysis.missingKeywords) && analysis.missingKeywords.length
      ? `Missing keywords: ${analysis.missingKeywords.join(', ')}`
      : '',
    analysis.hiringRecommendation
      ? `Hiring recommendation: ${analysis.hiringRecommendation}`
      : '',
  ];

  return lines.filter(Boolean).join('\n');
};

const STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'also', 'and', 'any', 'are',
  'because', 'been', 'before', 'being', 'between', 'both', 'can', 'candidate',
  'concise', 'description', 'did', 'does', 'doing', 'during', 'each', 'few',
  'for', 'from', 'had', 'has', 'have', 'here', 'into', 'its', 'job', 'more',
  'most', 'must', 'our', 'out', 'own', 'profile', 'resume', 'role', 'same',
  'should', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'use', 'very', 'was',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'will', 'with',
  'you', 'your',
]);

const TECHNICAL_TERMS = [
  'javascript', 'typescript', 'react', 'node', 'express', 'mongodb', 'mongoose',
  'python', 'java', 'sql', 'mysql', 'postgresql', 'aws', 'azure', 'docker',
  'kubernetes', 'api', 'rest', 'html', 'css', 'bootstrap', 'git', 'github',
  'machine', 'learning', 'ai', 'data', 'database', 'frontend', 'backend',
  'redux', 'vite', 'next', 'angular', 'vue', 'linux', 'testing', 'jest',
];

const normalizeWords = (text) => [
  ...new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s-]/g, ' ')
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  ),
];

const getCategoryScore = (resumeWords, jobWords, categoryTerms, fallbackScore) => {
  const relevantTerms = jobWords.filter((word) => categoryTerms.includes(word));

  if (!relevantTerms.length) {
    return fallbackScore;
  }

  const matchedTerms = relevantTerms.filter((word) => resumeWords.includes(word));
  return Math.round((matchedTerms.length / relevantTerms.length) * 100);
};

const buildLocalMatchScores = (resumeText, jobDescription, missingKeywords) => {
  const resumeWords = normalizeWords(resumeText);
  const jobWords = normalizeWords(jobDescription);
  const usableJobWords = jobWords.filter((word) => word.length > 2);
  const matchedJobWords = usableJobWords.filter((word) => resumeWords.includes(word));
  const fallbackScore = usableJobWords.length
    ? Math.round((matchedJobWords.length / usableJobWords.length) * 100)
    : 0;

  const projectTerms = [
    'project', 'projects', 'built', 'developed', 'implemented', 'designed',
    'deployed', 'created', 'application', 'system', 'dashboard', 'portfolio',
  ];
  const experienceTerms = [
    'experience', 'internship', 'intern', 'worked', 'professional', 'years',
    'collaborated', 'managed', 'led', 'team', 'client', 'production',
  ];
  const educationTerms = [
    'degree', 'bachelor', 'master', 'btech', 'mtech', 'computer', 'science',
    'engineering', 'university', 'college', 'education', 'graduate',
  ];

  const keywordPenalty = Math.min(missingKeywords.length * 3, 30);
  const adjustedFallbackScore = Math.max(0, fallbackScore - keywordPenalty);

  return {
    technicalSkillsMatch: getCategoryScore(resumeWords, jobWords, TECHNICAL_TERMS, adjustedFallbackScore),
    projectsMatch: getCategoryScore(resumeWords, jobWords, projectTerms, adjustedFallbackScore),
    experienceMatch: getCategoryScore(resumeWords, jobWords, experienceTerms, adjustedFallbackScore),
    educationMatch: getCategoryScore(resumeWords, jobWords, educationTerms, adjustedFallbackScore),
  };
};

const buildMissingKeywords = (resumeText, jobDescription) => {
  const resumeWords = normalizeWords(resumeText);
  const jobWords = normalizeWords(jobDescription);

  return jobWords
    .filter((keyword) => !resumeWords.includes(keyword))
    .slice(0, 12);
};

const buildMissingSkills = (missingKeywords) => {
  const skills = missingKeywords.filter((keyword) => TECHNICAL_TERMS.includes(keyword));
  return skills.length ? skills.slice(0, 8) : missingKeywords.slice(0, 6);
};

const buildLocalAnalysisFallback = ({ localScore, localMatchScores, missingKeywords, missingSkills }) => {
  const strongAreas = Object.entries({
    'technical skills': localMatchScores.technicalSkillsMatch,
    projects: localMatchScores.projectsMatch,
    experience: localMatchScores.experienceMatch,
    education: localMatchScores.educationMatch,
  })
    .filter(([, score]) => score >= 50)
    .map(([label]) => label);

  const weakAreas = Object.entries({
    'technical skills': localMatchScores.technicalSkillsMatch,
    projects: localMatchScores.projectsMatch,
    experience: localMatchScores.experienceMatch,
    education: localMatchScores.educationMatch,
  })
    .filter(([, score]) => score < 50)
    .map(([label]) => label);

  return {
    atsScore: localScore,
    ...localMatchScores,
    missingKeywords,
    missingSkills,
    strengths: strongAreas.length
      ? [`Good alignment found in ${strongAreas.join(', ')} based on resume and job-description keyword overlap.`]
      : ['Resume text was parsed successfully and compared with the job description using local keyword analysis.'],
    weaknesses: weakAreas.length
      ? [`Improve ${weakAreas.join(', ')} alignment by adding relevant, truthful details from your actual work.`]
      : ['No major local-match weakness found, but the resume can still be improved with stronger measurable achievements.'],
    suggestions: [
      'Add the most important missing job keywords naturally in the summary, skills, and project bullets.',
      'Rewrite project bullets with action verbs, technologies used, and measurable outcomes.',
      'Keep formatting simple with clear headings so ATS systems can parse the resume easily.',
    ],
    hiringRecommendation: localScore >= 75
      ? 'Good potential match. Resume is reasonably aligned with the job description.'
      : 'Potential candidate, but resume should be improved with more relevant keywords, skills, and project details.',
  };
};

// POST /api/analysis/upload
// File lives in req.file.buffer (memoryStorage). We return it as base64
// so the client can pass it back to /analyze — no disk I/O needed.
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const base64Buffer = req.file.buffer.toString('base64');
    res.json({
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileBuffer: base64Buffer,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed.' });
  }
};

// POST /api/analysis/analyze
const analyze = async (req, res) => {
  try {
    const { fileBuffer, fileMimeType, jobDescription, recruiterPersona, resumeFileName } = req.body;
    if (!fileBuffer || !jobDescription || !recruiterPersona) {
      return res.status(400).json({ message: 'Resume file, job description, and persona are required.' });
    }

    const resumeText = await parseResumeFromBase64(fileBuffer, fileMimeType);

    if (!resumeText.trim()) {
      return res.status(400).json({ message: 'Unable to extract readable text from this resume. Please upload a text-based PDF or DOCX file.' });
    }

    const missingKeywords = buildMissingKeywords(resumeText, jobDescription);
    const missingSkills = buildMissingSkills(missingKeywords);

    const localMatchScores = buildLocalMatchScores(resumeText, jobDescription, missingKeywords);
    const keywordScore = Math.max(0, 100 - missingKeywords.length * 6);
    const lengthPenalty = resumeText.length < 300 ? 10 : 0;
    const localScore = Math.max(
      20,
      Math.round(
        localMatchScores.technicalSkillsMatch * 0.35 +
        localMatchScores.projectsMatch * 0.2 +
        localMatchScores.experienceMatch * 0.2 +
        localMatchScores.educationMatch * 0.1 +
        keywordScore * 0.15 -
        lengthPenalty
      )
    );

    let aiResult;
    let aiFallback = false;

    try {
      aiResult = await analyzeResumeWithAI(recruiterPersona, resumeText, jobDescription);
    } catch (error) {
      console.error('AI analysis failed:', error.message);
      aiFallback = true;
      aiResult = buildLocalAnalysisFallback({ localScore, localMatchScores, missingKeywords, missingSkills });
    }

    const analysis = await ResumeAnalysis.create({
      userId: req.user._id,
      resumeFileName: resumeFileName || 'uploaded_resume.pdf',
      fileMimeType: fileMimeType || 'application/pdf',
      jobDescription,
      recruiterPersona,
      atsScore: aiResult.atsScore || localScore,
      technicalSkillsMatch: aiResult.technicalSkillsMatch ?? localMatchScores.technicalSkillsMatch,
      projectsMatch: aiResult.projectsMatch ?? localMatchScores.projectsMatch,
      experienceMatch: aiResult.experienceMatch ?? localMatchScores.experienceMatch,
      educationMatch: aiResult.educationMatch ?? localMatchScores.educationMatch,
      missingKeywords: Array.isArray(aiResult.missingKeywords) ? aiResult.missingKeywords : missingKeywords,
      missingSkills: Array.isArray(aiResult.missingSkills) ? aiResult.missingSkills : missingSkills,
      strengths: Array.isArray(aiResult.strengths) ? aiResult.strengths : ['No strengths found.'],
      weaknesses: Array.isArray(aiResult.weaknesses) ? aiResult.weaknesses : ['No weaknesses detected.'],
      suggestions: Array.isArray(aiResult.suggestions) ? aiResult.suggestions : [],
      hiringRecommendation: aiResult.hiringRecommendation || 'No recommendation available.',
      aiFallback,
    });

    res.status(201).json({ analysis });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ message: error.message || 'Failed to analyze resume.' });
  }
};

// GET /api/analysis/history
const getHistory = async (req, res) => {
  try {
    const history = await ResumeAnalysis.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Failed to retrieve history.' });
  }
};

// GET /api/analysis/admin/all-history  (admin only)
const getAllHistory = async (req, res) => {
  try {
    const history = await ResumeAnalysis
      .find({})
      .sort({ createdAt: -1 })
      .populate('userId', 'name email');
    res.json({ history });
  } catch (error) {
    console.error('Get all history error:', error);
    res.status(500).json({ message: 'Failed to retrieve all history.' });
  }
};

// POST /api/analysis/rewrite-resume
const rewriteResume = async (req, res) => {
  const { fileBuffer, fileMimeType, jobDescription, recruiterPersona, resumeContext, analysisId } = req.body;

  if (!jobDescription || !recruiterPersona) {
    return res.status(400).json({ message: 'Job description and persona are required.' });
  }

  if (!fileBuffer && !resumeContext && !analysisId) {
    return res.status(400).json({ message: 'Resume file, resume context, or analysis ID is required.' });
  }

  try {
    let resumeText = fileBuffer ? await parseResumeFromBase64(fileBuffer, fileMimeType) : '';

    // Fallback 1: look up saved analysis from DB
    if (!resumeText && analysisId) {
      const analysis = await ResumeAnalysis.findOne({ _id: analysisId, userId: req.user._id });
      resumeText = buildResumeContextFromAnalysis(analysis);
    }

    // Fallback 2: use the plain text context sent directly
    if (!resumeText && resumeContext) {
      resumeText = resumeContext;
    }

    if (!resumeText) {
      return res.status(404).json({ message: 'Resume file or saved analysis context not found.' });
    }

    const rewriteResult = await rewriteResumeWithAI(recruiterPersona, resumeText, jobDescription);
    res.status(200).json({ optimizedResume: rewriteResult.optimizedResume });
  } catch (error) {
    console.error('Resume rewrite failed:', error);
    res.status(500).json({ message: error.message || 'Failed to generate optimized resume.' });
  }
};

// POST /api/analysis/interview-questions
const generateInterviewQuestions = async (req, res) => {
  const { analysisId, fileBuffer, fileMimeType, jobDescription, recruiterPersona, resumeContext } = req.body;
  if ((!fileBuffer && !resumeContext && !analysisId) || !jobDescription || !recruiterPersona) {
    return res.status(400).json({ message: 'Resume context, job description, and persona are required.' });
  }

  try {
    let resumeText = fileBuffer ? await parseResumeFromBase64(fileBuffer, fileMimeType) : '';

    if (!resumeText && analysisId) {
      const analysis = await ResumeAnalysis.findOne({ _id: analysisId, userId: req.user._id });
      resumeText = buildResumeContextFromAnalysis(analysis);
    }

    if (!resumeText && resumeContext) {
      resumeText = resumeContext;
    }

    if (!resumeText) {
      return res.status(404).json({ message: 'Resume file or saved analysis context not found.' });
    }

    const interviews = await generateInterviewQuestionsWithAI(recruiterPersona, resumeText, jobDescription);
    res.status(200).json(interviews);
  } catch (error) {
    console.error('Interview generation failed:', error);
    res.status(500).json({ message: error.message || 'Failed to generate interview questions.' });
  }
};

// DELETE /api/analysis/:id
const deleteAnalysis = async (req, res) => {
  try {
    const analysis = await ResumeAnalysis.findOne({ _id: req.params.id, userId: req.user._id });
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis record not found.' });
    }
    await analysis.deleteOne();
    res.json({ message: 'Analysis removed successfully.' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Failed to delete analysis.' });
  }
};

module.exports = {
  uploadResume,
  analyze,
  getHistory,
  getAllHistory,
  deleteAnalysis,
  rewriteResume,
  generateInterviewQuestions,
};
