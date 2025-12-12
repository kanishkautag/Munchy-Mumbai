import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Database,
  Globe,
  Youtube,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Zap,
  DollarSign,
  MapPin,
  Code,
  FileText,
  BarChart3,
  Bot,
  User,
  ExternalLink,
} from "lucide-react";

// Use your existing map component to avoid Leaflet errors
import { ContextMap } from "@/src/components/ContextMap";

// --- UTILS ---
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// --- TYPES ---
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metrics?: {
    sql_time: number;
    vector_time: number;
    web_time: number;
    llm_time: number;
  };
  restaurant?: {
    name: string;
    location: { lat: number; lng: number };
    sqlQuery: string;
    scrapedData: string;
    vectors: string[];
  };
  latency?: number;
  cacheHit?: boolean;
}

// --- SUB-COMPONENTS (Inlined to avoid missing file errors) ---

// 1. Simple Tab Component (Replaces Shadcn Tabs)
const SimpleTabs = ({ 
  options, 
  active, 
  onChange, 
  data 
}: { 
  options: { id: string; label: string; icon: any }[], 
  active: string, 
  onChange: (id: string) => void,
  data: any
}) => {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex bg-slate-800/50 border-b border-slate-700/50">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-mono border-r border-slate-700/50 transition-colors ${
              active === opt.id 
                ? "bg-slate-700/50 text-cyan-400" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <opt.icon size={12} />
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-2 bg-slate-900/30">
        {active === 'sql' && (
           <pre className="text-xs font-mono text-cyan-300 whitespace-pre-wrap">{data.sqlQuery || "No SQL executed"}</pre>
        )}
        {active === 'scraped' && (
           <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap">{data.scrapedData || "No data scraped"}</pre>
        )}
        {active === 'vectors' && (
           <div className="space-y-2">
             {(data.vectors || []).map((v: string, i: number) => (
               <div key={i} className="bg-slate-950/50 p-2 rounded text-xs font-mono border-l-2 border-violet-500/50 text-slate-400">
                 {v}
               </div>
             ))}
             {(!data.vectors || data.vectors.length === 0) && <span className="text-slate-500 text-xs">No vectors found</span>}
           </div>
        )}
      </div>
    </div>
  );
};

