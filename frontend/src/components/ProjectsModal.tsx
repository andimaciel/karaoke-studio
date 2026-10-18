import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Music, Film, CheckCircle2, ArrowRight, Cloud, RefreshCw, Trash2 } from 'lucide-react';
import { listProjects, getProject, deleteProject, syncSupabase } from '../api';
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
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const loadProjects = () => {
    setLoading(true);
    listProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePick = async (id: string) => {
    try {
      const full = await getProject(id);
      onSelectProject(full);
      onClose();
    } catch {
      alert('Erro ao carregar projeto.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir este projeto e seus arquivos?')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Erro ao excluir projeto.');
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncSupabase();
      setSyncFeedback(res.message);
      loadProjects();
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (e: any) {
      setSyncFeedback('Erro ao sincronizar com Supabase.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setSyncing(false);
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
              <p className="text-xs text-zinc-400">Salvos no disco e na nuvem Supabase</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              title="Sincronizar todos os projetos com o Supabase"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-xs flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

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
                <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-violet-400 group-hover:border-violet-500/30 transition-colors shrink-0">
                    {proj.has_video ? <Film className="w-5 h-5 text-emerald-400" /> : <Music className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="font-bold text-white text-sm group-hover:text-violet-300 transition-colors truncate">
                        {proj.title}
                      </h4>
                      {proj.has_video && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center space-x-1 shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Vídeo Pronto</span>
                        </span>
                      )}
                      {proj.synced && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 flex items-center space-x-1 shrink-0" title="Salvo na nuvem Supabase">
                          <Cloud className="w-2.5 h-2.5" />
                          <span>Nuvem</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-zinc-500 mt-0.5">
                      {proj.artist && <span className="truncate">{proj.artist}</span>}
                      <span>•</span>
                      <span>{formatDate(proj.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={(e) => handleDelete(e, proj.id)}
                    title="Excluir projeto"
                    className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="p-2 rounded-xl bg-zinc-900 group-hover:bg-violet-600 text-zinc-400 group-hover:text-white transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
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
