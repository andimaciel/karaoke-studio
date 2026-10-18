import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Music,
  Film,
  Disc,
  Users,
  Sparkles,
  FileText,
  Sliders,
  CheckCircle2,
  Video,
  Download,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Globe,
  User,
  Music2,
  Check,
  Cpu,
  Cloud,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Settings,
  Edit3,
  Save,
  Clock,
  ArrowRight,
  X,
  Type,
  Layers
} from 'lucide-react';
import { Project, BackgroundConfig, StyleConfig, AppSettings, LyricLine } from '../types';
import {
  uploadMediaFile,
  updateSongInfo,
  uploadLogoImage,
  startSeparation,
  startTranscription,
  alignLyrics,
  updateLyrics,
  uploadSrtFile,
  uploadBackgroundMedia,
  renderKaraokeVideo,
  getProject,
  getAppSettings,
  API_BASE
} from '../api';

// Presets & Colors
export const backgroundPresets = [
  { id: 'neon', name: 'Neon Studio', style: 'linear-gradient(135deg, #090a0f 0%, #1e1136 50%, #0d0f22 100%)' },
  { id: 'amethyst', name: 'Ametista', style: 'linear-gradient(135deg, #120b24 0%, #29124e 50%, #110926 100%)' },
  { id: 'midnight', name: 'Azul Meia-Noite', style: 'linear-gradient(135deg, #060d1f 0%, #0c1c40 50%, #040916 100%)' },
  { id: 'emerald', name: 'Esmeralda Dark', style: 'linear-gradient(135deg, #061917 0%, #0c332e 50%, #041412 100%)' },
  { id: 'solid_black', name: 'Preto Total', style: '#000000' }
];

export const highlightColors = [
  { name: 'Magenta Neon', hex: '#d946ef', ass: '&H00D946EF' },
  { name: 'Ciano Elétrico', hex: '#06b6d4', ass: '&H00D4B606' },
  { name: 'Amarelo Ouro', hex: '#facc15', ass: '&H0015CCFA' },
  { name: 'Verde Neon', hex: '#10b981', ass: '&H0081B910' },
  { name: 'Vermelho Fogo', hex: '#ef4444', ass: '&H004444EF' }
];

interface UnifiedStudioProps {
  initialProject: Project | null;
  onProjectSaved: (project: Project) => void;
  onOpenSettings: () => void;
  onOpenProjects: () => void;
}