// 2. Chat Message Component
function ChatMessage({ message, engineerView }: { message: Message; engineerView: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex items-start gap-2 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
          message.role === "user" ? "bg-cyan-600/30" : "bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-violet-500/30"
        }`}>
          {message.role === "user" ? <User size={16} className="text-cyan-400" /> : <Bot size={16} className="text-white" />}
        </div>

        <div className="space-y-2 w-full">
          {/* Execution Trace (Assistant Only) */}
          {message.role === "assistant" && engineerView && message.metrics && (
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden w-full">
              <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-slate-400 hover:bg-slate-800/50">
                <span className="flex items-center gap-2"><Zap size={12} className="text-amber-400" /> Trace</span>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="border-t border-slate-700/50 px-3 py-3 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <img src="/mumbai.gif" alt="Pipeline" className="w-full h-24 object-cover rounded-lg opacity-80" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {/* Content Bubble */}
          <div className={`px-4 py-3 rounded-2xl text-sm ${
            message.role === "user" 
              ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-100 rounded-tr-sm" 
              : "bg-slate-800/60 border border-slate-700/40 text-slate-200 rounded-tl-sm"
          }`}>
            {message.content}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 3. Metric Marquee
function MetricMarquee({ latency, cacheHit, sources, cost }: { latency: number; cacheHit: boolean; sources: any; cost: number }) {
  const activeCount = Object.values(sources).filter(Boolean).length;
  return (
    <div className="bg-slate-900/90 border-b border-slate-700/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2 font-mono text-xs">
        {/* Latency */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Latency:</span>
          <span className={`font-bold ${latency < 2 ? "text-emerald-400" : "text-amber-400"}`}>{latency.toFixed(2)}s</span>
        </div>
        {/* RAG Sources */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500 hidden sm:inline">Sources:</span>
          <div className="flex items-center gap-1.5">
            <Database size={14} className={sources.sql ? "text-cyan-400" : "text-slate-600"} />
            <Layers size={14} className={sources.vector ? "text-violet-400" : "text-slate-600"} />
            <Globe size={14} className={sources.web ? "text-emerald-400" : "text-slate-600"} />
            <Youtube size={14} className={sources.yt ? "text-rose-400" : "text-slate-600"} />
          </div>
          <span className="text-slate-400">{activeCount}/4</span>
        </div>
        {/* Cost */}
        <div className="flex items-center gap-2">
          <DollarSign size={12} className="text-emerald-400" />
          <span className="text-emerald-400 font-bold">${cost.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}

// 4. Inspector Deck
function InspectorDeck({ restaurant }: { restaurant: Message["restaurant"] }) {
  const [activeTab, setActiveTab] = useState("sql");
  const defaultLocation = restaurant?.location || { lat: 19.076, lng: 72.8777 };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 border-l border-slate-700/50 w-80 shrink-0">
      {/* Map Header Link */}
      <div className="border-b border-slate-700/50 p-4 hover:bg-slate-800/50 transition-colors group relative h-48 overflow-hidden">
        <div className="absolute inset-0">
            {/* Reuse the ContextMap component we built earlier */}
            <ContextMap coordinates={defaultLocation} />
        </div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
            <div className="text-slate-200 font-medium truncate">{restaurant?.name || "Mumbai Munch HQ"}</div>
            <div className="text-xs font-mono text-cyan-400">{defaultLocation.lat.toFixed(4)}, {defaultLocation.lng.toFixed(4)}</div>
        </div>
      </div>

      {/* Tabs */}
      <SimpleTabs 
        active={activeTab} 
        onChange={setActiveTab}
        options={[
            { id: 'sql', label: 'SQL', icon: Code },
            { id: 'scraped', label: 'Web', icon: FileText },
            { id: 'vectors', label: 'RAG', icon: BarChart3 },
        ]}
        data={restaurant || {}}
      />
    </div>
  );
}

// --- MAIN PAGE ---
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function MumbaiMunchDashboard() {
  const [sessionId] = useState(() => generateUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [engineerView, setEngineerView] = useState(true);
  const [currentMetrics, setCurrentMetrics] = useState({
    latency: 0,
    cacheHit: false,
    sources: { sql: true, vector: true, web: true, yt: true },
    cost: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: generateUUID(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const startTime = Date.now();

    try {
      const resp = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg.content, session_id: sessionId }),
      });

      if (!resp.ok) throw new Error("Backend Error");
      const data = await resp.json();
      
      const latency = (Date.now() - startTime) / 1000;
      const backendLatency = data.metrics?.latency ?? latency;

      // Detect Sources
      const sources = {
          sql: Boolean(data.sql),
          vector: Boolean(data.rag || data.discovery),
          web: Boolean(data.web),
          yt: Boolean(data.youtube),
      };

      const assistantMsg: Message = {
        id: generateUUID(),
        role: "assistant",
        content: data.response || "No response.",
        latency: backendLatency,
        metrics: { sql_time: 0.1, vector_time: 0.2, web_time: 0.5, llm_time: 0.8 }, // Mock breakdown
        restaurant: data.coordinates ? {
            name: data.suggestions?.[0]?.name || "Result",
            location: data.coordinates,
            sqlQuery: data.sql,
            scrapedData: data.web,
            vectors: []
        } : undefined
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentMetrics({ latency: backendLatency, cacheHit: false, sources, cost: 0.004 });

    } catch (err) {
      setMessages((prev) => [...prev, { id: generateUUID(), role: "assistant", content: "Error connecting to server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const latestRestaurant = [...messages].reverse().find((m) => m.restaurant)?.restaurant;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
             {/* Using the GIF you have */}
             <img src="/mumbai.gif" alt="Loading" className="w-64 h-48 object-cover rounded-xl shadow-2xl border border-purple-500/30" />
             <span className="text-purple-300 font-mono animate-pulse">Running Neural Pipeline...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-700/50 px-4 py-3 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
            <span className="text-xl">🍛</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100">Mumbai Munch</h1>
            <p className="text-[10px] font-mono text-slate-500">Session: {sessionId.slice(0, 8)}</p>
          </div>
        </div>
        
        {/* Engineer Toggle */}
        <button 
            onClick={() => setEngineerView(!engineerView)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all ${
                engineerView ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400" : "bg-slate-800 border-slate-700 text-slate-500"
            }`}
        >
            {engineerView ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>Dev Mode</span>
        </button>
      </header>

      {/* Marquee */}
      {engineerView && <MetricMarquee {...currentMetrics} />}

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0">
        
        {/* Chat Column */}
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 overflow-y-auto p-4">
             {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
                    <div className="p-4 bg-slate-900 rounded-full border border-slate-800"><Bot size={32} /></div>
                    <p>Ask about Mumbai's food scene...</p>
                </div>
             )}
             {messages.map(m => <ChatMessage key={m.id} message={m} engineerView={engineerView} />)}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-900 border-t border-slate-800">
             <div className="flex gap-2 max-w-3xl mx-auto">
                <input 
                    className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
                    placeholder="E.g. Best Vada Pav in Dadar?"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
                >
                    <Send size={20} />
                </button>
             </div>
          </div>
        </div>

        {/* Right Sidebar (Inspector) */}
        {engineerView && <InspectorDeck restaurant={latestRestaurant} />}
      </div>
    </div>
  );
}