import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, X, Sparkles, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Mission, Habit, User } from '../../types';

interface AiPanelProps {
  missions: Mission[];
  consistencySystem: Habit[];
  userProfile: User | null;
  setShowAiPanel: (show: boolean) => void;
  MODEL_NAME: string;
}

export const AiPanel: React.FC<AiPanelProps> = ({
  missions,
  consistencySystem,
  userProfile,
  setShowAiPanel,
  MODEL_NAME
}) => {
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const askAi = async () => {
    if (!query.trim()) return;
    const userMsg = query;
    setQuery('');
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsGenerating(true);

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: `User Query: ${userMsg}\nContext: ${JSON.stringify({ missions, consistencySystem, userProfile })}\nAs an AI Life Architect, provide a concise, high-impact response.`,
      });
      
      setChat(prev => [...prev, { role: 'ai', text: response.text || "I'm processing your request." }]);
    } catch (err) {
      console.error("AI Error:", err);
      setChat(prev => [...prev, { role: 'ai', text: "Neural link interrupted. Please try again." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border z-[150] shadow-2xl flex flex-col"
    >
      <div className="p-6 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Brain size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tighter text-text_primary">AI Architect</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Neural Sync Active</p>
          </div>
        </div>
        <button onClick={() => setShowAiPanel(false)} className="text-text_secondary hover:text-text_primary">
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {chat.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <Sparkles size={48} className="mx-auto text-primary opacity-20" />
            <p className="text-text_secondary font-bold text-sm italic">"How can I optimize your performance today?"</p>
          </div>
        )}
        {chat.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl font-medium text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-black' : 'bg-surface border border-border text-text_primary'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border p-4 rounded-2xl flex gap-1">
              <div className="size-1.5 bg-primary rounded-full animate-bounce" />
              <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-border bg-surface">
        <div className="relative">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askAi()}
            placeholder="Ask your AI Architect..."
            className="w-full bg-background border border-border rounded-xl px-4 py-4 pr-12 outline-none focus:border-primary transition-all font-bold text-text_primary"
          />
          <button 
            onClick={askAi}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-10 bg-primary text-black rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
