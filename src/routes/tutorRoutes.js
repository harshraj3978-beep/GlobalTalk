const express = require('express');
const { aiTutorChat, aiCoachChat } = require('../controllers/tutorController');
const { authenticateToken } = require('./authMiddleware');

const router = express.Router();

router.post('/ai-tutor/chat', authenticateToken, aiTutorChat);
router.post('/chat/ai', authenticateToken, aiCoachChat);

module.exports = router;
