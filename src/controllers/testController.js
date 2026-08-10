const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { getLocalDateString } = require('../services/activityService');

function resetDatabase(req, res) {
  const todayStr = getLocalDateString();
  db.serialize(() => {
    db.run('DELETE FROM users');
    db.run('DELETE FROM moments');
    db.run('DELETE FROM moment_comments');
    db.run('DELETE FROM moment_likes');
    db.run('DELETE FROM moment_corrections');
    db.run('DELETE FROM messages');
    db.run('DELETE FROM corrections');
    db.run('DELETE FROM daily_usage');

    // Re-seed default users
    const seedUser = (username, email, password, name, native, target, bio, loc, hobbies, prof, xp, premium, age, region, tags, streak, lastActive) => {
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return;
        db.run(`
          INSERT INTO users (username, email, password, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags, streak_count, last_active_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [username, email, hashedPassword, name, native, target, bio, loc, hobbies, prof, xp, premium, age, region, tags, streak || 1, lastActive || '']);
      });
    };

    seedUser('AI Coach', 'aicoach@globaltalk.com', 'ai_coach_secret_pass_999', 'GlobalTalk AI Coach', 'All', 'All', 'Your 24/7 automated conversational partner', 'GlobalTalk AI Hub', 'Languages, Learning, Coaching', 'Advanced', 1000, 1, 99, 'North America', 'education, language, AI', 1, '');
    seedUser('yuki22', 'yuki@globaltalk.com', 'password123', 'Yuki Tanaka', 'Japanese', 'English', 'K-pop lover, casual gamer, and amateur chef!', 'Tokyo, Japan', 'Gaming, Cooking, K-pop', 'Intermediate', 120, 0, 22, 'Asia', 'gaming, cooking, K-pop', 3, todayStr);
    seedUser('carlos_g', 'carlos@globaltalk.com', 'password123', 'Carlos Gomez', 'Spanish', 'French', 'Let’s talk about food and sports! Learning French for my career.', 'Madrid, Spain', 'Soccer, Music, Cooking', 'Beginner', 80, 0, 29, 'Europe', 'cooking, sports, music', 5, todayStr);
    seedUser('chloe_l', 'chloe@globaltalk.com', 'password123', 'Chloe Laurent', 'French', 'Spanish', 'Bookworm. I love reading classics and practicing my Spanish.', 'Paris, France', 'Reading, Art, Cooking', 'Advanced', 210, 1, 34, 'Europe', 'cooking, reading, art', 7, todayStr);
    seedUser('sujin_p', 'sujin@globaltalk.com', 'password123', 'Sujin Park', 'Korean', 'English', 'Dancing to K-pop and streaming video games.', 'Seoul, South Korea', 'Dancing, Fashion, Gaming', 'Beginner', 60, 0, 20, 'Asia', 'K-pop, fashion, gaming', 1, todayStr);
  });

  // Give small delay for bcrypt hashes
  setTimeout(() => {
    res.json({ message: 'Database clean reset and seeds complete!' });
  }, 400);
}

module.exports = {
  resetDatabase
};
