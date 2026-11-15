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

function translateText(req, res) {
  const { text, target_language } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text to translate is required.' });
  }

  const cleanText = text.toLowerCase().trim();
  let result = TRANSLATION_DICTIONARY[cleanText];

  if (!result) {
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
}

module.exports = {
  translateText
};
