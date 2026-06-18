# 🎵 WavePlayer

**Your music. Your wave.**

A mobile-first music player PWA that lets you play your local music files directly from your phone — no streaming, no account, no ads. Just your music.

---

## 📦 Version

`v1.0.6` — Settings, Song Management & Stability Fixes

---

## ✨ Features

### Player
- Play local audio files (MP3, WAV, OGG, M4A, FLAC, AAC)
- Seek bar with current time and duration display
- Volume control
- Shuffle mode
- Repeat modes: Off / Repeat All / Repeat One
- Remembers last played song and position on reopen

### Visualizer
- **Wave** — real-time waveform visualizer using Web Audio API
- **Cassette** — animated cassette tape visual
- Toggle between both with one tap

### Library / Playlist
- Add multiple songs at once from your phone storage
- Search / filter tracks by name
- **Long press** on any track to reveal:
  - ✕ Remove button
  - ⋯ 3-dot context menu
- **3-dot menu options:**
  - 📋 View track details
  - ✏️ Rename track
  - 🏷️ Edit artist info
- Clear entire library with one tap

### Settings
- ⚙️ Settings menu — theme toggle and app info
- Dark / Light mode toggle
- Version info and developer credit

### What's New Modal
- Shows once on first open after each update
- Highlights new features clearly

### Media Session API
- Song title and controls on lock screen
- Notification bar controls (play/pause/prev/next)
- Works when app is in background

---

## 🗄️ Data Storage

Songs are stored locally using **IndexedDB** — music persists across sessions without re-uploading.

| Store    | Fields |
|----------|--------|
| `tracks` | id, title, artist, blob |

Settings stored in `localStorage`:
- `wave_theme` — dark/light preference
- `wave_visual` — wave/cassette preference
- `wave_lastTrack` — last played track index
- `wave_lastPos` — last playback position
- `wave_seen_v1_0_6` — What's New modal seen flag

---

## 🚀 Deployment

WavePlayer is a static PWA — no build step required.

```
index.html
style.css
app.js
manifest.json
service-worker.js
icons/
  icon-192.png
  icon-512.png
```

Deploy to **GitHub Pages**:
1. Push all files to your repo's `main` branch
2. Go to Settings → Pages → Source: `main / root`
3. Done — accessible at `https://yourusername.github.io/WavePlayer/`

---

## 🛠️ Tech Stack

| Layer       | Technology |
|-------------|------------|
| UI          | Vanilla HTML + CSS |
| Logic       | Vanilla JavaScript (ES6+) |
| Storage     | IndexedDB (audio blobs) + localStorage (settings) |
| Audio       | Web Audio API (visualizer) |
| PWA         | Service Worker + Web App Manifest |
| Media       | Media Session API (lock screen controls) |
| Fonts       | Inter (Google Fonts) |
| Hosting     | GitHub Pages |

---

## 📋 Changelog

### v1.0.6
- ✅ Fixed: Random song stop after one track — added proper audio load delay
- ✅ Fixed: Songs disappearing after closing app — IndexedDB persistence restored
- ✨ New: Settings menu (⚙️) — replaces old theme toggle button
- ✨ New: What's New modal — shows once on first open after update
- ✨ New: 3-dot context menu per song (long press to reveal)
  - View track details
  - Rename track
  - Edit artist info
- ✨ New: Remember last played song and position on reopen

### v1.0.5
- Fixed: IndexedDB persistence across sessions
- Fixed: Volume slider init
- Fixed: Active track highlight
- Fixed: Waveform visualizer centering
- New: Media Session API — lock screen and notification bar controls
- New: Wave / Cassette visualizer toggle
- New: Shuffle and Repeat modes

### v1.0.4 and earlier
- Initial PWA setup
- Basic play/pause/next/prev controls
- Local file upload and playlist management
- Dark/light theme toggle
- Seek bar and volume control
- Service worker for offline support

---

## 🗺️ Roadmap

### v1.0.7
- [ ] Playlist reordering (drag to sort)
- [ ] Song artwork/thumbnail support
- [ ] Sleep timer

### v1.0.8
- [ ] Multiple playlists support
- [ ] Equalizer presets

### v1.1.0
- [ ] Cloud sync (optional)
- [ ] Import from URL

---

## 📁 File Structure

```
WavePlayer/
├── index.html         # App shell, player UI, modals
├── style.css          # Dark/light theme, animations
├── app.js             # Player logic, IndexedDB, visualizer
├── manifest.json      # PWA manifest
├── service-worker.js  # Offline caching
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 👤 Author

Built by **Jaymar Reperuga** ([@jmprojectsme](https://github.com/jmprojectsme))
Self-taught developer · Built entirely on a Xiaomi Redmi Note 14 📱

---
