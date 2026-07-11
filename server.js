const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'globaltalk_secret_key_12345';

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// BCP 47 Language Locales Lookup
const LANGUAGE_LOCALES = {
  'English': 'en-US',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Italian': 'it-IT',
  'Japanese': 'ja-JP',
  'Chinese': 'zh-CN',
  'Korean': 'ko-KR',
  'Portuguese': 'pt-PT',
  'Russian': 'ru-RU',
  'Arabic': 'ar-SA',
  'Hindi': 'hi-IN'
};

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Get current date string (YYYY-MM-DD) for limit checks
function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

// ---------------- USER AUTHENTICATION ----------------

// Register User
app.post('/api/register', (req, res) => {
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
    proficiency_level
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
      `INSERT INTO users (username, email, password, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        10, // Starting XP is 10 (which includes the +10 registration XP)
        0 // default free tier
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
});

// Login User
app.post('/api/login', (req, res) => {
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

        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            native_language: user.native_language,
            target_language: user.target_language,
            bio: user.bio,
            profile_location: user.profile_location,
            hobbies: user.hobbies,
            proficiency_level: user.proficiency_level,
            xp: user.xp,
            is_premium: user.is_premium
          }
        });
      });
    }
  );
});

// Get Current Logged-in User Profile
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    }
  );
});

// Update Profile
app.put('/api/profile', authenticateToken, (req, res) => {
  const { name, native_language, target_language, bio, profile_location, hobbies, proficiency_level } = req.body;

  db.run(
    `UPDATE users SET
      name = ?,
      native_language = ?,
      target_language = ?,
      bio = ?,
      profile_location = ?,
      hobbies = ?,
      proficiency_level = ?
     WHERE id = ?`,
    [name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Profile updated successfully!' });
    }
  );
});

// Toggle Premium State (Mock Upgrade Button)
app.post('/api/profile/toggle-premium', authenticateToken, (req, res) => {
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
});

// ---------------- USER DIRECTORY ----------------

// Fetch Directory with Perfect Match Scoring
app.get('/api/directory', authenticateToken, (req, res) => {
  // Retrieve the logged-in user profile details first
  db.get(
    'SELECT native_language, target_language, profile_location, hobbies, proficiency_level FROM users WHERE id = ?',
    [req.user.id],
    (err, currentUser) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!currentUser) return res.status(404).json({ error: 'User not found' });

      // Fetch all other users
      db.all(
        'SELECT id, username, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium FROM users WHERE id != ?',
        [req.user.id],
        (err, otherUsers) => {
          if (err) return res.status(500).json({ error: err.message });

          // Map and calculate match score for each user
          const matchedUsers = otherUsers.map(user => {
            let score = 0;

            // Tiered calculations:
            // 1. +40% if My Native == Partner Target AND My Target == Partner Native
            if (
              currentUser.native_language && user.target_language &&
              currentUser.native_language.toLowerCase() === user.target_language.toLowerCase() &&
              currentUser.target_language && user.native_language &&
              currentUser.target_language.toLowerCase() === user.native_language.toLowerCase()
            ) {
              score += 40;
            }

            // 2. +30% for a matching profile_location string
            if (
              currentUser.profile_location && user.profile_location &&
              currentUser.profile_location.trim().toLowerCase() === user.profile_location.trim().toLowerCase() &&
              currentUser.profile_location.trim() !== ''
            ) {
              score += 30;
            }

            // 3. +20% if they share at least one hobby in the hobbies text string
            if (currentUser.hobbies && user.hobbies) {
              const myHobbiesList = currentUser.hobbies.split(',').map(h => h.trim().toLowerCase()).filter(h => h);
              const partnerHobbiesList = user.hobbies.split(',').map(h => h.trim().toLowerCase()).filter(h => h);
              const shared = myHobbiesList.some(hobby => partnerHobbiesList.includes(hobby));
              if (shared) {
                score += 20;
              }
            }

            // 4. +10% if their proficiency_level matches
            if (
              currentUser.proficiency_level && user.proficiency_level &&
              currentUser.proficiency_level.trim().toLowerCase() === user.proficiency_level.trim().toLowerCase()
            ) {
              score += 10;
            }

            // Add localized lookup voice key
            const partnerLocale = LANGUAGE_LOCALES[user.native_language] || 'en-US';

            return {
              ...user,
              match_score: score,
              partner_locale: partnerLocale
            };
          });

          // Sort by highest match score
          matchedUsers.sort((a, b) => b.match_score - a.match_score);

          res.json(matchedUsers);
        }
      );
    }
  );
});

// ---------------- MOMENTS FEED ----------------

// Create a Moment (+10 XP to creator)
app.post('/api/moments', authenticateToken, (req, res) => {
  const { content, image_url, audio_url } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Moment content is required.' });
  }

  db.run(
    'INSERT INTO moments (user_id, content, image_url, audio_url) VALUES (?, ?, ?, ?)',
    [req.user.id, content, image_url || '', audio_url || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const momentId = this.lastID;

      // Automatically grant +10 XP to the user when they share a Moment
      grantXP(req.user.id, 10, (err) => {
        if (err) console.error('Error granting moment XP:', err);
        res.status(201).json({ id: momentId, message: 'Moment posted successfully!' });
      });
    }
  );
});

// Fetch All Moments with Creator Profiles & Comments
app.get('/api/moments', authenticateToken, (req, res) => {
  db.all(
    `SELECT m.*, u.username, u.name, u.xp, u.is_premium FROM moments m
     JOIN users u ON m.user_id = u.id
     ORDER BY m.timestamp DESC`,
    [],
    (err, moments) => {
      if (err) return res.status(500).json({ error: err.message });

      // Fetch all comments and likes to attach
      db.all('SELECT * FROM moment_comments ORDER BY timestamp ASC', [], (err, comments) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT * FROM moment_likes', [], (err, likes) => {
          if (err) return res.status(500).json({ error: err.message });

          const momentsWithDetails = moments.map(m => {
            const momentComments = comments.filter(c => c.moment_id === m.id);
            const momentLikes = likes.filter(l => l.moment_id === m.id);
            const isLikedByMe = momentLikes.some(l => l.user_id === req.user.id);
            return {
              ...m,
              comments: momentComments,
              likes: momentLikes,
              is_liked_by_me: isLikedByMe
            };
          });

          res.json(momentsWithDetails);
        });
      });
    }
  );
});

// Like a Moment
app.post('/api/moments/:id/like', authenticateToken, (req, res) => {
  const momentId = req.params.id;
  const userId = req.user.id;

  db.run(
    'INSERT INTO moment_likes (moment_id, user_id) VALUES (?, ?)',
    [momentId, userId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'You have already liked this moment.' });
        }
        return res.status(500).json({ error: err.message });
      }

      // Update likes_count in moments table
      db.run(
        'UPDATE moments SET likes_count = likes_count + 1 WHERE id = ?',
        [momentId],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Moment liked!' });
        }
      );
    }
  );
});

// Comment on a Moment
app.post('/api/moments/:id/comment', authenticateToken, (req, res) => {
  const momentId = req.params.id;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content is required.' });

  db.run(
    'INSERT INTO moment_comments (moment_id, user_id, username, content) VALUES (?, ?, ?, ?)',
    [momentId, req.user.id, req.user.username, content],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Comment posted!' });
    }
  );
});

// ---------------- IN-STREAM CHAT & FREE TRANSLATION CORRECTIONS ----------------

// Fetch Messages with a Target Partner
app.get('/api/chat/:partnerId', authenticateToken, (req, res) => {
  const partnerId = req.params.partnerId;
  const userId = req.user.id;

  // Retrieve chat history and corrections for those messages
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
});

// Post a Message (+10 XP to sender)
app.post('/api/chat', authenticateToken, (req, res) => {
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

      // Automatically grant +10 XP to the sender
      grantXP(req.user.id, 10, (err) => {
        if (err) console.error('Error granting message XP:', err);
        res.status(201).json({ id: messageId, message: 'Message sent successfully!' });
      });
    }
  );
});

// Sentence Correction Endpoint (Limits applied here for free tier)
app.post('/api/corrections', authenticateToken, (req, res) => {
  const { message_id, original_text, corrected_text } = req.body;

  if (!message_id || !original_text || !corrected_text) {
    return res.status(400).json({ error: 'Required fields missing for correction.' });
  }

  const today = getLocalDateString();

  // First, verify if user is premium
  db.get('SELECT is_premium FROM users WHERE id = ?', [req.user.id], (err, currentUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    if (currentUser.is_premium) {
      // Direct insertion (bypass limit)
      insertCorrection();
    } else {
      // Query Daily Usage Table
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

          // Safe to insert and increment count
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

        // Grant +10 XP for correcting a sentence!
        grantXP(req.user.id, 10, (err) => {
          if (err) console.error('Error granting correction XP:', err);
          res.status(201).json({ message: 'Sentence correction saved successfully (+10 XP granted!)' });
        });
      }
    );
  }
});

// WebRTC calling daily limit tracker endpoint
app.post('/api/calls/initiate', authenticateToken, (req, res) => {
  const today = getLocalDateString();

  db.get('SELECT is_premium FROM users WHERE id = ?', [req.user.id], (err, currentUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    if (currentUser.is_premium) {
      return res.json({ message: 'WebRTC call initialized (Premium Unlimited)' });
    } else {
      // Check limits
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

          // Register call initialization
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
});

// Global metrics endpoint for current user limits state representation
app.get('/api/limits-state', authenticateToken, (req, res) => {
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
});

// Wildcard routing to SPA index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`GlobalTalk platform running on http://localhost:${PORT}`);
});
