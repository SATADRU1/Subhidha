/**
 * Gemini API service for Subhidha chatbot
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const MODEL_NAME = 'models/gemini-flash-latest';

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_CONTEXT = `You are Subhidha, a Smart Urban Virtual Interactive Digital Helpdesk Assistant.

You help citizens with:
- Electricity, Water, Gas, and Air Quality services
- Viewing and paying bills
- Filing complaints and tracking service requests

Reply politely, clearly, and in the same language as the user (English or Hindi).
If account-specific data is missing, guide the user to the app features or support.`;

export async function sendToGemini(
  userMessage: string,
  history: { role: 'user' | 'model'; text: string }[]
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return 'Missing Gemini API key. Add EXPO_PUBLIC_GEMINI_API_KEY to .env';
  }

  try {
    const contents = [
      ...history.slice(-10).map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_CONTEXT }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'Sorry, I could not generate a response.'
    );
  } catch (err: any) {
    console.error('Gemini error:', err.message);
    return `Gemini error: ${err.message}`;
  }
}
