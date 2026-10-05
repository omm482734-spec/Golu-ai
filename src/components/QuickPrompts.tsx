import React from 'react';
import { Sparkles, Phone, MessageSquare, Play, Globe } from 'lucide-react';

interface QuickPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ onSelectPrompt, disabled }) => {
  const prompts = [
    {
      category: 'Creator',
      icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />,
      text: 'तुम्हें किसने बनाया?',
    },
    {
      category: 'Owner',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
      text: 'तुम्हारा owner कौन है?',
    },
    {
      category: 'Owner',
      icon: <Sparkles className="w-3.5 h-3.5 text-rose-400" />,
      text: 'मुझे क्या बुलाओगी?',
    },
    {
      category: 'WhatsApp',
      icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
      text: 'WhatsApp kholo',
    },
    {
      category: 'Call',
      icon: <Phone className="w-3.5 h-3.5 text-cyan-400" />,
      text: 'Mummy ko call karo',
    },
    {
      category: 'Contact',
      icon: <Phone className="w-3.5 h-3.5 text-fuchsia-400" />,
      text: 'Rahul ko phone karo',
    },
    {
      category: 'App',
      icon: <Play className="w-3.5 h-3.5 text-red-400" />,
      text: 'Open YouTube',
    },
    {
      category: 'Fun',
      icon: <Sparkles className="w-3.5 h-3.5 text-violet-400" />,
      text: 'एक मस्त मज़ेदार जोक सुनाओ ना!',
    },
    {
      category: 'Languages',
      icon: <Globe className="w-3.5 h-3.5 text-blue-400" />,
      text: 'English mein baat karo',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Suggested Voice Commands (Golu Rani Voice: Hindi)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((p, idx) => (
          <button
            key={idx}
            disabled={disabled}
            onClick={() => onSelectPrompt(p.text)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-xs text-slate-200 transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            {p.icon}
            <span>{p.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
