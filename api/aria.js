import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // ─────────────────────────────────────────────
  // CORS
  // ─────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    // ─────────────────────────────────────────────
    // REQUEST DATA
    // ─────────────────────────────────────────────
    const {
      symptoms,
      patientName,
      patientAge,
      patientGender
    } = req.body;

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────
    if (!symptoms || !symptoms.trim()) {
      return res.status(400).json({
        error: 'No symptoms provided'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY not configured'
      });
    }

    // ─────────────────────────────────────────────
    // PATIENT CONTEXT
    // ─────────────────────────────────────────────
    const patientContext = patientName
      ? `Patient: ${patientName}${
          patientAge ? `, Age: ${patientAge}` : ''
        }${
          patientGender ? `, Gender: ${patientGender}` : ''
        }.`
      : '';

    // ─────────────────────────────────────────────
    // AI PROMPT
    // ─────────────────────────────────────────────
    const prompt = `
You are ARIA (Adaptive Response Intelligence Assistant), a medical AI integrated into the MedIntel Patient Portal.

STRICT RULES:
- If the input is a greeting (hi, hello, hey, good morning, etc.) with no symptoms, respond with ONLY 1-2 sentences: a warm greeting and a prompt to describe their symptoms. Nothing else.
- You ONLY respond to medical symptoms, health conditions, or medication questions
- If the input is not health-related (random text, non-medical requests like generating websites or code), respond with ONLY:
"I can only assist with health-related concerns. Please describe your symptoms so I can help you."
- Never use the patient's name more than once
- Be concise — maximum 300 words total for medical responses
- Never pad responses with bullet point checklists or generic health tips

RESPONSE FORMAT for valid medical symptoms only:

## Possible Conditions
2-4 possibilities, one line each with a brief reason

## Recommended Next Steps
3 bullet points max — home care, GP visit, or emergency

## General Guidance
2-3 sentences directly relevant to the symptoms only

End with exactly:
⚠️ This assessment is for informational purposes only. Always consult your doctor or a qualified healthcare professional for proper diagnosis and treatment.

${patientContext}

Patient input: ${symptoms}
`;

    // ─────────────────────────────────────────────
    // PRIMARY MODEL: GEMINI
    // ─────────────────────────────────────────────
    try {
      const genAI = new GoogleGenerativeAI(
        process.env.GEMINI_API_KEY
      );

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
      });

      const result = await model.generateContent(prompt);

      const text = result.response.text();

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return res.status(200).json({
        analysis: text,
        model: 'gemini-2.5-flash',
        timestamp: new Date().toISOString()
      });

    } catch (geminiErr) {
      console.warn(
        'Gemini failed, falling back to Groq:',
        geminiErr.message
      );

      // ─────────────────────────────────────────────
      // GROQ FALLBACK CHECK
      // ─────────────────────────────────────────────
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({
          error: 'Both Gemini and Groq are unavailable.'
        });
      }

      // ─────────────────────────────────────────────
      // FALLBACK MODEL: GROQ
      // ─────────────────────────────────────────────
      try {
        const groqRes = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are ARIA, a medical AI assistant. Follow the exact prompt instructions provided by the user.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.4,
              max_tokens: 1024
            })
          }
        );

        // ─────────────────────────────────────────────
        // GROQ API ERROR
        // ─────────────────────────────────────────────
        if (!groqRes.ok) {
          const groqErr = await groqRes.text();

          console.error(
            'Groq fallback error:',
            groqErr
          );

          return res.status(503).json({
            error:
              'ARIA is temporarily unavailable. Please try again in a few minutes.'
          });
        }

        // ─────────────────────────────────────────────
        // GROQ RESPONSE
        // ─────────────────────────────────────────────
        const groqData = await groqRes.json();

        const groqText =
          groqData?.choices?.[0]?.message?.content;

        if (!groqText) {
          return res.status(502).json({
            error:
              'ARIA did not return a response. Please try again.'
          });
        }

        return res.status(200).json({
          analysis: groqText,
          model: 'groq-llama-3.3-70b',
          timestamp: new Date().toISOString()
        });

      } catch (groqFallbackErr) {
        console.error(
          'Groq fallback exception:',
          groqFallbackErr.message
        );

        return res.status(503).json({
          error:
            'ARIA is temporarily unavailable. Please try again shortly.'
        });
      }
    }

  } catch (err) {
    // ─────────────────────────────────────────────
    // GLOBAL ERROR HANDLER
    // ─────────────────────────────────────────────
    console.error(
      'ARIA handler error:',
      err.message
    );

    return res.status(500).json({
      error: 'ARIA error: ' + err.message
    });
  }
}