const express = require('express');
const { getDirectory } = require('../controllers/directoryController');
const { authenticateToken } = require('./authMiddleware');

const router = express.Router();

router.get('/directory', authenticateToken, getDirectory);

module.exports = router;
