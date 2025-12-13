import { motion } from 'framer-motion';
import { Map, Grid3X3, X, Video } from 'lucide-react';
import { ContextMap } from './ContextMap'; // Ensure this exists from previous steps

interface ContextDashboardProps {
  coordinates?: { lat: number; lng: number } | null;
  youtube?: string[];
  sources?: string[];
  onClose?: () => void;
}

export function ContextDashboard({ 
  coordinates, 
  youtube = [], 
  sources = [], 
  onClose 
}: ContextDashboardProps) {
  
  const hasData = coordinates || youtube.length > 0;

  return (
    <motion.aside
      initial={{ x: 350, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-[350px] h-full bg-slate-950 border-l border-white/10 flex flex-col shadow-2xl z-20 shrink-0"
    >
      {/* 1. MAP SECTION (45%) */}
      <div className="h-[45%] flex flex-col border-b border-white/10 relative group">
        <div className="absolute top-3 left-3 z-10 flex gap-2">
            <div className="px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-mono text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <Map size={10} />
                LIVE LOCATION
            </div>
        </div>
        
        <div className="flex-1 bg-slate-900 relative overflow-hidden">
           {coordinates ? (
               <ContextMap coordinates={coordinates} />
           ) : (
               <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs font-mono">
                   NO LOCATION DATA
               </div>
           )}
        </div>
      </div>

      {/* 2. MEDIA SECTION (55%) */}
      <div className="h-[55%] flex flex-col bg-slate-900/30">
        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Related Media</span>
          </div>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
            {youtube.length} Vids
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          {youtube.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {youtube.map((id) => (
                <a 
                  key={id} 
                  href={`https://www.youtube.com/watch?v=${id}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block group relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  <img 
                    src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} 
                    alt="Thumbnail"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                 <Grid3X3 className="w-8 h-8 opacity-20" />
                 <span className="text-xs font-mono">NO MEDIA FOUND</span>
             </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}