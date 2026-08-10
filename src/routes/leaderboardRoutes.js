const express = require('express');
const { getLeaderboard } = require('../controllers/leaderboardController');
const { authenticateToken } = require('./authMiddleware');

const router = express.Router();

router.get('/leaderboard', authenticateToken, getLeaderboard);

module.exports = router;
