import { Project, AppSettings, SongInfo, LyricLine, BackgroundConfig, StyleConfig } from './types';

export const API_BASE = (typeof window !== 'undefined')
  ? `${window.location.protocol}//${window.location.hostname || 'localhost'}:8000`
  : 'http://127.0.0.1:8000';


export async function uploadMediaFile(file: File): Promise<Project> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Falha no upload' }));
    throw new Error(err.detail || 'Erro ao enviar arquivo.');
  }

  return res.json();
}

export async function getProject(projectId: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/project/${projectId}`);
  if (!res.ok) throw new Error('Projeto não encontrado');
  return res.json();
}

export async function listProjects(): Promise<Array<{ id: string; created_at: string; title: string; artist: string; status: string; has_video: boolean }>> {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error('Erro ao listar projetos');
  return res.json();
}

export async function updateSongInfo(projectId: string, info: Partial<SongInfo>): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/project/${projectId}/song-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(info),
  });
  if (!res.ok) throw new Error('Erro ao atualizar informações da música');
  return res.json();
}

export async function startSeparation(
  projectId: string,
  mode: string,
  provider: 'local' | 'audioshake' = 'local',
  customModel?: string
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/project/${projectId}/separate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, provider, custom_model: customModel }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao iniciar separação' }));
    throw new Error(err.detail || 'Falha ao iniciar separação.');
  }
  return res.json();
}

export async function startTranscription(
  projectId: string,
  language = 'auto',
  modelSize = 'base',
  useVocalsStem = true
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/project/${projectId}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, model_size: modelSize, use_vocals_stem: useVocalsStem }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao iniciar transcrição' }));
    throw new Error(err.detail || 'Falha ao iniciar transcrição.');
  }
  return res.json();
}

export async function alignLyrics(projectId: string, manualText: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/project/${projectId}/lyrics/align`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manual_text: manualText }),
  });
  if (!res.ok) throw new Error('Erro ao sincronizar letra manual');
  return res.json();
}

export async function updateLyrics(projectId: string, lines: LyricLine[]): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/project/${projectId}/lyrics/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
  });
  if (!res.ok) throw new Error('Erro ao salvar letra');
  return res.json();
}

export async function uploadSrtFile(projectId: string, file: File): Promise<Project> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/project/${projectId}/lyrics/upload-srt`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao importar arquivo .SRT' }));
    throw new Error(err.detail || 'Falha ao processar arquivo .SRT.');
  }
  return res.json();
}

export async function uploadBackgroundMedia(projectId: string, file: File): Promise<{ url: string; path: string; type: 'image' | 'video' }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/project/${projectId}/background/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Erro ao enviar fundo');
  return res.json();
}

export async function uploadLogoImage(projectId: string, file: File): Promise<{ url: string; path: string; project: Project }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/project/${projectId}/logo/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Erro ao enviar logo da banda/artista');
  return res.json();
}

export async function renderKaraokeVideo(
  projectId: string,
  audioType: string,
  background: BackgroundConfig,
  style: StyleConfig,
  lines?: LyricLine[]
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/project/${projectId}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_type: audioType, background, style, lines }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao renderizar vídeo' }));
    throw new Error(err.detail || 'Falha na renderização.');
  }
  return res.json();
}

export async function getAppSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error('Erro ao obter configurações');
  return res.json();
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Erro ao salvar configurações');
  return res.json();
}
