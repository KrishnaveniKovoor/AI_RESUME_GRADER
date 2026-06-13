const pdfParse = require('pdf-parse');
const ResumeAnalysis = require('../models/ResumeAnalysis');

const {
  analyzeResumeWithAI,
  rewriteResumeWithAI,
  generateInterviewQuestionsWithAI,
} = require('../utils/aiService');

// Helper: parse PDF text from a base64-encoded buffer string.
// We use memoryStorage on the upload endpoint (no disk writes),
// so the client sends back the base64 buffer for every operation.
const parsePdfFromBase64 = async (base64Buffer) => {
  if (!base64Buffer) return '';
  try {
    const buffer = Buffer.from(base64Buffer, 'base64');
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
    const { fileBuffer, jobDescription, recruiterPersona, resumeFileName } = req.body;
    if (!fileBuffer || !jobDescription || !recruiterPersona) {
      return res.status(400).json({ message: 'Resume file, job description, and persona are required.' });
    }

    const resumeText = await parsePdfFromBase64(fileBuffer);

    const keywordCandidates = jobDescription
      .replace(/[^a-zA-Z0-9,\s]/g, ' ')
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((word) => word.toLowerCase());

    const uniqueKeywords = [...new Set(keywordCandidates)];
    const missingKeywords = uniqueKeywords
      .filter((keyword) => keyword.length > 2 && !resumeText.toLowerCase().includes(keyword))
      .slice(0, 12);

    const localScore = Math.max(
      45,
      Math.round(100 - missingKeywords.length * 4 - (resumeText.length < 300 ? 10 : 0))
    );

    let aiResult;
    let aiFallback = false;

    try {
      aiResult = await analyzeResumeWithAI(recruiterPersona, resumeText, jobDescription);
    } catch (error) {
      console.error('AI analysis failed:', error.message);
      aiFallback = true;
      aiResult = {
        atsScore: localScore,
        missingKeywords,
        missingSkills: [],
        strengths: ['AI analysis unavailable due to quota or API restrictions. Showing local resume evaluation instead.'],
        weaknesses: ['AI analysis unavailable due to quota or API restrictions. Showing local resume evaluation instead.'],
        suggestions: ['Please try again later when API quota is available.'],
        hiringRecommendation: 'AI recommendation unavailable. Use the local score as a guide.',
      };
    }

    const analysis = await ResumeAnalysis.create({
      userId: req.user._id,
      resumeFileName: resumeFileName || 'uploaded_resume.pdf',
      jobDescription,
      recruiterPersona,
      atsScore: aiResult.atsScore || localScore,
      technicalSkillsMatch: aiResult.technicalSkillsMatch || 0,
      projectsMatch: aiResult.projectsMatch || 0,
      experienceMatch: aiResult.experienceMatch || 0,
      educationMatch: aiResult.educationMatch || 0,
      missingKeywords: Array.isArray(aiResult.missingKeywords) ? aiResult.missingKeywords : missingKeywords,
      missingSkills: Array.isArray(aiResult.missingSkills) ? aiResult.missingSkills : [],
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

// POST /api/analysis/rewrite-resume
const rewriteResume = async (req, res) => {
  const { fileBuffer, jobDescription, recruiterPersona } = req.body;
  if (!fileBuffer || !jobDescription || !recruiterPersona) {
    return res.status(400).json({ message: 'Resume file, job description, and persona are required.' });
  }

  try {
    const resumeText = await parsePdfFromBase64(fileBuffer);
    const rewriteResult = await rewriteResumeWithAI(recruiterPersona, resumeText, jobDescription);
    res.status(200).json({ optimizedResume: rewriteResult.optimizedResume });
  } catch (error) {
    console.error('Resume rewrite failed:', error);
    res.status(500).json({ message: error.message || 'Failed to generate optimized resume.' });
  }
};

// POST /api/analysis/interview-questions
const generateInterviewQuestions = async (req, res) => {
  const { analysisId, fileBuffer, jobDescription, recruiterPersona, resumeContext } = req.body;
  if ((!fileBuffer && !resumeContext && !analysisId) || !jobDescription || !recruiterPersona) {
    return res.status(400).json({ message: 'Resume context, job description, and persona are required.' });
  }

  try {
    let resumeText = fileBuffer ? await parsePdfFromBase64(fileBuffer) : '';

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
  deleteAnalysis,
  rewriteResume,
  generateInterviewQuestions,
};
