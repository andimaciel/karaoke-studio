import fs from 'fs';

async function run() {
  console.log('1. Health check...');
  const hRes = await fetch('http://127.0.0.1:8000/api/health');
  console.log('Health:', await hRes.json());

  console.log('2. Uploading file...');
  const blob = new Blob([fs.readFileSync('test_samples/sample_song.wav')], { type: 'audio/wav' });
  const form = new FormData();
  form.append('file', blob, 'sample_song.wav');

  const uRes = await fetch('http://127.0.0.1:8000/api/upload', {
    method: 'POST',
    body: form,
  });
  const proj = await uRes.json();
  console.log('Project uploaded:', proj.id, 'Duration:', proj.media.duration);

  console.log('3. Updating song info...');
  const iRes = await fetch(`http://127.0.0.1:8000/api/project/${proj.id}/song-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Evidências',
      artist: 'Chitãozinho & Xororó',
      language: 'pt',
      show_intro: true,
    }),
  });
  console.log('Info updated:', (await iRes.json()).song_info.title);

  console.log('4. Aligning lyrics...');
  const lRes = await fetch(`http://127.0.0.1:8000/api/project/${proj.id}/lyrics/align`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      manual_text: 'Quando eu digo que deixei de te amar\nE porque eu te amo\nQuando eu digo que nao quero mais voce\nE porque eu te quero',
    }),
  });
  const projWithLyrics = await lRes.json();
  console.log('Lyrics aligned lines:', projWithLyrics.lyrics.lines.length);

  console.log('5. Rendering video with FFmpeg...');
  const rRes = await fetch(`http://127.0.0.1:8000/api/project/${proj.id}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_type: 'original',
      background: { type: 'gradient', color: '#090a0f' },
      style: {
        font_name: 'Arial',
        font_size: 48,
        primary_color: '&H00FFFFFF',
        karaoke_color: '&H00D946EF',
        alignment: 2,
        margin_v: 60,
      },
    }),
  });
  console.log('Render started:', await rRes.json());

  console.log('6. Polling render status...');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pRes = await fetch(`http://127.0.0.1:8000/api/project/${proj.id}`);
    const data = await pRes.json();
    console.log(`Progress: ${data.render.progress}% | Status: ${data.render.status} | ${data.render.message || ''}`);
    if (data.render.status === 'completed') {
      console.log('VIDEO RENDER FINISHED SUCCESSFULLY!');
      console.log('Video URL:', data.render.video_url);
      console.log('ASS URL:', data.render.ass_url);
      break;
    }
    if (data.render.status === 'error') {
      console.error('Render error:', data.render.message);
      break;
    }
  }
}

run().catch(console.error);
