import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map, Video, ChevronUp, ChevronDown, Grid3X3 } from 'lucide-react';
import { ContextMap } from './ContextMap';

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
  
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Controls Mobile Sheet state

  // 1. Detect Screen Size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 2. Auto-expand on mobile when new data arrives
  useEffect(() => {
    if (isMobile && (coordinates || youtube.length > 0)) {
      setIsExpanded(true);
    }
  }, [coordinates, youtube.length, isMobile]);

  const displayCoordinates = coordinates || { lat: 19.0178, lng: 72.8478 };

  // --- SUB-COMPONENTS ---

  // The Top Bar (Visible in collapsed state on mobile)
  const Header = () => (
    <div 
      onClick={() => isMobile && setIsExpanded(!isExpanded)}
      className="h-14 flex items-center justify-between px-4 bg-slate-900 border-b border-white/10 cursor-pointer select-none"
    >
      <div className="flex items-center gap-3">
        {/* Location Badge */}
        <div className={`flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded border ${
          coordinates 
            ? 'bg-cyan-950 text-cyan-400 border-cyan-800' 
            : 'bg-slate-800 text-slate-400 border-slate-700'
        }`}>
          <Map size={12} />
          <span>{coordinates ? "LOCATION FOUND" : "MAP VIEW"}</span>
        </div>

        {/* Media Badge */}
        {youtube.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-purple-400 bg-purple-900/20 px-2 py-1 rounded border border-purple-500/20">
            <Video size={12} />
            <span>{youtube.length} Vids</span>
          </div>
        )}
      </div>

      {/* Mobile Toggle Icon */}
      {isMobile && (
        <div className="text-slate-400">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>
      )}
    </div>
  );

  // The Main Content (Map + Videos)
  const Content = () => (
    <div className="flex flex-col h-full bg-slate-950">
      {/* MAP SECTION */}
      <div className="h-[250px] md:h-[45%] relative border-b border-white/10 shrink-0">
        <div className="absolute top-3 left-3 z-10 hidden md:block">
            <div className="px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-mono text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <Map size={10} /> LIVE LOCATION
            </div>
        </div>
         <ContextMap coordinates={displayCoordinates} />
      </div>

      {/* MEDIA SECTION */}
      <div className="flex-1 overflow-y-auto bg-slate-900/50 p-4 pb-24 md:pb-4">
        <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs font-bold uppercase tracking-wider">
           <Video size={14} /> Related Media
        </div>
        
        {youtube.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {youtube.map((id) => (
              <a 
                key={id} 
                href={`https://www.youtube.com/watch?v=${id}`} 
                target="_blank" 
                rel="noreferrer"
                className="block aspect-video bg-black rounded-lg overflow-hidden border border-white/10 relative group"
              >
                <img 
                  src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                  alt="thumbnail"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                   <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">▶</div>
                </div>
              </a>
            ))}
          </div>
        ) : (
           <div className="text-center py-10 text-slate-600 flex flex-col items-center gap-2">
             <Grid3X3 className="w-8 h-8 opacity-20" />
             <span className="text-xs font-mono">NO MEDIA FOUND</span>
           </div>
        )}
      </div>
    </div>
  );

  // --- MOBILE RENDER: Bottom Sheet ---
  if (isMobile) {
    return (
      <motion.div 
        initial={{ y: "calc(100% - 3.5rem)" }} 
        animate={{ y: isExpanded ? "0%" : "calc(100% - 3.5rem)" }} 
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-cyan-500/30 rounded-t-xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.8)] flex flex-col h-[85vh]"
      >
        {/* Drag Handle Area */}
        <div className="w-full bg-slate-900 flex justify-center pt-2 pb-1" onClick={() => setIsExpanded(!isExpanded)}>
           <div className="w-12 h-1 bg-slate-700 rounded-full" />
        </div>
        
        <Header />
        <Content />
      </motion.div>
    );
  }

  // --- DESKTOP RENDER: Sidebar ---
  return (
    <motion.aside
      initial={{ x: 350, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-[350px] h-full bg-slate-950 border-l border-white/10 flex flex-col shadow-2xl z-20 shrink-0"
    >
      <Header />
      <Content />
    </motion.aside>
  );
}