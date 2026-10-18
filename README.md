# 🎤 Karaokê Studio — Aplicação Pessoal de Criação de Vídeos de Karaokê

Aplicação web moderna para transformar qualquer arquivo de áudio ou vídeo em vídeos de karaokê de alta qualidade (1080p Full HD MP4), com sincronização temporal de letra palavra por palavra, separação vocal com IA e preservação avançada de backing vocals.

Inspirado na experiência e fluxo de criação do [Youka.io](https://online.youka.io/), com processamento **100% local**, sem cobrança por requisição, sem necessidade de assinaturas externas e com total privacidade.

---

## 🚀 Destaques e Funcionalidades

- **Fluxo Guiado em 3 Etapas Principais:**
  1. **Upload de Mídia:** Arraste e solte arquivos de áudio (`MP3`, `WAV`, `FLAC`, `M4A`, `AAC`) ou vídeo (`MP4`, `MOV`, `MKV`, `WebM`). Vídeos têm o áudio extraído automaticamente pelo FFmpeg com inspeção de duração e metadados via FFprobe.
  2. **Informações da Música:** Título da faixa, artista, idioma (com detecção automática inteligente) e vinheta inicial de abertura de 4s opcional.
  3. **IA & Letra Sincronizada:**
     - Separação com **UVR (Ultimate Vocal Remover) e MDX-Net ONNX**:
       - *Instrumental Limpo:* Remoção total de vocais com `UVR-MDX-NET-Inst_HQ_3.onnx`.
       - *Preservar Backing Vocals:* Mantém coros e harmonias para o melhor efeito karaokê com `UVR_MDXNET_KARA_2.onnx`.
       - *Separar Solo e Coros:* Extração multifaixa de voz principal e backing vocals.
       - *Manter Áudio Original:* Karaoke sobre a gravação original.
     - Transcrição e Sincronização com **faster-whisper**:
       - Marcas temporais por palavra (*word-level timestamps*).
       - Suporte para colar letra manual e alinhar automaticamente ao áudio.
- **Estúdio & Editor de Karaokê em Tempo Real:**
  - Simulação de tela de karaokê interativa no navegador sincronizada ao áudio.
  - Efeito visual de *wipe / fill* e *glow* nas palavras cantadas no tempo exato.
  - Seletor de stems de áudio para conferir a qualidade (Instrumental vs Vocais Isolados vs Áudio Original).
  - Linha do tempo interativa: clique em qualquer estrofe para reproduzir a partir dela, ajuste deslocamentos temporais globais (-0.2s / +0.2s) e edite textos com erros de pronúncia.
  - Personalização de fundo: gradientes vibrantes (*Neon Studio, Ametista, Midnight, Esmeralda*), cor sólida, ou upload de foto/vídeo de fundo personalizado.
  - Personalização de tipografia: tamanho de fonte, alinhamento (inferior vs centro) e cor de destaque da palavra cantada.
- **Exportação & Renderização com FFmpeg:**
  - Gera vídeo **MP4 (H.264 / AAC 1080p 30fps)** com legendas estilizadas em ASS queimadas no vídeo.
  - Barra de progresso em tempo real da renderização.
  - Reprodutor embutido no navegador para assistir o resultado final.
  - Download em um clique: Vídeo MP4, Trilha Instrumental (WAV), Legendas ASS (com tags `\k` de karaokê) e Legendas SRT.
- **Integração Opcional com AudioShake:**
  - Aba de configurações para adicionar chave de API do [AudioShake](https://developer.audioshake.ai/).
  - Se desconfigurada, a interface desabilita a opção e usa o motor local UVR/MDX-Net com transparência total.
  - Aviso explícito de envio de áudio para a nuvem quando ativado.

---

## 🛠️ Arquitetura Técnica

```
karaoke-maker/
├── backend/                  # API Python FastAPI & Modelos de IA
│   ├── .venv/                # Ambiente virtual Python 3.11
│   ├── config.py             # Configurações de caminhos, FFmpeg e dados
│   ├── jobs.py               # Gerenciador de projetos e tarefas locais
│   ├── main.py               # Endpoints REST e streaming de arquivos
│   └── services/
│       ├── audio_extractor.py   # Extração de áudio e FFprobe
│       ├── separator_service.py # UVR MDX-Net ONNX via audio-separator
│       ├── transcriber_service.py # faster-whisper com word_timestamps
│       ├── lyric_aligner.py     # Alinhamento de letra, exportação ASS/SRT
│       ├── video_renderer.py    # Renderizador de vídeo MP4 1080p com FFmpeg
│       └── audioshake_service.py# Provedor em nuvem opcional
├── frontend/                 # Interface React 19 + TypeScript + Vite + Tailwind v4
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx           # Barra superior e status do motor
│   │   │   ├── Stepper.tsx          # Navegação em etapas
│   │   │   ├── Step1Upload.tsx      # Área de upload com drag-and-drop
│   │   │   ├── Step2SongInfo.tsx    # Metadados da faixa e vinheta
│   │   │   ├── Step3Processing.tsx  # Seleção de modelos UVR e Whisper
│   │   │   ├── KaraokeStudioEditor.tsx # Player e editor de sincronização
│   │   │   ├── Step4Export.tsx      # Renderizador MP4 e downloads
│   │   │   ├── SettingsModal.tsx    # Configurações e chaves de API
│   │   │   └── ProjectsModal.tsx    # Histórico de projetos salvos
│   │   ├── api.ts                   # Cliente HTTP REST
│   │   ├── types.ts                 # Tipagens completas
│   │   └── App.tsx                  # Coordenador de estado
└── test_samples/             # Amostras de teste
```

---

## 💻 Instruções de Inicialização Local

### 1. Pré-requisitos
- **Windows 10/11**
- **FFmpeg:** Instalado e configurado (o sistema detecta automaticamente instalações via WinGet).
- **Python 3.11** (gerenciado com `uv` ou instalador padrão)
- **Node.js 18+**

### 2. Iniciar o Backend (FastAPI)
No terminal do projeto:
```powershell
# Ativar ambiente e iniciar servidor
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
O backend ficará disponível em `http://127.0.0.1:8000` (docs Swagger em `/docs`).

### 3. Iniciar o Frontend (Vite)
Em outro terminal:
```powershell
cd frontend
npm run dev
```
Acesse a aplicação no navegador em `http://127.0.0.1:5173`.

---

## 🎙️ Modelos de Separação Vocal (UVR / MDX-Net)

| Modo | Modelo ONNX Utilizado | Descrição |
|---|---|---|
| **Instrumental Limpo** | `UVR-MDX-NET-Inst_HQ_3.onnx` | Alta fidelidade na eliminação de vozes principais e coros. |
| **Preservar Backing Vocals** | `UVR_MDXNET_KARA_2.onnx` | Especializado em isolar a voz solo mantendo harmonias e coros no instrumental. |
| **Separar Solo e Coros** | `UVR_MDXNET_KARA_2.onnx` | Gera faixas independentes para voz principal e instrumental com coros. |
| **Isolar Vocais** | `UVR_MDXNET_Main.onnx` | Faixa vocal limpa para alimentar a transcrição do Whisper. |

*Os pesos dos modelos ONNX são baixados automaticamente na primeira utilização na pasta `backend/data/models/`.*

---

## 📝 Licenças e Atribuições
- **UVR (Ultimate Vocal Remover) / MDX-Net:** Modelos desenvolvidos pela comunidade UVR (Anjok07, Kuielab). Licença MIT / Não comercial conforme os pesos originais.
- **faster-whisper:** Baseado no modelo Whisper da OpenAI, reimplementado com CTranslate2 sob licença MIT.
- **FFmpeg:** Licença LGPL/GPL v3.
