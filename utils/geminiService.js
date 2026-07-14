const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.1-8b-instruct';

let apiKey = null;
let keyChecked = false;

const ensureKey = () => {
  if (keyChecked) return;
  keyChecked = true;
  apiKey = process.env.NVIDIA_API_KEY || null;
  if (apiKey) {
    console.log('[NVIDIA] Recommendation AI enabled');
  } else {
    console.log('[NVIDIA] No API key — rule-based fallback for recommendations');
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
  ensureKey();

  if (!apiKey) {
    return null;
  }

  try {
    const prompt = buildPrompt(preferences, plots);

    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a real estate AI. Return only valid JSON arrays, no markdown or extra text.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[NVIDIA] Recommendation API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      console.error('[NVIDIA] Empty recommendation response');
      return null;
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[NVIDIA] No JSON array in recommendation response');
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
    console.error('[NVIDIA] Recommendation error:', err.message);
    return null;
  }
};
