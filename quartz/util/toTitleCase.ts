const replacements = {
  "Quantum Os" : "Quantum OS",
  " Ai" : " AI",
  "Ai " : "AI ",
  " Api" : " API",
  "Api " : "API ",
  "Imatch" : "IMatch",
  " Qa" : " QA",
  "Qa " : "QA ",
  "Vr2" : "VR2",
  "Thebrain" : "TheBrain",
  "Personalbrain" : "PersonalBrain"
 };

function replaceFixedWords(input: string, map: Record<string, string>): string {
  let output = input;

  for (const [key, value] of Object.entries(map)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    output = output.replace(regex, value);
  }

  return output;
}

export function toTitleCase(str : string) {
  const smallWords = new Set([
    "a", "an", "and", "as", "at", "but", "by", "for", "from",
    "in", "into", "nor", "of", "on", "or", "over", "per",
    "the", "to", "via", "with"
  ]);

  const words = str.toLowerCase().split(/\s+/); 

  const title = words
   .map((rawWord, index) => { 
      const isFirst = index === 0; 
      const isLast = index === words.length - 1; 
      
      // leading punctuation | core | trailing punctuation 
      const match = rawWord.match(/^([^A-Za-z0-9']*)([A-Za-z0-9'-]+)([^A-Za-z0-9']*)$/); 
      if (!match) return rawWord; 
      
      const [, leading, core, trailing] = match; 

      // Handle hyphenated words inside the core 
      const parts = core.split("-"); 
      const casedParts = parts.map((part, i) => { 
        const lower = part.toLowerCase(); 
        const isSmall = !isFirst && !isLast && smallWords.has(lower) && i === 0; // only treat the *first* segment as a small word 
        
        if (isSmall) return lower; 
        
        return lower.charAt(0).toUpperCase() + lower.slice(1); 
    }); 
    
    const casedCore = casedParts.join("-"); 
    
    return `${leading}${casedCore}${trailing}`; 
  })
  .join(" ");
  
  // const title = words .map((rawWord, index) => { 
  //   const isFirst = index === 0; 
  //   const isLast = index === words.length - 1; 
  //   // Split into: leading punctuation, core word, trailing punctuation 
  //   const match = rawWord.match(/^([^A-Za-z0-9']*)([A-Za-z0-9']+)([^A-Za-z0-9']*)$/); 
    
  //   // If it’s all punctuation or empty, just return as-is 
  //   if (!match) return rawWord; 
    
  //   const [, leading, core, trailing] = match; 
  //   const lowerCore = core.toLowerCase(); 
  //   let casedCore: string; 
  //   if (!isFirst && !isLast && smallWords.has(lowerCore)) { 
  //     // Middle “small word” → keep lowercase 
  //     casedCore = lowerCore; 
  //   } else { 
  //     // Capitalize core word 
  //     casedCore = lowerCore.charAt(0).toUpperCase() + lowerCore.slice(1); 
  //   } return `${leading}${casedCore}${trailing}`; 
  // }) .join(" ");
  

  return replaceFixedWords(
    title,
    replacements
  )
}
