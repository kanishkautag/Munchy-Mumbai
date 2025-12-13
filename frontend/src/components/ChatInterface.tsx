import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Bot, User, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- UTILS ---
const extractYoutubeIds = (ytData: any): string[] => {
  if (!ytData) return [];
  const textToCheck = typeof ytData === 'string' ? ytData : JSON.stringify(ytData);
  
  // Regex to catch standard IDs (11 chars)
  const patterns = [
    /v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/
  ];

  const ids = new Set<string>();
  
  // 1. Try to parse from string text (LLM response)
  const allMatches = textToCheck.matchAll(/([a-zA-Z0-9_-]{11})/g);
  for (const match of allMatches) {
     // Basic heuristic: valid IDs are usually 11 chars. 
     // We rely on the context of the input being "youtube related"
     if (match[0].length === 11) ids.add(match[0]);
  }

  // 2. Specific URL pattern matching for higher accuracy
  patterns.forEach(pattern => {
    const match = textToCheck.match(pattern);
    if (match && match[1]) ids.add(match[1]);
  });

  return Array.from(ids);
};

// --- TYPES ---
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  coordinates?: { lat: number; lng: number };
  youtube?: string[];
  sources?: string[];
  metrics?: { latency?: number };
}

interface ChatInterfaceProps {
  onNewMessage?: (message: Message) => void;
}

// --- SUB-COMPONENT: PIPELINE VISUALIZATION ---
const PipelineVisualization = ({ step }: { step: number }) => {
  const steps = ['Thinking', 'Searching DB', 'Analyzing Vibes', 'Synthesizing'];
  return (
    <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg border border-white/10 text-xs font-mono text-cyan-400 my-2">
      <Activity className="w-4 h-4 animate-pulse" />
      <span>{steps[step] || 'Processing...'}</span>
      <div className="flex gap-1 ml-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-cyan-400' : 'bg-slate-700'}`} />
        ))}
      </div>
    </div>
  );
};

export function ChatInterface({ onNewMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    // Simulate pipeline visuals
    const pipelineInterval = setInterval(() => {
      setPipelineStep(prev => (prev + 1) % 4);
    }, 800);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userMessage.content, 
          session_id: 'user-session-v1',
          chat_history: messages.slice(-5).map(m => ({ role: m.role, content: m.content })) // Send History!
        }),
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      clearInterval(pipelineInterval);

      // Extract Context Data
      const ytIds = extractYoutubeIds(data.youtube);
      const sources = [];
      if (data.sql && data.sql.length > 5) sources.push('SQL DB');
      if (data.rag || data.discovery) sources.push('Vector RAG');
      if (data.web) sources.push('Live Web');
      if (data.youtube) sources.push('YouTube');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'System returned empty response.',
        timestamp: new Date(),
        coordinates: data.coordinates,
        youtube: ytIds,
        sources: sources,
        metrics: { latency: data.metrics?.latency },
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (onNewMessage) onNewMessage(assistantMessage);

    } catch (error) {
      clearInterval(pipelineInterval);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "⚠️ **Connection Failed**: Is the backend running at " + API_BASE + "?",
        timestamp: new Date()
      }]);
    } finally {
      setIsThinking(false);
      setPipelineStep(0);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/50">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-2 text-cyan-400">
          <Sparkles className="w-5 h-5" />
          <h2 className="font-semibold text-slate-100">Mumbai Munch AI</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((m) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            key={m.id} 
            className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-purple-600' : 'bg-cyan-600'
            }`}>
              {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-purple-600/20 text-purple-100 rounded-tr-sm border border-purple-500/20' 
                : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
            }`}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
              
              {/* Metrics Footer */}
              {m.role === 'assistant' && m.metrics && (
                <div className="mt-3 pt-3 border-t border-white/10 flex gap-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  <span>⏱ {(m.metrics.latency || 0).toFixed(2)}s</span>
                  {m.sources?.map(s => <span key={s} className="text-cyan-400">{s}</span>)}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {isThinking && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <PipelineVisualization step={pipelineStep} />
           </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-slate-900/80">
        <form onSubmit={handleSubmit} className="relative">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about food in Mumbai..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
            disabled={isThinking}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isThinking}
            className="absolute right-2 top-2 p-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}