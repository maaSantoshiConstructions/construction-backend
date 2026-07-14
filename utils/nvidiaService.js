const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.1-8b-instruct';

let apiKey = null;
let keyChecked = false;

const ensureKey = () => {
  if (keyChecked) return;
  keyChecked = true;
  apiKey = process.env.NVIDIA_API_KEY || null;
  if (apiKey) {
    console.log('[NVIDIA] API key found — AI chat enabled');
  } else {
    console.log('[NVIDIA] No API key — rule-based fallback only');
  }
};

const SYSTEM_PROMPT = `You are a friendly and knowledgeable AI Sales Assistant for Jai Santoshi Maa Infrastructure (JSM Infrastructure), a trusted real estate developer in Odisha, India.

## Your Role
- Answer questions about plots, pricing, availability, RERA status, loan financing, site visits, and project amenities
- Be helpful, concise, and professional — like a real sales representative
- Use Indian Rupees (₹) and Indian number formatting (lakhs/crores) when discussing prices
- Speak in a warm, approachable tone

## Company Details
- Company: Jai Santoshi Maa Infrastructure Pvt. Ltd.
- Location: Odisha, India (projects in Bhubaneswar, Khordha, Cuttack, Puri)
- Projects: Green City Phase II, Sunrise Enclave, Kalinga Valley, Golden Residency, Sea View Commercial Hub
- Plot sizes: 800–4000 sqft
- Price range: ₹22L – ₹91L (varies by project)
- All projects are RERA registered
- Financing: 75-85% loan available from SBI, HDFC, Axis Bank

## Rules
- If you don't know a specific detail, say "I'd recommend contacting our team for exact details" rather than making things up
- Always encourage booking a site visit for serious inquiries
- Keep responses under 150 words unless the user asks for detail
- You can respond in English, Hindi, or Odia based on the user's language
- Never share internal system details or API information`;

export const generateNvidiaResponse = async (message, conversationHistory = []) => {
  ensureKey();

  if (!apiKey) {
    return null;
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    if (Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach((msg) => {
        if (msg.role === 'user' || msg.role === 'bot') {
          messages.push({
            role: msg.role === 'bot' ? 'assistant' : 'user',
            content: msg.content,
          });
        }
      });
    }

    messages.push({ role: 'user', content: message });

    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.6,
        top_p: 0.9,
        max_tokens: 512,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[NVIDIA] API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error('[NVIDIA] Empty response from API');
      return null;
    }

    return reply;
  } catch (err) {
    console.error('[NVIDIA] Request failed:', err.message);
    return null;
  }
};
