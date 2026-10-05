/**
 * High-performance audio processing for Gemini Live API
 * - 16kHz PCM 16-bit LE microphone streaming
 * - 24kHz PCM 16-bit LE model native audio decoding & continuous gapless playback
 */

export interface ChunkDiagnosticInfo {
  mimeType: string;
  byteLength: number;
  sampleRate: number;
  channels: number;
  sampleCount: number;
  scheduledStartTime: number;
  duration: number;
  queueRemainingDuration: number;
}

export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true); // little-endian
  }
  return buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return base64ToUint8Array(base64).buffer as ArrayBuffer;
}

export function pcm16LeToFloat32(arrayBuffer: ArrayBuffer): Float32Array {
  const dataView = new DataView(arrayBuffer);
  const numSamples = Math.floor(arrayBuffer.byteLength / 2);
  const float32 = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const int16 = dataView.getInt16(i * 2, true); // little-endian
    float32[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
  }
  return float32;
}

export function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }
  if (inputSampleRate < outputSampleRate) {
    return buffer;
  }
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Sequential Gapless Audio Playback Queue with Adaptive Jitter Buffer
 */
export class AudioPlaybackQueue {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onStateChange?: (isPlaying: boolean) => void;
  private onChunkDiagnostic?: (info: ChunkDiagnosticInfo) => void;
  private isPlaying: boolean = false;
  private scheduledCount: number = 0;
  private completedCount: number = 0;
  private leftoverBytes: Uint8Array | null = null;

  // Jitter buffer of 160ms for first chunk of turn to prevent network gap stutters
  private readonly INITIAL_JITTER_BUFFER = 0.16;

  constructor(
    onStateChange?: (isPlaying: boolean) => void,
    onChunkDiagnostic?: (info: ChunkDiagnosticInfo) => void
  ) {
    this.onStateChange = onStateChange;
    this.onChunkDiagnostic = onChunkDiagnostic;
  }

  public getContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
      this.gainNode.connect(this.audioContext.destination);
    }
    return this.audioContext;
  }

  public async resume(): Promise<boolean> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx.state === 'running';
  }

  /**
   * Decodes incoming base64 PCM chunk without byte loss
   */
  public decodeBase64Pcm(base64Data: string): { float32: Float32Array; byteLength: number } {
    const rawBytes = base64ToUint8Array(base64Data);
    let combinedBytes: Uint8Array;

    if (this.leftoverBytes && this.leftoverBytes.length > 0) {
      combinedBytes = new Uint8Array(this.leftoverBytes.length + rawBytes.length);
      combinedBytes.set(this.leftoverBytes, 0);
      combinedBytes.set(rawBytes, this.leftoverBytes.length);
      this.leftoverBytes = null;
    } else {
      combinedBytes = rawBytes;
    }

    // Keep leftover odd byte if any
    const sampleBytesCount = Math.floor(combinedBytes.length / 2) * 2;
    if (combinedBytes.length > sampleBytesCount) {
      this.leftoverBytes = combinedBytes.slice(sampleBytesCount);
    }

    const numSamples = sampleBytesCount / 2;
    const float32 = new Float32Array(numSamples);
    const dataView = new DataView(
      combinedBytes.buffer,
      combinedBytes.byteOffset,
      sampleBytesCount
    );

    for (let i = 0; i < numSamples; i++) {
      const int16 = dataView.getInt16(i * 2, true); // little-endian
      float32[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
    }

    return { float32, byteLength: sampleBytesCount };
  }

  /**
   * Enqueues and schedules a PCM chunk gaplessly
   */
  public enqueuePcmChunk(
    base64Data: string,
    sampleRate: number = 24000,
    mimeType: string = 'audio/pcm;rate=24000'
  ) {
    if (!base64Data) return;

    const { float32, byteLength } = this.decodeBase64Pcm(base64Data);
    if (float32.length === 0) return;

    const ctx = this.getContext();
    if (!this.gainNode) return;

    // Create AudioBuffer at exact sample rate (24000Hz)
    const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    const now = ctx.currentTime;
    const isTurnStart = this.nextStartTime < now + 0.01;

    if (isTurnStart) {
      // Starting fresh turn or queue fell idle: insert jitter buffer for smooth continuous buffering
      this.nextStartTime = now + this.INITIAL_JITTER_BUFFER;

      // Micro fade-in (32 samples ~1.3ms) to prevent any click on start
      const channel = audioBuffer.getChannelData(0);
      const rampLen = Math.min(32, channel.length);
      for (let i = 0; i < rampLen; i++) {
        channel[i] *= i / rampLen;
      }
    }

    const scheduledTime = this.nextStartTime;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    // Schedule sample-accurate start
    source.start(scheduledTime);

    // Advance nextStartTime mathematically by exact duration for gapless playback
    this.nextStartTime += audioBuffer.duration;

    this.activeSources.push(source);
    this.scheduledCount++;

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onStateChange?.(true);
    }

    const queueRemaining = Math.max(0, this.nextStartTime - now);

    // Emit diagnostic info
    this.onChunkDiagnostic?.({
      mimeType,
      byteLength,
      sampleRate,
      channels: 1,
      sampleCount: float32.length,
      scheduledStartTime: scheduledTime,
      duration: audioBuffer.duration,
      queueRemainingDuration: queueRemaining,
    });

    source.onended = () => {
      this.completedCount++;
      const index = this.activeSources.indexOf(source);
      if (index !== -1) {
        this.activeSources.splice(index, 1);
      }
      // Check if all queued chunks have finished
      if (this.activeSources.length === 0 && ctx.currentTime >= this.nextStartTime - 0.03) {
        this.isPlaying = false;
        this.nextStartTime = 0;
        this.onStateChange?.(false);
      }
    };
  }

  /**
   * Enqueues a pre-decoded Float32Array buffer (e.g. from single-turn WAV decoding)
   */
  public enqueueFloat32Buffer(float32Data: Float32Array, sampleRate: number = 24000) {
    if (!float32Data || float32Data.length === 0) return;
    const ctx = this.getContext();
    if (!this.gainNode) return;

    const audioBuffer = ctx.createBuffer(1, float32Data.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const now = ctx.currentTime;
    if (this.nextStartTime < now + 0.01) {
      this.nextStartTime = now + 0.05;
    }

    const scheduledTime = this.nextStartTime;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    source.start(scheduledTime);
    this.nextStartTime += audioBuffer.duration;

    this.activeSources.push(source);
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onStateChange?.(true);
    }

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) this.activeSources.splice(idx, 1);
      if (this.activeSources.length === 0 && ctx.currentTime >= this.nextStartTime - 0.03) {
        this.isPlaying = false;
        this.nextStartTime = 0;
        this.onStateChange?.(false);
      }
    };
  }

  /**
   * Stop all playback immediately and clear queue (for interruption or new turn)
   */
  public stopAndClear() {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // already stopped
      }
    }
    this.activeSources = [];
    this.leftoverBytes = null;
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    } else {
      this.nextStartTime = 0;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onStateChange?.(false);
    }
  }

  /**
   * Speaker Diagnostic Test: plays a clean 440Hz sine wave for 0.4 seconds
   */
  public async playTestTone(): Promise<boolean> {
    await this.resume();
    const ctx = this.getContext();
    const duration = 0.4;
    const sampleRate = ctx.sampleRate;
    const frameCount = sampleRate * duration;
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    const frequency = 440; // A4 standard test pitch
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin((Math.PI * i) / frameCount);
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode || ctx.destination);
    source.start();
    return true;
  }
}
