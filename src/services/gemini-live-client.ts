import { AssistantState, Contact, DeviceAction, LogEntry } from '../types/assistant';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  downsampleBuffer,
  floatTo16BitPCM,
  pcm16LeToFloat32,
  AudioPlaybackQueue,
} from '../utils/audio-processor';
import { DeviceActionHandler } from '../utils/android-bridge';

export interface LiveClientCallbacks {
  onStateChange: (state: AssistantState) => void;
  onLog: (log: LogEntry) => void;
  onTranscript: (text: string, sender: 'user' | 'assistant') => void;
  onAction: (action: DeviceAction) => void;
  onError: (error: string) => void;
  onAudioLevel?: (level: number) => void;
}

export class GeminiLiveClient {
  private state: AssistantState = 'IDLE';
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private playbackQueue: AudioPlaybackQueue;
  private actionHandler: DeviceActionHandler;
  private callbacks: LiveClientCallbacks;
  private isConnecting: boolean = false;
  private pingInterval: any = null;

  constructor(callbacks: LiveClientCallbacks) {
    this.callbacks = callbacks;
    this.playbackQueue = new AudioPlaybackQueue(
      (isPlaying) => {
        if (isPlaying && this.state !== 'SPEAKING') {
          this.setState('SPEAKING');
          this.addLog('AUDIO_OUT', 'Golu Rani smooth continuous playback started');
        } else if (!isPlaying && this.state === 'SPEAKING') {
          this.setState('LISTENING');
          this.addLog('AUDIO_OUT', 'Playback finished, listening to Rohit Sir');
        }
      },
      (diag) => {
        // Detailed technical chunk logging (Requirement 20)
        this.addLog(
          'AUDIO_OUT',
          `Chunk: MIME=${diag.mimeType} | ${diag.byteLength}B | ${diag.sampleRate}Hz | Ch=${diag.channels} | ${diag.sampleCount} samples | Start=${diag.scheduledStartTime.toFixed(3)}s | Dur=${(diag.duration * 1000).toFixed(1)}ms | QueueAhead=${(diag.queueRemainingDuration * 1000).toFixed(0)}ms`,
          diag
        );
      }
    );

    this.actionHandler = new DeviceActionHandler((action) => {
      this.callbacks.onAction(action);
      this.addLog('ACTION', `Device Action executed: ${action.type}`, action);
    });
  }

  public getState(): AssistantState {
    return this.state;
  }

  public getContacts(): Contact[] {
    return this.actionHandler.getContacts();
  }

  public updateContacts(contacts: Contact[]) {
    this.actionHandler.updateContacts(contacts);
  }

  private setState(state: AssistantState) {
    if (this.state !== state) {
      this.state = state;
      this.callbacks.onStateChange(state);
    }
  }

  private addLog(category: LogEntry['category'], message: string, details?: any) {
    console.log(`[${category}] ${message}`, details || '');
    this.callbacks.onLog({
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      category,
      message,
      details,
    });
  }

  /**
   * Diagnostic Speaker Test (440Hz Sine Tone)
   */
  public async testSpeaker(): Promise<boolean> {
    this.addLog('AUDIO_OUT', 'Speaker Diagnostic Test initiated (440Hz short tone)...');
    try {
      await this.playbackQueue.playTestTone();
      this.addLog('AUDIO_OUT', 'Speaker Diagnostic Test successful! Tone sent to speaker.');
      return true;
    } catch (err: any) {
      this.addLog('ERROR', 'Speaker Diagnostic Test failed: ' + (err?.message || err));
      return false;
    }
  }

