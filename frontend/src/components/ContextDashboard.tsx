import { motion } from 'framer-motion';
import { Map, Grid3X3, X } from 'lucide-react';
import { ContextMap } from './ContextMap';
import { MediaGrid } from './MediaGrid';

interface ContextDashboardProps {
  coordinates?: { lat: number; lng: number } | null;
  youtube?: string[];
  sources?: string[];
  onSelect?: (coords: { lat: number; lng: number }) => void;
  onClose?: () => void; // Optional: if you want a close button
}

export function ContextDashboard({ 
  coordinates, 
  youtube = [], 
  sources = [], 
  onSelect,
  onClose 
}: ContextDashboardProps) {
  
  return (
    <motion.aside
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-[350px] h-screen bg-[#0b0f19] border-l border-white/10 flex flex-col shadow-2xl z-20"
    >
      {/* 1. MAP SECTION (Top Half) */}
      <div className="h-[45%] flex flex-col border-b border-white/10">
        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-slate-200">Live Location</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex-1 relative bg-slate-900">
           {/* Pass coordinates and onSelect to the Map */}
           <ContextMap coordinates={coordinates || null} onSelect={onSelect} />
        </div>
      </div>

      {/* 2. MEDIA SECTION (Bottom Half) */}
      <div className="h-[55%] flex flex-col bg-[#0b0f19]">
        <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-white/5">
          <Grid3X3 className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-slate-200">Media & Sources</span>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {/* Pass youtube IDs and sources list to the Grid */}
          <MediaGrid youtube={youtube} sources={sources} />
        </div>
      </div>
    </motion.aside>
  );
}