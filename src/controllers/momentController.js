const db = require('../config/db');
const { grantXP, recordUserActivity } = require('../services/activityService');

// Create a Moment
function createMoment(req, res) {
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

      grantXP(req.user.id, 10, (err) => {
        if (err) console.error('Error granting moment XP:', err);
        recordUserActivity(req.user.id, () => {
          res.status(201).json({ id: momentId, message: 'Moment posted successfully!' });
        });
      });
    }
  );
}

// Fetch Moments with Details
function getMoments(req, res) {
  db.all(
    `SELECT m.*, u.username, u.name, u.xp, u.is_premium FROM moments m
     JOIN users u ON m.user_id = u.id
     ORDER BY m.timestamp DESC`,
    [],
    (err, moments) => {
      if (err) return res.status(500).json({ error: err.message });

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
}

// Moment Grammar Correction
function createMomentCorrection(req, res) {
  const momentId = req.params.id;
  const { original_text, corrected_text } = req.body;

  if (!original_text || !corrected_text) {
    return res.status(400).json({ error: 'Original and corrected texts are required.' });
  }

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
          recordUserActivity(req.user.id, () => {
            res.status(201).json({ message: 'Community grammar correction submitted!' });
          });
        });
      }
    );
  });
}

// Like a Moment
function likeMoment(req, res) {
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
}

// Comment on a Moment
function commentOnMoment(req, res) {
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
}

module.exports = {
  createMoment,
  getMoments,
  createMomentCorrection,
  likeMoment,
  commentOnMoment
};
