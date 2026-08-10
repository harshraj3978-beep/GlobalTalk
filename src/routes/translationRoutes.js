const express = require('express');
const { translateText } = require('../controllers/translationController');
const { authenticateToken } = require('./authMiddleware');

const router = express.Router();

router.post('/translate', authenticateToken, translateText);

module.exports = router;
