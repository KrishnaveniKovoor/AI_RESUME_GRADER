const mongoose = require('mongoose');

const resumeAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    resumeFileName: {
      type: String,
      required: true
    },

    jobDescription: {
      type: String,
      required: true
    },

    recruiterPersona: {
      type: String,
      required: true
    },

    atsScore: {
      type: Number,
      required: true
    },

    missingKeywords: [{ type: String }],

    missingSkills: [{ type: String }],

    strengths: [{ type: String }],

    weaknesses: [{ type: String }],

    suggestions: [{ type: String }],

    technicalSkillsMatch: {
      type: Number,
      default: 0,
    },

    projectsMatch: {
      type: Number,
      default: 0,
    },

    experienceMatch: {
      type: Number,
      default: 0,
    },

    educationMatch: {
      type: Number,
      default: 0,
    },

    optimizedResume: {
      type: String,
      default: '',
    },

    hiringRecommendation: {
      type: String,
      required: true
    },

    aiFallback: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'ResumeAnalysis',
  resumeAnalysisSchema
);