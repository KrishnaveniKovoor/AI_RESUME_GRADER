const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  uploadResume,
  analyze,
  getHistory,
  deleteAnalysis,
  rewriteResume,
  generateInterviewQuestions,
} = require('../controllers/analysisController');

const router = express.Router();

router.post('/upload', authMiddleware, upload.single('resume'), uploadResume);
router.post('/analyze', authMiddleware, analyze);
router.post('/rewrite-resume', authMiddleware, rewriteResume);
router.post('/interview-questions', authMiddleware, generateInterviewQuestions);
router.get('/history', authMiddleware, getHistory);
router.delete('/:id', authMiddleware, deleteAnalysis);

module.exports = router;
