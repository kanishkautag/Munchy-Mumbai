import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PipelineVisualization } from './PipelineVisualization';

// --- ROBUST DATA PARSING HELPER ---
const extractYoutubeIds = (ytData: any): string[] => {
  if (!ytData) return [];
  
  const ids: string[] = [];
  const patterns = [
    /v=([a-zA-Z0-9_-]{11})/,       // standard v=ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/, // short link
    /embed\/([a-zA-Z0-9_-]{11})/   // embed link
  ];

  const parseString = (str: string) => {
    for (const pattern of patterns) {
      const match = str.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Case A: It's a single string (dump from LLM)
  if (typeof ytData === 'string') {
    // Run regex globally to find all matches in the text block
    const globalV = Array.from(ytData.matchAll(/v=([a-zA-Z0-9_-]{11})/g)).map(m => m[1]);
    const globalShort = Array.from(ytData.matchAll(/youtu\.be\/([a-zA-Z0-9_-]{11})/g)).map(m => m[1]);
    return [...new Set([...globalV, ...globalShort])]; // Unique IDs only
  }

  // Case B: It's a List (API structure)
  if (Array.isArray(ytData)) {
    ytData.forEach(item => {
      let id = null;
      // Item is string URL
      if (typeof item === 'string') {
        id = parseString(item);
      } 
      // Item is Object (e.g. { url: "...", title: "..." })
      else if (typeof item === 'object' && item !== null) {
        const url = item.url || item.link || item.href || '';
        if (url) id = parseString(url);
      }
      
      if (id) ids.push(id);
    });
  }

  return [...new Set(ids)];
};

const determineSources = (data: any) => {
  const sources: string[] = [];
  if (data?.sql) sources.push('Local DB');
  if (data?.web) sources.push('Reddit'); // Assuming web often hits Reddit
  if (data?.rag || data?.discovery) sources.push('Vector Search');
  if (data?.youtube) sources.push('YouTube');
  return sources;
};

// --- COMPONENT ---

interface Message {
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

export function ChatInterface({ onNewMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const simulatePipeline = async () => {
    setPipelineStep(1);
    await new Promise((r) => setTimeout(r, 800));
    setPipelineStep(2);
    await new Promise((r) => setTimeout(r, 1200));
    setPipelineStep(3);
    await new Promise((r) => setTimeout(r, 800));
    setPipelineStep(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    const pipelinePromise = simulatePipeline();

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userMessage.content, 
          session_id: 'user-session-1' 
        }),
      });

      if (!response.ok) throw new Error(`Backend failed: ${response.status}`);
      const data = await response.json();
      
      // LOG DATA TO CONSOLE FOR DEBUGGING
      console.log("🔥 RAW BACKEND DATA:", data);
      
      await pipelinePromise;

      const ytIds = extractYoutubeIds(data.youtube);
      console.log("🎥 EXTRACTED YOUTUBE IDS:", ytIds);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'No response from server.',
        timestamp: new Date(),
        coordinates: data.coordinates || undefined, 
        youtube: ytIds,
        sources: determineSources(data),
        metrics: { latency: data.metrics?.latency },
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // CRITICAL: Notify Parent to update Dashboard
      if (onNewMessage) {
        onNewMessage(assistantMessage);
      }

    } catch (error) {
      console.error('API Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: "⚠️ **System Offline:** Is the backend running?",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl ${
                  message.role === 'user' 
                    ? 'chat-bubble-user' 
                    : 'chat-bubble-ai'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            </motion.div>
          ))}

          {isThinking && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start w-full">
                <PipelineVisualization currentStep={pipelineStep} />
             </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-card/30 backdrop-blur-sm">
        <motion.form
          onSubmit={handleSubmit}
          className="glass-card p-2 input-glow"
          whileFocus={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Mumbai..."
              className="flex-1 bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none"
              disabled={isThinking}
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}