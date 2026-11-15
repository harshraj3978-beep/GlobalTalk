const db = require('../../config/database');

const UserModel = {
  findById: (id, callback) => {
    db.get(
      'SELECT id, username, email, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags, streak_count, last_active_date FROM users WHERE id = ?',
      [id],
      callback
    );
  },

  findByEmail: (email, callback) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], callback);
  },

  findByUsername: (username, callback) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], callback);
  },

  createUser: (userData, callback) => {
    const {
      username,
      email,
      password,
      name,
      native_language,
      target_language,
      bio,
      profile_location,
      hobbies,
      proficiency_level,
      xp,
      is_premium,
      age,
      region,
      interest_tags,
      streak_count,
      last_active_date
    } = userData;

    db.run(
      `INSERT INTO users (username, email, password, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags, streak_count, last_active_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        email,
        password,
        name,
        native_language,
        target_language,
        bio,
        profile_location,
        hobbies,
        proficiency_level,
        xp,
        is_premium,
        age,
        region,
        interest_tags,
        streak_count,
        last_active_date
      ],
      function(err) {
        callback(err, this ? this.lastID : null);
      }
    );
  },

  updateProfile: (id, profileData, callback) => {
    const {
      name,
      native_language,
      target_language,
      bio,
      profile_location,
      hobbies,
      proficiency_level,
      age,
      region,
      interest_tags
    } = profileData;

    db.run(
      `UPDATE users SET
        name = ?,
        native_language = ?,
        target_language = ?,
        bio = ?,
        profile_location = ?,
        hobbies = ?,
        proficiency_level = ?,
        age = ?,
        region = ?,
        interest_tags = ?
       WHERE id = ?`,
      [name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, age, region, interest_tags, id],
      callback
    );
  },

  updatePremiumStatus: (id, isPremium, callback) => {
    db.run('UPDATE users SET is_premium = ? WHERE id = ?', [isPremium, id], callback);
  },

  grantXP: (id, amount, callback) => {
    db.run('UPDATE users SET xp = xp + ? WHERE id = ?', [amount, id], callback);
  },

  updateStreakAndLastActive: (id, streak, lastActiveDate, callback) => {
    db.run(
      'UPDATE users SET streak_count = ?, last_active_date = ? WHERE id = ?',
      [streak, lastActiveDate, id],
      callback
    );
  },

  getOtherUsers: (currentUserId, callback) => {
    db.all(
      'SELECT id, username, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags FROM users WHERE id != ?',
      [currentUserId],
      callback
    );
  },

  getLeaderboard: (limit, callback) => {
    db.all(
      'SELECT id, username, xp, native_language, target_language, streak_count, is_premium FROM users ORDER BY xp DESC LIMIT ?',
      [limit],
      callback
    );
  }
};

module.exports = UserModel;
