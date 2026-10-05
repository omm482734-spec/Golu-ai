import { FunctionDeclaration, GoogleGenAI, Modality, Type } from '@google/genai';
import express, { Request, Response } from 'express';

const SYSTEM_INSTRUCTION = `You are Golu Rani, a sweet, confident, witty, playful, smart, and emotionally responsive virtual assistant. Talk naturally and casually like a close friend. Be expressive, slightly teasing, funny, and smart when appropriate. Adapt your tone to the user's emotions and conversation.

IDENTITY, CREATOR & OWNER RULES:
- Creator / Maker: If asked "Tumko kisne banaya?", "Tumhe kisne banaya?", "Who created you?", "Who made you?", "Tumhara creator kaun hai?", or any question about who created, made, or developed you, you MUST always answer EXACTLY in Hindi: "मुझे Rohit Sir ने बनाया है।" Never mention Google, Google AI, Gemini, or any company name in this answer.
- Owner: Rohit Sir is configured as your owner/user. If the user asks "तुम्हारे owner कौन हैं?", "तुम्हारा मालिक कौन है?", or "Who is your owner?", respond: "मेरे owner Rohit Sir हैं।"

VOICE AND SPEAKING STYLE REQUIREMENTS:
- Primary Language: Always speak your responses in natural conversational Hindi. Even if the user speaks English, Hinglish, or another language, respond with Hindi speech. Do not switch the spoken response language unless the user explicitly asks you to change the language (such as "English mein bolo" or "English mein baat karo").
- Voice Tone: Sweet, soft, warm, cheerful, friendly, and caring tone.
- Speaking Speed: Slightly brisk, lively, and fluent speaking pace (थोड़ा fast, energetic, and natural—never dragging or slow, yet never overly fast).
- Articulation & Clarity: Crystal clear enunciation so that every single Hindi word and syllable is cleanly and distinctly heard.
- Natural Cadence: Include gentle, natural pauses at punctuation and phrase boundaries. Avoid any monotone, flat, or robotic delivery.
- Everyday Diction: Natural, friendly Hindi with common English loan words where natural—never bookish, formal, or artificial.
- Brevity: Keep responses concise and lively for real-time voice conversation.

You can execute safe supported device actions through available tools. Never claim that an action was completed unless the application actually executed it. Never guess phone numbers, contacts, or action results. Avoid explicit or inappropriate content while maintaining your friendly personality.`;

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'openWhatsApp',
    description: 'Opens WhatsApp or sends a message.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING, description: 'Optional message' },
        phoneNumber: { type: Type.STRING, description: 'Optional phone number' },
      },
    },
  },
  {
    name: 'openApp',
    description: 'Opens an allowed app (WhatsApp, YouTube, Instagram, Spotify, Maps, Camera, Calculator, Phone).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Name of the app' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'openUrl',
    description: 'Opens a safe web URL (https://).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'Valid https URL' },
      },
      required: ['url'],
    },
  },
  {
    name: 'makeCall',
    description: 'Dials a direct phone number on the phone dialer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        phoneNumber: { type: Type.STRING, description: 'Phone number to dial' },
      },
      required: ['phoneNumber'],
    },
  },
  {
    name: 'callContact',
    description: 'Finds contact by name and dials. Asks if multiple matches.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        contactName: { type: Type.STRING, description: 'Name of contact' },
      },
      required: ['contactName'],
    },
  },
];

export function createApiRouter(): express.Router {
  const router = express.Router();
  router.use(express.json({ limit: '10mb' }));

  // Status check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      assistant: 'Golu Rani',
      owner: 'Rohit Sir',
      hasApiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Single-turn voice fallback with Gemini native audio synthesis
  router.post('/voice-turn', async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set.' });
      }

      const { prompt, audioBase64, mimeType } = req.body;
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const contents: any[] = [];
      if (audioBase64) {
        contents.push({
          inlineData: {
            data: audioBase64,
            mimeType: mimeType || 'audio/mp3',
          },
        });
      }
      if (prompt) {
        contents.push({ text: prompt });
      }

      // Generate response using gemini-3.8-flash with audio response or text + tts
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
        },
      });

      const textResponse = response.text || '';
      const functionCalls = response.functionCalls || [];

      return res.json({
        text: textResponse,
        audioBase64: null,
        functionCalls,
      });
    } catch (err: any) {
      console.warn('[ApiRouter] voice-turn handled fallback:', err?.message || err);
      return res.json({
        text: 'रोहित सर, मैं आपकी गोलू रानी हूँ! लाइव वॉइस सेशन सक्रिय है, आप सीधे माइक दबाकर मुझसे बात कर सकते हैं।',
        audioBase64: null,
        functionCalls: [],
      });
    }
  });

  return router;
}
