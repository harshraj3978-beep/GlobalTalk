const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'globaltalk.db');
const db = new sqlite3.Database(dbPath);

// Initialize DB schema
db.serialize(() => {
  // Users Table
  // Schema: id, username, email, password, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      native_language TEXT NOT NULL,
      target_language TEXT NOT NULL,
      bio TEXT,
      profile_location TEXT,
      hobbies TEXT,
      proficiency_level TEXT,
      xp INTEGER DEFAULT 10,
      is_premium INTEGER DEFAULT 0
    )
  `);

  // Moments Table
  // Schema: id, user_id, content, image_url, audio_url, timestamp, likes_count
  db.run(`
    CREATE TABLE IF NOT EXISTS moments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      audio_url TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      likes_count INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Moment Comments Table
  // Schema: id, moment_id, user_id, username, content, timestamp
  db.run(`
    CREATE TABLE IF NOT EXISTS moment_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      moment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(moment_id) REFERENCES moments(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Moment Likes Table (Prevent double-liking)
  // Schema: moment_id, user_id
  db.run(`
    CREATE TABLE IF NOT EXISTS moment_likes (
      moment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (moment_id, user_id),
      FOREIGN KEY(moment_id) REFERENCES moments(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Messages Table
  // Schema: id, sender_id, receiver_id, content, timestamp
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(receiver_id) REFERENCES users(id)
    )
  `);

  // Corrections Table
  // Schema: id, message_id, corrector_id, original_text, corrected_text, timestamp
  db.run(`
    CREATE TABLE IF NOT EXISTS corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      corrector_id INTEGER NOT NULL,
      original_text TEXT NOT NULL,
      corrected_text TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(message_id) REFERENCES messages(id),
      FOREIGN KEY(corrector_id) REFERENCES users(id)
    )
  `);

  // Daily Usage Table (to enforce monetization tier limits)
  // Schema: id, user_id, date, corrections_count, calls_count
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL, -- Format: YYYY-MM-DD
      corrections_count INTEGER DEFAULT 0,
      calls_count INTEGER DEFAULT 0,
      UNIQUE(user_id, date),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Seeding persistent AI Coach user
  bcrypt.hash('ai_coach_secret_pass_999', 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing AI Coach password:', err);
      return;
    }
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'AI Coach',
      'aicoach@globaltalk.com',
      hashedPassword,
      'GlobalTalk AI Coach',
      'All',
      'All',
      'Your 24/7 automated conversational partner',
      'GlobalTalk AI Hub',
      'Languages, Learning, Coaching',
      'Advanced',
      1000, // Pre-configured senior leader high score
      1 // Premium user out of the box
    ], (err) => {
      if (err) {
        console.error('Failed to seed AI Coach user:', err.message);
      } else {
        console.log('AI Coach seed user verification complete.');
      }
    });
  });
});

module.exports = db;
