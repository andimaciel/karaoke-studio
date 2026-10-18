import os
import re
import subprocess
from pathlib import Path
from typing import Callable, Optional, Dict, Any
from backend.config import FFMPEG_BIN, TEMP_DIR
from backend.services.lyric_aligner import LyricAlignerService

def get_or_create_preset_background(preset_name: str = "neon") -> Path:
    """Creates a high-performance 1920x1080 gradient PNG so FFmpeg doesn't do per-pixel CPU math."""
    bg_dir = TEMP_DIR / "backgrounds"
    bg_dir.mkdir(parents=True, exist_ok=True)
    img_path = bg_dir / f"{preset_name}.png"
    if img_path.exists():
        return img_path

    PRESET_COLORS = {
        "neon": ((24, 11, 43), (9, 10, 15)),
        "sunset": ((43, 11, 20), (12, 9, 20)),
        "emerald": ((9, 32, 21), (8, 12, 16)),
        "ocean": ((10, 27, 43), (6, 9, 16)),
        "minimal": ((18, 18, 23), (7, 7, 9))
    }
    c1, c2 = PRESET_COLORS.get(preset_name, PRESET_COLORS["neon"])
    
    try:
        from PIL import Image
        base = Image.new("RGB", (256, 144))
        pixels = base.load()
        for y in range(144):
            for x in range(256):
                t = (x / 255.0 + y / 143.0) / 2.0
                r = int(c1[0] * (1 - t) + c2[0] * t)
                g = int(c1[1] * (1 - t) + c2[1] * t)
                b = int(c1[2] * (1 - t) + c2[2] * t)
                pixels[x, y] = (r, g, b)
        final_img = base.resize((1920, 1080), Image.Resampling.BICUBIC)
        final_img.save(img_path, format="PNG")
        return img_path
    except Exception:
        return img_path

