const express = require('express');
const { getChatMessages, postChatMessage, createCorrection, initiateCall, getLimitsState } = require('../controllers/chatController');
const { authenticateToken } = require('./authMiddleware');

const router = express.Router();

router.get('/chat/:partnerId', authenticateToken, getChatMessages);
router.post('/chat', authenticateToken, postChatMessage);
router.post('/corrections', authenticateToken, createCorrection);
router.post('/calls/initiate', authenticateToken, initiateCall);
router.get('/limits-state', authenticateToken, getLimitsState);

module.exports = router;
