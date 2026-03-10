# WavePlayer 🎵

A personal music player PWA built with HTML, CSS, and JavaScript. Designed to be simple, fast, and work fully offline on Android.

## Features

- 🎵 Play local MP3 and audio files
- 📼 **Two visual themes** — Live waveform visualizer or Cassette tape
- 💾 **Persistent library** — Music stays saved via IndexedDB, no re-uploading every session
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
└── icon.png         # App icon
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| V1.0.4 | March 11, 2026 | IndexedDB persistence, waveform visualizer, cassette theme, shuffle, repeat, search |
| V1.0.3 | — | Initial release |

## How to Use

1. Open the app and tap **🎶** to go to your playlist
2. Tap **＋ Add Music** to load audio files from your device
3. Tap any track to play it
4. Switch between **Wave** and **Cassette** themes using the toggle
5. Your library is saved automatically — no need to re-add files

## Tech Stack

- HTML / CSS / JavaScript
- Web Audio API (waveform visualizer)
- IndexedDB (persistent music library)
- Service Worker (offline PWA)

## License

MIT — free to use and modify.

