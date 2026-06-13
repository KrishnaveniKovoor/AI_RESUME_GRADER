const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  uploadResume,
  analyze,
  getHistory,
  getAllHistory,
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
router.get('/admin/all-history', authMiddleware, adminMiddleware, getAllHistory);
router.delete('/:id', authMiddleware, deleteAnalysis);

module.exports = router;
