import { useState } from 'react';
// FIX: Use relative paths to jump out of 'pages' and into 'components'
import { ChatInterface, Message } from '../components/ChatInterface';
import { ContextDashboard } from '../components/ContextDashboard';

export default function MumbaiMunchPage() {
  // State to hold the latest context from the chat
  const [currentContext, setCurrentContext] = useState<{
    coordinates: { lat: number; lng: number } | null;
    youtube: string[];
    sources: string[];
  }>({
    coordinates: null,
    youtube: [],
    sources: []
  });

  // Handler: When ChatInterface gets a response, update the Dashboard
  const handleNewMessage = (msg: Message) => {
    if (msg.role === 'assistant') {
      // Only update if the message has relevant data
      const hasNewLocation = !!msg.coordinates;
      const hasNewMedia = msg.youtube && msg.youtube.length > 0;
      
      if (hasNewLocation || hasNewMedia) {
        setCurrentContext({
          coordinates: msg.coordinates || currentContext.coordinates, // Keep old coords if new msg has none
          youtube: msg.youtube || [],
          sources: msg.sources || []
        });
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-slate-200 overflow-hidden font-sans">
      
      {/* LEFT: Chat Area (Flexible Width) */}
      <div className="flex-1 min-w-0 h-full relative z-10">
        <ChatInterface onNewMessage={handleNewMessage} />
      </div>

      {/* RIGHT: Dashboard (Fixed Width) */}
      <ContextDashboard 
        coordinates={currentContext.coordinates}
        youtube={currentContext.youtube}
        sources={currentContext.sources}
      />
      
    </div>
  );
}