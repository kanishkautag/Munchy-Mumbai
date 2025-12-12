import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Database, Server, Cpu, Circle } from 'lucide-react';

interface SystemStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  icon: React.ComponentType<{ className?: string }>;
}

const systems: SystemStatus[] = [
  { name: 'Vector DB', status: 'healthy', icon: Database },
  { name: 'SQL Engine', status: 'healthy', icon: Server },
  { name: 'Orchestrator', status: 'healthy', icon: Cpu },
];

export function MLOpsSidebar() {
  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="w-[280px] h-screen bg-[#0b0f19] border-r border-white/10 flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.5)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Munchy Mumbai</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400 font-mono">System Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 space-y-6">
        
        {/* AESTHETIC GIF DISPLAY */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 group shadow-lg">
            {/* The GIF - Clean and Bright */}
            <img 
                src="/mumbai.gif" 
                alt="Mumbai Live" 
                className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            />
            
            {/* Subtle Gradient Overlay at bottom for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

            {/* Clean Badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="px-2 py-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] font-mono font-medium text-yellow-400 tracking-wider">
                        LIVE FEED
                    </span>
                </div>
            </div>
        </div>

        {/* Minimal System Health */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-semibold text-slate-500 uppercase px-1 tracking-wider">
            Pipeline Status
          </span>
          {systems.map((system, index) => (
            <motion.div 
              key={system.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <system.icon className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
                <span className="text-sm text-slate-200">{system.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs text-emerald-500 font-medium">Active</span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono">
          <span>v1.2.0</span>
          <span>GenAI Pipeline</span>
        </div>
      </div>
    </motion.aside>
  );
}