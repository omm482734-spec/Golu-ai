import React from 'react';
import { motion } from 'motion/react';
import { AssistantState } from '../types/assistant';

interface GoluOrbProps {
  state: AssistantState;
  audioLevel: number; // 0 to 1
  onClick: () => void;
}

export const GoluOrb: React.FC<GoluOrbProps> = ({ state, audioLevel, onClick }) => {
  // Color palette based on state
  // LISTENING: Electric Cyan / Sky Blue
  // SPEAKING: Radiant Magenta / Rose / Violet
  // CONNECTING: Amber / Golden Pulse
  // IDLE: Subtle Deep Violet / Rose shimmer
  // ERROR: Fiery Crimson

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-72 md:h-72 my-2 cursor-pointer select-none" onClick={onClick}>
      {/* Outer ambient glow circles */}
      {state === 'SPEAKING' && (
        <>
          <motion.div
            className="absolute rounded-full bg-rose-500/20 blur-3xl"
            animate={{
              scale: [1, 1.35, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              ease: 'easeInOut',
            }}
            style={{ width: '120%', height: '120%' }}
          />
          <motion.div
            className="absolute rounded-full bg-fuchsia-600/30 blur-2xl"
            animate={{
              scale: [1.1, 1.45, 1.1],
              rotate: [0, 180, 360],
            }}
            transition={{
              repeat: Infinity,
              duration: 4,
              ease: 'linear',
            }}
            style={{ width: '100%', height: '100%' }}
          />
        </>
      )}

      {state === 'LISTENING' && (
        <>
          <motion.div
            className="absolute rounded-full bg-cyan-500/20 blur-2xl"
            animate={{
              scale: 1 + audioLevel * 0.6,
              opacity: 0.4 + audioLevel * 0.5,
            }}
            transition={{ duration: 0.1 }}
            style={{ width: '120%', height: '120%' }}
          />
          {/* Ripple rings */}
          <motion.div
            className="absolute rounded-full border border-cyan-400/40"
            animate={{
              scale: [1, 1.6, 2],
              opacity: [0.8, 0.3, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.8,
              ease: 'easeOut',
            }}
            style={{ width: '70%', height: '70%' }}
          />
          <motion.div
            className="absolute rounded-full border border-teal-300/30"
            animate={{
              scale: [1, 1.5, 1.9],
              opacity: [0.6, 0.2, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.8,
              delay: 0.6,
              ease: 'easeOut',
            }}
            style={{ width: '70%', height: '70%' }}
          />
        </>
      )}

      {state === 'CONNECTING' && (
        <motion.div
          className="absolute rounded-full border-2 border-amber-400/60 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          style={{ width: '85%', height: '85%' }}
        />
      )}

      {/* Main Core Orb */}
      <motion.div
        className="relative z-10 w-44 h-44 md:w-52 md:h-52 rounded-full flex flex-col items-center justify-center overflow-hidden shadow-2xl transition-all"
        animate={{
          scale:
            state === 'SPEAKING'
              ? [1, 1.07, 1.02, 1.08, 1]
              : state === 'LISTENING'
              ? 1 + audioLevel * 0.15
              : [1, 1.03, 1],
        }}
        transition={{
          repeat: state === 'SPEAKING' || state === 'IDLE' ? Infinity : 0,
          duration: state === 'SPEAKING' ? 1.6 : 3,
          ease: 'easeInOut',
        }}
        style={{
          background:
            state === 'SPEAKING'
              ? 'radial-gradient(circle at 35% 30%, #f43f5e 0%, #d946ef 45%, #6366f1 80%, #0f172a 100%)'
              : state === 'LISTENING'
              ? 'radial-gradient(circle at 35% 30%, #22d3ee 0%, #06b6d4 40%, #0284c7 75%, #082f49 100%)'
              : state === 'CONNECTING'
              ? 'radial-gradient(circle at 35% 30%, #fbbf24 0%, #f59e0b 50%, #78350f 100%)'
              : state === 'ERROR'
              ? 'radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 50%, #450a0a 100%)'
              : 'radial-gradient(circle at 35% 30%, #ec4899 0%, #8b5cf6 45%, #3b82f6 80%, #0f172a 100%)',
          boxShadow:
            state === 'SPEAKING'
              ? '0 0 50px rgba(244, 63, 94, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.5)'
              : state === 'LISTENING'
              ? '0 0 50px rgba(6, 182, 212, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.5)'
              : '0 0 40px rgba(139, 92, 246, 0.4), inset 0 0 25px rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Interior animated waves/particles */}
        <div className="absolute inset-0 opacity-40 mix-blend-overlay">
          <div className="w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* Center icon / status */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-4">
          <div className="text-3xl md:text-4xl mb-1 filter drop-shadow">
            {state === 'SPEAKING' && '✨'}
            {state === 'LISTENING' && '🎙️'}
            {state === 'CONNECTING' && '⚡'}
            {state === 'ERROR' && '⚠️'}
            {state === 'IDLE' && '👑'}
          </div>

          <span className="font-extrabold tracking-wider text-white text-base md:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            GOLU RANI
          </span>

          <span className="text-[11px] font-medium tracking-widest uppercase text-white/90 drop-shadow">
            {state === 'SPEAKING' && 'Speaking...'}
            {state === 'LISTENING' && 'Listening...'}
            {state === 'CONNECTING' && 'Connecting...'}
            {state === 'ERROR' && 'Error'}
            {state === 'IDLE' && 'Tap to Talk'}
          </span>
        </div>

        {/* Sound frequency bars inside the orb when speaking */}
        {state === 'SPEAKING' && (
          <div className="absolute bottom-6 flex items-center justify-center gap-1 z-20">
            {[0.4, 0.9, 0.6, 1, 0.7, 0.8, 0.5].map((h, i) => (
              <motion.span
                key={i}
                className="w-1 bg-white rounded-full"
                animate={{
                  height: [8, 24 * h, 6],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.5 + i * 0.1,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