  /**
   * Connect to Gemini Live & Start Real-time Microphone Pipeline
   */
  public async start(): Promise<void> {
    if (this.isConnecting || this.state === 'LISTENING' || this.state === 'SPEAKING') {
      return;
    }

    this.isConnecting = true;
    this.setState('CONNECTING');
    this.addLog('WS', 'Initializing Golu Rani voice pipeline for Rohit Sir...');

    try {
      // 1. Resume / Prepare Output AudioContext on user gesture
      await this.playbackQueue.resume();
      this.addLog('AUDIO_OUT', 'Output AudioContext verified & running at 24kHz');

      // 2. Connect WebSocket to backend Live proxy
      await this.connectWebSocket();

      // 3. Request Microphone Permission and start capture
      await this.startMicrophone();

      this.setState('LISTENING');
      this.addLog('MIC', 'Microphone active! Golu Rani is listening...');
    } catch (err: any) {
      console.error('Failed to start Live session:', err);
      this.setState('ERROR');
      this.callbacks.onError(err?.message || 'Could not start voice session');
      this.addLog('ERROR', 'Session start failed: ' + (err?.message || err));
      this.stop();
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Establish WebSocket connection
   */
  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      this.addLog('WS', `Connecting to WebSocket: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      let hasResolved = false;

      ws.onopen = () => {
        this.addLog('WS', 'WebSocket connection opened with server bridge');
        this.pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this.handleServerMessage(msg);
          if (!hasResolved && (msg.type === 'connected' || msg.type === 'audio')) {
            hasResolved = true;
            resolve();
          }
        } catch (e: any) {
          this.addLog('ERROR', 'Error parsing WebSocket message: ' + e?.message);
        }
      };

      ws.onerror = (err) => {
        this.addLog('ERROR', 'WebSocket error encountered', err);
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error('WebSocket connection failed to establish'));
        }
      };

      ws.onclose = (event) => {
        this.addLog('WS', `WebSocket closed (code: ${event.code}, reason: ${event.reason || 'normal'})`);
        clearInterval(this.pingInterval);
        if (this.state !== 'IDLE' && this.state !== 'ERROR') {
          this.setState('IDLE');
        }
      };

      // Timeout safety
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          // Even if 'connected' message hasn't arrived, proceed if socket is open
          if (ws.readyState === WebSocket.OPEN) {
            resolve();
          } else {
            reject(new Error('Connection timed out'));
          }
        }
      }, 7000);
    });
  }

  /**
   * Process messages received from the Gemini Live server
   */
  private async handleServerMessage(msg: any) {
    switch (msg.type) {
      case 'connected':
        this.addLog('GEMINI', `Gemini Live session connected (${msg.model}, Voice: ${msg.voice})`);
        break;

      case 'audio': {
        // Model native audio chunk
        const base64Data = msg.audio;
        if (!base64Data) return;

        try {
          // Enqueue chunk into jitter-buffered gapless player
          this.playbackQueue.enqueuePcmChunk(
            base64Data,
            msg.sampleRate || 24000,
            msg.mimeType || 'audio/pcm;rate=24000'
          );
        } catch (decErr: any) {
          this.addLog('ERROR', 'PCM Decoding error: ' + (decErr?.message || decErr));
        }
        break;
      }

      case 'transcript': {
        this.addLog('GEMINI', `Transcript: ${msg.text}`);
        this.callbacks.onTranscript(msg.text, msg.sender || 'assistant');
        break;
      }

      case 'interrupted': {
        this.addLog('AUDIO_OUT', 'User speech detected - Playback interrupted & audio queue cleared');
        this.playbackQueue.stopAndClear();
        this.setState('LISTENING');
        break;
      }

      case 'tool_call': {
        this.addLog('GEMINI', 'Tool Call received from Gemini Live', msg.functionCalls);
        const calls = msg.functionCalls || [];
        const responses = [];

        for (const call of calls) {
          const { name, args, id } = call;
          this.addLog('ACTION', `Executing safe device tool: ${name}`, args);
          const result = await this.actionHandler.executeTool(name, args || {});

          responses.push({
            name,
            id,
            response: {
              result: result.message,
              success: result.success,
              data: result.data || null,
            },
          });
        }

        // Send tool results back to Gemini Live
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.addLog('WS', 'Sending tool response back to Gemini Live', responses);
          try {
            this.ws.send(
              JSON.stringify({
                type: 'tool_response',
                functionResponses: responses,
              })
            );
          } catch (e: any) {
            this.addLog('ERROR', 'Error sending tool response: ' + e?.message);
          }
        }
        break;
      }

      case 'error': {
        this.addLog('ERROR', 'Gemini error: ' + msg.error);
        this.callbacks.onError(msg.error);
        break;
      }
    }
  }

  /**
   * Request Microphone & Setup 16kHz Streaming
   */
  private async startMicrophone(): Promise<void> {
    this.addLog('MIC', 'Microphone permission requested...');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    this.micStream = stream;
    this.addLog('MIC', 'Microphone permission granted! Starting AudioContext capture...');

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const inputCtx = new AudioCtx();
    this.inputAudioCtx = inputCtx;

    if (inputCtx.state === 'suspended') {
      await inputCtx.resume();
    }

    const source = inputCtx.createMediaStreamSource(stream);
    // 4096 sample buffer size
    const bufferSize = 4096;
    const processor = inputCtx.createScriptProcessor(bufferSize, 1, 1);
    this.scriptProcessor = processor;

    const sourceSampleRate = inputCtx.sampleRate;
    const targetSampleRate = 16000;

    processor.onaudioprocess = (e) => {
      if (this.state === 'IDLE' || this.state === 'ERROR') return;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Simple RMS audio level calculation for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.callbacks.onAudioLevel?.(Math.min(1, rms * 5));

      // Downsample to 16kHz if needed
      const downsampled = downsampleBuffer(inputData, sourceSampleRate, targetSampleRate);
      // Convert to 16-bit PCM LE
      const pcm16 = floatTo16BitPCM(downsampled);
      // Convert to Base64
      const base64Audio = arrayBufferToBase64(pcm16);

      // Stream to Gemini Live
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(
            JSON.stringify({
              type: 'audio',
              data: base64Audio,
              mimeType: 'audio/pcm;rate=16000',
            })
          );
        } catch (e: any) {
          // ignore transient mic send errors
        }
      }
    };

    source.connect(processor);
    processor.connect(inputCtx.destination);
    this.addLog('MIC', `Mic stream active: ${sourceSampleRate}Hz -> 16000Hz PCM LE`);
  }

  /**
   * Send text prompt directly over Gemini Live WebSocket or fallback single turn
   */
  public async sendQuickText(text: string) {
    this.callbacks.onTranscript(text, 'user');
    this.addLog('WS', `Sending prompt to Golu Rani: "${text}"`);

    // Ensure audio playback queue context is resumed on user gesture
    await this.playbackQueue.resume();

    // Check if Live WebSocket is already open or start it
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      try {
        await this.start();
      } catch (err: any) {
        this.addLog('ERROR', 'Starting Live session for quick prompt: ' + err?.message);
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.setState('CONNECTING');
      try {
        this.ws.send(JSON.stringify({ type: 'text', text }));
        return;
      } catch (e: any) {
        this.addLog('ERROR', 'Error sending text over live socket: ' + e?.message);
      }
    }

    // Fallback to REST endpoint if WebSocket is completely unavailable
    this.setState('CONNECTING');
    try {
      const res = await fetch('/api/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();

      if (data.text) {
        this.callbacks.onTranscript(data.text, 'assistant');
      }

      if (data.functionCalls && data.functionCalls.length > 0) {
        for (const call of data.functionCalls) {
          await this.actionHandler.executeTool(call.name, call.args || {});
        }
      }

      this.setState('LISTENING');
    } catch (e: any) {
      this.addLog('ERROR', 'Quick text fallback error: ' + (e?.message || e));
      this.setState('LISTENING');
    }
  }

  /**
   * Stop session and release audio hardware
   */
  public stop() {
    this.addLog('WS', 'Stopping Golu Rani voice session...');
    clearInterval(this.pingInterval);

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (e) {}
      this.scriptProcessor = null;
    }

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      this.micStream = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch (e) {}
      this.inputAudioCtx = null;
    }

    this.playbackQueue.stopAndClear();
    this.setState('IDLE');
    this.addLog('WS', 'Golu Rani is now IDLE.');
  }
}
