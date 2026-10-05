/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Users,
  Terminal,
  Sparkles,
  Phone,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { AssistantState, Contact, DeviceAction, LogEntry } from './types/assistant';
import { GeminiLiveClient } from './services/gemini-live-client';
import { GoluOrb } from './components/GoluOrb';
import { ActionFeedbackModal } from './components/ActionFeedbackModal';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { ContactsManager } from './components/ContactsManager';
import { QuickPrompts } from './components/QuickPrompts';

export default function App() {
  const [state, setState] = useState<AssistantState>('IDLE');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeAction, setActiveAction] = useState<DeviceAction | null>(null);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [assistantTranscript, setAssistantTranscript] = useState<string>(
    'नमस्ते रोहित सर! मैं आपकी गोलू रानी हूँ। बताइए आज क्या सेवा करूँ? माइक्रोफ़ोन दबाइए और बात शुरू कीजिए!'
  );
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [showContacts, setShowContacts] = useState<boolean>(false);
  const [isSpeakerTesting, setIsSpeakerTesting] = useState<boolean>(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientRef = useRef<GeminiLiveClient | null>(null);

  useEffect(() => {
    const client = new GeminiLiveClient({
      onStateChange: (newState) => {
        setState(newState);
        if (newState === 'LISTENING') {
          setErrorMessage(null);
        }
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
      onLog: (log) => {
        setLogs((prev) => [...prev.slice(-150), log]);
      },
      onTranscript: (text, sender) => {
        if (sender === 'user') {
          setUserTranscript(text);
        } else {
          setAssistantTranscript(text);
        }
      },
      onAction: (action) => {
        setActiveAction(action);
      },
      onError: (err) => {
        setErrorMessage(err);
      },
    });

    clientRef.current = client;
    setContacts(client.getContacts());

    return () => {
      client.stop();
    };
  }, []);

  const handleToggleVoice = async () => {
    if (!clientRef.current) return;

    if (state === 'IDLE' || state === 'ERROR') {
      setErrorMessage(null);
      await clientRef.current.start();
    } else {
      clientRef.current.stop();
    }
  };

  const handleTestSpeaker = async () => {
    if (!clientRef.current || isSpeakerTesting) return;
    setIsSpeakerTesting(true);
    await clientRef.current.testSpeaker();
    setTimeout(() => {
      setIsSpeakerTesting(false);
    }, 800);
  };

  const handleSelectPrompt = async (prompt: string) => {
    setUserTranscript(prompt);
    if (!clientRef.current) return;

    if (state === 'IDLE' || state === 'ERROR') {
      await clientRef.current.start();
    }
    // Send prompt through quick turn or let user speak
    clientRef.current.sendQuickText(prompt);
  };

  const handleSelectCandidate = (candidate: Contact) => {
    if (!clientRef.current) return;
    clientRef.current.sendQuickText(`${candidate.name} ko call karo`);
  };

  const handleDirectCallContact = (contact: Contact) => {
    window.location.href = `tel:${contact.phoneNumber}`;
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-between selection:bg-rose-500/30 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background radial gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-rose-900/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-900/20 rounded-full blur-[130px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <span className="text-xl">👑</span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight bg-gradient-to-r from-rose-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  Golu Rani AI
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Live Voice
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <span>Owner:</span>
                <span className="text-amber-400 font-semibold">Rohit Sir</span>
                <span className="text-slate-600">•</span>
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse inline-block" />
                  Voice: Hindi
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Speaker diagnostic test button */}
            <button
              onClick={handleTestSpeaker}
              disabled={isSpeakerTesting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isSpeakerTesting
                  ? 'bg-rose-900/70 border-rose-500 text-rose-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title="Test device speaker with 440Hz tone"
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Test Speaker</span>
            </button>

            {/* Contacts button */}
            <button
              onClick={() => setShowContacts(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition"
              title="Rohit Sir's Phone Contacts"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Contacts</span>
            </button>

            {/* Diagnostic console toggle */}
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className={`p-2 rounded-xl border text-xs font-semibold transition ${
                showDiagnostics
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Audio & System Diagnostics"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-4xl mx-auto w-full">
        {/* Error banner if any */}
        {errorMessage && (
          <div className="w-full max-w-md mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* State Badge */}
        <div className="mb-2">
          {state === 'IDLE' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Tap Microphone to start talking</span>
            </div>
          )}
          {state === 'CONNECTING' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/60 border border-amber-600/60 text-amber-300 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Connecting to Gemini Live...</span>
            </div>
          )}
          {state === 'LISTENING' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/60 text-cyan-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Golu Rani is Listening to Rohit Sir...</span>
            </div>
          )}
          {state === 'SPEAKING' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-950/70 border border-rose-500/60 text-rose-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span>Golu Rani is Speaking in Native Audio...</span>
            </div>
          )}
          {state === 'ERROR' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-950/90 border border-rose-600 text-rose-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Connection Interrupted - Tap to Retry</span>
            </div>
          )}
        </div>

        {/* Interactive Voice Orb */}
        <GoluOrb state={state} audioLevel={audioLevel} onClick={handleToggleVoice} />

        {/* Real-time Subtitles / Personality Speech Bubble */}
        <div className="w-full max-w-xl my-4 space-y-2.5">
          {/* User's query */}
          {userTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[85%] px-4 py-2 rounded-2xl rounded-tr-sm bg-slate-800/90 border border-slate-700/80 text-xs sm:text-sm text-slate-200 shadow-md">
                <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">
                  Rohit Sir
                </span>
                {userTranscript}
              </div>
            </div>
          )}

          {/* Golu Rani's response */}
          <div className="flex justify-start">
            <div className="max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-sm bg-gradient-to-br from-slate-900/95 to-slate-950/95 border border-rose-900/40 text-xs sm:text-sm text-slate-100 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-500 via-fuchsia-500 to-cyan-500" />
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold text-rose-400">
                  Golu Rani
                </span>
                {state === 'SPEAKING' && (
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                    Native Voice Output
                  </span>
                )}
              </div>
              <p className="leading-relaxed font-normal">{assistantTranscript}</p>
            </div>
          </div>
        </div>

        {/* Primary Microphone / Power Control Button */}
        <div className="flex flex-col items-center justify-center my-2">
          <button
            onClick={handleToggleVoice}
            className={`relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full transition-all duration-300 shadow-2xl active:scale-95 ${
              state === 'LISTENING' || state === 'SPEAKING'
                ? 'bg-gradient-to-tr from-rose-600 to-fuchsia-600 text-white shadow-rose-600/50 hover:from-rose-500 hover:to-fuchsia-500'
                : state === 'CONNECTING'
                ? 'bg-amber-600 text-white shadow-amber-600/50'
                : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-cyan-600/40 hover:from-cyan-500 hover:to-blue-500'
            }`}
            title={state === 'LISTENING' || state === 'SPEAKING' ? 'Disconnect / Stop Listening' : 'Connect / Start Voice Assistant'}
          >
            {/* Glowing ring animation */}
            {(state === 'LISTENING' || state === 'SPEAKING') && (
              <span className="absolute inset-0 rounded-full animate-ping bg-rose-500/30 pointer-events-none" />
            )}

            {state === 'LISTENING' || state === 'SPEAKING' ? (
              <MicOff className="w-7 h-7 sm:w-8 sm:h-8" />
            ) : (
              <Mic className="w-7 h-7 sm:w-8 sm:h-8" />
            )}
          </button>

          <span className="text-xs font-semibold text-slate-400 mt-2">
            {state === 'LISTENING' || state === 'SPEAKING'
              ? 'Tap to Pause / End'
              : 'Tap to Speak with Golu Rani'}
          </span>
        </div>

        {/* Quick Voice Suggestions */}
        <div className="w-full max-w-2xl mt-4">
          <QuickPrompts onSelectPrompt={handleSelectPrompt} disabled={state === 'CONNECTING'} />
        </div>

        {/* Diagnostic Panel when toggled */}
        {showDiagnostics && (
          <div className="w-full max-w-2xl mt-6 animate-fade-in">
            <DiagnosticPanel
              logs={logs}
              onTestSpeaker={handleTestSpeaker}
              onClearLogs={() => setLogs([])}
              isSpeakerTesting={isSpeakerTesting}
            />
          </div>
        )}
      </main>

      {/* Footer info & features */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Safe Android Actions & Phone Bridge Active</span>
          </div>
          <div>
            Built exclusively for <span className="text-slate-300 font-semibold">Rohit Sir</span> • Real-time Gemini Live Engine
          </div>
        </div>
      </footer>

      {/* Action Execution Feedback & Disambiguation Modal */}
      <ActionFeedbackModal
        action={activeAction}
        onClose={() => setActiveAction(null)}
        onSelectCandidate={handleSelectCandidate}
      />

      {/* Contacts Drawer/Modal */}
      {showContacts && (
        <ContactsManager
          contacts={contacts}
          onAddContact={(newContact) => {
            const updated = [...contacts, newContact];
            setContacts(updated);
            clientRef.current?.updateContacts(updated);
          }}
          onClose={() => setShowContacts(false)}
          onCallContact={handleDirectCallContact}
        />
      )}
    </div>
  );
}
