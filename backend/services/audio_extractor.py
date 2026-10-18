import json
import subprocess
from pathlib import Path
from backend.config import FFMPEG_BIN, FFPROBE_BIN

def inspect_media_file(file_path: Path) -> dict:
    """Uses ffprobe to extract detailed information about media file."""
    cmd = [
        FFPROBE_BIN,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(file_path)
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFprobe failed: {result.stderr}")
    
    data = json.loads(result.stdout)
    fmt = data.get("format", {})
    streams = data.get("streams", [])
    
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    
    duration = float(fmt.get("duration", 0.0))
    if duration == 0.0 and audio_stream:
        duration = float(audio_stream.get("duration", 0.0))
        
    size_bytes = int(fmt.get("size", file_path.stat().st_size if file_path.exists() else 0))
    
    # Try tags for title/artist
    tags = fmt.get("tags", {})
    title = tags.get("title") or tags.get("TITLE") or file_path.stem
    artist = tags.get("artist") or tags.get("ARTIST") or ""
    
    return {
        "filename": file_path.name,
        "duration": duration,
        "size_bytes": size_bytes,
        "format_name": fmt.get("format_name", file_path.suffix.lstrip(".")),
        "has_audio": audio_stream is not None,
        "has_video": video_stream is not None,
        "audio_codec": audio_stream.get("codec_name") if audio_stream else None,
        "sample_rate": int(audio_stream.get("sample_rate", 44100)) if audio_stream else 44100,
        "channels": int(audio_stream.get("channels", 2)) if audio_stream else 2,
        "suggested_title": title,
        "suggested_artist": artist
    }

def extract_standard_audio(input_path: Path, output_path: Path) -> Path:
    """
    Extracts or converts audio to 44.1kHz 16-bit stereo WAV/MP3.
    Works for any input: video (MP4, MOV, etc.) or audio (MP3, FLAC, M4A, etc.).
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        FFMPEG_BIN,
        "-y",
        "-i", str(input_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "44100",
        "-ac", "2",
        str(output_path)
    ]
    
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {res.stderr}")
        
    return output_path
