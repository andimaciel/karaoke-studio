import React, { useState } from 'react';
import { Music2, User, Globe, Sparkles, ArrowRight, SkipForward } from 'lucide-react';
import { Project, SongInfo } from '../types';
import { updateSongInfo } from '../api';

interface Step2SongInfoProps {
  project: Project;
  onContinue: (updatedProject: Project) => void;
  onBack: () => void;
}

export const Step2SongInfo: React.FC<Step2SongInfoProps> = ({
  project,
  onContinue,
  onBack,
}) => {
  const [title, setTitle] = useState(project.song_info?.title || '');
  const [artist, setArtist] = useState(project.song_info?.artist || '');
  const [language, setLanguage] = useState(project.song_info?.language || 'auto');
  const [showIntro, setShowIntro] = useState(project.song_info?.show_intro ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (skipOptional = false) => {
    setLoading(true);
    try {
      const payload: Partial<SongInfo> = {
        title: skipOptional ? (title || 'Minha Música') : title,
        artist: skipOptional ? artist : artist,
        language: language,
        show_intro: showIntro,
      };

      const updated = await updateSongInfo(project.id, payload);
      onContinue(updated);
    } catch (err) {
      console.error(err);
      onContinue(project);
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    { code: 'auto', name: '✨ Detecção Automática (Recomendado)' },
    { code: 'pt', name: '🇧🇷 Português' },
    { code: 'en', name: '🇺🇸 Inglês' },
    { code: 'es', name: '🇪🇸 Espanhol' },
    { code: 'fr', name: '🇫🇷 Francês' },
    { code: 'it', name: '🇮🇹 Italiano' },
    { code: 'ja', name: '🇯🇵 Japonês' },
    { code: 'ko', name: '🇰🇷 Coreano' },
    { code: 'de', name: '🇩🇪 Alemão' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Informações da Música
        </h1>
        <p className="text-zinc-400 text-sm">
          Essas informações são usadas na vinheta inicial do vídeo e para otimizar o reconhecimento de voz do Whisper.
        </p>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md">
        {/* Title Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center space-x-1.5">
            <Music2 className="w-3.5 h-3.5 text-violet-400" />
            <span>Título da Música</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Evidências"
            className="w-full px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm transition-all"
          />
        </div>

        {/* Artist Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-violet-400" />
            <span>Nome do Artista / Banda (Opcional)</span>
          </label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Ex: Chitãozinho & Xororó"
            className="w-full px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm transition-all"
          />
        </div>

        {/* Language Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5 text-violet-400" />
            <span>Idioma da Letra</span>
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm transition-all"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="bg-zinc-900 text-white">
                {l.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500 mt-1.5">
            Se deixado em automático, o Whisper detectará o idioma exato a partir das frequências vocais.
          </p>
        </div>

        {/* Intro Card Toggle */}
        <div className="pt-2">
          <label className="flex items-center space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showIntro}
              onChange={(e) => setShowIntro(e.target.checked)}
              className="w-4 h-4 rounded text-violet-600 bg-zinc-950 border-zinc-800 focus:ring-violet-500"
            />
            <span className="text-sm font-medium text-zinc-300">
              Exibir vinheta de abertura inicial com título e artista nos primeiros 4 segundos
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-between border-t border-zinc-800">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Voltar
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors flex items-center space-x-1.5"
            >
              <span>Pular</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs transition-all shadow-lg shadow-violet-600/30 hover:scale-[1.02] disabled:opacity-50"
            >
              <span>Continuar para Letra & IA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
