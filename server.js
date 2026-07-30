const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'globaltalk_secret_key_12345';

// Create HTTP server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

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

// ---------------- DATABASE RESET & SEED ENDPOINT FOR TESTING ----------------
app.post('/api/reset-db', (req, res) => {
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
    const seedUser = (username, email, password, name, native, target, bio, loc, hobbies, prof, xp, premium, age, region, tags) => {
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return;
        db.run(`
          INSERT INTO users (username, email, password, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [username, email, hashedPassword, name, native, target, bio, loc, hobbies, prof, xp, premium, age, region, tags]);
      });
    };

    seedUser('AI Coach', 'aicoach@globaltalk.com', 'ai_coach_secret_pass_999', 'GlobalTalk AI Coach', 'All', 'All', 'Your 24/7 automated conversational partner', 'GlobalTalk AI Hub', 'Languages, Learning, Coaching', 'Advanced', 1000, 1, 99, 'North America', 'education, language, AI');
    seedUser('yuki22', 'yuki@globaltalk.com', 'password123', 'Yuki Tanaka', 'Japanese', 'English', 'K-pop lover, casual gamer, and amateur chef!', 'Tokyo, Japan', 'Gaming, Cooking, K-pop', 'Intermediate', 120, 0, 22, 'Asia', 'gaming, cooking, K-pop');
    seedUser('carlos_g', 'carlos@globaltalk.com', 'password123', 'Carlos Gomez', 'Spanish', 'French', 'Let’s talk about food and sports! Learning French for my career.', 'Madrid, Spain', 'Soccer, Music, Cooking', 'Beginner', 80, 0, 29, 'Europe', 'cooking, sports, music');
    seedUser('chloe_l', 'chloe@globaltalk.com', 'password123', 'Chloe Laurent', 'French', 'Spanish', 'Bookworm. I love reading classics and practicing my Spanish.', 'Paris, France', 'Reading, Art, Cooking', 'Advanced', 210, 1, 34, 'Europe', 'cooking, reading, art');
    seedUser('sujin_p', 'sujin@globaltalk.com', 'password123', 'Sujin Park', 'Korean', 'English', 'Dancing to K-pop and streaming video games.', 'Seoul, South Korea', 'Dancing, Fashion, Gaming', 'Beginner', 60, 0, 20, 'Asia', 'K-pop, fashion, gaming');
  });

  // Give small delay for bcrypt hashes
  setTimeout(() => {
    res.json({ message: 'Database clean reset and seeds complete!' });
  }, 400);
});


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
      `INSERT INTO users (username, email, password, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        interest_tags || ''
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
            is_premium: user.is_premium,
            age: user.age,
            region: user.region,
            interest_tags: user.interest_tags
          }
        });
      });
    }
  );
});

// Get Current Logged-in User Profile
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags FROM users WHERE id = ?',
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

// ---------------- USER DIRECTORY (WITH ENHANCED SEARCH FILTERS) ----------------

