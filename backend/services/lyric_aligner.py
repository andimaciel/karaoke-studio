import difflib
import re
from typing import List, Dict, Any, Optional

def clean_token(text: str) -> str:
    """Removes punctuation and lowercases for fuzzy audio matching."""
    return re.sub(r"[^\w\s]", "", text).lower().strip()

class LyricAlignerService:
    @staticmethod
    def align_manual_lyrics(manual_text: str, whisper_lines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Aligns user-supplied lyrics with Whisper transcription at the word level.
        Preserves genuine word timestamps detected in audio and prevents artificial linear splitting.
        """
        raw_manual_lines = [l.strip() for l in manual_text.splitlines() if l.strip()]
        if not raw_manual_lines:
            return whisper_lines

        # Extract all words from Whisper across all segments
        all_whisper_words = []
        for seg in whisper_lines:
            seg_words = seg.get("words", [])
            if seg_words:
                for w in seg_words:
                    all_whisper_words.append({
                        "word": w.get("word", ""),
                        "clean": clean_token(w.get("word", "")),
                        "start": float(w.get("start", 0.0)),
                        "end": float(w.get("end", 0.0)),
                        "probability": float(w.get("probability", 1.0))
                    })
            else:
                # If segment lacked individual words, approximate words in segment
                seg_tokens = seg.get("text", "").split()
                s_start = float(seg.get("start", 0.0))
                s_end = float(seg.get("end", s_start + 2.0))
                dur = max(0.4, s_end - s_start)
                w_dur = dur / max(1, len(seg_tokens))
                for i, tok in enumerate(seg_tokens):
                    all_whisper_words.append({
                        "word": tok,
                        "clean": clean_token(tok),
                        "start": round(s_start + i * w_dur, 2),
                        "end": round(s_start + (i + 1) * w_dur, 2),
                        "probability": 1.0
                    })

        if not all_whisper_words:
            # Fallback if no whisper words at all: evenly space lines
            result = []
            cur_time = 0.5
            for i, line_text in enumerate(raw_manual_lines):
                tokens = line_text.split()
                duration = max(2.0, len(tokens) * 0.4)
                w_dur = duration / max(1, len(tokens))
                words = []
                for w_i, tok in enumerate(tokens):
                    words.append({
                        "word": tok,
                        "start": round(cur_time + w_i * w_dur, 2),
                        "end": round(cur_time + (w_i + 1) * w_dur, 2),
                        "probability": 1.0
                    })
                result.append({
                    "id": f"line_{i + 1}",
                    "start": round(cur_time, 2),
                    "end": round(cur_time + duration, 2),
                    "text": line_text,
                    "words": words
                })
                cur_time += duration + 0.5
            return result

        aligned = []
        w_cursor = 0
        total_w_words = len(all_whisper_words)

        for m_idx, manual_line in enumerate(raw_manual_lines):
            tokens = manual_line.split()
            if not tokens:
                continue

            clean_tokens = [clean_token(t) for t in tokens]
            
            # Find the best anchor in a lookahead window
            window_size = min(40, total_w_words - w_cursor)
            best_match_start = -1
            best_score = 0.0

            # Match first token or phrase sequence in whisper words
            for cand_start in range(w_cursor, min(w_cursor + window_size, total_w_words)):
                cand_clean = all_whisper_words[cand_start]["clean"]
                sim = difflib.SequenceMatcher(None, clean_tokens[0], cand_clean).ratio()
                if sim >= 0.65:
                    # Check subsequence score
                    matched_cnt = 1
                    for sub_i in range(1, min(len(clean_tokens), total_w_words - cand_start)):
                        sub_sim = difflib.SequenceMatcher(None, clean_tokens[sub_i], all_whisper_words[cand_start + sub_i]["clean"]).ratio()
                        if sub_sim >= 0.55:
                            matched_cnt += 1
                    score = matched_cnt / len(clean_tokens)
                    if score > best_score:
                        best_score = score
                        best_match_start = cand_start
                        if best_score >= 0.75:
                            break

            line_words = []
            if best_match_start != -1 and best_score >= 0.3:
                # Map tokens to matched whisper words
                cur_w_idx = best_match_start
                last_time = all_whisper_words[best_match_start]["start"]

                for t_idx, tok in enumerate(tokens):
                    c_tok = clean_tokens[t_idx]
                    matched = False

                    # Check current or next 2 whisper words for match
                    for look in range(cur_w_idx, min(cur_w_idx + 3, total_w_words)):
                        if difflib.SequenceMatcher(None, c_tok, all_whisper_words[look]["clean"]).ratio() >= 0.5:
                            w_item = all_whisper_words[look]
                            line_words.append({
                                "word": tok,
                                "start": round(w_item["start"], 2),
                                "end": round(w_item["end"], 2),
                                "probability": w_item["probability"]
                            })
                            cur_w_idx = look + 1
                            last_time = w_item["end"]
                            matched = True
                            break

                    if not matched:
                        # Estimate word duration based on average speech pace (0.35s)
                        w_start = last_time
                        w_end = round(w_start + max(0.2, len(tok) * 0.07), 2)
                        line_words.append({
                            "word": tok,
                            "start": w_start,
                            "end": w_end,
                            "probability": 0.8
                        })
                        last_time = w_end

                w_cursor = cur_w_idx
            else:
                # If no direct match found, find next available timestamp after previous line
                prev_end = aligned[-1]["end"] if aligned else 0.5
                if w_cursor < total_w_words:
                    # Move to next whisper word that is ahead of prev_end
                    while w_cursor < total_w_words and all_whisper_words[w_cursor]["start"] < prev_end:
                        w_cursor += 1
                
                if w_cursor < total_w_words:
                    ref_start = all_whisper_words[w_cursor]["start"]
                    w_cursor += min(len(tokens), total_w_words - w_cursor)
                else:
                    ref_start = prev_end + 0.3

                # Distribute tokens starting at ref_start
                cur_t = ref_start
                for tok in tokens:
                    tok_dur = max(0.25, len(tok) * 0.08)
                    line_words.append({
                        "word": tok,
                        "start": round(cur_t, 2),
                        "end": round(cur_t + tok_dur, 2),
                        "probability": 0.7
                    })
                    cur_t = round(cur_t + tok_dur, 2)

            if line_words:
                line_start = line_words[0]["start"]
                line_end = line_words[-1]["end"]
                # Give a tiny buffer at the end so subtitle stays readable
                line_end = round(max(line_end, line_start + 1.2), 2)
            else:
                line_start = aligned[-1]["end"] + 0.5 if aligned else 0.5
                line_end = line_start + 2.0

            aligned.append({
                "id": f"line_{m_idx + 1}",
                "start": line_start,
                "end": line_end,
                "text": manual_line,
                "words": line_words
            })

        return aligned

    @staticmethod
    def generate_srt(lines: List[Dict[str, Any]]) -> str:
        def format_timestamp(seconds: float) -> str:
            hrs = int(seconds // 3600)
            mins = int((seconds % 3600) // 60)
            secs = int(seconds % 60)
            millis = int((seconds - int(seconds)) * 1000)
            return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

        srt_blocks = []
        for i, line in enumerate(lines, 1):
            start = format_timestamp(line.get("start", 0.0))
            end = format_timestamp(line.get("end", 0.0))
            text = line.get("text", "")
            srt_blocks.append(f"{i}\n{start} --> {end}\n{text}\n")
        return "\n".join(srt_blocks)

    @staticmethod
    def parse_srt(srt_content: str) -> List[Dict[str, Any]]:
        """
        Parses standard SRT subtitle text into structured lyric lines with words and timestamps.
        """
        def parse_time(t_str: str) -> float:
            t_str = t_str.strip().replace(',', '.')
            parts = t_str.split(':')
            if len(parts) == 3:
                h, m, s = parts
                return float(h) * 3600 + float(m) * 60 + float(s)
            elif len(parts) == 2:
                m, s = parts
                return float(m) * 60 + float(s)
            return float(t_str)

        lines = []
        blocks = re.split(r'\r?\n\r?\n+', srt_content.strip())
        line_idx = 1
        for block in blocks:
            raw_lines = [l.strip() for l in block.splitlines() if l.strip()]
            if not raw_lines:
                continue

            time_line_idx = -1
            for i, l in enumerate(raw_lines):
                if '-->' in l:
                    time_line_idx = i
                    break

            if time_line_idx == -1:
                continue

            time_parts = raw_lines[time_line_idx].split('-->')
            if len(time_parts) != 2:
                continue

            try:
                start_sec = round(parse_time(time_parts[0]), 2)
                end_sec = round(parse_time(time_parts[1]), 2)
            except Exception:
                continue

            text_lines = raw_lines[time_line_idx + 1:]
            text = " ".join(text_lines).strip()
            if not text:
                continue

            clean_text = re.sub(r'<[^>]+>', '', text).strip()
            tokens = clean_text.split()
            dur = max(0.2, end_sec - start_sec)
            w_dur = dur / max(1, len(tokens))

            words = []
            for w_i, tok in enumerate(tokens):
                words.append({
                    "word": tok,
                    "start": round(start_sec + w_i * w_dur, 2),
                    "end": round(start_sec + (w_i + 1) * w_dur, 2),
                    "probability": 1.0
                })

            lines.append({
                "id": f"line_{line_idx}",
                "start": start_sec,
                "end": end_sec,
                "text": clean_text,
                "words": words
            })
            line_idx += 1

        return lines

    @staticmethod
    def generate_ass(lines: List[Dict[str, Any]], style_opts: Dict[str, Any] = None) -> str:
        """
        Generates standard ASS (Advanced SubStation Alpha) subtitle file
        with karaoke timing tags {\\kf<duration_in_centiseconds>} for smooth karaoke sweep.
        
        Fixes premature word lighting:
        - If the dialogue line starts before the first word, inserts a silence tag {\\k<cs>}
          so the first word does NOT highlight until the vocal actually begins.
        - Accounts for pauses between words with gap tags {\\k<cs>}.
        """
        opts = style_opts or {}
        font_name = opts.get("font_name", "Arial")
        font_size = opts.get("font_size", 48)
        base_color = opts.get("primary_color", "&H00FFFFFF")   # Pre-sung base color (White)
        sung_color = opts.get("karaoke_color", "&H00D946EF")   # Highlighted sung color (Neon)
        outline_color = opts.get("outline_color", "&H00050608")# Pitch black sharp border
        back_color = opts.get("back_color", "&HB0000000")       # Deep solid shadow for pop
        alignment = opts.get("alignment", 2)                    # 2 = Bottom-Center, 5 = Center
        margin_v = opts.get("margin_v", 65)

        outline_width = opts.get("outline_width", 3.5)
        shadow_depth = opts.get("shadow_depth", 2.5)

        def to_ass_time(sec: float) -> str:
            sec = max(0.0, sec)
            hrs = int(sec // 3600)
            mins = int((sec % 3600) // 60)
            secs = int(sec % 60)
            cs = int(round((sec - int(sec)) * 100))
            if cs >= 100:
                secs += 1
                cs -= 100
            return f"{hrs}:{mins:02d}:{secs:02d}.{cs:02d}"

        header = f"""[Script Info]
Title: Studio Karaoke Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: KaraokeDefault,{font_name},{font_size},{sung_color},{base_color},{outline_color},{back_color},-1,0,0,0,100,100,1.5,0,1,{outline_width},{shadow_depth},{alignment},40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        effect_type = opts.get("karaoke_effect", "smooth")
        ktag = "\\k" if effect_type == "step" else "\\kf"

        events = []
        for line in lines:
            line_start = float(line.get("start", 0.0))
            line_end = float(line.get("end", line_start + 2.0))
            words = line.get("words", [])

            if words:
                # Ordena palavras cronologicamente pelo início
                words_sorted = sorted(words, key=lambda w: float(w.get("start", 0.0)))
                first_w_start = float(words_sorted[0].get("start", line_start))
                last_w_end = float(words_sorted[-1].get("end", line_end))
                
                # Início real do evento de diálogo
                actual_line_start = min(line_start, first_w_start)
                
                karaoke_parts = []
                current_time = actual_line_start

                # Silêncio de preparação antes da primeira palavra cantada
                if first_w_start > current_time:
                    lead_silence_cs = int(round((first_w_start - current_time) * 100))
                    if lead_silence_cs > 0:
                        karaoke_parts.append(f"{{\\k{lead_silence_cs}}}")
                        current_time = first_w_start

                for idx, w in enumerate(words_sorted):
                    w_start = float(w.get("start", current_time))
                    w_end = float(w.get("end", w_start + 0.3))
                    
                    # Pausa ou respiração entre palavras
                    if w_start > current_time:
                        gap_cs = int(round((w_start - current_time) * 100))
                        if gap_cs > 0:
                            karaoke_parts.append(f"{{\\k{gap_cs}}}")
                        current_time = w_start
                    elif w_start < current_time:
                        # Palavra sobreposta à anterior: fixa o início no término da anterior
                        w_start = current_time
                        w_end = max(w_start + 0.05, w_end)

                    w_dur_cs = max(1, int(round((w_end - w_start) * 100)))
                    w_text = w.get("word", "")
                    karaoke_parts.append(f"{{{ktag}{w_dur_cs}}}{w_text} ")
                    current_time = current_time + (w_dur_cs / 100.0)

                line_text = "".join(karaoke_parts).strip()
                # Garante que a linha fique visível na tela até todas as palavras terminarem
                final_line_end = max(line_end, current_time + 0.4, last_w_end + 0.4)
            else:
                actual_line_start = line_start
                line_dur_cs = max(1, int(round((line_end - line_start) * 100)))
                line_text = f"{{{ktag}{line_dur_cs}}}{line.get('text', '')}"
                final_line_end = line_end

            start_str = to_ass_time(actual_line_start)
            end_str = to_ass_time(final_line_end)
            events.append(f"Dialogue: 0,{start_str},{end_str},KaraokeDefault,,0,0,0,,{line_text}")

        return header + "\n".join(events) + "\n"
