import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, ShieldCheck, Save, ExternalLink, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { AppSettings } from '../types';
import { getAppSettings, updateAppSettings, syncSupabase } from '../api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [whisperModel, setWhisperModel] = useState('base');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseSync, setSupabaseSync] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getAppSettings().then((s) => {
        setSettings(s);
        setApiKey(s.audioshake_api_key || '');
        setWhisperModel(s.whisper_model_size || 'base');
        setSupabaseUrl(s.supabase_url || '');
        setSupabaseKey(s.supabase_key || '');
        setSupabaseSync(s.supabase_sync_enabled !== false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateAppSettings({
        audioshake_api_key: apiKey,
        whisper_model_size: whisperModel,
        supabase_url: supabaseUrl,
        supabase_key: supabaseKey,
        supabase_sync_enabled: supabaseSync,
      });
      setSettings(updated);
      setMessage('Configurações salvas com sucesso!');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await syncSupabase();
      setMessage(res.message);
      setTimeout(() => setMessage(null), 4000);
    } catch {
      alert('Erro ao sincronizar com Supabase.');
    } finally {
      setSyncing(false);
    }
  };

  const isSupabaseConnected = settings?.supabase_status?.connected ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white">Configurações do Estúdio</h2>
            <p className="text-xs text-zinc-400">Preferências de IA, Nuvem Supabase e Provedores</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supabase Cloud Persistence Section */}
        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/90 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Persistência em Nuvem (Supabase)
              </span>
            </div>
            {isSupabaseConnected ? (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Conectado (sa-east-1)</span>
              </span>
            ) : (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                Não Conectado
              </span>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Seus projetos, letras sincronizadas, metadados e histórico são salvos automaticamente no banco de dados Postgres do Supabase, garantindo que nada se perca entre reinicializações.
          </p>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-zinc-300">URL do Projeto Supabase</label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://sua-instancia.supabase.co"
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 text-xs font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-zinc-300">Chave de API Pública (Anon Key)</label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={supabaseSync}
                onChange={(e) => setSupabaseSync(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-zinc-900 border-zinc-700"
              />
              <span className="text-xs text-zinc-300">Sincronizar novos projetos automaticamente</span>
            </label>

            <button
              onClick={handleManualSync}
              disabled={syncing || !isSupabaseConnected}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Fazer Backup Agora'}</span>
            </button>
          </div>
        </div>

        {/* AudioShake Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-violet-400" />
              <span>Chave de API AudioShake (Opcional)</span>
            </label>
            <a
              href="https://developer.audioshake.ai/"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-violet-400 hover:underline flex items-center space-x-1"
            >
              <span>developer.audioshake.ai</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Cole sua chave de API AudioShake aqui..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 text-xs font-mono"
          />

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed">
            <span className="font-semibold text-zinc-300 block mb-0.5">Processamento 100% Local por Padrão:</span>
            A integração com o AudioShake é puramente opcional. Se este campo for deixado em branco, a aplicação opera totalmente no seu hardware local através dos modelos UVR MDX-Net ONNX.
          </div>
        </div>

        {/* Whisper Model Size */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span>Modelo faster-whisper Padrão</span>
          </label>

          <select
            value={whisperModel}
            onChange={(e) => setWhisperModel(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-violet-500 text-xs"
          >
            <option value="tiny">Tiny (Ultra rápido, menor uso de RAM)</option>
            <option value="base">Base (Recomendado - Equilíbrio ideal entre precisão e velocidade)</option>
            <option value="small">Small (Maior precisão para línguas complexas)</option>
            <option value="medium">Medium (Máxima fidelidade acústica)</option>
          </select>
        </div>

        {message && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/30 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
