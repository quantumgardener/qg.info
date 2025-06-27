(() => {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  const tryReplaceFlags = () => {
    const emojiFlags = document.querySelector('.tinylytics_countries.flags');
    const flagContainer = emojiFlags?.textContent || '';

    if (!emojiFlags || !flagContainer.trim()) {
      return false;
    }

    const emojiArray = Array.from(segmenter.segment(flagContainer), s => s.segment);
    const flagCodes = [];

    for (const emoji of emojiArray) {
      const codePoints = [...emoji].map(cp => cp.codePointAt(0));
      if (codePoints.length !== 2) continue;

      const code1 = codePoints[0] - 0x1F1E6 + 65;
      const code2 = codePoints[1] - 0x1F1E6 + 65;
      const countryCode = String.fromCharCode(code1) + String.fromCharCode(code2);
      flagCodes.push(countryCode);
    }

    emojiFlags.innerHTML = flagCodes.map(code =>
      `<img src="/static/flags/${code.toLowerCase()}.webp" alt="${code}" class="flag-icon">`
    ).join('');

    return true;
  };

  const interval = setInterval(() => {
    if (tryReplaceFlags()) {
      clearInterval(interval);
    }
  }, 300);
})();