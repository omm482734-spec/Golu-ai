import React from 'react';
import { DeviceAction, Contact } from '../types/assistant';
import { Phone, MessageSquare, ExternalLink, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ActionFeedbackModalProps {
  action: DeviceAction | null;
  onClose: () => void;
  onSelectCandidate?: (contact: Contact) => void;
}

export const ActionFeedbackModal: React.FC<ActionFeedbackModalProps> = ({
  action,
  onClose,
  onSelectCandidate,
}) => {
  if (!action) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 text-slate-100 relative overflow-hidden">
        {/* Accent glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-cyan-500" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-2xl flex-shrink-0">
            {action.type === 'openWhatsApp' && <MessageSquare className="w-6 h-6 text-emerald-400" />}
            {(action.type === 'makeCall' || action.type === 'callContact') && (
              <Phone className="w-6 h-6 text-cyan-400" />
            )}
            {action.type === 'openApp' && <span className="text-xl">🚀</span>}
            {action.type === 'openUrl' && <ExternalLink className="w-6 h-6 text-indigo-400" />}
          </div>

          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                Android Action Executed
              </span>
              {action.status === 'success' && (
                <CheckCircle className="w-4 h-4 text-emerald-400 inline" />
              )}
              {action.status === 'disambiguation_needed' && (
                <AlertTriangle className="w-4 h-4 text-amber-400 inline" />
              )}
            </div>

            <h3 className="text-lg font-bold text-white mt-1">
              {action.type === 'openWhatsApp' && 'WhatsApp Action'}
              {action.type === 'callContact' && 'Contact Calling'}
              {action.type === 'makeCall' && 'Phone Dialer'}
              {action.type === 'openApp' && 'Application Launch'}
              {action.type === 'openUrl' && 'Web Navigation'}
            </h3>

            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              {action.message}
            </p>

            {/* Disambiguation UI for Multiple Contacts (e.g. Rahul Sharma vs Rahul Verma) */}
            {action.status === 'disambiguation_needed' && action.candidates && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-amber-300">
                  Kripya chunav karein:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {action.candidates.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        onSelectCandidate?.(contact);
                        onClose();
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600/70 text-left transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{contact.avatar || '👤'}</span>
                        <div>
                          <div className="font-semibold text-sm text-white">{contact.name}</div>
                          <div className="text-xs text-slate-400">{contact.relationship}</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-2 py-1 rounded border border-cyan-800">
                        {contact.phoneNumber}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Link / Action button if URL available */}
            {action.url && action.status === 'success' && (
              <div className="mt-4 flex gap-2">
                <a
                  href={action.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition"
                >
                  <span>Open Now</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
