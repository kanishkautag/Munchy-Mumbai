import { motion } from 'framer-motion';
import { Play, ExternalLink } from 'lucide-react';

interface MediaGridProps {
  youtube?: string[];
  sources?: string[];
}

const sourceColors: Record<string, string> = {
  'Local DB': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Reddit: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  YouTube: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function MediaGrid({ youtube = [], sources = [] }: MediaGridProps) {
  if (youtube.length === 0 && sources.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        <p>No media available</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* Sources */}
      {sources.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Sources
          </span>
          <div className="flex flex-wrap gap-2">
            {sources.map((source) => (
              <motion.span
                key={source}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`media-chip ${sourceColors[source] || ''}`}
              >
                {source}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* YouTube Videos */}
      {youtube.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Related Videos
          </span>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {youtube.map((videoId, index) => (
              <motion.a
                key={videoId}
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative flex-shrink-0 w-40 aspect-video rounded-lg overflow-hidden glass-card"
                whileHover={{ scale: 1.02 }}
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
