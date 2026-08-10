const db = require('../config/db');

// Helper to grant XP
function grantXP(userId, xpAmount, callback) {
  db.run(
    'UPDATE users SET xp = xp + ? WHERE id = ?',
    [xpAmount, userId],
    function(err) {
      if (err) console.error('grantXP error:', err);
      if (callback) callback(err);
    }
  );
}

// Get current date string (YYYY-MM-DD) for limit checks
function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to record user activity and update daily streaks
function recordUserActivity(userId, callback) {
  const today = getLocalDateString();
  db.get('SELECT streak_count, last_active_date FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      if (callback) callback(err);
      return;
    }
    let streak = user.streak_count || 1;
    let lastDate = user.last_active_date || '';
    let xpReward = 0;

    console.log(`STREAK DEBUG - userId: ${userId}, streak: ${streak}, lastDate: ${lastDate}, today: ${today}`);

    if (!lastDate) {
      streak = 1;
      xpReward = 10; // Start streak bonus
    } else {
      const lastTime = new Date(lastDate).getTime();
      const todayTime = new Date(today).getTime();
      const diffTime = todayTime - lastTime;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      console.log(`STREAK DEBUG - diffDays: ${diffDays}`);

      if (diffDays === 1) {
        streak += 1;
        xpReward = 10; // Continue streak bonus
      } else if (diffDays > 1) {
        streak = 1;
        xpReward = 10; // Reset streak bonus
      } else {
        // diffDays === 0: already active today, streak is maintained, no extra daily bonus
      }
    }

    console.log(`STREAK DEBUG - Saving streak: ${streak}, lastDate: ${today}`);

    db.run(
      'UPDATE users SET streak_count = ?, last_active_date = ? WHERE id = ?',
      [streak, today, userId],
      (err) => {
        if (err) {
          if (callback) callback(err);
          return;
        }
        if (xpReward > 0) {
          grantXP(userId, xpReward, (err2) => {
            if (callback) callback(err2, streak, xpReward);
          });
        } else {
          if (callback) callback(null, streak, 0);
        }
      }
    );
  });
}

module.exports = {
  grantXP,
  getLocalDateString,
  recordUserActivity
};
