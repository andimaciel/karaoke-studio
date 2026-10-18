import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, ShieldCheck, AlertCircle, Save, ExternalLink } from 'lucide-react';
import { AppSettings } from '../types';
import { getAppSettings, updateAppSettings } from '../api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [whisperModel, setWhisperModel] = useState('base');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getAppSettings().then((s) => {
        setSettings(s);
        setApiKey(s.audioshake_api_key || '');
        setWhisperModel(s.whisper_model_size || 'base');
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
      });
      setSettings(updated);
      setMessage('Configurações salvas com sucesso!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white">Configurações do Estúdio</h2>
            <p className="text-xs text-zinc-400">Preferências de IA e chaves de provedores</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
            A integração com o AudioShake é puramente opcional. Se este campo for deixado em branco, a aplicação opera totalmente no seu hardware local através dos modelos UVR MDX-Net ONNX, sem custos por requisição.
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
