import requests
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

print("1. Testing Upload...")
sample = Path("test_samples/sample_song.wav")
with open(sample, "rb") as f:
    r = requests.post(f"{BASE_URL}/api/upload", files={"file": ("sample_song.wav", f, "audio/wav")})

if r.status_code != 200:
    print("Upload failed:", r.status_code, r.text)
    exit(1)

proj = r.json()
pid = proj["id"]
print(f"Project created: {pid}, Duration: {proj['media']['duration']}s")

print("2. Updating Song Info...")
r2 = requests.post(f"{BASE_URL}/api/project/{pid}/song-info", json={
    "title": "Evidências",
    "artist": "Chitãozinho & Xororó",
    "language": "pt",
    "show_intro": True
})
print("Song info status:", r2.status_code)

print("3. Aligning Lyrics...")
lyrics = (
    "Quando eu digo que deixei de te amar\n"
    "É porque eu te amo\n"
    "Quando eu digo que não quero mais você\n"
    "É porque eu te quero"
)
r3 = requests.post(f"{BASE_URL}/api/project/{pid}/lyrics/align", json={"manual_text": lyrics})
print("Lyrics aligned:", len(r3.json()["lyrics"]["lines"]), "lines")

print("4. Triggering Video Render...")
r4 = requests.post(f"{BASE_URL}/api/project/{pid}/render", json={
    "audio_type": "original",
    "background": {"type": "gradient", "color": "#090a0f"},
    "style": {
        "font_name": "Arial",
        "font_size": 48,
        "primary_color": "&H00FFFFFF",
        "karaoke_color": "&H00D946EF",
        "alignment": 2,
        "margin_v": 60
    }
})
print("Render response:", r4.status_code, r4.json())

print("5. Polling Render Progress...")
for _ in range(30):
    time.sleep(2)
    p = requests.get(f"{BASE_URL}/api/project/{pid}").json()
    status = p.get("render", {}).get("status")
    prog = p.get("render", {}).get("progress")
    msg = p.get("render", {}).get("message")
    print(f"Status: {status} | Progress: {prog}% | {msg}")
    if status == "completed":
        print("VIDEO RENDER COMPLETED SUCCESSFULLY!")
        print("Video URL:", p["render"]["video_url"])
        break
    if status == "error":
        print("RENDER ERROR:", msg)
        break
