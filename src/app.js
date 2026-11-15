const express = require('express');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const directoryRoutes = require('./routes/directoryRoutes');
const translationRoutes = require('./routes/translationRoutes');
const momentRoutes = require('./routes/momentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const tutorRoutes = require('./routes/tutorRoutes');
const testRoutes = require('./routes/testRoutes');

function createServer(io) {
  const app = express();

  // Middlewares
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  // Mount API Routers
  app.use('/api', authRoutes);
  app.use('/api', directoryRoutes);
  app.use('/api', translationRoutes);
  app.use('/api', momentRoutes);
  app.use('/api', chatRoutes);
  app.use('/api', leaderboardRoutes);
  app.use('/api', tutorRoutes);
  app.use('/api', testRoutes);

  // Wildcard routing to SPA index
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });

  return app;
}

module.exports = {
  createServer
};
