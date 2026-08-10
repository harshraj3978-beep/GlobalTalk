const db = require('../config/db');

// Leaderboard with Streaks & Premium
function getLeaderboard(req, res) {
  db.all(
    'SELECT id, username, xp, native_language, target_language, streak_count, is_premium FROM users ORDER BY xp DESC LIMIT 10',
    [],
    (err, rows) => {
      if (err) {
        console.error('Leaderboard fetch database error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
}

module.exports = {
  getLeaderboard
};
