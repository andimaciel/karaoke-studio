import React from 'react';
import { Mic2, Settings, FolderOpen, Sparkles, PlusCircle } from 'lucide-react';

interface HeaderProps {
  onNewProject: () => void;
  onOpenSettings: () => void;
  onOpenProjects: () => void;
  currentProjectId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNewProject,
  onOpenSettings,
  onOpenProjects,
  currentProjectId,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090a0f]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onNewProject}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Mic2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                KARAOKÊ STUDIO
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30">
                PRO LOCAL
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Separação UVR / MDX-Net & Sincronização IA
            </p>
          </div>
        </div>

        {/* Status badges & actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-xs text-zinc-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Motor UVR ONNX Ativo</span>
            <span className="text-zinc-600">•</span>
            <span>faster-whisper</span>
          </div>

          <button
            onClick={onOpenProjects}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
            title="Ver projetos salvos"
          >
            <FolderOpen className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">Projetos</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
            title="Configurações e Provedores"
          >
            <Settings className="w-4 h-4" />
          </button>

          {currentProjectId && (
            <button
              onClick={onNewProject}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg shadow-md shadow-violet-500/20 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
