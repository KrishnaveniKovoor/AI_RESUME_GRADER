const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  rewriteResume,
  generateInterviewQuestions,
} = require('../controllers/analysisController');

const router = express.Router();

router.post('/rewrite-resume', authMiddleware, rewriteResume);
router.post('/interview-questions', authMiddleware, generateInterviewQuestions);

module.exports = router;
