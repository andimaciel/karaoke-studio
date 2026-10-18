import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Sliders,
  Type,
  Palette,
  Image as ImageIcon,
  Check,
  ChevronRight,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Project, LyricLine, BackgroundConfig, StyleConfig } from '../types';
import { updateLyrics, uploadBackgroundMedia } from '../api';

interface KaraokeStudioEditorProps {
  project: Project;
  onProjectUpdated: (updatedProject: Project) => void;
  onProceedToExport: (background: BackgroundConfig, style: StyleConfig, audioType: string) => void;
  onBack: () => void;
}

export const KaraokeStudioEditor: React.FC<KaraokeStudioEditorProps> = ({
  project,
  onProjectUpdated,
  onProceedToExport,
  onBack,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(project.media?.duration || 180);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Audio track stem selector
  const [selectedStem, setSelectedStem] = useState<string>(
    project.separation?.instrumental_url ? 'instrumental' : 'original'
  );

  // Editable lines
  const [lines, setLines] = useState<LyricLine[]>(project.lyrics?.lines || []);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  // Styling
  const [activeTab, setActiveTab] = useState<'style' | 'lyrics' | 'background'>('lyrics');
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>({
    type: 'gradient',
    preset_name: 'neon',
    color: '#090a0f'
  });

  const [styleConfig, setStyleConfig] = useState<StyleConfig>({
    font_name: 'Arial',
    font_size: 48,
    primary_color: '&H00FFFFFF', // White
    karaoke_color: '&H00D946EF', // Vibrant Magenta
    alignment: 2, // Bottom center
    margin_v: 60
  });

  const [sungHexColor, setSungHexColor] = useState('#d946ef');
  const [unsungHexColor, setUnsungHexColor] = useState('#ffffff');
  const [fontSizePx, setFontSizePx] = useState(36);
  const [alignmentPos, setAlignmentPos] = useState<'bottom' | 'center'>('bottom');

  // Background presets
  const backgroundPresets = [
    { id: 'neon', name: 'Neon Studio', style: 'linear-gradient(135deg, #090a0f 0%, #1e1136 50%, #0d0f22 100%)' },
    { id: 'amethyst', name: 'Ametista Profunda', style: 'linear-gradient(135deg, #120b24 0%, #29124e 50%, #110926 100%)' },
    { id: 'midnight', name: 'Azul Meia-Noite', style: 'linear-gradient(135deg, #060d1f 0%, #0c1c40 50%, #040916 100%)' },
    { id: 'emerald', name: 'Esmeralda Dark', style: 'linear-gradient(135deg, #061917 0%, #0c332e 50%, #041412 100%)' },
    { id: 'solid_black', name: 'Preto Absoluto', style: '#000000' }
  ];

  // Colors for sung highlight
  const highlightColors = [
    { name: 'Magenta Neon', hex: '#d946ef', ass: '&H00D946EF' },
    { name: 'Ciano Elétrico', hex: '#06b6d4', ass: '&H00D4B606' },
    { name: 'Amarelo Ouro', hex: '#facc15', ass: '&H0015CCFA' },
    { name: 'Verde Neon', hex: '#10b981', ass: '&H0081B910' },
    { name: 'Vermelho Fogo', hex: '#ef4444', ass: '&H004444EF' }
  ];

  // Resolve current active audio URL based on selected stem
  const getAudioUrl = () => {
    if (selectedStem === 'instrumental' && project.separation?.instrumental_url) {
      return project.separation.instrumental_url;
    }
    if (selectedStem === 'vocals' && project.separation?.vocals_url) {
      return project.separation.vocals_url;
    }
    if (selectedStem === 'lead_vocals' && project.separation?.lead_vocals_url) {
      return project.separation.lead_vocals_url;
    }
    return project.media?.audio_url || '';
  };

  const currentAudioUrl = getAudioUrl();

  // Playback handlers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || duration);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  // Find currently active line and next line
  const activeLineIndex = lines.findIndex(
    (l) => currentTime >= l.start && currentTime <= l.end
  );
  const activeLine = activeLineIndex !== -1 ? lines[activeLineIndex] : null;
  const nextLine = activeLineIndex !== -1 && activeLineIndex + 1 < lines.length
    ? lines[activeLineIndex + 1]
    : (!activeLine ? lines.find((l) => l.start > currentTime) : null);

  // Line editing
  const handleLineTextChange = (lineId: string, newText: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id === lineId) {
          const words = newText.split(' ').map((w, idx) => ({
            word: w,
            start: l.start + (idx * ((l.end - l.start) / Math.max(1, newText.split(' ').length))),
            end: l.start + ((idx + 1) * ((l.end - l.start) / Math.max(1, newText.split(' ').length))),
          }));
          return { ...l, text: newText, words };
        }
        return l;
      })
    );
  };

  const handleShiftAllTiming = (offset: number) => {
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        start: Math.max(0, Number((l.start + offset).toFixed(2))),
        end: Math.max(0.1, Number((l.end + offset).toFixed(2))),
        words: l.words.map((w) => ({
          ...w,
          start: Math.max(0, Number((w.start + offset).toFixed(2))),
          end: Math.max(0.1, Number((w.end + offset).toFixed(2))),
        }))
      }))
    );
  };

  const handleSaveLyrics = async () => {
    try {
      const updated = await updateLyrics(project.id, lines);
      onProjectUpdated(updated);
      alert('Alterações nas letras salvas com sucesso!');
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar letra.');
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const res = await uploadBackgroundMedia(project.id, file);
      setBackgroundConfig({
        type: res.type,
        url: res.url,
        image_path: res.type === 'image' ? res.path : undefined,
        video_path: res.type === 'video' ? res.path : undefined,
      });
    } catch (err: any) {
      alert('Erro ao enviar arquivo de fundo.');
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={currentAudioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top Bar: Title & Action to Render */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">
            Estúdio Karaokê
          </span>
          <h1 className="text-xl font-bold text-white">
            {project.song_info?.title || 'Minha Música'}
            {project.song_info?.artist && (
              <span className="text-zinc-400 font-normal ml-2">— {project.song_info.artist}</span>
            )}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Voltar
          </button>

          <button
            onClick={() => onProceedToExport(backgroundConfig, styleConfig, selectedStem)}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:scale-[1.02] text-white font-bold text-xs transition-all shadow-lg shadow-violet-600/30 cursor-pointer"
          >
            <span>Avançar para Renderização MP4</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Live Preview (Left) + Studio Tools (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Karaoke Screen & Audio Controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* Karaoke Screen Simulation */}
          <div
            className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-between p-6 select-none transition-all"
            style={{
              background:
                backgroundConfig.type === 'solid'
                  ? backgroundConfig.color
                  : backgroundConfig.type === 'gradient'
                  ? backgroundPresets.find((p) => p.id === backgroundConfig.preset_name)?.style || '#090a0f'
                  : backgroundConfig.url
                  ? `url(${backgroundConfig.url}) center/cover no-repeat`
                  : '#090a0f'
            }}
          >
            {/* Background Video (if selected) */}
            {backgroundConfig.type === 'video' && backgroundConfig.url && (
              <video
                src={backgroundConfig.url}
                autoPlay
                loop
                muted
                className="absolute inset-0 w-full h-full object-cover -z-0"
              />
            )}

            {/* Dark tint overlay for readability */}
            <div className="absolute inset-0 bg-black/40 -z-0" />

            {/* Intro Card Overlay (first 4s) */}
            {project.song_info?.show_intro && currentTime < 4 && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity">
                <span className="text-xs uppercase font-extrabold tracking-widest text-violet-400 mb-1">
                  KARAOKÊ
                </span>
                <h2 className="text-3xl font-black text-white text-center px-4 mb-2">
                  {project.song_info?.title}
                </h2>
                <h3 className="text-lg text-violet-300 font-semibold text-center">
                  {project.song_info?.artist}
                </h3>
                <div className="flex items-center space-x-1.5 mt-4">
                  {[0, 1, 2, 3].map((dot) => (
                    <div
                      key={dot}
                      className={`w-2.5 h-2.5 rounded-full ${
                        currentTime >= dot ? 'bg-fuchsia-500 scale-125' : 'bg-zinc-700'
                      } transition-all`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Header info */}
            <div className="relative z-10 flex items-center justify-between text-xs text-white/70">
              <span className="font-semibold tracking-wide">
                {project.song_info?.title}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 font-mono text-[10px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Lyrics View Area */}
            <div
              className={`relative z-10 flex flex-col transition-all text-center px-4 ${
                alignmentPos === 'center' ? 'my-auto' : 'mb-6'
              }`}
            >
              {activeLine ? (
                <div className="space-y-3">
                  {/* Current Active Line with Word-by-Word Highlight */}
                  <div
                    className="font-extrabold tracking-tight leading-tight flex flex-wrap items-center justify-center gap-x-2"
                    style={{ fontSize: `${fontSizePx}px` }}
                  >
                    {activeLine.words && activeLine.words.length > 0 ? (
                      activeLine.words.map((w, idx) => {
                        const isSung = currentTime >= w.start;
                        const isSingingNow = currentTime >= w.start && currentTime <= w.end;

                        return (
                          <span
                            key={idx}
                            style={{
                              color: isSung ? sungHexColor : unsungHexColor,
                              textShadow: isSingingNow
                                ? `0 0 20px ${sungHexColor}, 0 0 35px ${sungHexColor}`
                                : '0 2px 8px rgba(0,0,0,0.8)'
                            }}
                            className={`transition-all duration-75 inline-block ${
                              isSingingNow ? 'scale-110 font-black' : ''
                            }`}
                          >
                            {w.word}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ color: sungHexColor }}>{activeLine.text}</span>
                    )}
                  </div>

                  {/* Upcoming Next Line */}
                  {nextLine && (
                    <div
                      className="text-sm sm:text-base font-medium text-white/50 tracking-normal transition-all"
                    >
                      {nextLine.text}
                    </div>
                  )}
                </div>
              ) : nextLine ? (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest animate-pulse">
                    Preparar...
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-white/70">
                    {nextLine.text}
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 text-sm font-medium">
                  {lines.length === 0 ? 'Nenhuma letra carregada' : 'Aguardando início do verso...'}
                </div>
              )}
            </div>

            {/* Bottom screen status */}
            <div className="relative z-10 flex items-center justify-between text-[11px] text-white/40">
              <span>Faixa: {selectedStem.toUpperCase()}</span>
              <span>1080p 16:9</span>
            </div>
          </div>

          {/* Audio Player Controls */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            {/* Timeline seek bar */}
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-zinc-400 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="flex-1 accent-violet-500 h-1.5 rounded-lg bg-zinc-800 cursor-pointer"
              />
              <span className="text-xs font-mono text-zinc-400 w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Action buttons & stem selector */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Stem selector */}
              <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                {project.separation?.instrumental_url && (
                  <button
                    onClick={() => setSelectedStem('instrumental')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      selectedStem === 'instrumental'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Instrumental
                  </button>
                )}
                {project.separation?.vocals_url && (
                  <button
                    onClick={() => setSelectedStem('vocals')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      selectedStem === 'vocals'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Vocais
                  </button>
                )}
                {project.separation?.lead_vocals_url && (
                  <button
                    onClick={() => setSelectedStem('lead_vocals')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      selectedStem === 'lead_vocals'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Voz Solo
                  </button>
                )}
                <button
                  onClick={() => setSelectedStem('original')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    selectedStem === 'original'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Original
                </button>
              </div>

              {/* Playback trigger */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => seekTo(0)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
                  title="Reiniciar"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 transition-transform hover:scale-105"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                {/* Volume slider */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-zinc-400 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 accent-violet-500 h-1 rounded-lg bg-zinc-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Studio Customization & Lyric Editor Tabs */}
        <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between space-y-4 backdrop-blur-md">
          {/* Tabs */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all text-center ${
                activeTab === 'lyrics' ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Linhas da Letra ({lines.length})
            </button>
            <button
              onClick={() => setActiveTab('style')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all text-center ${
                activeTab === 'style' ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tipografia & Cores
            </button>
            <button
              onClick={() => setActiveTab('background')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all text-center ${
                activeTab === 'background' ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Plano de Fundo
            </button>
          </div>

          {/* TAB 1: LYRICS & TIMING */}
          {activeTab === 'lyrics' && (
            <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                <span className="text-zinc-400">Clique na linha para ouvir o trecho:</span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleShiftAllTiming(-0.2)}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px]"
                    title="Adiantar toda a letra em 0.2s"
                  >
                    -0.2s
                  </button>
                  <button
                    onClick={() => handleShiftAllTiming(0.2)}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px]"
                    title="Atrasar toda a letra em 0.2s"
                  >
                    +0.2s
                  </button>
                  <button
                    onClick={handleSaveLyrics}
                    className="px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-[10px]"
                  >
                    Salvar
                  </button>
                </div>
              </div>

              {/* Scrollable list of lines */}
              <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
                {lines.map((line, idx) => {
                  const isActive = activeLine?.id === line.id;

                  return (
                    <div
                      key={line.id}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        isActive
                          ? 'border-violet-500/60 bg-violet-950/30 ring-1 ring-violet-500/30'
                          : 'border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-950/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <button
                          onClick={() => seekTo(line.start)}
                          className="flex items-center space-x-1 text-violet-400 hover:text-violet-300 font-mono font-bold text-[11px]"
                        >
                          <Play className="w-3 h-3 fill-violet-400" />
                          <span>{formatTime(line.start)} - {formatTime(line.end)}</span>
                        </button>
                        <span className="text-[10px] text-zinc-500 font-mono">#{idx + 1}</span>
                      </div>

                      <input
                        type="text"
                        value={line.text}
                        onChange={(e) => handleLineTextChange(line.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-violet-500 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY & COLORS */}
          {activeTab === 'style' && (
            <div className="space-y-4 flex-1">
              {/* Highlight Color */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Cor da Palavra Cantada (Karaokê Glow):
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {highlightColors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setSungHexColor(c.hex);
                        setStyleConfig((s) => ({ ...s, karaoke_color: c.ass }));
                      }}
                      className={`h-9 rounded-xl flex items-center justify-center border transition-all ${
                        sungHexColor === c.hex ? 'border-white scale-105 shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {sungHexColor === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Tamanho da Letra ({fontSizePx}px):
                </label>
                <input
                  type="range"
                  min="24"
                  max="64"
                  step="2"
                  value={fontSizePx}
                  onChange={(e) => {
                    const sz = parseInt(e.target.value);
                    setFontSizePx(sz);
                    setStyleConfig((s) => ({ ...s, font_size: sz }));
                  }}
                  className="w-full accent-violet-500 h-1.5 rounded-lg bg-zinc-800 cursor-pointer"
                />
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Posição da Letra na Tela:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setAlignmentPos('bottom');
                      setStyleConfig((s) => ({ ...s, alignment: 2 }));
                    }}
                    className={`py-2 rounded-xl border font-medium transition-all ${
                      alignmentPos === 'bottom'
                        ? 'border-violet-500 bg-violet-600/20 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    Inferior (Padrão TV)
                  </button>
                  <button
                    onClick={() => {
                      setAlignmentPos('center');
                      setStyleConfig((s) => ({ ...s, alignment: 5 }));
                    }}
                    className={`py-2 rounded-xl border font-medium transition-all ${
                      alignmentPos === 'center'
                        ? 'border-violet-500 bg-violet-600/20 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    Centro da Tela
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKGROUND */}
          {activeTab === 'background' && (
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Temas de Fundo em Gradiente:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {backgroundPresets.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() =>
                        setBackgroundConfig({
                          type: 'gradient',
                          preset_name: bg.id,
                        })
                      }
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                        backgroundConfig.preset_name === bg.id
                          ? 'border-violet-500 ring-2 ring-violet-500/30 text-white'
                          : 'border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                      style={{ background: bg.style }}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image / Video Upload */}
              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Ou Envie Imagem / Vídeo de Fundo:
                </label>
                <label className="flex items-center justify-center space-x-2 py-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 transition-colors">
                  <ImageIcon className="w-4 h-4 text-violet-400" />
                  <span>Escolher Imagem (JPG, PNG) ou Vídeo (MP4)</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
