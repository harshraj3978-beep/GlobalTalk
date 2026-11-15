const express = require('express');
const { registerUser, loginUser, getProfile, updateProfile, togglePremium } = require('../controllers/authController');
const { authenticateToken } = require('./authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.post('/profile/toggle-premium', authenticateToken, togglePremium);

module.exports = router;