app.get('/api/directory', authenticateToken, (req, res) => {
  // Query parameters for filters
  const { filterAge, filterRegion, filterInterests } = req.query;

  db.get(
    'SELECT native_language, target_language, profile_location, hobbies, proficiency_level, interest_tags FROM users WHERE id = ?',
    [req.user.id],
    (err, currentUser) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!currentUser) return res.status(404).json({ error: 'User not found' });

      // Fetch all other users
      db.all(
        'SELECT id, username, name, native_language, target_language, bio, profile_location, hobbies, proficiency_level, xp, is_premium, age, region, interest_tags FROM users WHERE id != ?',
        [req.user.id],
        (err, otherUsers) => {
          if (err) return res.status(500).json({ error: err.message });

          // Map and calculate match score for each user
          let matchedUsers = otherUsers.map(user => {
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

            // 3. +20% if they share at least one hobby/interest tag
            const myHobbiesAndTags = [
              ...(currentUser.hobbies || '').split(','),
              ...(currentUser.interest_tags || '').split(',')
            ].map(h => h.trim().toLowerCase()).filter(h => h);

            const partnerHobbiesAndTags = [
              ...(user.hobbies || '').split(','),
              ...(user.interest_tags || '').split(',')
            ].map(h => h.trim().toLowerCase()).filter(h => h);

            const shared = myHobbiesAndTags.some(tag => partnerHobbiesAndTags.includes(tag));
            if (shared) {
              score += 20;
            }

            // 4. +10% if their proficiency_level matches
            if (
              currentUser.proficiency_level && user.proficiency_level &&
              currentUser.proficiency_level.trim().toLowerCase() === user.proficiency_level.trim().toLowerCase()
            ) {
              score += 10;
            }

            const partnerLocale = LANGUAGE_LOCALES[user.native_language] || 'en-US';

            return {
              ...user,
              match_score: score,
              partner_locale: partnerLocale
            };
          });

          // Apply Server-side Filters
          if (filterAge && filterAge !== 'all') {
            const range = filterAge.split('-');
            const minAge = parseInt(range[0]);
            const maxAge = parseInt(range[1]) || 120;
            matchedUsers = matchedUsers.filter(u => u.age >= minAge && u.age <= maxAge);
          }

          if (filterRegion && filterRegion !== 'all') {
            matchedUsers = matchedUsers.filter(u => u.region && u.region.toLowerCase() === filterRegion.toLowerCase());
          }

          if (filterInterests && filterInterests !== '') {
            const queryInterest = filterInterests.toLowerCase().trim();
            matchedUsers = matchedUsers.filter(u => {
              const uTags = `${u.hobbies || ''}, ${u.interest_tags || ''}`.toLowerCase();
              return uTags.includes(queryInterest);
            });
          }

          // Sort by highest match score
          matchedUsers.sort((a, b) => b.match_score - a.match_score);

          res.json(matchedUsers);
        }
      );
    }
  );
});

// ---------------- LOCAL SIMULATED TRANSLATION LOOP (ZERO APIS) ----------------

const TRANSLATION_DICTIONARY = {
  // English to Spanish
  "how are you": { translation: "¿Cómo estás?", transliteration: "Coh-moh ehs-tahs?" },
  "how are you?": { translation: "¿Cómo estás?", transliteration: "Coh-moh ehs-tahs?" },
  "thank you": { translation: "Gracias", transliteration: "Grah-syahs" },
  "thank you!": { translation: "Gracias", transliteration: "Grah-syahs" },
  "hello": { translation: "Hola", transliteration: "Oh-lah" },
  "good morning": { translation: "Buenos días", transliteration: "Bweh-nohs dee-ahs" },
  "goodbye": { translation: "Adiós", transliteration: "Ah-dyohs" },

  // Spanish to English
  "como estas": { translation: "how are you?", transliteration: "how are you?" },
  "¿cómo estás?": { translation: "how are you?", transliteration: "how are you?" },
  "gracias": { translation: "thank you", transliteration: "thank you" },
  "hola": { translation: "hello", transliteration: "hello" },

  // English to Japanese
  "good afternoon": { translation: "こんにちは", transliteration: "Konnichiwa" },
  "excuse me": { translation: "すみません", transliteration: "Sumimasen" },

  // English to Chinese
  "nice to meet you": { translation: "很高兴认识你", transliteration: "Hěn gāoxìng rènshí nǐ" }
};

app.post('/api/translate', authenticateToken, (req, res) => {
  const { text, target_language } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text to translate is required.' });
  }

  const cleanText = text.toLowerCase().trim();
  let result = TRANSLATION_DICTIONARY[cleanText];

  // If not found in static dictionary, generate simulated high-fidelity translation
  if (!result) {
    // Generate simulated Romaji/Pinyin/character output depending on target language
    if (target_language === 'Japanese') {
      result = {
        translation: `[JP] ${text} です`,
        transliteration: `Desu ${text.replace(/[aeiou]/gi, 'u')}`
      };
    } else if (target_language === 'Chinese') {
      result = {
        translation: `[ZH] 传 ${text}`,
        transliteration: `Chuán ${text}`
      };
    } else if (target_language === 'Spanish') {
      result = {
        translation: `[ES] El ${text}o`,
        transliteration: `El ${text}o`
      };
    } else {
      result = {
        translation: `[Simulated ${target_language}] ${text}`,
        transliteration: `${text} (Transliteration)`
      };
    }
  }

  res.json({
    original: text,
    translated: result.translation,
    transliteration: result.transliteration
  });
});

// ---------------- MOMENTS FEED & COMMUNITY CORRECTIONS ----------------

// Create a Moment
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

      // Automatically grant +10 XP
      grantXP(req.user.id, 10, (err) => {
        if (err) console.error('Error granting moment XP:', err);
        res.status(201).json({ id: momentId, message: 'Moment posted successfully!' });
      });
    }
  );
});

