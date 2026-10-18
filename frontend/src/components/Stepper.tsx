import React from 'react';
import { UploadCloud, Music, Sparkles, Video } from 'lucide-react';

interface StepperProps {
  currentStep: number;
  onSelectStep?: (step: number) => void;
  maxStepAllowed: number;
}

export const Stepper: React.FC<StepperProps> = ({
  currentStep,
  onSelectStep,
  maxStepAllowed,
}) => {
  const steps = [
    { number: 1, label: 'Upload de Mídia', icon: UploadCloud },
    { number: 2, label: 'Informações', icon: Music },
    { number: 3, label: 'IA & Letra', icon: Sparkles },
    { number: 4, label: 'Estúdio & Exportação', icon: Video },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
        {/* Background track line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-zinc-800 -z-0 hidden sm:block" />
        
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isDone = currentStep > step.number;
          const isAllowed = step.number <= maxStepAllowed;

          return (
            <button
              key={step.number}
              disabled={!isAllowed}
              onClick={() => onSelectStep && isAllowed && onSelectStep(step.number)}
              className={`flex flex-col items-center group relative text-center focus:outline-none transition-all ${
                !isAllowed ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all z-10 ${
                  isActive
                    ? 'bg-violet-600 text-white ring-4 ring-violet-500/30 shadow-lg shadow-violet-600/40 scale-105'
                    : isDone
                    ? 'bg-zinc-800 text-violet-400 border border-violet-500/40'
                    : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="mt-2 text-center">
                <span
                  className={`text-[11px] sm:text-xs font-semibold block transition-colors ${
                    isActive
                      ? 'text-white'
                      : isDone
                      ? 'text-zinc-300'
                      : 'text-zinc-500'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-zinc-600 hidden sm:block">
                  Etapa {step.number}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
