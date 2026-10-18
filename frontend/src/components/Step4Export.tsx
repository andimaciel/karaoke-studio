import React, { useState, useEffect } from 'react';
import {
  Video,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Music,
  FileCode,
  FileText,
  RotateCcw,
  Sparkles,
  Play
} from 'lucide-react';
import { Project, BackgroundConfig, StyleConfig } from '../types';
import { renderKaraokeVideo, getProject } from '../api';

interface Step4ExportProps {
  project: Project;
  backgroundConfig: BackgroundConfig;
  styleConfig: StyleConfig;
  selectedAudioType: string;
  onProjectUpdated: (updatedProject: Project) => void;
  onNewProject: () => void;
  onBackToStudio: () => void;
}

export const Step4Export: React.FC<Step4ExportProps> = ({
  project,
  backgroundConfig,
  styleConfig,
  selectedAudioType,
  onProjectUpdated,
  onNewProject,
  onBackToStudio,
}) => {
  const [isRendering, setIsRendering] = useState(project.render?.status === 'rendering');
  const [renderProgress, setRenderProgress] = useState(project.render?.progress || 0);
  const [renderMessage, setRenderMessage] = useState(project.render?.message || '');
  const [error, setError] = useState<string | null>(null);

  // Poll rendering progress
  useEffect(() => {
    let interval: any = null;
    if (isRendering) {
      interval = setInterval(async () => {
        try {
          const fresh = await getProject(project.id);
          onProjectUpdated(fresh);
          setRenderProgress(fresh.render?.progress || 0);
          setRenderMessage(fresh.render?.message || '');

          if (fresh.render?.status === 'completed') {
            setIsRendering(false);
          } else if (fresh.render?.status === 'error') {
            setIsRendering(false);
            setError(fresh.render?.message || 'Falha na renderização do vídeo.');
          }
        } catch (e) {
          console.error(e);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isRendering, project.id]);

  const handleStartRender = async () => {
    setIsRendering(true);
    setError(null);
    try {
      await renderKaraokeVideo(
        project.id,
        selectedAudioType,
        backgroundConfig,
        styleConfig
      );
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar renderização.');
      setIsRendering(false);
    }
  };

  const isCompleted = project.render?.status === 'completed' && Boolean(project.render?.video_url);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Renderização & Exportação Final
        </h1>
        <p className="text-zinc-400 text-sm max-w-lg mx-auto">
          Gere um vídeo MP4 em alta definição (1080p H.264 / AAC) com legendas sincronizadas e fundo dinâmico.
        </p>
      </div>

      {/* Main Status Panel */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md">
        {isRendering ? (
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
              <Video className="w-8 h-8 text-violet-400 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Renderizando Vídeo com FFmpeg</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md">
                Combinando trilha de áudio selecionada, animações de karaokê e renderização H.264 em 1080p 30fps...
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>{renderMessage || 'Processando quadros...'}</span>
                <span className="font-bold text-violet-400">{renderProgress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, renderProgress)}%` }}
                />
              </div>
            </div>
          </div>
        ) : isCompleted ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">
                Seu Vídeo de Karaokê está Pronto para Assistir e Baixar!
              </h3>
            </div>

            {/* In-Browser Video Player */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
              <video
                controls
                src={project.render?.video_url}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Download Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-zinc-800">
              {/* MP4 Video */}
              <a
                href={`/api/project/${project.id}/export/mp4`}
                download
                className="flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02]"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Vídeo (MP4)</span>
              </a>

              {/* Instrumental Audio */}
              <a
                href={`/api/project/${project.id}/export/audio`}
                download
                className="flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-all hover:scale-[1.02]"
              >
                <Music className="w-4 h-4 text-violet-400" />
                <span>Instrumental (WAV)</span>
              </a>

              {/* ASS Subtitles */}
              <a
                href={`/api/project/${project.id}/export/ass`}
                download
                className="flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-all hover:scale-[1.02]"
              >
                <FileCode className="w-4 h-4 text-fuchsia-400" />
                <span>Legendas (.ASS)</span>
              </a>

              {/* SRT Subtitles */}
              <a
                href={`/api/project/${project.id}/export/srt`}
                download
                className="flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-all hover:scale-[1.02]"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Legendas (.SRT)</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center mx-auto">
              <Video className="w-8 h-8 text-violet-400" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Pronto para Renderizar o Vídeo Final?</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                O FFmpeg compilará a trilha sonora com as legendas animadas em um arquivo MP4 1080p pronto para cantar.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 max-w-sm mx-auto text-left text-xs space-y-1.5 text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">Música:</span>
                <span className="font-medium text-white">{project.song_info?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Resolução:</span>
                <span className="font-mono text-violet-400">1920x1080 (Full HD 30fps)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Codec de Vídeo:</span>
                <span className="font-mono text-zinc-300">H.264 (libx264)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Codec de Áudio:</span>
                <span className="font-mono text-zinc-300">AAC Estéreo 192kbps</span>
              </div>
            </div>

            <button
              onClick={handleStartRender}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:scale-105 text-white font-bold text-sm shadow-xl shadow-violet-600/30 transition-all cursor-pointer"
            >
              Iniciar Renderização do Vídeo MP4
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-3 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Erro na Renderização</span>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <button
          onClick={onBackToStudio}
          className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          Voltar ao Estúdio
        </button>

        <button
          onClick={onNewProject}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Criar Outro Karaokê</span>
        </button>
      </div>
    </div>
  );
};