// Fetch Moments with Corrections
app.get('/api/moments', authenticateToken, (req, res) => {
  db.all(
    `SELECT m.*, u.username, u.name, u.xp, u.is_premium FROM moments m
     JOIN users u ON m.user_id = u.id
     ORDER BY m.timestamp DESC`,
    [],
    (err, moments) => {
      if (err) return res.status(500).json({ error: err.message });

      // Fetch comments, likes, and corrections
      db.all('SELECT * FROM moment_comments ORDER BY timestamp ASC', [], (err, comments) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT * FROM moment_likes', [], (err, likes) => {
          if (err) return res.status(500).json({ error: err.message });

          db.all('SELECT * FROM moment_corrections ORDER BY timestamp ASC', [], (err, corrections) => {
            if (err) return res.status(500).json({ error: err.message });

            const momentsWithDetails = moments.map(m => {
              const mComments = comments.filter(c => c.moment_id === m.id);
              const mLikes = likes.filter(l => l.moment_id === m.id);
              const mCorrections = corrections.filter(c => c.moment_id === m.id);
              const isLikedByMe = mLikes.some(l => l.user_id === req.user.id);
              return {
                ...m,
                comments: mComments,
                likes: mLikes,
                corrections: mCorrections,
                is_liked_by_me: isLikedByMe
              };
            });

            res.json(momentsWithDetails);
          });
        });
      });
    }
  );
});

// Post a Moment Grammar Correction (+10 XP)
app.post('/api/moments/:id/corrections', authenticateToken, (req, res) => {
  const momentId = req.params.id;
  const { original_text, corrected_text } = req.body;

  if (!original_text || !corrected_text) {
    return res.status(400).json({ error: 'Original and corrected texts are required.' });
  }

  // Retrieve corrector's display name from database before inserting
  db.get('SELECT name FROM users WHERE id = ?', [req.user.id], (err, corrector) => {
    if (err || !corrector) {
      return res.status(500).json({ error: 'Failed to retrieve corrector profile name.' });
    }

    db.run(
      `INSERT INTO moment_corrections (moment_id, corrector_id, corrector_name, original_text, corrected_text)
       VALUES (?, ?, ?, ?, ?)`,
      [momentId, req.user.id, corrector.name, original_text, corrected_text],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        grantXP(req.user.id, 10, (err) => {
          if (err) console.error('Error granting moment correction XP:', err);
          res.status(201).json({ message: 'Community grammar correction submitted!' });
        });
      }
    );
  });
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

// ---------------- CHAT & CORRECTIONS ----------------

// Fetch Messages
app.get('/api/chat/:partnerId', authenticateToken, (req, res) => {
  const partnerId = req.params.partnerId;
  const userId = req.user.id;

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

// Post a Message
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

      grantXP(req.user.id, 10, (err) => {
        if (err) console.error('Error granting message XP:', err);
        res.status(201).json({ id: messageId, message: 'Message sent successfully!' });
      });
    }
  );
});

// Sentence Correction Endpoint
app.post('/api/corrections', authenticateToken, (req, res) => {
  const { message_id, original_text, corrected_text } = req.body;

  if (!message_id || !original_text || !corrected_text) {
    return res.status(400).json({ error: 'Required fields missing for correction.' });
  }

  const today = getLocalDateString();

  db.get('SELECT is_premium FROM users WHERE id = ?', [req.user.id], (err, currentUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    if (currentUser.is_premium) {
      insertCorrection();
    } else {
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

        grantXP(req.user.id, 10, (err) => {
          if (err) console.error('Error granting correction XP:', err);
          res.status(201).json({ message: 'Sentence correction saved successfully (+10 XP granted!)' });
        });
      }
    );
  }
});

