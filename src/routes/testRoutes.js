const express = require('express');
const { resetDatabase } = require('../controllers/testController');

const router = express.Router();

router.post('/reset-db', resetDatabase);

module.exports = router;
