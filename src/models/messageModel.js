const db = require('../../config/database');

const MessageModel = {
  getMessagesBetweenUsers: (userId, partnerId, callback) => {
    db.all(
      `SELECT m.*, c.id AS correction_id, c.corrector_id, c.original_text, c.corrected_text
       FROM messages m
       LEFT JOIN corrections c ON m.id = c.message_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.timestamp ASC`,
      [userId, partnerId, partnerId, userId],
      callback
    );
  },

  createMessage: (senderId, receiverId, content, callback) => {
    db.run(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [senderId, receiverId, content],
      function(err) {
        callback(err, this ? this.lastID : null);
      }
    );
  },

  createCorrection: (messageId, correctorId, originalText, correctedText, callback) => {
    db.run(
      'INSERT INTO corrections (message_id, corrector_id, original_text, corrected_text) VALUES (?, ?, ?, ?)',
      [messageId, correctorId, originalText, correctedText],
      function(err) {
        callback(err, this ? this.lastID : null);
      }
    );
  },

  getDailyUsage: (userId, date, callback) => {
    db.get(
      'SELECT corrections_count, calls_count FROM daily_usage WHERE user_id = ? AND date = ?',
      [userId, date],
      callback
    );
  },

  incrementCorrectionsCount: (userId, date, callback) => {
    db.run(
      `INSERT INTO daily_usage (user_id, date, corrections_count)
       VALUES (?, ?, 1)
       ON CONFLICT(user_id, date) DO UPDATE SET corrections_count = corrections_count + 1`,
      [userId, date],
      callback
    );
  },

  incrementCallsCount: (userId, date, callback) => {
    db.run(
      `INSERT INTO daily_usage (user_id, date, calls_count)
       VALUES (?, ?, 1)
       ON CONFLICT(user_id, date) DO UPDATE SET calls_count = calls_count + 1`,
      [userId, date],
      callback
    );
  }
};

module.exports = MessageModel;