// WebRTC calling limit tracker
app.post('/api/calls/initiate', authenticateToken, (req, res) => {
  const today = getLocalDateString();

  db.get('SELECT is_premium FROM users WHERE id = ?', [req.user.id], (err, currentUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    if (currentUser.is_premium) {
      return res.json({ message: 'WebRTC call initialized (Premium Unlimited)' });
    } else {
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

// Limits State
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

// Leaderboard
app.get('/api/leaderboard', authenticateToken, (req, res) => {
  db.all(
    'SELECT username, xp, native_language, target_language FROM users ORDER BY xp DESC LIMIT 10',
    [],
    (err, rows) => {
      if (err) {
        console.error('Leaderboard fetch database error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// AI Tutor Scenario Roleplay
app.post('/api/ai-tutor/chat', authenticateToken, (req, res) => {
  const { scenario, language, message } = req.body;
  if (!scenario || !language || !message) {
    return res.status(400).json({ error: 'Scenario, language, and user message are required.' });
  }

  let tutorReply = '';
  let tutorFeedback = '';

  const msgLower = message.toLowerCase();

  if (scenario.includes('Tokyo') || language.toLowerCase() === 'japanese') {
    tutorReply = "いらっしゃいませ！ご注文はお決まりですか？ (Welcome! Are you ready to order?)";
    if (msgLower.includes('kohi') || msgLower.includes('coffee')) {
      tutorFeedback = "Grammar feedback: Great use of 'コーヒー' (ko-hi-). Tip: Use '〜をください' (onegaishimasu) to politely ask for items.";
    } else {
      tutorFeedback = "Grammar feedback: You used Japanese characters well! Tip: Practice saying 'Kore o kudasai' (Please give me this) to order easily.";
    }
  } else if (scenario.includes('Berlin') || language.toLowerCase() === 'german') {
    tutorReply = "Guten Tag! Willkommen bei unserem Vorstellungsgespräch. Warum möchten Sie bei uns arbeiten?";
    if (msgLower.includes('ich') || msgLower.includes('arbeit')) {
      tutorFeedback = "Grammar feedback: Your sentence structure is grammatically correct! Tip: Remember that German nouns are always capitalized.";
    } else {
      tutorFeedback = "Grammar feedback: Good job attempting German interview dialogue! Tip: Use 'Ich bewerbe mich für...' (I am applying for...) to start off.";
    }
  } else if (scenario.includes('Paris') || language.toLowerCase() === 'french') {
    tutorReply = "Bonjour Monsieur/Madame, bienvenue à l'Hôtel de Paris. Avez-vous une réservation?";
    if (msgLower.includes('oui') || msgLower.includes('reser')) {
      tutorFeedback = "Grammar feedback: Excellent hotel vocabulary match! 'Une réservation' is feminine, so your agreement is perfect.";
    } else {
      tutorFeedback = "Grammar feedback: Natural French hotel interaction. Tip: Say 'Je voudrais une chambre, s'il vous plaît' (I would like a room, please).";
    }
  } else {
    tutorReply = "¡Hola! Bienvenidos a nuestra cafetería en Madrid. ¿Qué le pongo de beber?";
    if (msgLower.includes('caf') || msgLower.includes('favor')) {
      tutorFeedback = "Grammar feedback: Your Spanish restaurant structure flows incredibly naturally. Spanish coffee is unmatched!";
    } else {
      tutorFeedback = "Grammar feedback: Excellent effort! Tip: Use 'Quisiera un café solo, por favor' to order like a local Madrid resident.";
    }
  }

  // Grant user 10 XP
  grantXP(req.user.id, 10, (err) => {
    if (err) console.error('Error granting AI Tutor user XP:', err);
    res.json({
      reply: tutorReply,
      feedback: tutorFeedback
    });
  });
});

// AI Language Coach
app.post('/api/chat/ai', authenticateToken, (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  db.get("SELECT id FROM users WHERE username = 'AI Coach'", [], (err, coach) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!coach) return res.status(404).json({ error: 'AI Coach system seed user not found.' });

    const aiCoachId = coach.id;
    const humanUserId = req.user.id;

    db.run(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [humanUserId, aiCoachId, content],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        grantXP(humanUserId, 10, (err) => {
          if (err) console.error('Error granting AI chat user XP:', err);

          res.json({ message: 'User message processed (+10 XP granted!)', coach_id: aiCoachId });

          let reply = '';
          const msgLower = content.toLowerCase();

          if (msgLower.includes('hola') || msgLower.includes('como') || msgLower.includes('espanol') || msgLower.includes('gracias')) {
            reply = "¡Excelente esfuerzo! Your pronunciation and sentence structure look great. Quick tip: Remember that nouns ending in -a are usually feminine in Spanish! ¿De qué te gustaría hablar hoy?";
          } else if (msgLower.includes('bonjour') || msgLower.includes('comment') || msgLower.includes('francais')) {
            reply = "Formidable! You are articulating beautifully. Quick tip: In French, the letter 'h' is silent and vowels blend wonderfully. Qu'est-ce que vous aimez faire pendant votre temps libre?";
          } else if (msgLower.includes('hello') || msgLower.includes('english') || msgLower.includes('thank')) {
            reply = "Marvelous job! Your English sentence flow is highly natural. Quick tip: Practice using idioms to sound even more like a native speaker! What hobbies make you the happiest?";
          } else {
            reply = "Incredible dedication to language learning! You are doing amazing. Quick tip: Try speaking out loud to build muscle memory! What is your favorite learning goal for this week?";
          }

          setTimeout(() => {
            db.run(
              'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
              [aiCoachId, humanUserId, reply],
              function(err) {
                if (err) console.error('Error inserting AI Coach response:', err);
              }
            );
          }, 2000);
        });
      }
    );
  });
});

// Wildcard routing to SPA index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------- WEBRTC WEBSOCKET SIGNALING & LIVE REAL-TIME CHAT ORCHESTRATION ----------------
const activeSockets = {}; // Mapping of user_id -> socket.id

// Keep track of active Voicerooms
const voicerooms = {};

io.on('connection', (socket) => {
  console.log('A user connected via socket:', socket.id);

  socket.on('register-socket', (userId) => {
    if (userId) {
      activeSockets[userId] = socket.id;
      socket.userId = userId;
      console.log(`Registered user_id ${userId} to socket_id ${socket.id}`);
    }
  });

  // Call routing: 'call-user'
  socket.on('call-user', (data) => {
    const targetSocketId = activeSockets[data.to];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-made', {
        offer: data.offer,
        socket: socket.id,
        from: socket.userId
      });
    } else {
      socket.emit('call-error', { message: 'Target user is offline or not connected to signaling.' });
    }
  });

  // Answer routing: 'make-answer'
  socket.on('make-answer', (data) => {
    const targetSocketId = activeSockets[data.to];
    if (targetSocketId) {
      io.to(targetSocketId).emit('answer-made', {
        socket: socket.id,
        answer: data.answer
      });
    }
  });

  // ICE Candidate routing
  socket.on('ice-candidate', (data) => {
    const targetSocketId = activeSockets[data.to];
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate-relay', {
        candidate: data.candidate
      });
    }
  });

  // Call termination event relay
  socket.on('end-call', (data) => {
    const targetSocketId = activeSockets[data.to];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended');
    }
  });

  // ---------------- LIVE REAL-TIME PRIVATE CHAT SIGNALING ----------------
  socket.on('private-message', (data) => {
    const senderId = socket.userId;
    const receiverId = data.to;
    const content = data.content;

    if (!senderId || !receiverId || !content) return;

    // 1. Insert message to SQLite
    db.run(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [senderId, receiverId, content],
      function(err) {
        if (err) {
          console.error('Socket private-message insertion error:', err.message);
          return;
        }
        const messageId = this.lastID;

        // 2. Grant +10 XP to sender
        grantXP(senderId, 10, (err) => {
          if (err) console.error('Error granting message XP:', err);

          const messageModel = {
            id: messageId,
            sender_id: senderId,
            receiver_id: receiverId,
            content: content,
            timestamp: new Date().toISOString()
          };

          // 3. Relay back to sender socket instantly
          socket.emit('message-relay', messageModel);

          // 4. Relay to receiver socket instantly if online
          const receiverSocketId = activeSockets[receiverId];
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('message-relay', messageModel);
          }

          // 5. Special AI Coach handling
          db.get("SELECT id FROM users WHERE username = 'AI Coach'", [], (err, coach) => {
            if (!err && coach && parseInt(receiverId) === coach.id) {
              const aiCoachId = coach.id;

              // Generate AI response
              let reply = '';
              const msgLower = content.toLowerCase();
              if (msgLower.includes('hola') || msgLower.includes('como') || msgLower.includes('espanol') || msgLower.includes('gracias')) {
                reply = "¡Excelente esfuerzo! Your pronunciation and sentence structure look great. Quick tip: Remember that nouns ending in -a are usually feminine in Spanish! ¿De qué te gustaría hablar hoy?";
              } else if (msgLower.includes('bonjour') || msgLower.includes('comment') || msgLower.includes('francais')) {
                reply = "Formidable! You are articulating beautifully. Quick tip: In French, the letter 'h' is silent and vowels blend wonderfully. Qu'est-ce que vous aimez faire pendant votre temps libre?";
              } else if (msgLower.includes('hello') || msgLower.includes('english') || msgLower.includes('thank')) {
                reply = "Marvelous job! Your English sentence flow is highly natural. Quick tip: Practice using idioms to sound even more like a native speaker! What hobbies make you the happiest?";
              } else {
                reply = "Incredible dedication to language learning! You are doing amazing. Quick tip: Try speaking out loud to build muscle memory! What is your favorite learning goal for this week?";
              }

              // Delay reply by 2 seconds
              setTimeout(() => {
                db.run(
                  'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
                  [aiCoachId, senderId, reply],
                  function(err) {
                    if (err) {
                      console.error('Error inserting AI Coach response:', err);
                      return;
                    }
                    const aiMessageModel = {
                      id: this.lastID,
                      sender_id: aiCoachId,
                      receiver_id: senderId,
                      content: reply,
                      timestamp: new Date().toISOString()
                    };
                    // Emit back to sender
                    socket.emit('message-relay', aiMessageModel);
                  }
                );
              }, 2000);
            }
          });
        }
      );
    });
  });

  // ---------------- VOICEROOMS SIGNALS ----------------

  socket.on('voiceroom-join', ({ roomName, username }) => {
    socket.join(roomName);
    socket.roomName = roomName;
    socket.username = username;

    if (!voicerooms[roomName]) {
      voicerooms[roomName] = {
        hostId: socket.userId,
        members: []
      };
    }

    const alreadyJoined = voicerooms[roomName].members.some(m => m.userId === socket.userId);
    if (!alreadyJoined) {
      voicerooms[roomName].members.push({
        userId: socket.userId,
        username: username,
        socketId: socket.id,
        status: voicerooms[roomName].hostId === socket.userId ? 'panel' : 'audience',
        isMuted: false
      });
    }

    // Broadcast updated room state
    io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
    console.log(`Socket ${socket.id} (User ${username}) joined voiceroom: ${roomName}`);
  });

  socket.on('voiceroom-toggle-mute', ({ isMuted }) => {
    const roomName = socket.roomName;
    if (roomName && voicerooms[roomName]) {
      const member = voicerooms[roomName].members.find(m => m.socketId === socket.id);
      if (member) {
        member.isMuted = !!isMuted;
        io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
      }
    }
  });

  socket.on('voiceroom-raise-hand', () => {
    const roomName = socket.roomName;
    if (roomName && voicerooms[roomName]) {
      const member = voicerooms[roomName].members.find(m => m.socketId === socket.id);
      if (member && member.status === 'audience') {
        member.status = 'hand-raised';
        io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
      }
    }
  });

  socket.on('voiceroom-approve-speaker', ({ targetSocketId }) => {
    const roomName = socket.roomName;
    if (roomName && voicerooms[roomName]) {
      // Ensure only host can approve
      if (voicerooms[roomName].hostId === socket.userId) {
        const member = voicerooms[roomName].members.find(m => m.socketId === targetSocketId);
        if (member) {
          member.status = 'panel';
          io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
          // Direct signal to approved socket to establish WebRTC connections if applicable
          io.to(targetSocketId).emit('voiceroom-approved');
        }
      }
    }
  });

  socket.on('voiceroom-leave', () => {
    handleVoiceroomLeave(socket);
  });

  // Cleanup on socket disconnection
  socket.on('disconnect', () => {
    console.log('User socket disconnected:', socket.id);
    if (socket.userId && activeSockets[socket.userId] === socket.id) {
      delete activeSockets[socket.userId];
    }
    handleVoiceroomLeave(socket);
  });
});

function handleVoiceroomLeave(socket) {
  const roomName = socket.roomName;
  if (roomName && voicerooms[roomName]) {
    voicerooms[roomName].members = voicerooms[roomName].members.filter(m => m.socketId !== socket.id);

    // If room becomes empty, tear it down
    if (voicerooms[roomName].members.length === 0) {
      delete voicerooms[roomName];
    } else {
      // If host left, designate next member as host
      if (voicerooms[roomName].hostId === socket.userId) {
        voicerooms[roomName].hostId = voicerooms[roomName].members[0].userId;
        voicerooms[roomName].members[0].status = 'panel';
      }
      io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
    }
    socket.leave(roomName);
    socket.roomName = null;
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`GlobalTalk platform running on http://localhost:${PORT}`);
});
