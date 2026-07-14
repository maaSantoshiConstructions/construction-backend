import { GoogleGenerativeAI } from '@google/generative-ai';

let model = null;
let initialized = false;

const ensureInitialized = () => {
  if (initialized) return;
  initialized = true;

  const key = process.env.GEMINI_API_KEY;
  if (key) {
    const genAI = new GoogleGenerativeAI(key);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('[Gemini] Initialized with API key');
  } else {
    console.log('[Gemini] No API key found — rule-based fallback only');
  }
};

const buildPrompt = (preferences, plots) => {
  const { budget, location, propertyType, purpose } = preferences;

  const plotData = plots.map((p, i) => {
    const proj = p.project || {};
    const loc = proj.location || {};
    return {
      index: i,
      plotNumber: p.plotNumber || 'Unknown',
      size: p.size || 0,
      price: p.price || 0,
      facing: p.facing || 'Unknown',
      corner: p.corner || false,
      roadWidth: p.roadWidth || 0,
      projectName: proj.name || 'Unknown',
      city: loc.city || 'Unknown',
      projectStatus: proj.status || 'unknown',
      amenities: proj.amenities || [],
      reraRegistered: !!proj.reraNumber,
      pricePerSqft: p.pricePerSqft || 0,
    };
  });

  return `You are an expert real estate recommendation AI for Jai Santoshi Maa Infrastructure, a trusted property developer in Odisha, India.

Analyze the following user preferences and available plots, then recommend the best matches.

## User Preferences
- Budget: ${budget || 'Not specified'}
- Preferred Location: ${location || 'Any'}
- Property Type: ${propertyType || 'Any'}
- Purchase Purpose: ${purpose || 'Any'}

## Available Plots (JSON array)
${JSON.stringify(plotData, null, 0)}

## Your Task
1. Evaluate each plot against the user's preferences.
2. Score each plot from 0-100 based on how well it matches.
3. Provide 2-3 short, specific match reasons per plot (mention real details like price, facing, location, amenities, RERA status).
4. Only include plots with score >= 40.
5. Sort by score descending.
6. Return a MAXIMUM of 8 plots.

## Scoring Guidelines
- Price fit within budget: up to 25 pts
- Location match: up to 20 pts
- Facing direction (NE/E/N preferred): up to 10 pts
- Corner plot: up to 10 pts
- Wide road (30ft+): up to 8 pts
- Project status (ongoing = early advantage, completed = ready): up to 7 pts
- RERA registered: up to 5 pts
- Amenities count (5+): up to 5 pts
- Investment potential (low price/sqft): up to 5 pts
- Spacious plot for self-use (1200+ sqft): up to 5 pts

## Response Format
Return ONLY a valid JSON array. No markdown, no explanation, no text outside the array.
Each element must have: { "index": number, "score": number, "matchReasons": ["reason1", "reason2"] }

Example:
[{"index":0,"score":85,"matchReasons":["₹9.5L within budget — excellent value","North-East facing — premium direction","RERA registered project"]}]`;
};

export const getGeminiRecommendations = async (preferences, plots) => {
  ensureInitialized();

  if (!model) {
    return null;
  }

  try {
    const prompt = buildPrompt(preferences, plots);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[Gemini] No JSON array in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    const validated = parsed
      .filter((item) => item.index >= 0 && item.index < plots.length && typeof item.score === 'number')
      .map((item) => ({
        plotIndex: item.index,
        score: Math.min(Math.max(Math.round(item.score), 0), 100),
        matchReasons: Array.isArray(item.matchReasons) ? item.matchReasons.slice(0, 3) : ['Good match based on preferences'],
      }));

    return validated.length > 0 ? validated : null;
  } catch (err) {
    console.error('[Gemini] Error:', err.message);
    return null;
  }
};