def get_windows_font_path() -> Optional[str]:
    """Finds a valid TrueType font on Windows to prevent FFmpeg fontconfig crash."""
    windir = os.environ.get("WINDIR", "C:\\Windows")
    candidates = [
        Path(windir) / "Fonts" / "arial.ttf",
        Path(windir) / "Fonts" / "segoeui.ttf",
        Path(windir) / "Fonts" / "tahoma.ttf",
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for c in candidates:
        if c.exists():
            return str(c).replace("\\", "/").replace(":", "\\:")
    return None

class VideoRendererService:
    @staticmethod
    def render_karaoke_video(
        audio_path: Path,
        lines: list,
        output_path: Path,
        background_config: Dict[str, Any],
        style_config: Dict[str, Any],
        song_info: Dict[str, str],
        progress_cb: Optional[Callable[[str, int], None]] = None
    ) -> Path:
        """
        Renders the final Karaoke MP4 video using FFmpeg and stylized ASS subtitles.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 1. Generate ASS subtitle file
        ass_content = LyricAlignerService.generate_ass(lines, style_config)
        ass_path = output_path.parent / f"{output_path.stem}.ass"
        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)

        if progress_cb:
            progress_cb("Legendas ASS geradas. Preparando renderização do vídeo...", 10)

        # 2. Get audio duration using ffprobe
        probe_cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)
        ]
        try:
            dur_out = subprocess.check_output(probe_cmd, text=True).strip()
            total_duration = float(dur_out)
        except Exception:
            total_duration = 180.0

        # 3. Configure Background
        bg_type = background_config.get("type", "gradient")  # "solid", "gradient", "image", "video"
        bg_color = background_config.get("color", "#090a0f")
        bg_image_path = background_config.get("image_path")
        bg_video_path = background_config.get("video_path")

        # Prepare subtitle filter with Windows path escaping
        # FFmpeg requires escaping colons and backslashes in filter paths
        escaped_ass_path = str(ass_path.resolve()).replace("\\", "/").replace(":", "\\:")

        # 4. Prepare FFmpeg Inputs and -filter_complex
        input_args = []
        filter_parts = []

        # Background stream is Input 0 -> labeled as [v_bg]
        if bg_type == "image" and bg_image_path and Path(bg_image_path).exists():
            input_args.extend(["-loop", "1", "-i", str(bg_image_path)])
            filter_parts.append("[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,drawbox=x=0:y=0:w=1920:h=1080:color=black@0.4:t=fill[v_bg]")
        elif bg_type == "video" and bg_video_path and Path(bg_video_path).exists():
            input_args.extend(["-stream_loop", "-1", "-i", str(bg_video_path)])
            filter_parts.append("[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,drawbox=x=0:y=0:w=1920:h=1080:color=black@0.4:t=fill[v_bg]")
        elif bg_type == "solid":
            clean_hex = bg_color.lstrip("#")
            input_args.extend(["-f", "lavfi", "-i", f"color=c=0x{clean_hex}:s=1920x1080:r=30"])
            filter_parts.append("[0:v]null[v_bg]")
        else: # gradient preset
            preset_name = background_config.get("preset_name", "neon")
            preset_bg_path = get_or_create_preset_background(preset_name)
            if preset_bg_path.exists():
                input_args.extend(["-loop", "1", "-i", str(preset_bg_path.resolve())])
                filter_parts.append("[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1[v_bg]")
            else:
                input_args.extend(["-f", "lavfi", "-i", "color=c=0x120e24:s=1920x1080:r=30"])
                filter_parts.append("[0:v]null[v_bg]")

        # Audio stream is Input 1 -> [1:a]
        input_args.extend(["-i", str(audio_path)])

        # Add optional title/logo intro card overlay if requested
        intro_mode = song_info.get("intro_mode")
        if intro_mode is None:
            intro_mode = "text" if song_info.get("show_intro", True) else "none"

        title = song_info.get("title", "").replace("'", "")
        artist = song_info.get("artist", "").replace("'", "")
        logo_path = song_info.get("logo_path")
        if not logo_path or not Path(logo_path).exists():
            cand_logos = list(output_path.parent.glob("logo_*"))
            if cand_logos:
                logo_path = str(cand_logos[0])

        has_logo = bool(logo_path and Path(logo_path).exists() and intro_mode in ["logo", "both"])
        has_text = bool((title or artist) and intro_mode in ["text", "both"])
        font_path = get_windows_font_path()

        current_v = "v_bg"

        if intro_mode != "none":
            if has_logo:
                # Logo image is passed as Input 2 -> with -loop 1 so it lasts the entire 4s fade duration
                input_args.extend(["-loop", "1", "-i", str(logo_path)])
                if has_text and font_path:
                    # Sleek card background box
                    filter_parts.append(f"[{current_v}]drawbox=x=(w-760)/2:y=(h-420)/2:w=760:h=420:color=black@0.7:t=fill:enable='between(t,0,4)'[v_card]")
                    # Logo scaled with smooth fade in/out
                    filter_parts.append("[2:v]scale=340:180:force_original_aspect_ratio=decrease,fade=t=in:st=0:d=0.5:alpha=1,fade=t=out:st=3.5:d=0.5:alpha=1[v_logo]")
                    filter_parts.append("[v_card][v_logo]overlay=(W-w)/2:(H-h)/2-75:enable='between(t,0,4)'[v_over]")
                    current_v = "v_over"
                    filter_parts.append(
                        f"[{current_v}]drawtext=fontfile='{font_path}':text='{title}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2+70:enable='between(t,0,4)':shadowcolor=black@0.9:shadowx=2:shadowy=2,"
                        f"drawtext=fontfile='{font_path}':text='{artist}':fontsize=32:fontcolor=0xd8b4fe:x=(w-text_w)/2:y=(h-text_h)/2+130:enable='between(t,0,4)':shadowcolor=black@0.9:shadowx=2:shadowy=2[v_text]"
                    )
                    current_v = "v_text"
                else:
                    # Logo only: larger, centered with card and fade in/out
                    filter_parts.append(f"[{current_v}]drawbox=x=(w-640)/2:y=(h-420)/2:w=640:h=420:color=black@0.65:t=fill:enable='between(t,0,4)'[v_card]")
                    filter_parts.append("[2:v]scale=560:360:force_original_aspect_ratio=decrease,fade=t=in:st=0:d=0.5:alpha=1,fade=t=out:st=3.5:d=0.5:alpha=1[v_logo]")
                    filter_parts.append("[v_card][v_logo]overlay=(W-w)/2:(H-h)/2:enable='between(t,0,4)'[v_over]")
                    current_v = "v_over"
            elif has_text and font_path:
                # Elegant card for text-only intro
                filter_parts.append(f"[{current_v}]drawbox=x=(w-760)/2:y=(h-260)/2:w=760:h=260:color=black@0.7:t=fill:enable='between(t,0,4)'[v_card]")
                current_v = "v_card"
                filter_parts.append(
                    f"[{current_v}]drawtext=fontfile='{font_path}':text='{title}':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-30:enable='between(t,0,4)':shadowcolor=black@0.9:shadowx=2:shadowy=2,"
                    f"drawtext=fontfile='{font_path}':text='{artist}':fontsize=36:fontcolor=0xd8b4fe:x=(w-text_w)/2:y=(h-text_h)/2+35:enable='between(t,0,4)':shadowcolor=black@0.9:shadowx=2:shadowy=2[v_text]"
                )
                current_v = "v_text"

        # Burn-in subtitles
        filter_parts.append(f"[{current_v}]subtitles='{escaped_ass_path}'[v_out]")

        filter_complex_str = ";".join(filter_parts)

        cmd = [
            FFMPEG_BIN,
            "-y",
            *input_args,
            "-filter_complex", filter_complex_str,
            "-map", "[v_out]",
            "-map", "1:a:0",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "44100",
            "-ac", "2",
            "-movflags", "+faststart",
            "-t", str(total_duration),
            "-progress", "pipe:1",
            str(output_path)
        ]

        if progress_cb:
            progress_cb("Renderizando vídeo MP4 a 1080p...", 25)

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        time_regex = re.compile(r"out_time_us=(\d+)")
        output_logs = []

        for line in process.stdout:
            output_logs.append(line)
            if len(output_logs) > 40:
                output_logs.pop(0)

            match = time_regex.search(line)
            if match:
                microsecs = int(match.group(1))
                current_sec = microsecs / 1_000_000.0
                if total_duration > 0:
                    pct = min(98, 25 + int((current_sec / total_duration) * 70))
                    if progress_cb:
                        progress_cb(f"Renderizando MP4 ({int(current_sec)}s / {int(total_duration)}s)...", pct)

        process.wait()

        if process.returncode != 0:
            err_snippet = "".join(output_logs[-15:]).strip()
            raise RuntimeError(f"FFmpeg render failed with exit code {process.returncode}: {err_snippet}")


        if progress_cb:
            progress_cb("Renderização concluída com sucesso!", 100)

        return output_path
