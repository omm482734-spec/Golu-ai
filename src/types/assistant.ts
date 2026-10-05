export type AssistantState = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR';

export interface Contact {
  id: string;
  name: string;
  relationship?: string;
  phoneNumber: string;
  avatar?: string;
}

export interface DeviceAction {
  id: string;
  type: 'openWhatsApp' | 'openApp' | 'openUrl' | 'makeCall' | 'callContact';
  timestamp: number;
  params: Record<string, any>;
  status: 'pending' | 'success' | 'failed' | 'disambiguation_needed';
  message: string;
  url?: string;
  candidates?: Contact[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  language?: string;
  action?: DeviceAction;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  category: 'MIC' | 'WS' | 'GEMINI' | 'AUDIO_OUT' | 'ACTION' | 'ERROR';
  message: string;
  details?: any;
}
