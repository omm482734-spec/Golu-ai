import { FunctionDeclaration, GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';

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

const LIVE_TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: 'openWhatsApp',
        description: 'Opens WhatsApp or opens a direct chat with an optional message or phone number.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description: 'Optional pre-filled message text to send.',
            },
            phoneNumber: {
              type: Type.STRING,
              description: 'Optional phone number with country code, e.g. +919876543210.',
            },
          },
        },
      },
      {
        name: 'openApp',
        description: 'Opens a supported installed app from the safe allowlist: WhatsApp, YouTube, Instagram, Spotify, Google Maps, Camera, Calculator, Phone.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            appName: {
              type: Type.STRING,
              description: 'The name of the application to open, e.g. YouTube, Instagram, WhatsApp, Spotify, Maps.',
            },
          },
          required: ['appName'],
        },
      },
      {
        name: 'openUrl',
        description: 'Safely opens a validated web URL (https://) in the browser or WebView.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: {
              type: Type.STRING,
              description: 'The full URL starting with http:// or https://',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'makeCall',
        description: 'Dials a direct phone number on the user device via the phone dialer.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            phoneNumber: {
              type: Type.STRING,
              description: 'The phone number to dial, e.g. +919876543210.',
            },
          },
          required: ['phoneNumber'],
        },
      },
      {
        name: 'callContact',
        description: 'Searches for a contact by name (e.g. Mummy, Papa, Rahul, Priya, Boss) and initiates a call. Does not guess numbers.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            contactName: {
              type: Type.STRING,
              description: 'Name or relationship of the person to call, e.g. "Mummy", "Papa", "Rahul", "Priya".',
            },
          },
          required: ['contactName'],
        },
      },
    ],
  },
];

function safeSend(ws: WebSocket | null, payload: any) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    ws.send(data, (err) => {
      if (err) {
        console.warn('[LiveServer] safeSend warning (suppressed):', err.message || err);
      }
    });
  } catch (err: any) {
    console.warn('[LiveServer] safeSend catch:', err?.message || err);
  }
}

export function setupLiveWebSocket(wss: WebSocketServer) {
  wss.on('error', (err) => {
    console.warn('[LiveServer] WebSocketServer error:', err?.message || err);
  });

  wss.on('connection', async (clientWs: WebSocket, req: IncomingMessage) => {
    // Immediately register clientWs error handler to prevent unhandled EventEmitter errors
    clientWs.on('error', (err) => {
      console.warn('[LiveServer] Client WS error handled:', err?.message || 'client socket error');
    });

    console.log('[LiveServer] Client connected to Golu Rani Live Socket from', req.socket.remoteAddress);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[LiveServer] Missing GEMINI_API_KEY environment variable');
      safeSend(clientWs, {
        type: 'error',
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let liveSession: any = null;
    let isLiveActive = false;

    // Handle messages from client
    clientWs.on('message', async (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());

        if (parsed.type === 'audio' && parsed.data) {
          // Client sent 16kHz PCM audio chunk
          if (liveSession && isLiveActive) {
            try {
              liveSession.sendRealtimeInput({
                audio: {
                  data: parsed.data,
                  mimeType: parsed.mimeType || 'audio/pcm;rate=16000',
                },
              });
            } catch (inputErr: any) {
              console.warn('[LiveServer] sendRealtimeInput warning:', inputErr?.message || inputErr);
            }
          }
        } else if (parsed.type === 'text' && parsed.text) {
          // Client sent text prompt to Gemini Live session
          if (liveSession && isLiveActive) {
            try {
              liveSession.sendClientContent({
                turns: [
                  {
                    role: 'user',
                    parts: [{ text: parsed.text }],
                  },
                ],
                turnComplete: true,
              });
            } catch (textErr: any) {
              console.warn('[LiveServer] sendClientContent warning:', textErr?.message || textErr);
            }
          }
        } else if (parsed.type === 'tool_response' && parsed.functionResponses) {
          // Client responded to function call
          console.log('[LiveServer] Sending tool response back to Gemini:', parsed.functionResponses);
          if (liveSession && isLiveActive) {
            try {
              liveSession.sendToolResponse({
                functionResponses: parsed.functionResponses,
              });
            } catch (toolErr: any) {
              console.warn('[LiveServer] sendToolResponse warning:', toolErr?.message || toolErr);
            }
          }
        } else if (parsed.type === 'ping') {
          safeSend(clientWs, { type: 'pong' });
        }
      } catch (err: any) {
        console.warn('[LiveServer] Error parsing client message:', err?.message || err);
      }
    });

    clientWs.on('close', () => {
      console.log('[LiveServer] Client disconnected, closing Live session...');
      isLiveActive = false;
      if (liveSession) {
        try {
          liveSession.close();
        } catch (e: any) {
          // ignore
        }
        liveSession = null;
      }
    });

    // Connect to Gemini Live
    try {
      console.log('[LiveServer] Connecting to Gemini Live with model gemini-3.8-live...');
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore', // Warm, cheerful, feminine persona for Golu Rani
              },
            },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: LIVE_TOOLS,
        },
        callbacks: {
          onopen: () => {
            console.log('[LiveServer] Live socket opened with Gemini backend');
          },
          onmessage: (message: LiveServerMessage) => {
            // Check for audio chunks
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  const audioBase64 = part.inlineData.data;
                  const mime = part.inlineData.mimeType || 'audio/pcm;rate=24000';
                  const rateMatch = mime.match(/rate=(\d+)/);
                  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
                  // Send audio chunk to client
                  safeSend(clientWs, {
                    type: 'audio',
                    audio: audioBase64,
                    mimeType: mime,
                    sampleRate: sampleRate,
                  });
                }
                if (part.text) {
                  // If model sends accompanying text/transcript
                  safeSend(clientWs, {
                    type: 'transcript',
                    text: part.text,
                    sender: 'assistant',
                  });
                }
              }
            }

            // Check for interruption signal
            if (message.serverContent?.interrupted) {
              console.log('[LiveServer] Model speech interrupted by user speech');
              safeSend(clientWs, { type: 'interrupted' });
            }

            // Check for turn complete
            if (message.serverContent?.turnComplete) {
              safeSend(clientWs, { type: 'turn_complete' });
            }

            // Check for tool calls
            const toolCall = message.toolCall;
            if (toolCall?.functionCalls && toolCall.functionCalls.length > 0) {
              console.log('[LiveServer] Received toolCall from Gemini:', toolCall.functionCalls);
              safeSend(clientWs, {
                type: 'tool_call',
                functionCalls: toolCall.functionCalls,
              });
            }
          },
          onclose: (event: any) => {
            console.log('[LiveServer] Gemini Live session closed cleanly');
            isLiveActive = false;
            safeSend(clientWs, { type: 'session_closed' });
          },
          onerror: (err: any) => {
            const msg = err?.message || 'Gemini Live Session encountered an issue.';
            console.warn('[LiveServer] Gemini Live session error:', msg);
            isLiveActive = false;
            safeSend(clientWs, {
              type: 'error',
              error: msg,
            });
          },
        },
      });

      isLiveActive = true;
      console.log('[LiveServer] Successfully connected to Gemini Live!');
      safeSend(clientWs, {
        type: 'connected',
        model: 'gemini-3.8-live',
        voice: 'Kore',
        owner: 'Rohit Sir',
        assistant: 'Golu Rani',
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn('[LiveServer] Failed to connect to Gemini Live:', errMsg);
      safeSend(clientWs, {
        type: 'error',
        error: `Live session connection: ${errMsg}`,
      });
    }
  });
}
