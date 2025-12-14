import { useState } from 'react';
import { ChatInterface, Message } from '../components/ChatInterface';
import { ContextDashboard } from '../components/ContextDashboard';

export default function MumbaiMunchPage() {
  const [currentContext, setCurrentContext] = useState<{
    coordinates: { lat: number; lng: number } | null;
    youtube: string[];
    sources: string[];
  }>({
    coordinates: null,
    youtube: [],
    sources: []
  });

  const handleNewMessage = (msg: Message) => {
    if (msg.role === 'assistant') {
      const hasNewLocation = !!msg.coordinates;
      const hasNewMedia = msg.youtube && msg.youtube.length > 0;
      
      if (hasNewLocation || hasNewMedia) {
        setCurrentContext({
          coordinates: msg.coordinates || currentContext.coordinates,
          youtube: msg.youtube || [],
          sources: msg.sources || []
        });
      }
    }
  };

  return (
    // md:flex-row stacks items on mobile (col) and puts them side-by-side on desktop
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#050505] text-slate-200 overflow-hidden font-sans relative">
      
      {/* LEFT: Chat Area */}
      {/* Added 'pb-14' on mobile so input isn't hidden by the collapsed map sheet */}
      <div className="flex-1 h-full relative z-10 min-w-0 pb-14 md:pb-0">
        <ChatInterface onNewMessage={handleNewMessage} />
      </div>

      {/* RIGHT: Dashboard (Responsive behavior handled internally) */}
      <ContextDashboard 
        coordinates={currentContext.coordinates}
        youtube={currentContext.youtube}
        sources={currentContext.sources}
      />
      
    </div>
  );
}