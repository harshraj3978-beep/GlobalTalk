const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../routes/authMiddleware');
const { recordUserActivity, getLocalDateString } = require('../services/activityService');

// Register
function registerUser(req, res) {
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
    age,
    region,
    interest_tags
  } = req.body;

  if (!username || !email || !password || !name || !native_language || !target_language) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Bcrypt hash error:', err);
      return res.status(500).json({ error: 'Error hashing password' });
    }

    db.run(
      `INSERT INTO users (username, email, password, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags, streak_count, last_active_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        name.trim(),
        native_language,
        target_language,
        bio || '',
        profile_location || '',
        hobbies || '',
        proficiency_level || 'Beginner',
        10, // Starting XP is 10
        0, // default free tier
        age ? parseInt(age) : 25,
        region || 'North America',
        interest_tags || '',
        1,
        getLocalDateString()
      ],
      function(err) {
        if (err) {
          console.error('INSERT users DB error:', err);
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or Email already exists.' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Registration successful!', userId: this.lastID });
      }
    );
  });
}

// Login
function loginUser(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter Email and Password.' });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email.trim().toLowerCase()],
    (err, user) => {
      if (err) {
        console.error('SELECT users login DB error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        console.warn('Login failure: user not found:', email);
        return res.status(400).json({ error: 'Invalid Email or Password' });
      }

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) return res.status(500).json({ error: 'Authentication error' });
        if (!isMatch) {
          console.warn('Login failure: password mismatch:', email);
          return res.status(400).json({ error: 'Invalid Email or Password' });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        recordUserActivity(user.id, (err, updatedStreak, bonusXp) => {
          // Fetch updated user stats so we return the latest xp and streak_count to the SPA
          db.get('SELECT * FROM users WHERE id = ?', [user.id], (err, updatedUser) => {
            const u = updatedUser || user;
            res.json({
              token,
              user: {
                id: u.id,
                username: u.username,
                name: u.name,
                email: u.email,
                native_language: u.native_language,
                target_language: u.target_language,
                bio: u.bio,
                profile_location: u.profile_location,
                hobbies: u.hobbies,
                proficiency_level: u.proficiency_level,
                xp: u.xp,
                is_premium: u.is_premium,
                age: u.age,
                region: u.region,
                interest_tags: u.interest_tags,
                streak_count: u.streak_count,
                last_active_date: u.last_active_date
              }
            });
          });
        });
      });
    }
  );
}

// Get Profile
function getProfile(req, res) {
  db.get(
    'SELECT id, username, email, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags, streak_count, last_active_date FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    }
  );
}

// Update Profile
function updateProfile(req, res) {
  const { name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, age, region, interest_tags } = req.body;

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
    [name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, age ? parseInt(age) : 25, region, interest_tags, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Profile updated successfully!' });
    }
  );
}

// Toggle Premium
function togglePremium(req, res) {
  db.get('SELECT is_premium FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const nextPremiumState = user.is_premium ? 0 : 1;
    db.run(
      'UPDATE users SET is_premium = ? WHERE id = ?',
      [nextPremiumState, req.user.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Premium status updated to ${nextPremiumState === 1 ? 'PRO Premium' : 'Free Tier'}`, is_premium: nextPremiumState });
      }
    );
  });
}

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  togglePremium
};
