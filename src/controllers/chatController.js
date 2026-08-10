const db = require('../config/db');
const { grantXP, recordUserActivity, getLocalDateString } = require('../services/activityService');

// Fetch Messages
function getChatMessages(req, res) {
  const partnerId = req.params.partnerId;
  const userId = req.user.id;

  db.all(
    `SELECT m.*, c.id AS correction_id, c.corrector_id, c.original_text, c.corrected_text
     FROM messages m
     LEFT JOIN corrections c ON m.id = c.message_id
     WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
     ORDER BY m.timestamp ASC`,
    [userId, partnerId, partnerId, userId],
    (err, messages) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(messages);
    }
  );
}

// Post Message
function postChatMessage(req, res) {
  const { receiver_id, content } = req.body;
  if (!receiver_id || !content) {
    return res.status(400).json({ error: 'Receiver ID and content are required.' });
  }

  db.run(
    'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
    [req.user.id, receiver_id, content],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const messageId = this.lastID;

      grantXP(req.user.id, 10, (err) => {
        if (err) console.error('Error granting message XP:', err);
        recordUserActivity(req.user.id, () => {
          res.status(201).json({ id: messageId, message: 'Message sent successfully!' });
        });
      });
    }
  );
}

// Sentence Correction
function createCorrection(req, res) {
  const { message_id, original_text, corrected_text } = req.body;

  if (!message_id || !original_text || !corrected_text) {
    return res.status(400).json({ error: 'Required fields missing for correction.' });
  }

  const today = getLocalDateString();

  db.get('SELECT is_premium FROM users WHERE id = ?', [req.user.id], (err, currentUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    if (currentUser.is_premium) {
      insertCorrection();
    } else {
      db.get(
        'SELECT corrections_count FROM daily_usage WHERE user_id = ? AND date = ?',
        [req.user.id, today],
        (err, usage) => {
          if (err) return res.status(500).json({ error: err.message });

          const currentCount = usage ? usage.corrections_count : 0;
          if (currentCount >= 5) {
            return res.status(403).json({
              error: 'LIMIT_BREACHED',
              message: 'You have breached the Free Tier maximum limit of 5 sentence corrections per day.'
            });
          }

          db.run(
            `INSERT INTO daily_usage (user_id, date, corrections_count)
             VALUES (?, ?, 1)
             ON CONFLICT(user_id, date) DO UPDATE SET corrections_count = corrections_count + 1`,
            [req.user.id, today],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });
              insertCorrection();
            }
          );
        }
      );
    }
  });

  function insertCorrection() {
    db.run(
      'INSERT INTO corrections (message_id, corrector_id, original_text, corrected_text) VALUES (?, ?, ?, ?)',
      [message_id, req.user.id, original_text, corrected_text],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        grantXP(req.user.id, 10, (err) => {
          if (err) console.error('Error granting correction XP:', err);
          recordUserActivity(req.user.id, () => {
            res.status(201).json({ message: 'Sentence correction saved successfully (+10 XP granted!)' });
          });
        });
      }
    );
  }
}

// WebRTC limit tracker
function initiateCall(req, res) {
  const today = getLocalDateString();

  db.get('SELECT is_premium FROM users WHERE id = ?', [req.user.id], (err, currentUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    if (currentUser.is_premium) {
      return res.json({ message: 'WebRTC call initialized (Premium Unlimited)' });
    } else {
      db.get(
        'SELECT calls_count FROM daily_usage WHERE user_id = ? AND date = ?',
        [req.user.id, today],
        (err, usage) => {
          if (err) return res.status(500).json({ error: err.message });

          const currentCallsCount = usage ? usage.calls_count : 0;
          if (currentCallsCount >= 1) {
            return res.status(403).json({
              error: 'LIMIT_BREACHED',
              message: 'You have breached the Free Tier maximum limit of 1 WebRTC call initialization session per day.'
            });
          }

          db.run(
            `INSERT INTO daily_usage (user_id, date, calls_count)
             VALUES (?, ?, 1)
             ON CONFLICT(user_id, date) DO UPDATE SET calls_count = calls_count + 1`,
            [req.user.id, today],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ message: 'WebRTC Call Initialized' });
            }
          );
        }
      );
    }
  });
}

// Limits state
function getLimitsState(req, res) {
  const today = getLocalDateString();
  db.get('SELECT is_premium FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.get(
      'SELECT corrections_count, calls_count FROM daily_usage WHERE user_id = ? AND date = ?',
      [req.user.id, today],
      (err, usage) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          is_premium: user.is_premium,
          corrections_count: usage ? usage.corrections_count : 0,
          calls_count: usage ? usage.calls_count : 0
        });
      }
    );
  });
}

module.exports = {
  getChatMessages,
  postChatMessage,
  createCorrection,
  initiateCall,
  getLimitsState
};
