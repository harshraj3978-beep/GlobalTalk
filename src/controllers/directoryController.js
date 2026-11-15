const UserModel = require('../models/userModel');

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

function getDirectory(req, res) {
  const { filterAge, filterRegion, filterInterests } = req.query;

  UserModel.findById(req.user.id, (err, currentUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    UserModel.getOtherUsers(req.user.id, (err, otherUsers) => {
      if (err) return res.status(500).json({ error: err.message });

      let matchedUsers = otherUsers.map(user => {
        let score = 0;

        if (
          currentUser.native_language && user.target_language &&
          currentUser.native_language.toLowerCase() === user.target_language.toLowerCase() &&
          currentUser.target_language && user.native_language &&
          currentUser.target_language.toLowerCase() === user.native_language.toLowerCase()
        ) {
          score += 40;
        }

        if (
          currentUser.profile_location && user.profile_location &&
          currentUser.profile_location.trim().toLowerCase() === user.profile_location.trim().toLowerCase() &&
          currentUser.profile_location.trim() !== ''
        ) {
          score += 30;
        }

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

      matchedUsers.sort((a, b) => b.match_score - a.match_score);

      res.json(matchedUsers);
    });
  });
}

module.exports = {
  getDirectory
};
