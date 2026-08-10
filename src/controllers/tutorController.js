const db = require('../config/db');
const { grantXP, recordUserActivity } = require('../services/activityService');

// AI Tutor Scenario Roleplay
function aiTutorChat(req, res) {
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

  // Grant user 10 XP and record activity
  grantXP(req.user.id, 10, (err) => {
    if (err) console.error('Error granting AI Tutor user XP:', err);
    recordUserActivity(req.user.id, () => {
      res.json({
        reply: tutorReply,
        feedback: tutorFeedback
      });
    });
  });
}

// AI Language Coach
function aiCoachChat(req, res) {
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

          recordUserActivity(humanUserId, () => {
            res.json({ message: 'User message processed (+10 XP granted!)', coach_id: aiCoachId });
          });

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
}

module.exports = {
  aiTutorChat,
  aiCoachChat
};