export const UnifiedStudio: React.FC<UnifiedStudioProps> = ({
  initialProject,
  onProjectSaved,
}) => {
  const loadedProjectIdRef = useRef<string | null>(initialProject?.id || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const srtFileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);

  // Project state
  const [project, setProject] = useState<Project | null>(initialProject);
  const [renderVersion, setRenderVersion] = useState<number>(Date.now());
  const [isUploadingSrt, setIsUploadingSrt] = useState(false);
  const [globalFeedback, setGlobalFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Configurações Avançadas
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(true);
  const [keepBackingVocals, setKeepBackingVocals] = useState(false);
  const [lyricsSyncModel, setLyricsSyncModel] = useState<string>('whisper');
  const [vocalSeparationModel, setVocalSeparationModel] = useState<string>('mdx_net_inst');

  // Step 2: Song Info & Opening Vinheta
  const [title, setTitle] = useState(initialProject?.song_info?.title || '');
  const [artist, setArtist] = useState(initialProject?.song_info?.artist || '');
  const [language, setLanguage] = useState(initialProject?.song_info?.language || 'auto');
  const [showIntro, setShowIntro] = useState(initialProject?.song_info?.show_intro ?? true);
  const [introMode, setIntroMode] = useState<'none' | 'text' | 'logo' | 'both'>(
    initialProject?.song_info?.intro_mode || (initialProject?.song_info?.show_intro === false ? 'none' : 'text')
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(initialProject?.song_info?.logo_url || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Vocal Separation
  const [separationMode, setSeparationMode] = useState<string>('instrumental_clean');
  const [provider, setProvider] = useState<'local' | 'audioshake'>('local');

  // Step 4: Lyrics & Interactive Verification
  const [lyricsMode, setLyricsMode] = useState<'whisper' | 'manual'>('manual');
  const [manualLyricsText, setManualLyricsText] = useState<string>(
    initialProject?.lyrics?.full_text || ''
  );
  const [lines, setLines] = useState<LyricLine[]>(initialProject?.lyrics?.lines || []);
  const [isSyncingLyrics, setIsSyncingLyrics] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSavingLyrics, setIsSavingLyrics] = useState(false);
  const [lyricsSaveSuccess, setLyricsSaveSuccess] = useState(false);
  const [forceRealign, setForceRealign] = useState(false);
  const [selectedLineIdx, setSelectedLineIdx] = useState<number>(0);
  const [customOffsetSec, setCustomOffsetSec] = useState<string>('0.2');
  const [showRawLyrics, setShowRawLyrics] = useState(false);
  const [expandedLineIdx, setExpandedLineIdx] = useState<number | null>(null);
  const [cascadeWordsInLine, setCascadeWordsInLine] = useState(true);

  // Step 5: Visual Styling
  const [bgMode, setBgMode] = useState<'preset' | 'custom'>('preset');
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [bgUploadError, setBgUploadError] = useState<string | null>(null);
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>({
    type: 'gradient',
    preset_name: 'neon',
    color: '#090a0f'
  });
  const [karaokeEffect, setKaraokeEffect] = useState<'smooth' | 'step'>('smooth');
  const [styleConfig, setStyleConfig] = useState<StyleConfig>({
    font_name: 'Arial',
    font_size: 48,
    primary_color: '&H00FFFFFF',
    karaoke_color: '&H00D946EF',
    alignment: 2,
    margin_v: 60,
    karaoke_effect: 'smooth'
  });
  const [sungHexColor, setSungHexColor] = useState('#d946ef');
  const [alignmentPos, setAlignmentPos] = useState<'bottom' | 'center'>('bottom');

  // Pipeline execution & rendering state
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<string>('');
  const [pipelineProgress, setPipelineProgress] = useState<number>(0);
  const [pipelineMessage, setPipelineMessage] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Live Audio Preview & Scrubber State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewAudioSource, setPreviewAudioSource] = useState<'original' | 'instrumental'>('original');

  // App settings for AudioShake
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getAppSettings().then(setAppSettings).catch(console.error);
  }, []);

  useEffect(() => {
    if (!initialProject) return;

    if (initialProject.id !== loadedProjectIdRef.current) {
      loadedProjectIdRef.current = initialProject.id;
      setProject(initialProject);
      setTitle(initialProject.song_info?.title || '');
      setArtist(initialProject.song_info?.artist || '');
      setLanguage(initialProject.song_info?.language || 'auto');
      setShowIntro(initialProject.song_info?.show_intro ?? true);
      if (initialProject.song_info?.intro_mode) {
        setIntroMode(initialProject.song_info.intro_mode);
      } else if (initialProject.song_info?.show_intro === false) {
        setIntroMode('none');
      } else {
        setIntroMode('text');
      }
      setLogoUrl(initialProject.song_info?.logo_url || null);
      setManualLyricsText(initialProject.lyrics?.full_text || '');
      setLines(initialProject.lyrics?.lines || []);
      if (initialProject.separation?.mode === 'instrumental_with_backing') {
        setKeepBackingVocals(true);
        setVocalSeparationModel('mdx_net_kara');
      } else if (initialProject.separation?.mode === 'original') {
        setKeepBackingVocals(false);
        setVocalSeparationModel('original');
      } else {
        setKeepBackingVocals(false);
        setVocalSeparationModel('mdx_net_inst');
      }
      if (initialProject.style) {
        setStyleConfig(initialProject.style);
        if (initialProject.style.karaoke_effect) {
          setKaraokeEffect(initialProject.style.karaoke_effect);
        }
        if (initialProject.style.karaoke_color) {
          const matched = highlightColors.find((c) => c.ass === initialProject.style?.karaoke_color);
          if (matched) setSungHexColor(matched.hex);
        }
      }
      if (initialProject.background) {
        setBackgroundConfig(initialProject.background);
        if (initialProject.background.type === 'image' || initialProject.background.type === 'video') {
          setBgMode('custom');
        } else {
          setBgMode('preset');
        }
      }
    } else {
      // Incremental updates for the SAME project:
      // Preserve active user form inputs (title, artist, font, size, outline, background), only merge project status
      setProject((prev) => (prev ? { ...prev, ...initialProject } : initialProject));
      if (initialProject.song_info?.logo_url && !logoUrl) {
        setLogoUrl(initialProject.song_info.logo_url);
      }
    }
  }, [initialProject]);

  // Audio Playback Handler
  const togglePlayAudio = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingAudio) {
      audioPreviewRef.current.pause();
    } else {
      audioPreviewRef.current.play();
    }
    setIsPlayingAudio(!isPlayingAudio);
  };

  const handlePlayLine = (startSec: number) => {
    if (!audioPreviewRef.current) return;
    audioPreviewRef.current.currentTime = Math.max(0, startSec);
    audioPreviewRef.current.play();
    setIsPlayingAudio(true);
  };

  // Upload Handler (Supports Click & Drag & Drop)
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploading(true);
    setUploadError(null);

    try {
      const newProj = await uploadMediaFile(file);
      setProject(newProj);
      setTitle(newProj.song_info?.title || file.name.replace(/\.[^/.]+$/, ''));
      setArtist(newProj.song_info?.artist || '');
      onProjectSaved(newProj);
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao carregar arquivo de áudio.');
    } finally {
      setIsUploading(false);
    }
  };

  // Custom Background Upload
  const handleBackgroundUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!project) {
      alert('Por favor, envie o áudio no Passo 1 primeiro antes de adicionar o fundo personalizado.');
      return;
    }

    const file = files[0];
    setIsUploadingBg(true);
    setBgUploadError(null);

    try {
      const res = await uploadBackgroundMedia(project.id, file);
      setBackgroundConfig({
        type: res.type,
        image_path: res.type === 'image' ? res.path : undefined,
        video_path: res.type === 'video' ? res.path : undefined,
        url: res.url,
      });
      setBgMode('custom');
    } catch (err: any) {
      setBgUploadError(err.message || 'Erro ao carregar fundo personalizado.');
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleRemoveCustomBackground = () => {
    setBgMode('preset');
    setBackgroundConfig({
      type: 'gradient',
      preset_name: 'neon',
      color: '#090a0f',
    });
  };

  // Custom Band/Artist Logo Upload
  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!project) {
      alert('Envie seu arquivo de áudio no Passo 1 primeiro antes de adicionar a logo da banda.');
      return;
    }

    const file = files[0];
    setIsUploadingLogo(true);
    setLogoUploadError(null);

    try {
      const res = await uploadLogoImage(project.id, file);
      setLogoUrl(res.url);
      setProject((prev) =>
        prev
          ? {
              ...prev,
              song_info: {
                ...prev.song_info,
                logo_url: res.url,
                logo_path: res.path,
              },
            }
          : prev
      );
    } catch (err: any) {
      setLogoUploadError(err.message || 'Erro ao carregar a logo da banda.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = '';
    }
  };


  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // Sync / Align Lyrics for Interactive Verification
  const handleSyncLyricsOnly = async () => {
    if (!project) {
      alert('Envie um arquivo de áudio no Passo 1 primeiro.');
      return;
    }

    setIsSyncingLyrics(true);
    setSyncError(null);

    try {
      // 1. Update song info
      await updateSongInfo(project.id, {
        title: title || 'Minha Música',
        artist: artist,
        language: language,
        show_intro: introMode !== 'none',
        intro_mode: introMode,
        logo_url: logoUrl || undefined,
      });

      if (manualLyricsText.trim()) {
        const res = await alignLyrics(project.id, manualLyricsText);
        setProject(res);
        setLines(res.lyrics?.lines || []);
      } else {
        await startTranscription(project.id, language, 'base', false);
        // Poll for transcription
        let done = false;
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const p = await getProject(project.id);
          if (p.status === 'transcribed') {
            setProject(p);
            setLines(p.lyrics?.lines || []);
            done = true;
            break;
          }
          if (p.status === 'error') {
            throw new Error(p.message || 'Erro na transcrição.');
          }
        }
        if (!done) throw new Error('Tempo limite excedido na transcrição.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Erro ao sincronizar letra.');
    } finally {
      setIsSyncingLyrics(false);
    }
  };

  // Line-by-Line Lyrics Editing
  const handleUpdateLineText = (index: number, newText: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text: newText };
      return next;
    });
  };

  const handleAdjustTiming = (index: number, startDelta: number, endDelta: number) => {
    setLines((prev) => {
      const next = [...prev];
      const cur = next[index];
      const newStart = Math.max(0, Number((cur.start + startDelta).toFixed(2)));
      const newEnd = Math.max(newStart + 0.3, Number((cur.end + endDelta).toFixed(2)));

      const oldDur = Math.max(0.1, cur.end - cur.start);
      const newDur = Math.max(0.1, newEnd - newStart);
      const scale = newDur / oldDur;

      const updatedWords = (cur.words || []).map((w) => {
        const offsetStart = (w.start - cur.start) * scale;
        const offsetEnd = (w.end - cur.start) * scale;
        const wStart = Math.max(0, Number((newStart + offsetStart).toFixed(2)));
        const wEnd = Math.max(wStart + 0.05, Number((newStart + offsetEnd).toFixed(2)));
        return { ...w, start: wStart, end: wEnd };
      });

      next[index] = { ...cur, start: newStart, end: newEnd, words: updatedWords };
      return next;
    });
  };

  // Desloca todas as estrofes e palavras com offset global (adiantar/atrasar tudo)
  const handleShiftAllTiming = (offset: number) => {
    setLines((prev) =>
      prev.map((l) => {
        const newStart = Math.max(0, Number((l.start + offset).toFixed(2)));
        const newEnd = Math.max(newStart + 0.3, Number((l.end + offset).toFixed(2)));
        const updatedWords = (l.words || []).map((w) => ({
          ...w,
          start: Math.max(0, Number((w.start + offset).toFixed(2))),
          end: Math.max(0.05, Number((w.end + offset).toFixed(2))),
        }));
        return { ...l, start: newStart, end: newEnd, words: updatedWords };
      })
    );
  };

  // Marca início da estrofe selecionada no tempo exato da reprodução de áudio
  const handleTapSync = (lineIdx: number) => {
    if (!audioPreviewRef.current) return;
    const tapTime = Number(audioPreviewRef.current.currentTime.toFixed(2));
    setLines((prev) => {
      if (lineIdx < 0 || lineIdx >= prev.length) return prev;
      const next = [...prev];
      const cur = next[lineIdx];
      const dur = Math.max(1.0, cur.end - cur.start);
      const newStart = tapTime;
      const newEnd = Number((tapTime + dur).toFixed(2));
      const shift = newStart - cur.start;

      const updatedWords = (cur.words || []).map((w) => ({
        ...w,
        start: Math.max(0, Number((w.start + shift).toFixed(2))),
        end: Math.max(0.05, Number((w.end + shift).toFixed(2))),
      }));

      next[lineIdx] = { ...cur, start: newStart, end: newEnd, words: updatedWords };
      return next;
    });
  };

  // Ajuste fino individual ou em cascata de tempo e duração de palavras na mesma estrofe
  const handleAdjustWordTiming = (
    lineIdx: number,
    wordIdx: number,
    deltaStart: number,
    deltaDur: number,
    customCascade?: boolean
  ) => {
    const isCascade = customCascade !== undefined ? customCascade : cascadeWordsInLine;
    setLines((prev) => {
      if (lineIdx < 0 || lineIdx >= prev.length) return prev;
      const next = [...prev];
      const curLine = next[lineIdx];
      if (!curLine.words || wordIdx < 0 || wordIdx >= curLine.words.length) return prev;

      const updatedWords = curLine.words.map((w) => ({ ...w }));
      const curWord = updatedWords[wordIdx];
      const oldStart = curWord.start;
      const oldDur = Math.max(0.05, Number((curWord.end - curWord.start).toFixed(2)));

      // Novo início e duração da palavra selecionada
      const newStart = Math.max(0, Number((oldStart + deltaStart).toFixed(2)));
      const newDur = Math.max(0.05, Number((oldDur + deltaDur).toFixed(2)));
      const newEnd = Number((newStart + newDur).toFixed(2));
      const actualDeltaStart = Number((newStart - oldStart).toFixed(2));
      const actualDeltaDur = Number((newDur - oldDur).toFixed(2));

      updatedWords[wordIdx] = { ...curWord, start: newStart, end: newEnd };

      // Se a palavra anterior terminar depois do novo início, ajusta o término da anterior para não sobrepor
      if (wordIdx > 0 && updatedWords[wordIdx - 1].end > newStart) {
        updatedWords[wordIdx - 1].end = Math.max(
          updatedWords[wordIdx - 1].start + 0.05,
          newStart
        );
      }

      // Propagação em Cascata: ajusta todas as palavras seguintes apenas na mesma estrofe
      if (isCascade) {
        const totalShift = Number((actualDeltaStart + actualDeltaDur).toFixed(2));
        if (totalShift !== 0) {
          for (let k = wordIdx + 1; k < updatedWords.length; k++) {
            const nextWord = updatedWords[k];
            const nextDur = Math.max(0.05, Number((nextWord.end - nextWord.start).toFixed(2)));
            const shiftedStart = Math.max(newEnd, Number((nextWord.start + totalShift).toFixed(2)));
            const shiftedEnd = Number((shiftedStart + nextDur).toFixed(2));
            updatedWords[k] = {
              ...nextWord,
              start: shiftedStart,
              end: shiftedEnd,
            };
          }
        }
      } else {
        // Sem cascata: garante que palavras seguintes não fiquem antes do fim da palavra atual
        for (let k = wordIdx + 1; k < updatedWords.length; k++) {
          if (updatedWords[k].start < updatedWords[k - 1].end) {
            const dur = Math.max(0.05, Number((updatedWords[k].end - updatedWords[k].start).toFixed(2)));
            updatedWords[k].start = updatedWords[k - 1].end;
            updatedWords[k].end = Number((updatedWords[k].start + dur).toFixed(2));
          }
        }
      }

      // Atualiza os limites da estrofe inteira para acompanhar todas as palavras
      const minStart = Math.min(...updatedWords.map((w) => w.start));
      const maxEnd = Math.max(...updatedWords.map((w) => w.end));
      const finalStart = Math.min(curLine.start, minStart);
      const finalEnd = Math.max(curLine.end, Number((maxEnd + 0.3).toFixed(2)));

      next[lineIdx] = {
        ...curLine,
        start: finalStart,
        end: finalEnd,
        words: updatedWords,
      };
      return next;
    });
  };

  // Marca início da palavra selecionada no tempo atual da reprodução (Tap-to-Sync Palavra)
  // com ajuste em cascata para as palavras seguintes da mesma estrofe
  const handleWordTapSync = (lineIdx: number, wordIdx: number) => {
    if (!audioPreviewRef.current) return;
    const tapTime = Number(audioPreviewRef.current.currentTime.toFixed(2));
    setLines((prev) => {
      if (lineIdx < 0 || lineIdx >= prev.length) return prev;
      const next = [...prev];
      const curLine = next[lineIdx];
      if (!curLine.words || wordIdx < 0 || wordIdx >= curLine.words.length) return prev;

      const updatedWords = curLine.words.map((w) => ({ ...w }));
      const curWord = updatedWords[wordIdx];
      const oldStart = curWord.start;
      const curDur = Math.max(0.05, Number((curWord.end - curWord.start).toFixed(2)));
      const shift = Number((tapTime - oldStart).toFixed(2));

      // Atualiza a palavra clicada
      const newStart = tapTime;
      const newEnd = Number((tapTime + curDur).toFixed(2));
      updatedWords[wordIdx] = { ...curWord, start: newStart, end: newEnd };

      // Se a palavra anterior ultrapassar o novo início, ajusta a anterior
      if (wordIdx > 0 && updatedWords[wordIdx - 1].end > newStart) {
        updatedWords[wordIdx - 1].end = Math.max(
          updatedWords[wordIdx - 1].start + 0.05,
          newStart
        );
      }

      // Propaga o deslocamento em cascata para as palavras seguintes da mesma estrofe
      if (cascadeWordsInLine && shift !== 0) {
        for (let k = wordIdx + 1; k < updatedWords.length; k++) {
          const nextWord = updatedWords[k];
          const nextDur = Math.max(0.05, Number((nextWord.end - nextWord.start).toFixed(2)));
          const shiftedStart = Math.max(newEnd, Number((nextWord.start + shift).toFixed(2)));
          const shiftedEnd = Number((shiftedStart + nextDur).toFixed(2));
          updatedWords[k] = {
            ...nextWord,
            start: shiftedStart,
            end: shiftedEnd,
          };
        }
      }

      const minStart = Math.min(...updatedWords.map((w) => w.start));
      const maxEnd = Math.max(...updatedWords.map((w) => w.end));
      const finalStart = Math.min(curLine.start, minStart);
      const finalEnd = Math.max(curLine.end, Number((maxEnd + 0.3).toFixed(2)));

      next[lineIdx] = {
        ...curLine,
        start: finalStart,
        end: finalEnd,
        words: updatedWords,
      };
      return next;
    });
  };

  // Divide o texto da estrofe em palavras automaticamente caso ainda não existam palavras
  const handleGenerateWordsFromLine = (lineIdx: number) => {
    setLines((prev) => {
      if (lineIdx < 0 || lineIdx >= prev.length) return prev;
      const next = [...prev];
      const curLine = next[lineIdx];
      const tokens = curLine.text.trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return prev;

      const lineDur = Math.max(0.5, curLine.end - curLine.start);
      const wordDur = lineDur / tokens.length;
      const words = tokens.map((t, i) => ({
        word: t,
        start: Number((curLine.start + i * wordDur).toFixed(2)),
        end: Number((curLine.start + (i + 1) * wordDur).toFixed(2)),
        score: 1.0,
      }));
      next[lineIdx] = { ...curLine, words };
      return next;
    });
  };

  const handleAddLine = (afterIndex: number) => {
    setLines((prev) => {
      const cur = prev[afterIndex];
      const newStart = cur ? Number((cur.end + 0.5).toFixed(2)) : 0;
      const newLine: LyricLine = {
        id: `line_${Date.now()}`,
        start: newStart,
        end: newStart + 3.5,
        text: 'Nova estrofe...',
        words: []
      };
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newLine);
      return next;
    });
  };

  const handleDeleteLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveLyrics = async () => {
    if (!project) return;
    setIsSavingLyrics(true);
    try {
      const updated = await updateLyrics(project.id, lines);
      setProject(updated);
      onProjectSaved(updated);
      setLyricsSaveSuccess(true);
      setTimeout(() => setLyricsSaveSuccess(false), 3000);
      setGlobalFeedback({
        type: 'info',
        title: 'Letra Salva com Sucesso',
        message: 'As alterações na letra foram salvas. Para atualizar o vídeo final com os novos tempos, clique em "Salvar e Gerar Vídeo".'
      });
    } catch (err: any) {
      setGlobalFeedback({
        type: 'error',
        title: 'Erro ao Salvar Letra',
        message: err.message || 'Falha ao salvar alterações na letra.'
      });
    } finally {
      setIsSavingLyrics(false);
    }
  };

  // Salva a letra atualizada e dispara a renderização direta do vídeo MP4
  const handleSaveAndGenerateVideo = async () => {
    if (!project) {
      alert('Por favor, envie um arquivo de áudio ou vídeo primeiro.');
      return;
    }
    setGlobalFeedback(null);
    try {
      setIsSavingLyrics(true);
      const updated = await updateLyrics(project.id, lines);
      setProject(updated);
      onProjectSaved(updated);
      setIsSavingLyrics(false);
      setLyricsSaveSuccess(true);
      setTimeout(() => setLyricsSaveSuccess(false), 2000);

      // Dispara a geração diretamente com as linhas atuais
      await handleGenerateKaraoke();
    } catch (err: any) {
      setIsSavingLyrics(false);
      setGlobalFeedback({
        type: 'error',
        title: 'Erro ao Salvar e Gerar Vídeo',
        message: err.message || 'Falha ao processar.'
      });
    }
  };

  // Upload e importação de arquivo de legendas .SRT
  const handleSrtUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.srt')) {
      alert('Por favor, selecione um arquivo válido com extensão .SRT.');
      return;
    }
    if (!project) {
      alert('Por favor, envie o áudio no Passo 1 ou carregue um projeto antes de importar legendas.');
      return;
    }

    setIsUploadingSrt(true);
    setGlobalFeedback(null);
    try {
      const updatedProj = await uploadSrtFile(project.id, file);
      setProject(updatedProj);
      onProjectSaved(updatedProj);
      const newLines = updatedProj.lyrics?.lines || [];
      setLines(newLines);
      setManualLyricsText(updatedProj.lyrics?.full_text || '');
      setShowRawLyrics(false);
      setLyricsMode('manual');
      setGlobalFeedback({
        type: 'success',
        title: 'Arquivo .SRT Importado com Sucesso!',
        message: `${newLines.length} estrofes e marcas de tempo foram carregadas. Você pode ajustar os tempos ou clicar direto em "Salvar e Gerar Vídeo".`
      });
    } catch (err: any) {
      setGlobalFeedback({
        type: 'error',
        title: 'Erro ao Importar .SRT',
        message: err.message || 'Não foi possível carregar as legendas do arquivo .SRT.'
      });
    } finally {
      setIsUploadingSrt(false);
      if (srtFileInputRef.current) srtFileInputRef.current.value = '';
    }
  };

  // Final Action: Render 1080p Video
  const handleGenerateKaraoke = async () => {
    if (!project) {
      alert('Por favor, envie um arquivo de áudio ou vídeo primeiro.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setPipelinePhase('Iniciando');
    setPipelineProgress(5);
    setPipelineMessage('Preparando configurações do karaokê...');

    try {
      // 1. Save metadata
      await updateSongInfo(project.id, {
        title: title || 'Minha Música',
        artist: artist,
        language: language,
        show_intro: introMode !== 'none',
        intro_mode: introMode,
        logo_url: logoUrl || undefined,
      });

      let currentProj = await getProject(project.id);

      // 2. Vocal Separation FIRST (so isolated vocals stem is ready for high-precision Whisper transcription!)
      const effectiveSepMode = keepBackingVocals ? 'instrumental_with_backing' : separationMode;

      if (effectiveSepMode !== 'original' && !currentProj.separation?.instrumental_url) {
        setPipelinePhase('Separação Vocal');
        setPipelineProgress(15);
        setPipelineMessage(`Isolando vocais e instrumentos (${effectiveSepMode})...`);
        await startSeparation(project.id, effectiveSepMode, provider);

        let sepDone = false;
        for (let i = 0; i < 200; i++) {
          await new Promise((r) => setTimeout(r, 2500));
          const p = await getProject(project.id);
          if (p.status === 'separated') {
            currentProj = p;
            sepDone = true;
            break;
          }
          if (p.status === 'error') {
            throw new Error(p.message || 'Erro na separação vocal.');
          }
          if (p.message) {
            setPipelineMessage(p.message);
          }
          setPipelineProgress(Math.min(50, 15 + Math.floor(i * 0.2)));
        }
        if (!sepDone) throw new Error('Tempo limite excedido na separação vocal.');
      }

      // 3. IA Lyrics Alignment / Transcription ON ISOLATED VOCALS
      if (lines.length > 0 && !forceRealign) {
        setPipelinePhase('Letra & Sincronia');
        setPipelineProgress(60);
        setPipelineMessage(`Utilizando ${lines.length} estrofes ajustadas na tela...`);
        currentProj = await updateLyrics(project.id, lines);
      } else if (lyricsMode === 'whisper' || !manualLyricsText.trim()) {
        setPipelinePhase('Transcrição IA');
        setPipelineProgress(55);
        setPipelineMessage('Transcrevendo e sincronizando palavras com faster-whisper IA (VAD ativo)...');
        await startTranscription(project.id, language, 'base', true);

        let done = false;
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const p = await getProject(project.id);
          if (p.status === 'transcribed') {
            currentProj = p;
            setLines(p.lyrics?.lines || []);
            done = true;
            break;
          }
          if (p.status === 'error') {
            throw new Error(p.message || 'Falha na transcrição.');
          }
          setPipelineProgress(55 + Math.min(18, Math.floor(i * 0.3)));
          setPipelineMessage(p.message || 'Alinhando palavras com IA...');
        }
        if (!done) throw new Error('Tempo limite excedido na transcrição.');
      } else {
        setPipelinePhase('Sincronização IA');
        setPipelineProgress(55);
        setPipelineMessage('Alinhando letra com a música via IA...');
        currentProj = await alignLyrics(project.id, manualLyricsText);
        setLines(currentProj.lyrics?.lines || []);
      }

      // 4. Render Video with FFmpeg
      setPipelinePhase('Renderização');
      setPipelineProgress(75);
      setPipelineMessage('Renderizando vídeo MP4 em 1080p com FFmpeg...');

      const audioType = (effectiveSepMode !== 'original' && currentProj.separation?.instrumental_url)
        ? 'instrumental'
        : 'original';

      await renderKaraokeVideo(
        project.id,
        audioType,
        backgroundConfig,
        styleConfig,
        lines
      );

      let renderDone = false;
      for (let i = 0; i < 300; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const p = await getProject(project.id);
        const rStatus = p.render?.status;

        if (p.render?.message) {
          setPipelineMessage(p.render.message);
        }
        if (typeof p.render?.progress === 'number') {
          setPipelineProgress(Math.min(99, 75 + Math.floor(p.render.progress * 0.24)));
        }

        if (rStatus === 'completed') {
          setProject(p);
          onProjectSaved(p);
          renderDone = true;
          setPipelineProgress(100);
          setPipelineMessage('Vídeo de karaokê pronto com sucesso!');
          setRenderVersion(Date.now());
          setGlobalFeedback({
            type: 'success',
            title: '🎉 Vídeo de Karaokê Atualizado com Sucesso!',
            message: 'O novo vídeo MP4 1080p foi renderizado com todas as alterações e tempos da letra sincronizada.'
          });
          setTimeout(() => {
            videoSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 300);
          break;
        }
        if (rStatus === 'error') {
          throw new Error(p.render?.message || 'Falha ao compilar vídeo MP4.');
        }
      }

      if (!renderDone) throw new Error('Tempo limite excedido na renderização.');
    } catch (err: any) {
      setGenerationError(err.message || 'Erro ao processar karaokê.');
      setGlobalFeedback({
        type: 'error',
        title: '❌ Erro na Geração do Vídeo',
        message: err.message || 'Ocorreu um erro ao processar o vídeo de karaokê com FFmpeg.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isVideoReady = Boolean(project?.render?.status === 'completed' && project?.render?.video_url);

  // Active audio URL for playback
  const activeAudioUrl = previewAudioSource === 'instrumental' && project?.separation?.instrumental_url
    ? `${API_BASE}${project.separation.instrumental_url}`
    : project?.media?.audio_url
    ? `${API_BASE}${project.media.audio_url}`
    : '';

  // Active line calculation for live karaoke visualizer
  const activeLineIndex = lines.findIndex((l) => currentTime >= l.start && currentTime <= l.end);
  const activeLine = activeLineIndex !== -1 ? lines[activeLineIndex] : null;
  const nextLine = activeLineIndex !== -1 && lines[activeLineIndex + 1] ? lines[activeLineIndex + 1] : null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 space-y-7">
      {/* Hidden audio element for preview */}
      {activeAudioUrl && (
        <audio
          ref={audioPreviewRef}
          src={activeAudioUrl}
          onTimeUpdate={() => setCurrentTime(audioPreviewRef.current?.currentTime || 0)}
          onEnded={() => setIsPlayingAudio(false)}
        />
      )}

      {/* Main Title Banner */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Crie seu Karaokê em <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Um Só Lugar</span>
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto">
          Arraste o arquivo, confira a letra e o karaokê em tempo real e gere seu vídeo profissional em 1080p.
        </p>
      </div>




      {/* Feedback Alert Banner (Sucesso / Erro) com Alta Visibilidade */}
      {globalFeedback && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border shadow-2xl backdrop-blur-md flex items-start justify-between gap-4 transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            globalFeedback.type === 'success'
              ? 'bg-emerald-950/85 border-emerald-500/60 shadow-emerald-950/50 text-emerald-100'
              : globalFeedback.type === 'info'
              ? 'bg-violet-950/85 border-violet-500/60 shadow-violet-950/50 text-violet-100'
              : 'bg-red-950/85 border-red-500/70 shadow-red-950/60 text-red-100'
          }`}
        >
          <div className="flex items-start space-x-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                globalFeedback.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : globalFeedback.type === 'info'
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                  : 'bg-red-500/20 border-red-500/40 text-red-400'
              }`}
            >
              {globalFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : globalFeedback.type === 'info' ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold flex items-center space-x-2">
                <span>{globalFeedback.title}</span>
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {globalFeedback.message}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {globalFeedback.type === 'success' && isVideoReady && (
              <button
                type="button"
                onClick={() => videoSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Assistir ao Vídeo
              </button>
            )}
            <button
              type="button"
              onClick={() => setGlobalFeedback(null)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED VIDEO PLAYER & DOWNLOADS (IF READY) */}
      {isVideoReady && (
        <div ref={videoSectionRef} className="p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border border-emerald-500/40 shadow-2xl backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-3 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Vídeo de Karaokê Concluído e Pronto para Cantar!
              </h2>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              1080p 30fps Full HD
            </span>
          </div>

          {/* In-Browser Video Player with cache busting */}
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative">
            <video
              key={renderVersion}
              controls
              src={`${API_BASE}${project?.render?.video_url}?v=${renderVersion}`}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Downloads Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <a
              href={`${API_BASE}/api/project/${project?.id}/export/mp4?v=${renderVersion}`}
              download
              className="flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Vídeo (MP4)</span>
            </a>

            <a
              href={`${API_BASE}/api/project/${project?.id}/export/audio?v=${renderVersion}`}
              download
              className="flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-all hover:scale-[1.02]"
            >
              <Music className="w-4 h-4 text-violet-400" />
              <span>Instrumental (WAV)</span>
            </a>

            <a
              href={`${API_BASE}/api/project/${project?.id}/export/ass?v=${renderVersion}`}
              download
              className="flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4 text-fuchsia-400" />
              <span>Legendas (.ASS)</span>
            </a>

            <a
              href={`${API_BASE}/api/project/${project?.id}/export/srt?v=${renderVersion}`}
              download
              className="flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Legendas (.SRT)</span>
            </a>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PASSO 1: UPLOAD DE MÍDIA (DRAG AND DROP TOTALMENTE CORRIGIDO) */}
      {/* ============================================================== */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
          }
        }}
        className={`bg-zinc-900/60 border rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl backdrop-blur-md transition-all ${
          isDragging
            ? 'border-violet-500 bg-violet-950/30 ring-2 ring-violet-500/50'
            : 'border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-xs">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Arquivo de Áudio ou Vídeo</span>
              </h2>
              <p className="text-xs text-zinc-400">MP3, WAV, FLAC, M4A, MP4, MOV, MKV (arraste e solte aqui)</p>
            </div>
          </div>

          {project && (
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Arquivo Pronto</span>
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="audio/*,video/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.mp4,.mov,.mkv,.webm"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        {project?.media?.audio_url ? (
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlayAudio}
                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-md shadow-violet-600/30 transition-all hover:scale-105"
                title={isPlayingAudio ? 'Pausar áudio' : 'Ouvir áudio original'}
              >
                {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">
                    {project.media.original_filename}
                  </span>
                  {project.media.has_video && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-semibold border border-violet-500/30">
                      Vídeo
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs text-zinc-400 mt-0.5">
                  <span>Duração: {formatDuration(project.media.duration)}</span>
                  <span>•</span>
                  <span>Formato: {project.media.format?.toUpperCase()}</span>
                  <span>•</span>
                  <span>{((project.media.size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
            >
              Trocar Arquivo
            </button>
          </div>
        ) : (
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-violet-400 bg-violet-600/20 scale-[1.01] shadow-xl'
                : 'border-zinc-800 hover:border-violet-500/60 bg-zinc-950/40 hover:bg-zinc-950/70'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center py-4">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <span className="text-sm font-semibold text-white mt-2">Carregando arquivo...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className={`w-11 h-11 mb-2.5 transition-transform ${isDragging ? 'text-violet-300 scale-125' : 'text-violet-400'}`} />
                <span className="text-sm font-bold text-white">
                  {isDragging ? 'Solte o arquivo aqui para enviar!' : 'Arraste e solte o arquivo aqui, ou clique para escolher'}
                </span>
                <span className="text-xs text-zinc-500 mt-1">
                  Formatos aceitos: MP3, WAV, FLAC, M4A, MP4, MOV (áudio extraído automaticamente).
                </span>
              </div>
            )}
          </div>
        )}

        {uploadError && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* PASSO 2: INFORMAÇÕES DA MÚSICA */}
      {/* ============================================================== */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/80">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-xs">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Informações da Música</h2>
            <p className="text-xs text-zinc-400">Usado na vinheta inicial e para auxiliar o alinhamento da IA</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Music2 className="w-3.5 h-3.5 text-violet-400" />
              <span>Título da Música</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Evidências"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span>Artista / Banda</span>
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Ex: Chitãozinho & Xororó"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Globe className="w-3.5 h-3.5 text-violet-400" />
              <span>Idioma</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-violet-500"
            >
              <option value="auto">✨ Detecção Automática</option>
              <option value="pt">🇧🇷 Português</option>
              <option value="en">🇺🇸 Inglês</option>
              <option value="es">🇪🇸 Espanhol</option>
              <option value="fr">🇫🇷 Francês</option>
              <option value="it">🇮🇹 Italiano</option>
              <option value="ja">🇯🇵 Japonês</option>
            </select>
          </div>
        </div>

        {/* Vinheta de Abertura / Intro Styling Selector */}
        <div className="pt-2 border-t border-zinc-800/60 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Vinheta de Abertura do Vídeo (Primeiros 4 segundos):</span>
            </label>
            <p className="text-[11px] text-zinc-400">
              Escolha como deseja apresentar os créditos no início do clipe ou selecione "Sem Vinheta" para começar direto.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIntroMode('none');
                setShowIntro(false);
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                introMode === 'none'
                  ? 'border-violet-500 bg-violet-600/20 text-white shadow-sm'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${introMode === 'none' ? 'bg-violet-600/30 text-violet-300' : 'bg-zinc-800 text-zinc-400'}`}>
                  <X className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">Sem Vinheta</span>
              </div>
              <span className="text-[10px] text-zinc-400 mt-2">Começa direto no instrumental sem tela inicial.</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIntroMode('text');
                setShowIntro(true);
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                introMode === 'text'
                  ? 'border-violet-500 bg-violet-600/20 text-white shadow-sm'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${introMode === 'text' ? 'bg-violet-600/30 text-violet-300' : 'bg-zinc-800 text-zinc-400'}`}>
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">Texto Elegante</span>
              </div>
              <span className="text-[10px] text-zinc-400 mt-2">Exibe Título da Música e Artista formatados.</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIntroMode('logo');
                setShowIntro(true);
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                introMode === 'logo'
                  ? 'border-violet-500 bg-violet-600/20 text-white shadow-sm'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${introMode === 'logo' ? 'bg-pink-600/30 text-pink-300' : 'bg-zinc-800 text-zinc-400'}`}>
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">Logo da Banda</span>
              </div>
              <span className="text-[10px] text-zinc-400 mt-2">Imagem da logo centralizada com fade in/out.</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIntroMode('both');
                setShowIntro(true);
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                introMode === 'both'
                  ? 'border-violet-500 bg-violet-600/20 text-white shadow-sm'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${introMode === 'both' ? 'bg-amber-600/30 text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">Logo + Texto</span>
              </div>
              <span className="text-[10px] text-zinc-400 mt-2">Logo central com Título e Artista logo abaixo.</span>
            </button>
          </div>

          {/* Logo Upload Box (Active when 'logo' or 'both' is selected) */}
          {(introMode === 'logo' || introMode === 'both') && (
            <div className="mt-3 p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3 animate-in fade-in duration-200">
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => handleLogoUpload(e.target.files)}
                className="hidden"
              />

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-white">Logo do Artista / Banda (PNG com transparência recomendado)</span>
                </div>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remover Logo</span>
                  </button>
                )}
              </div>

              {logoUrl ? (
                <div className="flex items-center space-x-4 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <div className="w-20 h-16 rounded-lg bg-black/60 flex items-center justify-center p-1.5 border border-white/10 shrink-0">
                    <img
                      src={`${API_BASE}${logoUrl}`}
                      alt="Logo carregada"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">Logo carregada com sucesso!</p>
                    <p className="text-[11px] text-zinc-400">
                      Será aplicada na vinheta dos primeiros 4 segundos com efeito suave de fade in/out.
                    </p>
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium inline-block mt-0.5"
                    >
                      Trocar imagem da logo
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    if (!project) {
                      alert('Envie seu arquivo de áudio no Passo 1 primeiro.');
                      return;
                    }
                    logoFileInputRef.current?.click();
                  }}
                  className="border-2 border-dashed border-zinc-800 hover:border-violet-500/50 hover:bg-violet-500/5 rounded-2xl p-4 text-center cursor-pointer transition-all group"
                >
                  {isUploadingLogo ? (
                    <div className="flex items-center justify-center space-x-2 py-2">
                      <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                      <span className="text-xs text-zinc-300">Enviando imagem da logo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1.5">
                      <div className="w-8 h-8 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-zinc-200">
                        Clique para selecionar a imagem da logo da banda
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Formatos suportados: PNG (fundo transparente), JPG, WEBP, SVG
                      </p>
                    </div>
                  )}
                </div>
              )}

              {logoUploadError && (
                <p className="text-xs text-red-400 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{logoUploadError}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* PASSO 3: LETRA DA MÚSICA */}
      {/* ============================================================== */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-xs">
              3
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Letra da Música</h2>
              <p className="text-xs text-zinc-400">Cole a letra pronta ou deixe o Whisper IA transcrever automaticamente</p>
            </div>
          </div>

          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setLyricsMode('manual')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg font-medium transition-all ${
                lyricsMode === 'manual' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Colar Letra Manual</span>
            </button>
            <button
              type="button"
              onClick={() => setLyricsMode('whisper')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg font-medium transition-all ${
                lyricsMode === 'whisper' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transcrição Whisper IA</span>
            </button>
          </div>
        </div>

        {lines && lines.length > 0 && !showRawLyrics ? (
          <div className="space-y-4">
            {/* Top Bar do Painel de Sincronia */}
            <div className="flex items-center justify-between flex-wrap gap-2 p-3.5 rounded-2xl bg-zinc-950/80 border border-violet-500/30">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white">
                  {lines.length} Estrofes Sincronizadas
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Pronto para Gerar
                </span>
              </div>

              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <input
                  ref={srtFileInputRef}
                  type="file"
                  accept=".srt"
                  onChange={(e) => handleSrtUpload(e.target.files)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => srtFileInputRef.current?.click()}
                  disabled={isUploadingSrt}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Importar legendas de arquivo .SRT com marcas de tempo"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isUploadingSrt ? 'Importando .SRT...' : 'Importar .SRT'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRawLyrics(true)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Editar Texto
                </button>

                <button
                  type="button"
                  onClick={handleSaveLyrics}
                  disabled={isSavingLyrics || isGenerating}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700"
                  title="Salvar apenas alterações na letra sem re-renderizar vídeo"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingLyrics ? 'Salvando...' : 'Salvar Letra'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndGenerateVideo}
                  disabled={isSavingLyrics || isGenerating}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:scale-105 text-white text-xs font-black transition-all shadow-lg shadow-violet-600/40 cursor-pointer animate-glow"
                  title="Salva as alterações e atualiza o vídeo MP4 imediatamente"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Salvar e Gerar Vídeo</span>
                </button>
              </div>
            </div>

            {lyricsSaveSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Alterações e sincronia salvas com sucesso!</span>
              </div>
            )}

            {/* Painel de Offset Global e Tap-to-Sync */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-zinc-950 to-indigo-950/40 border border-violet-500/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Offset Global (Adiantar / Atrasar Todas as Frases)
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleShiftAllTiming(-0.5)}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono font-bold transition-colors"
                    title="Atrasar todas as estrofes em -0.5s"
                  >
                    -0.5s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftAllTiming(-0.1)}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono font-bold transition-colors"
                    title="Atrasar todas as estrofes em -0.1s"
                  >
                    -0.1s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftAllTiming(0.1)}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono font-bold transition-colors"
                    title="Adiantar todas as estrofes em +0.1s"
                  >
                    +0.1s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftAllTiming(0.5)}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono font-bold transition-colors"
                    title="Adiantar todas as estrofes em +0.5s"
                  >
                    +0.5s
                  </button>
                </div>
              </div>

              {/* Botão de Tap-to-Sync em tempo real com reprodução de áudio */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleTapSync(selectedLineIdx);
                      setSelectedLineIdx((prev) => Math.min(lines.length - 1, prev + 1));
                    }}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:scale-[1.02] text-white font-bold text-xs transition-all shadow-lg shadow-violet-600/30 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>🎯 Marcar Início da Frase #{selectedLineIdx + 1} ({formatTimeSec(currentTime)})</span>
                  </button>
                  <span className="text-[11px] text-zinc-400">
                    Atalho: dê Play e clique ao ouvir a voz para cravar o tempo
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 cursor-pointer select-none text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={!forceRealign}
                      onChange={(e) => setForceRealign(!e.target.checked)}
                      className="w-4 h-4 rounded text-violet-600 bg-zinc-950 border-zinc-800"
                    />
                    <span>Usar edições da tela ao gerar vídeo (sem re-alinhar)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Lista Interativa de Estrofes */}
            <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
              {lines.map((line, idx) => {
                const isActive = activeLineIndex === idx;
                const isSelected = selectedLineIdx === idx;
                return (
                  <div
                    key={line.id || idx}
                    onClick={() => setSelectedLineIdx(idx)}
                    className={`p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-violet-500 bg-violet-950/40 shadow-lg shadow-violet-900/20'
                        : isSelected
                        ? 'border-fuchsia-500/60 bg-zinc-950/90'
                        : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2.5 flex-1 min-w-[240px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (audioPreviewRef.current) {
                              audioPreviewRef.current.currentTime = line.start;
                              audioPreviewRef.current.play();
                              setIsPlayingAudio(true);
                            }
                          }}
                          className="w-7 h-7 rounded-lg bg-violet-600/30 hover:bg-violet-600 text-violet-300 hover:text-white flex items-center justify-center transition-colors"
                          title="Tocar a partir desta estrofe"
                        >
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                        <span className="text-[11px] font-mono font-bold text-zinc-500">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={line.text}
                          onChange={(e) => handleUpdateLineText(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      {/* Controles de Tempo Fino */}
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        {/* Início */}
                        <div className="flex items-center space-x-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 text-xs">
                          <span className="text-[10px] text-zinc-500 uppercase font-mono mr-1">Início:</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustTiming(idx, -0.2, 0)}
                            className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold"
                            title="-0.2s"
                          >
                            -
                          </button>
                          <span className="font-mono text-zinc-200 text-xs w-12 text-center">
                            {line.start.toFixed(2)}s
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustTiming(idx, 0.2, 0)}
                            className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold"
                            title="+0.2s"
                          >
                            +
                          </button>
                        </div>

                        {/* Fim */}
                        <div className="flex items-center space-x-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 text-xs">
                          <span className="text-[10px] text-zinc-500 uppercase font-mono mr-1">Fim:</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustTiming(idx, 0, -0.2)}
                            className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold"
                            title="-0.2s"
                          >
                            -
                          </button>
                          <span className="font-mono text-zinc-200 text-xs w-12 text-center">
                            {line.end.toFixed(2)}s
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustTiming(idx, 0, 0.2)}
                            className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold"
                            title="+0.2s"
                          >
                            +
                          </button>
                        </div>

                        {/* Botão para Expandir Ajuste de Palavras */}
                        <button
                          type="button"
                          onClick={() => setExpandedLineIdx(expandedLineIdx === idx ? null : idx)}
                          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                            expandedLineIdx === idx
                              ? 'bg-violet-600/30 border-violet-500/60 text-violet-300 shadow-sm'
                              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                          }`}
                          title="Ajustar tempo e varredura da cor em cada palavra"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                          <span>Palavras ({line.words?.length || 0})</span>
                          {expandedLineIdx === idx ? (
                            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddLine(idx)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          title="Adicionar estrofe após esta"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(idx)}
                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-400"
                          title="Excluir estrofe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Painel Expandido: Ajuste Fino de Cada Palavra e Varredura da Cor */}
                    {expandedLineIdx === idx && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-3 bg-zinc-950/70 p-3.5 rounded-xl border border-violet-900/30">
                        <div className="flex items-center justify-between flex-wrap gap-2.5">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            <span className="text-xs font-bold text-white">
                              Sincronia Fina por Palavra & Varredura da Cor
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 font-mono">
                              Modo {karaokeEffect === 'smooth' ? 'Varredura Suave (\\kf)' : 'Destaque Bloco (\\k)'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2.5 flex-wrap">
                            <label
                              className="flex items-center space-x-1.5 cursor-pointer bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-violet-500/30 text-xs transition-colors select-none"
                              title="Ao ajustar o tempo ou duração de uma palavra, ajusta automaticamente as seguintes nesta mesma estrofe para manter o ritmo sincronizado"
                            >
                              <input
                                type="checkbox"
                                checked={cascadeWordsInLine}
                                onChange={(e) => setCascadeWordsInLine(e.target.checked)}
                                className="rounded text-violet-600 focus:ring-0 bg-zinc-800 border-zinc-700 cursor-pointer w-3.5 h-3.5"
                              />
                              <span className="text-[11px] font-semibold text-violet-300">
                                Ajustar seguintes em cascata
                              </span>
                            </label>
                            <span className="text-[11px] text-zinc-400">
                              Use <span className="font-semibold text-violet-300">🎯 Tap</span> durante o áudio
                            </span>
                          </div>
                        </div>

                        {(!line.words || line.words.length === 0) ? (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                            <span className="text-xs text-zinc-400">
                              Esta estrofe ainda não possui divisão por palavras.
                            </span>
                            <button
                              type="button"
                              onClick={() => handleGenerateWordsFromLine(idx)}
                              className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer"
                            >
                              Dividir Palavras Automaticamente
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                            {line.words.map((w, wIdx) => {
                              const dur = Math.max(0.05, Number((w.end - w.start).toFixed(2)));
                              const isCurrentlySung = currentTime >= w.start && currentTime <= w.end;
                              const isPassed = currentTime > w.end;
                              return (
                                <div
                                  key={wIdx}
                                  className={`p-2.5 rounded-xl border transition-all ${
                                    isCurrentlySung
                                      ? 'border-violet-500 bg-violet-950/30 ring-1 ring-violet-500/50'
                                      : isPassed
                                      ? 'border-zinc-800 bg-zinc-900/60'
                                      : 'border-zinc-800/80 bg-zinc-900/40'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span
                                      className="font-bold text-sm tracking-tight truncate mr-1"
                                      style={{
                                        color: isCurrentlySung || isPassed ? sungHexColor : '#ffffff'
                                      }}
                                      title={w.word}
                                    >
                                      {w.word}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleWordTapSync(idx, wIdx)}
                                      className="px-1.5 py-0.5 rounded bg-violet-600/30 hover:bg-violet-600/60 text-violet-300 border border-violet-500/40 text-[10px] font-bold flex items-center space-x-0.5 cursor-pointer"
                                      title="Marcar início da palavra no tempo atual do áudio"
                                    >
                                      <span>🎯 Tap</span>
                                    </button>
                                  </div>

                                  {/* Controles de início e duração */}
                                  <div className="space-y-1 text-[11px]">
                                    {/* Início */}
                                    <div className="flex items-center justify-between bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800/80">
                                      <span className="text-[10px] text-zinc-500 font-mono">Início:</span>
                                      <div className="flex items-center space-x-1">
                                        <button
                                          type="button"
                                          onClick={() => handleAdjustWordTiming(idx, wIdx, -0.05, 0)}
                                          className="w-4 h-4 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold"
                                          title="-0.05s no início"
                                        >
                                          -
                                        </button>
                                        <span className="font-mono text-zinc-200 text-[11px] w-11 text-center">
                                          {w.start.toFixed(2)}s
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleAdjustWordTiming(idx, wIdx, 0.05, 0)}
                                          className="w-4 h-4 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold"
                                          title="+0.05s no início"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    {/* Duração da Varredura / Iluminação */}
                                    <div className="flex items-center justify-between bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800/80">
                                      <span className="text-[10px] text-zinc-500 font-mono">Duração:</span>
                                      <div className="flex items-center space-x-1">
                                        <button
                                          type="button"
                                          onClick={() => handleAdjustWordTiming(idx, wIdx, 0, -0.05)}
                                          className="w-4 h-4 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold"
                                          title="-0.05s de duração"
                                        >
                                          -
                                        </button>
                                        <span className="font-mono text-violet-300 text-[11px] w-11 text-center font-semibold">
                                          {dur.toFixed(2)}s
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleAdjustWordTiming(idx, wIdx, 0, 0.05)}
                                          className="w-4 h-4 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold"
                                          title="+0.05s de duração"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Botão de ouvir palavra */}
                                  <button
                                    type="button"
                                    onClick={() => handlePlayLine(w.start)}
                                    className="w-full mt-1.5 py-0.5 rounded bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] font-mono flex items-center justify-center space-x-1 cursor-pointer"
                                    title="Tocar áudio a partir desta palavra"
                                  >
                                    <Play className="w-2.5 h-2.5" />
                                    <span>Ouvir</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : lyricsMode === 'manual' ? (
          <div className="space-y-3">
            <textarea
              rows={6}
              value={manualLyricsText}
              onChange={(e) => {
                setManualLyricsText(e.target.value);
                setLines([]);
              }}
              placeholder="Cole a letra da música aqui (uma estrofe por linha)...&#10;Exemplo:&#10;Quando eu digo que deixei de te amar&#10;É porque eu te amo&#10;Quando eu digo que não quero mais você&#10;É porque eu te quero..."
              className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 text-xs font-mono transition-all"
            />
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <input
                  ref={srtFileInputRef}
                  type="file"
                  accept=".srt"
                  onChange={(e) => handleSrtUpload(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => srtFileInputRef.current?.click()}
                  disabled={isUploadingSrt}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isUploadingSrt ? 'Importando .SRT...' : 'Importar Arquivo .SRT Pronto'}</span>
                </button>
                <span className="text-[11px] text-zinc-400">
                  Carrega tempos e estrofes instantaneamente
                </span>
              </div>

              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRawLyrics(false)}
                  className="text-xs text-violet-400 hover:text-violet-300 underline font-semibold cursor-pointer"
                >
                  Voltar ao Editor de Estrofes
                </button>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>
                Ao gerar o vídeo, o modelo de IA (faster-whisper) sincronizará automaticamente cada estrofe e palavra com a música.
              </span>
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-violet-500/20 flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white mb-0.5">Sincronização 100% Automática por IA</h3>
              <p className="text-xs text-zinc-400">
                O modelo faster-whisper detectará a voz no áudio e sincronizará palavras e estrofes automaticamente ao gerar o vídeo.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* CONFIGURAÇÕES AVANÇADAS (ABAIXO DO PASSO 3) */}
      {/* ============================================================== */}
      <div className="bg-[#120f1d]/90 border border-violet-900/40 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md transition-all">
        {/* Cabeçalho do Accordion */}
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center space-x-2 text-white font-semibold text-sm">
            <Settings className="w-4 h-4 text-violet-400" />
            <span>Configurações Avançadas</span>
          </div>
          {showAdvancedSettings ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {showAdvancedSettings && (
          <div className="px-5 pb-5 pt-1 space-y-5 border-t border-violet-950/40">
            {/* Interruptor: Preservar backing vocals */}
            <div className="flex items-start justify-between pt-2">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-white">Preservar backing vocals</div>
                <div className="text-xs text-zinc-400">
                  Manter vozes de apoio e coros na faixa instrumental de karaokê
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={keepBackingVocals}
                onClick={() => {
                  const next = !keepBackingVocals;
                  setKeepBackingVocals(next);
                  if (next) {
                    setVocalSeparationModel('mdx_net_kara');
                    setSeparationMode('instrumental_with_backing');
                  } else {
                    setVocalSeparationModel('mdx_net_inst');
                    setSeparationMode('instrumental_clean');
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  keepBackingVocals ? 'bg-violet-600' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    keepBackingVocals ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Dropdown: Modelo de Sincronização da Letra */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-200">
                Modelo de Sincronização da Letra
              </label>
              <div className="relative">
                <select
                  value={lyricsSyncModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLyricsSyncModel(val);
                    if (val === 'whisper') setLyricsMode('whisper');
                    if (val === 'manual') setLyricsMode('manual');
                    if (val === 'audioshake') setProvider('audioshake');
                  }}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-[#1b152b] border border-violet-900/50 text-white text-xs font-medium focus:outline-none focus:border-violet-500 pr-9 cursor-pointer"
                >
                  <option value="whisper">faster-whisper IA Local (Word-Level Sync) — Recomendado</option>
                  <option value="audioshake">AudioShake (IA em Nuvem) — Alta Precisão</option>
                  <option value="manual">Alinhamento Manual de Texto (Frases coladas)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-zinc-400">
                Modelo de IA que sincroniza os tempos das estrofes com o áudio
              </p>
            </div>

            {/* Dropdown: Modelo de Separação Vocal */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-200">
                Modelo de Separação Vocal
              </label>
              <div className="relative">
                <select
                  value={vocalSeparationModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVocalSeparationModel(val);
                    if (val === 'mdx_net_kara') {
                      setKeepBackingVocals(true);
                      setSeparationMode('instrumental_with_backing');
                      setProvider('local');
                    } else if (val === 'mdx_net_inst') {
                      setKeepBackingVocals(false);
                      setSeparationMode('instrumental_clean');
                      setProvider('local');
                    } else if (val === 'original') {
                      setKeepBackingVocals(false);
                      setSeparationMode('original');
                    } else if (val === 'audioshake') {
                      setProvider('audioshake');
                    }
                  }}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-[#1b152b] border border-violet-900/50 text-white text-xs font-medium focus:outline-none focus:border-violet-500 pr-9 cursor-pointer"
                >
                  <option value="mdx_net_inst">MDX-Net (UVR-MDX-NET Inst HQ 3 — Instrumental Limpo) [Padrão]</option>
                  <option value="mdx_net_kara">MDX-Net (UVR-MDX-NET KARAOKE 2 — Preservar Coros/Backing Vocals)</option>
                  <option value="audioshake">AudioShake (Separação IA em Nuvem)</option>
                  <option value="original">Áudio Original (Sem Separação de Vocais)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-zinc-400">
                Modelo de IA que separa a voz e os instrumentos musicais
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* PASSO 4: ESTILO VISUAL, PLANO DE FUNDO & PRÉVIA AO VIVO */}
      {/* ============================================================== */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/80">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-xs">
            4
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Estilo Visual do Karaokê</h2>
            <p className="text-xs text-zinc-400">Personalize o fundo, as cores e a posição da letra</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Controls (Left) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Background Selector: Preset or Custom Asset */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Plano de Fundo do Vídeo:
                </label>
                {/* Tabs */}
                <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
                  <button
                    onClick={() => {
                      setBgMode('preset');
                      if (backgroundConfig.type === 'image' || backgroundConfig.type === 'video') {
                        setBackgroundConfig({ type: 'gradient', preset_name: 'neon', color: '#090a0f' });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      bgMode === 'preset'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Temas Prontos
                  </button>
                  <button
                    onClick={() => setBgMode('custom')}
                    className={`px-2.5 py-1 rounded-md font-semibold flex items-center space-x-1 transition-all ${
                      bgMode === 'custom'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-fuchsia-400" />
                    <span>Asset Próprio</span>
                  </button>
                </div>
              </div>

              {/* Mode: Preset Themes */}
              {bgMode === 'preset' && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {backgroundPresets.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setBackgroundConfig({ type: 'gradient', preset_name: bg.id })}
                      className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                        backgroundConfig.type === 'gradient' && backgroundConfig.preset_name === bg.id
                          ? 'border-violet-500 ring-2 ring-violet-500/40 text-white scale-105'
                          : 'border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                      style={{ background: bg.style }}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Mode: Custom Asset Upload */}
              {bgMode === 'custom' && (
                <div className="space-y-2">
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleBackgroundUpload(e.target.files)}
                    className="hidden"
                  />

                  {backgroundConfig.url && (backgroundConfig.type === 'image' || backgroundConfig.type === 'video') ? (
                    <div className="p-3 rounded-2xl bg-zinc-950/80 border border-violet-500/40 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shrink-0">
                          {backgroundConfig.type === 'image' ? (
                            <img
                              src={`${API_BASE}${backgroundConfig.url}`}
                              alt="Fundo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={`${API_BASE}${backgroundConfig.url}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">Fundo Personalizado Ativo</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                              {backgroundConfig.type === 'image' ? 'Imagem' : 'Vídeo'}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            Renderização com ajuste 1080p e contraste aprimorado
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => bgFileInputRef.current?.click()}
                          disabled={isUploadingBg}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-all"
                        >
                          Trocar
                        </button>
                        <button
                          onClick={handleRemoveCustomBackground}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                          title="Remover fundo personalizado"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        if (!project) {
                          alert('Envie seu arquivo de áudio no Passo 1 primeiro.');
                          return;
                        }
                        bgFileInputRef.current?.click();
                      }}
                      className="border-2 border-dashed border-zinc-800 hover:border-violet-500/50 hover:bg-violet-500/5 rounded-2xl p-4 text-center cursor-pointer transition-all group"
                    >
                      {isUploadingBg ? (
                        <div className="flex items-center justify-center space-x-2 py-2">
                          <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                          <span className="text-xs text-zinc-300">Enviando seu asset de fundo...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-1.5">
                          <div className="w-9 h-9 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-bold text-zinc-200">
                            Clique para escolher uma Imagem ou Vídeo do seu computador
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Formatos: JPG, PNG, WEBP, MP4, MOV (será ajustado para 1080p 16:9)
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {bgUploadError && (
                    <p className="text-xs text-red-400 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{bgUploadError}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Sung Highlight Color */}
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

            {/* Alignment */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Posição da Letra:
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
                  Inferior (Padrão)
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

            {/* Modo de Destaque / Transição da Cor */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Modo de Transição da Cor na Letra:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setKaraokeEffect('smooth');
                    setStyleConfig((s) => ({ ...s, karaoke_effect: 'smooth' }));
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    karaokeEffect === 'smooth'
                      ? 'border-violet-500 bg-violet-600/20 text-white shadow-sm'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span>Varredura Suave (\kf)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    A cor preenche as letras progressivamente conforme a voz se estende.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setKaraokeEffect('step');
                    setStyleConfig((s) => ({ ...s, karaoke_effect: 'step' }));
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    karaokeEffect === 'step'
                      ? 'border-violet-500 bg-violet-600/20 text-white shadow-sm'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Destaque em Bloco (\k)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    A palavra inteira acende de uma vez na batida exata do vocal cantado.
                  </p>
                </button>
              </div>
            </div>

            {/* Tipografia da Letra */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Type className="w-3.5 h-3.5 text-violet-400" />
                <span>Tipografia da Letra:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'Arial', label: 'Arial', sub: 'Limpa & Padrão' },
                  { id: 'Impact', label: 'Impact', sub: 'Marcante / Bloco' },
                  { id: 'Trebuchet MS', label: 'Trebuchet', sub: 'Moderna' },
                  { id: 'Segoe UI', label: 'Segoe UI', sub: 'Elegante' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStyleConfig((s) => ({ ...s, font_name: f.id }))}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      (styleConfig.font_name || 'Arial') === f.id
                        ? 'border-violet-500 bg-violet-600/20 text-white font-bold shadow-sm'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                    style={{ fontFamily: f.id }}
                  >
                    <div className="text-xs">{f.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{f.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tamanho da Fonte & Borda de Contraste */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Tamanho do Texto:
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { size: 40, label: '40px', name: 'Pequeno' },
                    { size: 48, label: '48px', name: 'Normal' },
                    { size: 56, label: '56px', name: 'Grande' },
                  ].map((sz) => (
                    <button
                      key={sz.size}
                      type="button"
                      onClick={() => setStyleConfig((s) => ({ ...s, font_size: sz.size }))}
                      className={`py-2 px-1 rounded-xl border font-medium transition-all text-center ${
                        (styleConfig.font_size ?? 48) === sz.size
                          ? 'border-violet-500 bg-violet-600/20 text-white font-bold'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>{sz.label}</div>
                      <div className="text-[9px] text-zinc-500">{sz.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <Layers className="w-3 h-3 text-violet-400" />
                  <span>Borda & Contraste:</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { width: 2, label: '2px', name: 'Suave' },
                    { width: 3, label: '3px', name: 'Padrão' },
                    { width: 5, label: '5px', name: 'Extra' },
                  ].map((ow) => (
                    <button
                      key={ow.width}
                      type="button"
                      onClick={() => setStyleConfig((s) => ({ ...s, outline_width: ow.width }))}
                      className={`py-2 px-1 rounded-xl border font-medium transition-all text-center ${
                        (styleConfig.outline_width ?? 3) === ow.width
                          ? 'border-violet-500 bg-violet-600/20 text-white font-bold'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>{ow.label}</div>
                      <div className="text-[9px] text-zinc-500">{ow.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mini Live Preview (Right) with Real-Time Karaoke Highlighting */}
          <div className="lg:col-span-6">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Prévia Visual do Karaokê em Ação:
            </label>
            <div
              className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-between p-4 select-none bg-black"
              style={
                backgroundConfig.type === 'gradient'
                  ? {
                      background:
                        backgroundPresets.find((p) => p.id === backgroundConfig.preset_name)?.style || '#090a0f',
                    }
                  : backgroundConfig.type === 'solid'
                  ? { background: backgroundConfig.color || '#000000' }
                  : undefined
              }
            >
              {/* Custom Image Asset */}
              {backgroundConfig.type === 'image' && backgroundConfig.url && (
                <img
                  src={`${API_BASE}${backgroundConfig.url}`}
                  alt="Fundo personalizado"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Custom Video Asset */}
              {backgroundConfig.type === 'video' && backgroundConfig.url && (
                <video
                  src={`${API_BASE}${backgroundConfig.url}`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Readability Contrast Overlay */}
              {(backgroundConfig.type === 'image' || backgroundConfig.type === 'video') && (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-[0.5px]" />
              )}

              <div className="relative z-10 flex justify-between text-[10px] text-white/70">
                <span className="font-semibold">{title || 'Título da Música'}</span>
                <span>1080p 16:9</span>
              </div>

              {/* LIVE PREVIEW OF OPENING VINHETA (0s - 4s) */}
              {currentTime <= 4 && introMode !== 'none' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-[2px] p-4 text-center animate-in fade-in duration-300">
                  {(introMode === 'logo' || introMode === 'both') && logoUrl && (
                    <img
                      src={`${API_BASE}${logoUrl}`}
                      alt="Logo da Banda"
                      className="max-h-20 max-w-[180px] object-contain mb-2 drop-shadow-2xl"
                    />
                  )}
                  {(introMode === 'text' || introMode === 'both') && (
                    <div className="space-y-0.5">
                      <h3 className="text-base sm:text-lg font-black text-white drop-shadow tracking-wider uppercase">
                        {title || 'Título da Música'}
                      </h3>
                      <p className="text-xs font-semibold text-violet-300 drop-shadow">
                        {artist || 'Artista / Banda'}
                      </p>
                    </div>
                  )}
                  <div className="text-[9px] text-zinc-400 mt-2 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                    🎬 Vinheta de Abertura (0s a 4s)
                  </div>
                </div>
              )}

              {/* DYNAMIC KARAOKE DISPLAY */}
              <div className={`relative z-10 text-center transition-all ${alignmentPos === 'center' ? 'my-auto' : 'mb-4'}`}>
                {activeLine ? (
                  <>
                    <div
                      className="font-extrabold tracking-tight px-2"
                      style={{
                        fontSize: styleConfig.font_size ? `${Math.round(styleConfig.font_size * 0.42)}px` : '20px',
                        fontFamily: styleConfig.font_name || 'Arial',
                      }}
                    >
                      {activeLine.words && activeLine.words.length > 0 ? (
                        activeLine.words.map((w, wIdx) => {
                          const dur = Math.max(0.05, w.end - w.start);
                          const percent =
                            karaokeEffect === 'smooth'
                              ? (currentTime >= w.end
                                  ? 100
                                  : currentTime <= w.start
                                  ? 0
                                  : Math.min(100, Math.max(0, ((currentTime - w.start) / dur) * 100)))
                              : (currentTime >= w.start ? 100 : 0);

                          const strokePx = (styleConfig.outline_width ?? 3) >= 5 ? 2.5 : (styleConfig.outline_width ?? 3) <= 2 ? 1 : 1.8;

                          return (
                            <span
                              key={wIdx}
                              className="relative inline-block mx-1 font-extrabold select-none align-middle"
                              style={{
                                WebkitTextStroke: `${strokePx}px rgba(0,0,0,0.9)`,
                                paintOrder: 'stroke fill',
                              }}
                            >
                              {/* Camada Base: texto branco limpo com sombra nítida */}
                              <span className="block select-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                {w.word}
                              </span>
                              {/* Camada Destaque: cor cantada neon recortada pela largura (%) */}
                              <span
                                className="absolute left-0 top-0 overflow-hidden whitespace-nowrap select-none pointer-events-none"
                                style={{
                                  width: `${percent}%`,
                                  color: sungHexColor,
                                  textShadow: `0 0 12px ${sungHexColor}, 0 0 20px ${sungHexColor}80`,
                                  transition: karaokeEffect === 'smooth' ? 'none' : 'width 100ms ease',
                                }}
                              >
                                {w.word}
                              </span>
                            </span>
                          );
                        })
                      ) : (
                        <span
                          style={{
                            color: sungHexColor,
                            textShadow: `0 0 16px ${sungHexColor}`,
                          }}
                        >
                          {activeLine.text}
                        </span>
                      )}
                    </div>
                    {nextLine && (
                      <div
                        className="text-xs text-white/50 mt-1.5 drop-shadow line-clamp-1 px-4"
                        style={{ fontFamily: styleConfig.font_name || 'Arial' }}
                      >
                        {nextLine.text}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center px-4">
                    <div className="text-sm font-semibold text-white/60">
                      {isPlayingAudio ? '♪ Instrumental tocando ♪' : (lines.length > 0 ? 'Pressione Play no player acima para ver o karaokê em tempo real' : 'Sincronize a letra para ver a prévia viva')}
                    </div>
                    {lines[0] && !isPlayingAudio && (
                      <div className="text-xs text-white/40 mt-1">
                        Primeira linha: "{lines[0].text}" ({formatTimeSec(lines[0].start)})
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative z-10 text-[9px] text-white/50 text-right">
                {artist ? `Artista: ${artist}` : 'Karaokê Studio'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* BOTÃO PRINCIPAL / CARD DE PROCESSAMENTO CENTRALIZADO */}
      {/* ============================================================== */}
      <div className="pt-4 pb-12 flex flex-col items-center justify-center space-y-4 w-full max-w-2xl mx-auto">
        {isGenerating ? (
          <div className="w-full p-6 sm:p-7 rounded-3xl bg-zinc-900/90 border border-violet-500/50 shadow-2xl backdrop-blur-md space-y-4 transition-all">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/30">
                      {pipelinePhase}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">Processando com IA</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mt-1">
                    {pipelineMessage}
                  </h3>
                </div>
              </div>
              <span className="text-base font-black font-mono text-violet-400">
                {pipelineProgress}%
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500 transition-all duration-300 rounded-full shadow-lg shadow-violet-500/50"
                style={{ width: `${Math.max(5, pipelineProgress)}%` }}
              />
            </div>

            <p className="text-[11px] text-zinc-400 text-center">
              Processando via IA local com aceleração de hardware. Por favor, aguarde a conclusão...
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handleGenerateKaraoke}
              disabled={!project}
              className={`flex items-center space-x-3 px-10 py-5 rounded-2xl font-black text-sm sm:text-base tracking-wide transition-all shadow-2xl ${
                !project
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:scale-105 text-white shadow-violet-600/40 cursor-pointer animate-glow'
              }`}
            >
              <Video className="w-6 h-6" />
              <span>GERAR VÍDEO DE KARAOKÊ (MP4 1080p)</span>
            </button>

            {!project && (
              <span className="text-xs text-zinc-500">
                Envie um arquivo de áudio ou vídeo no Passo 1 para habilitar a geração.
              </span>
            )}
          </>
        )}

        {generationError && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 flex items-center space-x-2.5 max-w-lg w-full">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
