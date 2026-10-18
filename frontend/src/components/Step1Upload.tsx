import React, { useState, useRef } from 'react';
import { UploadCloud, Music, Film, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Project } from '../types';
import { uploadMediaFile } from '../api';

interface Step1UploadProps {
  onUploaded: (project: Project) => void;
}

export const Step1Upload: React.FC<Step1UploadProps> = ({ onUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedProject, setUploadedProject] = useState<Project | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setError(null);
    setLoading(true);

    try {
      const project = await uploadMediaFile(file);
      setUploadedProject(project);
      onUploaded(project);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar o arquivo enviado.');
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      {/* Title & description */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          Transforme Músicas em <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Karaokê Profissional</span>
        </h1>
        <p className="text-zinc-400 text-sm max-w-lg mx-auto">
          Faça upload de qualquer arquivo de áudio ou vídeo. A IA remove os vocais e sincroniza a letra automaticamente.
        </p>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-violet-500 bg-violet-950/20 shadow-2xl shadow-violet-500/20 scale-[1.01]'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="audio/*,video/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.mp4,.mov,.mkv,.webm"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {loading ? (
          <div className="py-8 flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
              <Loader2 className="w-8 h-8 text-violet-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-white">Processando arquivo...</h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              Analisando metadados com FFprobe e extraindo áudio padrão a 44.1kHz estéreo...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-10 h-10 text-violet-400" />
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
              Arraste e solte o arquivo aqui, ou <span className="text-violet-400 underline decoration-violet-400/40 underline-offset-4">escolha do computador</span>
            </h2>

            <p className="text-xs text-zinc-400 mb-6 max-w-md">
              Compatível com todos os formatos comuns de áudio e vídeo: MP3, WAV, FLAC, M4A, AAC, MP4, MOV, MKV.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {['MP3', 'WAV', 'FLAC', 'M4A', 'MP4', 'MOV'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-white/5 text-zinc-400 border border-white/5"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Erro no carregamento</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Uploaded File Details (if ready) */}
      {uploadedProject && (
        <div className="mt-6 p-5 rounded-2xl bg-zinc-900/80 border border-emerald-500/30 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                {uploadedProject.media?.has_video ? (
                  <Film className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Music className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-bold text-white text-sm">
                    {uploadedProject.media?.original_filename}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    Pronto
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-zinc-400 mt-1">
                  <span>Duração: {formatDuration(uploadedProject.media?.duration)}</span>
                  <span>•</span>
                  <span>Tamanho: {formatSize(uploadedProject.media?.size_bytes)}</span>
                  <span>•</span>
                  <span>Formato: {uploadedProject.media?.format?.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onUploaded(uploadedProject)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-600/30 hover:scale-[1.02]"
            >
              <span>Avançar para Informações</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {uploadedProject.media?.has_video && (
            <div className="mt-3 pt-3 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vídeo detectado: o áudio foi extraído automaticamente para processamento do karaokê.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
