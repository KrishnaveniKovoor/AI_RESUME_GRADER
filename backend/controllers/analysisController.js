const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const ResumeAnalysis = require('../models/ResumeAnalysis');

const {
  analyzeResumeWithAI,
  rewriteResumeWithAI,
  generateInterviewQuestionsWithAI,
} = require('../utils/aiService');

const readResumeTextFromFile = async (resumeFileName) => {
  if (!resumeFileName) {
    return '';
  }

  const resumePath = path.join(__dirname, '..', 'uploads', resumeFileName);
  if (!fs.existsSync(resumePath)) {
    return '';
  }

  const resumeBuffer = fs.readFileSync(resumePath);
  const pdfData = await pdfParse(resumeBuffer);
  return pdfData.text || '';
};

const buildResumeContextFromAnalysis = (analysis) => {
  if (!analysis) {
    return '';
  }

  const lines = [
    Array.isArray(analysis.strengths) && analysis.strengths.length ? `Strengths: ${analysis.strengths.join(', ')}` : '',
    Array.isArray(analysis.weaknesses) && analysis.weaknesses.length ? `Weaknesses: ${analysis.weaknesses.join(', ')}` : '',
    Array.isArray(analysis.missingSkills) && analysis.missingSkills.length ? `Missing skills: ${analysis.missingSkills.join(', ')}` : '',
    Array.isArray(analysis.missingKeywords) && analysis.missingKeywords.length ? `Missing keywords: ${analysis.missingKeywords.join(', ')}` : '',
    analysis.hiringRecommendation ? `Hiring recommendation: ${analysis.hiringRecommendation}` : '',
  ];

  return lines.filter(Boolean).join('\n');
};

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    res.json({ fileName: req.file.filename, originalName: req.file.originalname });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed.' });
  }
};

const analyze = async (req, res) => {
  try {
  const { resumeFileName, jobDescription, recruiterPersona } = req.body;
  if (!resumeFileName || !jobDescription || !recruiterPersona) {
    return res.status(400).json({ message: 'Resume file, job description, and persona are required.' });
  }

  const resumePath = path.join(__dirname, '..', 'uploads', resumeFileName);
  if (!fs.existsSync(resumePath)) {
    return res.status(404).json({ message: 'Uploaded resume file not found.' });
  }

  const resumeBuffer = fs.readFileSync(resumePath);
  const pdfData = await pdfParse(resumeBuffer);
  const resumeText = pdfData.text || '';

  const keywordCandidates = jobDescription
    .replace(/[^a-zA-Z0-9,\s]/g, ' ')
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());

  const uniqueKeywords = [...new Set(keywordCandidates)];
  const missingKeywords = uniqueKeywords.filter((keyword) => {
    return keyword.length > 2 && !resumeText.toLowerCase().includes(keyword);
  }).slice(0, 12);

  const localScore = Math.max(
    45,
    Math.round(100 - missingKeywords.length * 4 - (resumeText.length < 300 ? 10 : 0))
  );

  let aiResult;
  let aiFallback = false;

  try {
    aiResult = await analyzeResumeWithAI(recruiterPersona, resumeText, jobDescription);
  } catch (error) {
    console.error('AI analysis failed - Error details:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      fullError: error
    });
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

  // TODO: delete uploaded file after analysis is saved to keep uploads/ clean
  const analysis = await ResumeAnalysis.create({
    userId: req.user._id,
    resumeFileName,
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

const getHistory = async (req, res) => {
  try {
    const history = await ResumeAnalysis.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Failed to retrieve history.' });
  }
};

const rewriteResume = async (req, res) => {
  const { resumeFileName, jobDescription, recruiterPersona } = req.body;
  if (!resumeFileName || !jobDescription || !recruiterPersona) {
    return res.status(400).json({ message: 'Resume file, job description, and persona are required.' });
  }

  const resumePath = path.join(__dirname, '..', 'uploads', resumeFileName);
  if (!fs.existsSync(resumePath)) {
    return res.status(404).json({ message: 'Uploaded resume file not found.' });
  }

  const resumeBuffer = fs.readFileSync(resumePath);
  const pdfData = await pdfParse(resumeBuffer);
  const resumeText = pdfData.text || '';

  try {
    const rewriteResult = await rewriteResumeWithAI(recruiterPersona, resumeText, jobDescription);
    res.status(200).json({ optimizedResume: rewriteResult.optimizedResume });
  } catch (error) {
    console.error('Resume rewrite failed:', error);
    res.status(500).json({ message: error.message || 'Failed to generate optimized resume.' });
  }
};

const generateInterviewQuestions = async (req, res) => {
  const { analysisId, resumeFileName, jobDescription, recruiterPersona, resumeContext } = req.body;
  if ((!resumeFileName && !resumeContext && !analysisId) || !jobDescription || !recruiterPersona) {
    return res.status(400).json({ message: 'Resume context, job description, and persona are required.' });
  }

  try {
    let resumeText = await readResumeTextFromFile(resumeFileName);

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
