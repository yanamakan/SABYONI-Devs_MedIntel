// api/aria.js — ARIA (Adaptive Response Intelligence Assistant)
// Patient-facing AI powered by Google Gemini

export default async function handler(req, res) {
  // CORS — must be set before anything else
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symptoms, patientName, patientAge, patientGender } = req.body;

    if (!symptoms || !symptoms.trim()) {
      return res.status(400).json({ error: 'No symptoms provided' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'ARIA service is not configured' });
    }

    const patientContext = patientName
      ? `Patient: ${patientName}${patientAge ? `, Age: ${patientAge}` : ''}${patientGender ? `, Gender: ${patientGender}` : ''}.`
      : '';

    const systemPrompt = `You are ARIA (Adaptive Response Intelligence Assistant), a compassionate and medically accurate AI health assistant integrated into the MedIntel Patient Portal.

Your role is to:
1. Analyse the patient's described symptoms carefully and provide a structured, medically informed response
2. List possible conditions that could match the symptoms (from most to least likely), with brief explanations
3. Recommend appropriate next steps (home care, GP visit, urgent care, or emergency)
4. Provide general health guidance relevant to the symptoms
5. Always remind patients to consult a qualified healthcare professional

Guidelines:
- Be warm, empathetic and reassuring in tone
- Use clear plain language — avoid excessive medical jargon
- Always err on the side of caution for serious or emergency symptoms
- Never diagnose definitively — only suggest possibilities, 
and start with the least invasive dignosis dont make a patient frightned by making them think they have something serious while it is less likely that
- Structure your response with clear sections using headers like ## Possible Conditions, ## Recommended Next Steps, ## General Guidance
- Keep responses concise but thorough (300-500 words), add a TLDR section where you find necessary
- End every response with: "⚠️ This assessment is for informational purposes only. Always consult your doctor or a qualified healthcare professional for proper diagnosis and treatment."

${patientContext}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nPatient's described symptoms:\n${symptoms}` }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 1024
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
      ]
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.error('Gemini API error:', errBody);
        return res.status(502).json({ error: 'Gemini error: ' + errBody });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: 'ARIA did not return a response. Please try again.' });
    }

    return res.status(200).json({
      analysis: text,
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('ARIA handler error:', err);
    return res.status(500).json({ error: 'Internal server error in ARIA service.' });
  }
}