import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Music, Film, CheckCircle2, ArrowRight } from 'lucide-react';
import { listProjects, getProject } from '../api';
import { Project } from '../types';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: Project) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      listProjects()
        .then(setProjects)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePick = async (id: string) => {
    try {
      const full = await getProject(id);
      onSelectProject(full);
      onClose();
    } catch (e) {
      alert('Erro ao carregar projeto.');
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Meus Projetos de Karaokê</h2>
              <p className="text-xs text-zinc-400">Projetos salvos no seu disco local</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Carregando projetos...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Nenhum projeto encontrado. Crie um novo karaokê na tela inicial!
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handlePick(proj.id)}
                className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-950 hover:border-violet-500/40 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-violet-400 group-hover:border-violet-500/30 transition-colors">
                    {proj.has_video ? <Film className="w-5 h-5 text-emerald-400" /> : <Music className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-white text-sm group-hover:text-violet-300 transition-colors">
                        {proj.title}
                      </h4>
                      {proj.has_video && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Vídeo Pronto</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-zinc-500 mt-0.5">
                      {proj.artist && <span>{proj.artist}</span>}
                      <span>•</span>
                      <span>{formatDate(proj.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-zinc-900 group-hover:bg-violet-600 text-zinc-400 group-hover:text-white transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
