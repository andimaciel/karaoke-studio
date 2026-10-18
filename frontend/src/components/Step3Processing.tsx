import React, { useState, useEffect } from 'react';
import {
  Mic,
  Disc,
  Users,
  Music4,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sliders,
  Cloud,
  Cpu
} from 'lucide-react';
import { Project, AppSettings } from '../types';
import { startSeparation, startTranscription, alignLyrics, getProject, getAppSettings } from '../api';

interface Step3ProcessingProps {
  project: Project;
  onProjectUpdated: (updatedProject: Project) => void;
  onProceedToStudio: () => void;
  onBack: () => void;
}

export const Step3Processing: React.FC<Step3ProcessingProps> = ({
  project,
  onProjectUpdated,
  onProceedToStudio,
  onBack,
}) => {
  const [separationMode, setSeparationMode] = useState<string>('instrumental_clean');
  const [provider, setProvider] = useState<'local' | 'audioshake'>('local');
  const [lyricsTab, setLyricsTab] = useState<'whisper' | 'manual'>('whisper');
  const [manualText, setManualText] = useState<string>(project.lyrics?.full_text || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processType, setProcessType] = useState<string>('');
  const [currentProgress, setCurrentProgress] = useState<number>(project.progress || 0);
  const [statusMessage, setStatusMessage] = useState<string>(project.message || '');
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Poll project state when processing
  useEffect(() => {
    let interval: any = null;
    if (isProcessing) {
      interval = setInterval(async () => {
        try {
          const fresh = await getProject(project.id);
          onProjectUpdated(fresh);
          setCurrentProgress(fresh.progress || 0);
          setStatusMessage(fresh.message || '');

          if (fresh.status === 'separated' && processType === 'sep') {
            setIsProcessing(false);
          } else if (fresh.status === 'transcribed' && processType === 'trans') {
            setIsProcessing(false);
          } else if (fresh.status === 'error') {
            setIsProcessing(false);
          }
        } catch (e) {
          console.error(e);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isProcessing, processType, project.id]);

  useEffect(() => {
    getAppSettings().then(setAppSettings).catch(console.error);
  }, []);

  const handleStartSeparation = async () => {
    setIsProcessing(true);
    setProcessType('sep');
    try {
      await startSeparation(project.id, separationMode, provider);
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar separação.');
      setIsProcessing(false);
    }
  };

  const handleStartTranscription = async () => {
    setIsProcessing(true);
    setProcessType('trans');
    try {
      const lang = project.song_info?.language || 'auto';
      await startTranscription(project.id, lang, 'base', true);
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar transcrição.');
      setIsProcessing(false);
    }
  };

  const handleAlignManual = async () => {
    if (!manualText.trim()) {
      alert('Por favor, cole a letra da música antes de sincronizar.');
      return;
    }
    try {
      const updated = await alignLyrics(project.id, manualText);
      onProjectUpdated(updated);
      alert('Letra alinhada com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao alinhar letra.');
    }
  };

  const separationOptions = [
    {
      id: 'instrumental_clean',
      title: 'Instrumental Limpo',
      badge: 'Padrão Karaokê',
      description: 'Remove todos os vocais (voz principal e coros) com UVR-MDX-Net Inst HQ 3.',
      icon: Disc,
      color: 'from-violet-500/20 to-indigo-500/20',
      border: 'border-violet-500/40'
    },
    {
      id: 'instrumental_with_backing',
      title: 'Preservar Backing Vocals',
      badge: 'Coros Mantidos',
      description: 'Remove a voz principal e preserva coros/harmonias com UVR_MDXNET_KARA_2.',
      icon: Users,
      color: 'from-fuchsia-500/20 to-pink-500/20',
      border: 'border-fuchsia-500/40'
    },
    {
      id: 'lead_vs_backing',
      title: 'Separar Solo e Coros',
      badge: 'Multifaixas',
      description: 'Isola voz principal e gera instrumental com backing vocals separados.',
      icon: Mic,
      color: 'from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-500/40'
    },
    {
      id: 'original',
      title: 'Manter Áudio Original',
      badge: 'Sem Separação',
      description: 'Mantém a gravação original intacta, apenas adicionando letra sincronizada.',
      icon: Music4,
      color: 'from-zinc-500/20 to-zinc-600/20',
      border: 'border-zinc-500/40'
    }
  ];

  const hasSeparation = Boolean(project.separation?.instrumental_url || project.separation?.mode === 'original');
  const hasLyrics = Boolean(project.lyrics?.lines && project.lyrics.lines.length > 0);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Separação Vocal & Letra Sincronizada
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Escolha como deseja separar os vocais com os modelos UVR e obtenha a letra sincronizada palavra por palavra via Whisper.
        </p>
      </div>

      {/* Real-time Progress Card (if processing) */}
      {isProcessing && (
        <div className="p-6 rounded-3xl bg-zinc-900/90 border border-violet-500/40 shadow-2xl backdrop-blur-md animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              <span className="font-bold text-white text-sm">
                {processType === 'sep' ? 'Processando Separação Vocal com IA...' : 'Transcrevendo e Sincronizando com Whisper...'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-violet-400">{currentProgress}%</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(5, currentProgress)}%` }}
            />
          </div>

          <p className="text-xs text-zinc-400 mt-3 font-mono">
            {statusMessage || 'Processando amostras de áudio no motor local...'}
          </p>
        </div>
      )}

      {/* SECTION 1: Vocal Separation */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Disc className="w-5 h-5 text-violet-400" />
              <span>1. Método de Separação Vocal</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Modelos UVR MDX-Net ONNX executados localmente no seu computador.
            </p>
          </div>

          {/* Provider selector */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setProvider('local')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                provider === 'local'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Local (UVR)</span>
            </button>

            <button
              onClick={() => {
                if (!appSettings?.audioshake_status?.available) {
                  alert(appSettings?.audioshake_status?.message || 'Chave do AudioShake não configurada.');
                  return;
                }
                setProvider('audioshake');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                provider === 'audioshake'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : appSettings?.audioshake_status?.available
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-600 cursor-not-allowed'
              }`}
              title={appSettings?.audioshake_status?.available ? 'Usar API externa AudioShake' : 'AudioShake desabilitado (sem chave)'}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>AudioShake (Nuvem)</span>
            </button>
          </div>
        </div>

        {/* AudioShake Notice if selected */}
        {provider === 'audioshake' && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Envio para Serviço Externo</span>
              <span>O arquivo de áudio será transmitido para a nuvem da AudioShake e consumirá créditos da sua conta de desenvolvedor.</span>
            </div>
          </div>
        )}

        {/* Separation cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {separationOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = separationMode === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => setSeparationMode(opt.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? `bg-gradient-to-br ${opt.color} ${opt.border} ring-2 ring-violet-500/30 shadow-lg scale-[1.01]`
                    : 'bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-950/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Icon className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                      {opt.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1">{opt.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{opt.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500">
                    {opt.id === 'original' ? 'Sem IA' : 'UVR MDX-Net ONNX'}
                  </span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-violet-500 bg-violet-500' : 'border-zinc-700'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Separation trigger button & status */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-xs">
            {hasSeparation ? (
              <span className="text-emerald-400 flex items-center space-x-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Faixas separadas prontas ({project.separation?.mode})</span>
              </span>
            ) : (
              <span className="text-zinc-500">Nenhuma separação executada ainda.</span>
            )}
          </div>

          <button
            onClick={handleStartSeparation}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-violet-600/20 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{hasSeparation ? 'Reprocessar Separação' : 'Separar Vocais com IA'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Lyrics & Sync */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-violet-400" />
              <span>2. Letra & Sincronização Temporal</span>
            </h2>
            <p className="text-xs text-zinc-400">
              faster-whisper extrai marcas temporais por palavra (word-level sync) para animação de karaokê.
            </p>
          </div>

          {/* Lyrics tabs */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setLyricsTab('whisper')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                lyricsTab === 'whisper'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Detectar com Whisper IA</span>
            </button>

            <button
              onClick={() => setLyricsTab('manual')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                lyricsTab === 'manual'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Colar Letra Manual</span>
            </button>
          </div>
        </div>

        {lyricsTab === 'whisper' ? (
          <div className="p-6 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Transcrição Automática e Alinhamento de Palavras</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  O modelo Whisper analisa a faixa vocal isolada para identificar todas as estrofes e o tempo exato de início e fim de cada palavra cantada.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-zinc-400">
                {hasLyrics ? (
                  <span className="text-emerald-400 flex items-center space-x-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{project.lyrics?.lines.length} linhas sincronizadas</span>
                  </span>
                ) : (
                  <span>Nenhuma letra transcrita ainda.</span>
                )}
              </div>

              <button
                onClick={handleStartTranscription}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-violet-600/20 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{hasLyrics ? 'Transcrever Novamente' : 'Detectar Letra com Whisper'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Cole a letra completa da música (uma linha por estrofe):
              </label>
              <textarea
                rows={6}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Quando eu digo que deixei de te amar&#10;É porque eu te amo&#10;Quando eu digo que não quero mais você&#10;É porque eu te quero..."
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs font-mono transition-all"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAlignManual}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-all"
              >
                <Sliders className="w-4 h-4 text-violet-400" />
                <span>Sincronizar Letra Manual com Áudio</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <button
          onClick={onBack}
          className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          Voltar para Informações
        </button>

        <button
          onClick={onProceedToStudio}
          disabled={!hasLyrics}
          className={`flex items-center space-x-2 px-7 py-3 rounded-xl font-bold text-xs transition-all shadow-xl ${
            hasLyrics
              ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:scale-[1.02] text-white shadow-violet-600/30 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
          }`}
        >
          <span>Abrir Estúdio & Editor de Karaokê</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
