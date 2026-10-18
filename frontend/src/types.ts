export interface LyricWord {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface LyricLine {
  id: string;
  start: number;
  end: number;
  text: string;
  words: LyricWord[];
}

export interface SongInfo {
  title: string;
  artist: string;
  language: string;
  show_intro: boolean;
  intro_mode?: 'none' | 'text' | 'logo' | 'both';
  logo_url?: string;
  logo_path?: string;
}

export interface MediaData {
  original_filename?: string;
  original_file_url?: string;
  audio_url?: string;
  audio_path?: string;
  duration?: number;
  size_bytes?: number;
  format?: string;
  has_video?: boolean;
  channels?: number;
  sample_rate?: number;
}

export interface SeparationData {
  status?: string;
  mode?: string;
  model_used?: string;
  instrumental_path?: string;
  instrumental_url?: string;
  vocals_path?: string;
  vocals_url?: string;
  lead_vocals_path?: string;
  lead_vocals_url?: string;
}

export interface LyricsData {
  detected_language?: string;
  language_probability?: number;
  full_text?: string;
  lines: LyricLine[];
}

export interface RenderData {
  status: 'idle' | 'rendering' | 'completed' | 'error';
  progress: number;
  message?: string;
  video_url?: string;
  ass_url?: string;
  instrumental_url?: string;
}

export interface Project {
  id: string;
  created_at: string;
  status: string;
  progress: number;
  message: string;
  song_info: SongInfo;
  media: MediaData;
  separation: SeparationData;
  lyrics: LyricsData;
  render: RenderData;
  style?: StyleConfig;
  background?: BackgroundConfig;
}

export interface BackgroundConfig {
  type: 'gradient' | 'solid' | 'image' | 'video';
  color?: string;
  image_path?: string;
  video_path?: string;
  url?: string;
  preset_name?: string;
}

export interface StyleConfig {
  font_name: string;
  font_size: number;
  primary_color: string;
  karaoke_color: string;
  alignment: number;
  margin_v: number;
  karaoke_effect?: 'smooth' | 'step';
  base_color?: string;
  outline_width?: number;
  shadow_depth?: number;
}

export interface AppSettings {
  audioshake_api_key: string;
  whisper_model_size: string;
  default_separation_model: string;
  audioshake_status: {
    available: boolean;
    provider: string;
    status: string;
    message: string;
  };
  supported_models: Record<string, {
    name: string;
    model_file: string;
    description: string;
  }>;
}
