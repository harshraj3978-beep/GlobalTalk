const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'globaltalk.db');
const rawDb = new Database(dbPath);

rawDb.pragma('foreign_keys = ON');

const db = {
  serialize(fn) {
    if (typeof fn === 'function') {
      fn();
    }
  },

  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    } else if (params === undefined || params === null) {
      params = [];
    }
    if (!Array.isArray(params)) {
      params = [params];
    }
    try {
      const stmt = rawDb.prepare(sql);
      const info = stmt.run(...params);
      const context = {
        lastID: Number(info.lastInsertRowid),
        changes: info.changes
      };
      if (typeof callback === 'function') {
        callback.call(context, null);
      }
      return context;
    } catch (err) {
      if (typeof callback === 'function') {
        callback(err);
      } else {
        throw err;
      }
    }
  },

  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    } else if (params === undefined || params === null) {
      params = [];
    }
    if (!Array.isArray(params)) {
      params = [params];
    }
    try {
      const stmt = rawDb.prepare(sql);
      const row = stmt.get(...params);
      if (typeof callback === 'function') {
        callback(null, row);
      }
      return row;
    } catch (err) {
      if (typeof callback === 'function') {
        callback(err);
      } else {
        throw err;
      }
    }
  },

  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    } else if (params === undefined || params === null) {
      params = [];
    }
    if (!Array.isArray(params)) {
      params = [params];
    }
    try {
      const stmt = rawDb.prepare(sql);
      const rows = stmt.all(...params);
      if (typeof callback === 'function') {
        callback(null, rows);
      }
      return rows;
    } catch (err) {
      if (typeof callback === 'function') {
        callback(err);
      } else {
        throw err;
      }
    }
  },

  exec(sql, callback) {
    try {
      rawDb.exec(sql);
      if (typeof callback === 'function') callback(null);
    } catch (err) {
      if (typeof callback === 'function') callback(err);
      else throw err;
    }
  },

  prepare(sql) {
    return rawDb.prepare(sql);
  }
};

// Initialize DB schema
db.serialize(() => {
  // Users Table
  // Added: age, region, interest_tags
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
      is_premium INTEGER DEFAULT 0,
      age INTEGER DEFAULT 25,
      region TEXT DEFAULT 'North America',
      interest_tags TEXT DEFAULT ''
    )
  `);

  // Fallback migrations in case db already exists
  const alterColumns = [
    { name: 'age', type: 'INTEGER DEFAULT 25' },
    { name: 'region', type: "TEXT DEFAULT 'North America'" },
    { name: 'interest_tags', type: "TEXT DEFAULT ''" }
  ];

  alterColumns.forEach(col => {
    db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`, (err) => {
      // Ignore "duplicate column name" error
      if (err && !err.message.includes('duplicate column name')) {
        console.warn(`Column warning for ${col.name}:`, err.message);
      }
    });
  });

  // Moments Table
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
  db.run(`
    CREATE TABLE IF NOT EXISTS moment_likes (
      moment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (moment_id, user_id),
      FOREIGN KEY(moment_id) REFERENCES moments(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Moment Corrections Table (New table for community corrections)
  db.run(`
    CREATE TABLE IF NOT EXISTS moment_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      moment_id INTEGER NOT NULL,
      corrector_id INTEGER NOT NULL,
      corrector_name TEXT NOT NULL,
      original_text TEXT NOT NULL,
      corrected_text TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(moment_id) REFERENCES moments(id),
      FOREIGN KEY(corrector_id) REFERENCES users(id)
    )
  `);

  // Messages Table
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

  // Corrections Table (for Chat Corrections)
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

  // Hash helper
  function seedUser(username, email, password, name, native, target, bio, loc, hobbies, prof, xp, premium, age, region, tags) {
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return;
      db.run(`
        INSERT OR IGNORE INTO users (username, email, password, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [username, email, hashedPassword, name, native, target, bio, loc, hobbies, prof, xp, premium, age, region, tags]);
    });
  }

  // Seed persistent AI Coach user
  seedUser(
    'AI Coach',
    'aicoach@globaltalk.com',
    'ai_coach_secret_pass_999',
    'GlobalTalk AI Coach',
    'All',
    'All',
    'Your 24/7 automated conversational partner',
    'GlobalTalk AI Hub',
    'Languages, Learning, Coaching',
    'Advanced',
    1000,
    1,
    99,
    'North America',
    'education, language, AI'
  );

  // Seed Yuki Tanaka (Gaming & Cooking)
  seedUser(
    'yuki22',
    'yuki@globaltalk.com',
    'password123',
    'Yuki Tanaka',
    'Japanese',
    'English',
    'K-pop lover, casual gamer, and amateur chef!',
    'Tokyo, Japan',
    'Gaming, Cooking, K-pop',
    'Intermediate',
    120,
    0,
    22,
    'Asia',
    'gaming, cooking, K-pop'
  );

  // Seed Carlos Gomez (Sports & Cooking)
  seedUser(
    'carlos_g',
    'carlos@globaltalk.com',
    'password123',
    'Carlos Gomez',
    'Spanish',
    'French',
    'Let’s talk about food and sports! Learning French for my career.',
    'Madrid, Spain',
    'Soccer, Music, Cooking',
    'Beginner',
    80,
    0,
    29,
    'Europe',
    'cooking, sports, music'
  );

  // Seed Chloe Laurent (Reading & Cooking)
  seedUser(
    'chloe_l',
    'chloe@globaltalk.com',
    'password123',
    'Chloe Laurent',
    'French',
    'Spanish',
    'Bookworm. I love reading classics and practicing my Spanish.',
    'Paris, France',
    'Reading, Art, Cooking',
    'Advanced',
    210,
    1,
    34,
    'Europe',
    'cooking, reading, art'
  );

  // Seed Sujin Park (K-pop & Gaming)
  seedUser(
    'sujin_p',
    'sujin@globaltalk.com',
    'password123',
    'Sujin Park',
    'Korean',
    'English',
    'Dancing to K-pop and streaming video games.',
    'Seoul, South Korea',
    'Dancing, Fashion, Gaming',
    'Beginner',
    60,
    0,
    20,
    'Asia',
    'K-pop, fashion, gaming'
  );
});

module.exports = db;
