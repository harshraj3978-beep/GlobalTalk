const UserModel = require('../models/userModel');

function getLeaderboard(req, res) {
  UserModel.getLeaderboard(10, (err, rows) => {
    if (err) {
      console.error('Leaderboard fetch database error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
}

module.exports = {
  getLeaderboard
};
