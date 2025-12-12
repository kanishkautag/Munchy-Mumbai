import { motion } from 'framer-motion';
import { Network, Database, BrainCircuit, Search } from 'lucide-react';

interface PipelineProps {
  currentStep: number;
}

const steps = [
  { id: 1, label: 'Routing', icon: Network },
  { id: 2, label: 'Retrieving', icon: Database }, // or Search depending on logic
  { id: 3, label: 'Synthesizing', icon: BrainCircuit },
];

export function PipelineVisualization({ currentStep }: PipelineProps) {
  // If step is 0, we are idle, don't show anything or show idle state
  if (currentStep === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/5">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step Icon */}
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1.1 : 1,
                opacity: isActive || isCompleted ? 1 : 0.4,
                color: isActive ? '#a855f7' : isCompleted ? '#22c55e' : '#94a3b8' // Purple active, Green done, Gray pending
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className={`p-1.5 rounded-md ${isActive ? 'bg-purple-500/20' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono uppercase">{step.label}</span>
            </motion.div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="w-6 h-[1px] bg-white/10 mx-1 relative">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-purple-500"
                  initial={{ width: '0%' }}
                  animate={{ width: isActive || isCompleted ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}