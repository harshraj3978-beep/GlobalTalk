const express = require('express');
const { createMoment, getMoments, createMomentCorrection, likeMoment, commentOnMoment } = require('../controllers/momentController');
const { authenticateToken } = require('./authMiddleware');

const router = express.Router();

router.post('/moments', authenticateToken, createMoment);
router.get('/moments', authenticateToken, getMoments);
router.post('/moments/:id/corrections', authenticateToken, createMomentCorrection);
router.post('/moments/:id/like', authenticateToken, likeMoment);
router.post('/moments/:id/comment', authenticateToken, commentOnMoment);

module.exports = router;
