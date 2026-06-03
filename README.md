# WavePlayer 🎵

A personal music player PWA built with HTML, CSS, and JavaScript. Designed to be simple, fast, and work fully offline on Android.

## Features

- 🎵 Play local MP3 and audio files
- 📼 **Two visual themes** — Live waveform visualizer or Cassette tape
- 💾 **Persistent library** — Music stays saved via IndexedDB, no re-uploading every session
- ⏸️ **Resume Playback** — Continue from where you left off (v1.0.5)
- ⚙️ **Settings Menu** — Dark/Light mode, app info, and version details (v1.0.5)
- 🔀 Shuffle mode
- 🔁 Repeat (off / repeat all / repeat one)
- 🔍 Search tracks by name
- 🌗 Dark / Light mode
- 📱 PWA — installs on Android home screen, works offline
- ⌨️ Keyboard shortcuts

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `→` | Next track |
| `←` | Previous track |
| `↑` | Volume up |
| `↓` | Volume down |

## File Structure

```
Waveplayer/
├── index.html       # App markup
├── style.css        # All styles
├── app.js           # Player logic
├── sw.js            # Service worker (offline support)
├── manifest.json    # PWA manifest
└── icon.png         # App icon (512x512)
```

## Version History

| Version | Date | Changes |
|---------|------|----------|
| V1.0.5 | June 3, 2026 | Settings menu, resume playback, bug fixes, improved light/dark theme support |
| V1.0.4 | March 11, 2026 | IndexedDB persistence, waveform visualizer, cassette theme, shuffle, repeat, search |
| V1.0.3 | — | Initial release |

## How to Use

1. Open the app and tap **🎶** to go to your playlist
2. Tap **＋ Add Music** to load audio files from your device
3. Tap any track to play it
4. Switch between **Wave** and **Cassette** themes using the toggle
5. Your library is saved automatically — no need to re-add files
6. Tap **⚙️** to access settings, including dark/light mode

## Tech Stack

- HTML / CSS / JavaScript
- Web Audio API (waveform visualizer)
- IndexedDB (persistent music library)
- Service Worker (offline PWA)
- Media Session API (lock screen controls)

## What's New in v1.0.5

### ✨ Features
- **Settings Menu** — Access dark/light mode and app information in one place
- **Resume Playback** — The app remembers your last played track and position for up to 7 days
- **Improved Theme Support** — Better light mode styling for waveform visualizer and UI elements

### 🐛 Bug Fixes
- Fixed service worker registration path (`service-worker.js` → `sw.js`)
- Fixed memory leaks by properly revoking object URLs on track deletion
- Added file size validation (50MB max per file)
- Improved error handling for file operations

### ⚡ Performance
- Optimized shuffle queue generation
- Reduced memory footprint with proper cleanup
- Better canvas rendering in light mode

## License

MIT — free to use and modify.