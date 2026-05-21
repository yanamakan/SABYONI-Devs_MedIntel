import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { symptoms, patientName, patientAge, patientGender } = req.body;

    if (!symptoms || !symptoms.trim()) {
      return res.status(400).json({ error: 'No symptoms provided' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const patientContext = patientName
      ? `Patient: ${patientName}${patientAge ? `, Age: ${patientAge}` : ''}${patientGender ? `, Gender: ${patientGender}` : ''}.`
      : '';

    const prompt = `You are ARIA (Adaptive Response Intelligence Assistant), a compassionate and medically accurate AI health assistant integrated into the MedIntel Patient Portal.

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
- Never diagnose definitively — only suggest possibilities
- Structure your response with clear sections: ## Possible Conditions, ## Recommended Next Steps, ## General Guidance
- Keep responses concise but thorough (300-500 words)
- End every response with: "⚠️ This assessment is for informational purposes only. Always consult your doctor or a qualified healthcare professional for proper diagnosis and treatment."

${patientContext}

Patient's described symptoms:
${symptoms}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      return res.status(502).json({ error: 'ARIA did not return a response. Please try again.' });
    }

    return res.status(200).json({
      analysis: text,
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('ARIA handler error:', err.message);
    return res.status(500).json({ error: 'ARIA error: ' + err.message });
  }
}