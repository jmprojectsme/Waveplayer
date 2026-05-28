// ═══════════════════════════════════════════════════════
//  WavePlayer — app.js  v2.0.0 (with Lyrics)
//  New: Settings menu, remember last song,
//       3-dot context menu, lyrics with auto-sync,
//       Lyrics overlay with blurred theme background,
//       Crash fixes: robust error handling
// ═══════════════════════════════════════════════════════

// ── DOM ────────────────────────────────────────────────
const audio       = document.getElementById('audio');
const playBtn     = document.getElementById('play');
const menuBtn     = document.getElementById('menuBtn');
const settingsBtn = document.getElementById('settingsBtn');
const backBtn     = document.getElementById('backBtn');
const playlistEl  = document.getElementById('playlist');
const fileInput   = document.getElementById('fileInput');
const seekEl      = document.getElementById('seek');
const volumeEl    = document.getElementById('volume');
const currentEl   = document.getElementById('current');
const durationEl  = document.getElementById('duration');
const titleEl     = document.getElementById('track-title');
const artistEl    = document.getElementById('track-artist');
const shuffleBtn  = document.getElementById('shuffleBtn');
const repeatBtn   = document.getElementById('repeatBtn');
const searchInput = document.getElementById('searchInput');
const clearAllBtn = document.getElementById('clearAllBtn');
const canvas      = document.getElementById('visualizer');
const canvasCtx   = canvas.getContext('2d');
const lyricsToggleBtn = document.getElementById('lyricsToggleBtn');

// ── State ──────────────────────────────────────────────
let playlist     = [];
let currentTrack = 0;
let shuffleOn    = false;
let repeatMode   = 0;
let shuffleQueue = [];
let audioReady   = false;
let showLyrics   = false;
let currentLyricIndex = 0;
let lyricTimings = [];

// ── IndexedDB Setup ────────────────────────────────────
const DB_NAME    = 'WavePlayerDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function dbGetAll() {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function dbAdd(record) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).add(record);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function dbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

function dbUpdate(id, record) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put({ ...record, id });
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

function dbClear() {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).clear();
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Lyrics Functions ───────────────────────────────────
function parseTimestamp(timeStr) {
  // Parse [mm:ss] or [m:ss] format to seconds
  const match = timeStr.match(/\[(\d+):(\d+)\]/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes * 60 + seconds;
}

function parseTimestampLyrics(lyricsText) {
  // Returns array of { time: seconds, text: lyric }
  const lines = lyricsText.split('\n').filter(l => l.trim());
  const parsed = [];
  
  lines.forEach(line => {
    const time = parseTimestamp(line);
    if (time !== null) {
      const text = line.replace(/\[\d+:\d+\]\s*/, '').trim();
      parsed.push({ time, text });
    }
  });
  
  return parsed;
}

function calculateLyricTimings(lyricLines, duration) {
  if (!lyricLines || lyricLines.length === 0) return [];
  const timePerLine = duration / lyricLines.length;
  return lyricLines.map((_, i) => i * timePerLine);
}

function getLyricIndex(currentTime, timings) {
  for (let i = timings.length - 1; i >= 0; i--) {
    if (currentTime >= timings[i]) return i;
  }
  return 0;
}

function getLyricIndexByTimestamp(currentTime, parsedLyrics) {
  // Find the lyric that matches current time
  for (let i = parsedLyrics.length - 1; i >= 0; i--) {
    if (currentTime >= parsedLyrics[i].time) return i;
  }
  return 0;
}

function updateCurrentLyric() {
  if (!showLyrics) {
    document.getElementById('lyricDisplay').textContent = '';
    return;
  }
  
  const track = playlist[currentTrack];
  if (!track || !track.lyrics) {
    document.getElementById('lyricDisplay').textContent = '';
    return;
  }

  // Parse lyrics with timestamps
  const parsedLyrics = parseTimestampLyrics(track.lyrics);
  
  if (parsedLyrics.length === 0) {
    document.getElementById('lyricDisplay').textContent = '';
    return;
  }

  if (isNaN(audio.duration) || audio.duration <= 0) {
    return;
  }

  const newIndex = getLyricIndexByTimestamp(audio.currentTime, parsedLyrics);
  currentLyricIndex = newIndex;
  
  // Show current lyric with fade effect
  const lyricDisplay = document.getElementById('lyricDisplay');
  const nextLyric = parsedLyrics[currentLyricIndex]?.text || '';
  
  if (lyricDisplay.textContent !== nextLyric) {
    lyricDisplay.style.opacity = '0.5';
    lyricDisplay.textContent = nextLyric;
    setTimeout(() => {
      lyricDisplay.style.opacity = '1';
    }, 50);
  }
}

lyricsToggleBtn.addEventListener('click', () => {
  showLyrics = !showLyrics;
  lyricsToggleBtn.classList.toggle('active', showLyrics);
  if (showLyrics && audio.src) {
    // Immediately update to show current lyric
    updateCurrentLyric();
  } else {
    document.getElementById('lyricDisplay').textContent = '';
  }
});

// ── "What's New" Modal ─────────────────────────────────
function showWhatsNewModal() {
  const hasSeenV105 = localStorage.getItem('wave_seen_v1_0_5');
  if (hasSeenV105) return;

  const modal = document.getElementById('whatsNewModal');
  modal.classList.remove('hidden');

  const closeModal = () => {
    modal.classList.add('hidden');
    localStorage.setItem('wave_seen_v1_0_5', 'true');
  };

  document.getElementById('whatsNewClose').addEventListener('click', closeModal);
  document.getElementById('whatsNewDone').addEventListener('click', closeModal);
}

// ── Settings Modal ─────────────────────────────────────
settingsBtn.addEventListener('click', () => {
  document.getElementById('settingsModal').classList.remove('hidden');
});

document.getElementById('settingsClose').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.add('hidden');
});

document.getElementById('settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') {
    document.getElementById('settingsModal').classList.add('hidden');
  }
});

document.getElementById('settingsThemeBtn').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  document.getElementById('settingsThemeBtn').textContent = isLight ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('wave_theme', isLight ? 'light' : 'dark');
});

document.getElementById('developerInfo').textContent = 'Built by Jaymar Reperuga';
document.getElementById('versionInfo').textContent = 'v1.0.5 • June 2026';

// ── Visual Theme Toggle (Wave / Cassette) ──────────────
const waveVisual     = document.getElementById('wave-visual');
const cassetteVisual = document.getElementById('cassette-visual');
const visBtns        = document.querySelectorAll('.vis-btn');
let currentVisTheme  = localStorage.getItem('wave_visual') || 'wave';

function applyVisTheme(theme) {
  currentVisTheme = theme;
  localStorage.setItem('wave_visual', theme);
  visBtns.forEach(b => b.classList.toggle('active', b.dataset.vis === theme));

  if (theme === 'wave') {
    waveVisual.classList.remove('hidden');
    cassetteVisual.classList.add('hidden');
    requestAnimationFrame(() => {
      resizeCanvas();
      if (!audio.paused) startVisualizer();
    });
  } else {
    waveVisual.classList.add('hidden');
    cassetteVisual.classList.remove('hidden');
    stopVisualizer();
  }
}

visBtns.forEach(btn => {
  btn.addEventListener('click', () => applyVisTheme(btn.dataset.vis));
});

// ── Init ───────────────────────────────────────────────
async function init() {
  try {
    db = await openDB();
  } catch (e) {
    console.error('Failed to open DB:', e);
    return;
  }

  if (localStorage.getItem('wave_theme') === 'light') {
    document.body.classList.add('light');
    document.getElementById('settingsThemeBtn').textContent = '☀️ Light Mode';
  } else {
    document.getElementById('settingsThemeBtn').textContent = '🌙 Dark Mode';
  }

  applyVisTheme(currentVisTheme);

  audio.volume = 0.8;
  volumeEl.value = 80;

  try {
    const saved = await dbGetAll();
    saved.forEach(record => {
      const url = URL.createObjectURL(record.blob);
      playlist.push({ 
        id: record.id, 
        title: record.title, 
        artist: record.artist, 
        src: url,
        lyrics: record.lyrics || ''
      });
      renderTrackItem(playlist.length - 1);
    });
  } catch (e) {
    console.error('Failed to load tracks:', e);
  }

  if (playlist.length > 0) {
    const lastTrackIndex = localStorage.getItem('wave_lastTrack');
    const lastTrackPos = localStorage.getItem('wave_lastPos');
    const trackIdx = lastTrackIndex ? parseInt(lastTrackIndex, 10) : 0;
    if (trackIdx >= 0 && trackIdx < playlist.length) {
      currentTrack = trackIdx;
      loadTrack(currentTrack);
      if (lastTrackPos) {
        audio.currentTime = parseFloat(lastTrackPos);
      }
    } else {
      loadTrack(0);
    }
  }

  requestAnimationFrame(() => requestAnimationFrame(resizeCanvas));
  showWhatsNewModal();
}

// ── View Toggling ──────────────────────────────────────
menuBtn.addEventListener('click', () => {
  document.getElementById('player-view').classList.add('hidden');
  document.getElementById('library-view').classList.remove('hidden');
});

backBtn.addEventListener('click', () => {
  document.getElementById('library-view').classList.add('hidden');
  document.getElementById('player-view').classList.remove('hidden');
});

// ── File Upload → IndexedDB ────────────────────────────
fileInput.addEventListener('change', async e => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    try {
      const title  = file.name.replace(/\.[^/.]+$/, '');
      const artist = 'Local File';
      const record = { title, artist, blob: file, lyrics: '' };
      const newId  = await dbAdd(record);
      const url    = URL.createObjectURL(file);
      playlist.push({ id: newId, title, artist, src: url, lyrics: '' });
      renderTrackItem(playlist.length - 1);
    } catch (e) {
      console.error('Failed to add file:', e);
    }
  }
  fileInput.value = '';
  if (playlist.length === files.length && currentTrack === 0 && !audio.src) {
    loadTrack(0);
  }
});

// ── Song Context Menu (3-dot) ──────────────────────────
function showTrackMenu(index, event) {
  event.stopPropagation();
  const track = playlist[index];
  if (!track) return;

  const existing = document.querySelector('.track-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'track-context-menu';
  menu.style.position = 'absolute';
  menu.style.background = 'rgba(0,0,0,0.9)';
  menu.style.border = '1px solid rgba(0,207,255,0.3)';
  menu.style.borderRadius = '8px';
  menu.style.padding = '8px 0';
  menu.style.zIndex = '1000';
  menu.style.minWidth = '140px';

  const rect = event.target.getBoundingClientRect();
  menu.style.top = (rect.bottom + 5) + 'px';
  menu.style.left = (rect.left - 120) + 'px';

  const options = [
    { label: '📋 Details', action: () => showTrackDetails(index) },
    { label: '✏️ Rename', action: () => renameTrack(index) },
    { label: '🏷️ Edit Info', action: () => editTrackInfo(index) },
    { label: '🎤 Add Lyrics', action: () => addLyrics(index) },
  ];

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    btn.style.width = '100%';
    btn.style.padding = '10px 16px';
    btn.style.border = 'none';
    btn.style.background = 'transparent';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '0.85rem';
    btn.style.textAlign = 'left';
    btn.style.transition = 'background 0.2s';
    btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(0,207,255,0.2)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
    btn.addEventListener('click', () => {
      opt.action();
      menu.remove();
    });
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
  }, 0);
}

function showTrackDetails(index) {
  const track = playlist[index];
  alert(`📋 Track Details\n\nTitle: ${track.title}\nArtist: ${track.artist}\nID: ${track.id}`);
}

function renameTrack(index) {
  const track = playlist[index];
  const newTitle = prompt('Rename track:', track.title);
  if (newTitle && newTitle.trim()) {
    playlist[index].title = newTitle.trim();
    if (currentTrack === index) {
      titleEl.textContent = newTitle.trim();
    }
    rebuildPlaylistUI();
  }
}

function editTrackInfo(index) {
  const track = playlist[index];
  const newArtist = prompt('Edit artist name:', track.artist);
  if (newArtist !== null) {
    playlist[index].artist = newArtist.trim() || 'Unknown Artist';
    if (currentTrack === index) {
      artistEl.textContent = playlist[index].artist;
    }
    rebuildPlaylistUI();
  }
}

function addLyrics(index) {
  const track = playlist[index];
  const lyricsText = prompt('Enter lyrics with timestamps:\n\nFormat: [mm:ss] Lyric text\n\nExample:\n[0:12] First line\n[0:25] Second line\n[1:30] Third line', track.lyrics || '');
  
  if (lyricsText !== null && lyricsText.trim()) {
    playlist[index].lyrics = lyricsText.trim();
    
    // Get the current record and update only lyrics
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(track.id);
    
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.lyrics = lyricsText.trim();
        store.put(record);
      }
    };
  }
}

// ── Render Track in Playlist ───────────────────────────
function renderTrackItem(index) {
  const track = playlist[index];

  const item = document.createElement('div');
  item.className    = 'track-item';
  item.dataset.index = index;

  const num = document.createElement('span');
  num.className   = 'track-num';
  num.textContent = index + 1;

  const name = document.createElement('span');
  name.className   = 'track-name';
  name.textContent = track.title;
  name.title       = track.title;

  const menuBtn = document.createElement('button');
  menuBtn.className   = 'track-menu-btn';
  menuBtn.textContent = '⋯';
  menuBtn.title       = 'Options';
  menuBtn.style.background = 'none';
  menuBtn.style.border = 'none';
  menuBtn.style.color = '#888';
  menuBtn.style.fontSize = '1rem';
  menuBtn.style.cursor = 'pointer';
  menuBtn.style.padding = '0 4px';
  menuBtn.style.opacity = '0';
  menuBtn.style.transition = 'opacity 0.15s, color 0.15s';
  menuBtn.addEventListener('click', (e) => showTrackMenu(index, e));

  const del = document.createElement('button');
  del.className   = 'del-btn';
  del.textContent = '✕';
  del.title       = 'Remove track';
  del.style.background = 'none';
  del.style.border = 'none';
  del.style.color = '#888';
  del.style.fontSize = '0.9rem';
  del.style.cursor = 'pointer';
  del.style.padding = '2px 4px';
  del.style.borderRadius = '4px';
  del.style.opacity = '0';
  del.style.transition = 'opacity 0.15s, color 0.15s';
  del.addEventListener('click', async e => {
    e.stopPropagation();
    try {
      await dbDelete(track.id);
      playlist.splice(index, 1);
      if (currentTrack >= playlist.length) currentTrack = Math.max(0, playlist.length - 1);
      rebuildPlaylistUI();
      if (playlist.length === 0) resetPlayer();
    } catch (e) {
      console.error('Failed to delete track:', e);
    }
  });

  item.addEventListener('click', () => {
    currentTrack = index;
    loadTrack(currentTrack);
    safePlayAudio();
    backBtn.click();
  });

  item.addEventListener('mouseenter', () => {
    menuBtn.style.opacity = '1';
    del.style.opacity = '1';
  });

  item.addEventListener('mouseleave', () => {
    menuBtn.style.opacity = '0';
    del.style.opacity = '0';
  });

  item.appendChild(num);
  item.appendChild(name);
  item.appendChild(menuBtn);
  item.appendChild(del);
  playlistEl.appendChild(item);
}

function rebuildPlaylistUI() {
  playlistEl.innerHTML = '';
  playlist.forEach((_, i) => renderTrackItem(i));
  updateActiveTrack();
}

// ── Load & Play ────────────────────────────────────────
function loadTrack(i) {
  if (!playlist[i]) return;
  
  audioReady = false;
  audio.src = playlist[i].src;
  titleEl.textContent  = playlist[i].title;
  artistEl.textContent = playlist[i].artist;
  
  localStorage.setItem('wave_lastTrack', i);
  
  updateActiveTrack();
  updateMediaSession();
  
// Clear lyrics display on track change
  document.getElementById('lyricDisplay').textContent = '';
  currentLyricIndex = 0;
}

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const track = playlist[currentTrack];
  if (!track) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  track.title,
      artist: track.artist || 'WavePlayer',
      album:  'WavePlayer',
      artwork: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    navigator.mediaSession.setActionHandler('play',          () => safePlayAudio());
    navigator.mediaSession.setActionHandler('pause',         () => pauseAudio());
    navigator.mediaSession.setActionHandler('nexttrack',     () => nextTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
    navigator.mediaSession.setActionHandler('seekto', e => {
      if (e.seekTime !== undefined) audio.currentTime = e.seekTime;
    });
  } catch (e) {
    console.error('MediaSession error:', e);
  }
}

function updateActiveTrack() {
  Array.from(playlistEl.querySelectorAll('.track-item')).forEach(el => {
    el.classList.toggle('activeTrack', +el.dataset.index === currentTrack);
  });
}

function safePlayAudio() {
  if (!audio.src) return;
  
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        audioReady = true;
        playBtn.textContent = '⏸️';
        document.body.classList.add('playing');
        startVisualizer();
        if ('mediaSession' in navigator) {
          try { navigator.mediaSession.playbackState = 'playing'; } catch (e) {}
        }
      })
      .catch(error => {
        console.error('Play failed:', error);
        audioReady = false;
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().then(() => {
            audio.play().catch(e => console.error('Retry play failed:', e));
          });
        }
      });
  }
}

function pauseAudio() {
  audio.pause();
  audioReady = false;
  playBtn.textContent = '▶️';
  document.body.classList.remove('playing');
  stopVisualizer();
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.playbackState = 'paused'; } catch (e) {}
  }
}

function resetPlayer() {
  audio.src = '';
  titleEl.textContent  = 'Track Title';
  artistEl.textContent = 'Artist Name';
  currentEl.textContent = '0:00';
  durationEl.textContent = '0:00';
  seekEl.value = 0;
  pauseAudio();
}

// ── Controls ───────────────────────────────────────────
playBtn.addEventListener('click', () => {
  if (!audio.src) return;
  audio.paused ? safePlayAudio() : pauseAudio();
});

document.getElementById('next').addEventListener('click', nextTrack);
document.getElementById('prev').addEventListener('click', prevTrack);

function nextTrack() {
  if (!playlist.length) return;
  if (repeatMode === 2) { 
    audio.currentTime = 0; 
    safePlayAudio(); 
    return; 
  }
  if (shuffleOn) {
    currentTrack = getShuffleNext();
  } else {
    currentTrack = (currentTrack + 1) % playlist.length;
  }
  loadTrack(currentTrack);
  safePlayAudio();
}

function prevTrack() {
  if (!playlist.length) return;
  if (audio.currentTime > 3) { 
    audio.currentTime = 0; 
    return; 
  }
  currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrack);
  safePlayAudio();
}

audio.addEventListener('ended', () => {
  if (repeatMode === 2) { 
    audio.currentTime = 0; 
    safePlayAudio(); 
    return; 
  }
  if (playlist.length > 0) nextTrack();
});

audio.addEventListener('error', (e) => {
  console.error('Audio error:', e);
  if (playlist.length > 0) nextTrack();
});

// ── Shuffle ────────────────────────────────────────────
shuffleBtn.addEventListener('click', () => {
  shuffleOn = !shuffleOn;
  shuffleBtn.classList.toggle('active', shuffleOn);
  if (shuffleOn) buildShuffleQueue();
});

function buildShuffleQueue() {
  shuffleQueue = playlist.map((_, i) => i).filter(i => i !== currentTrack);
  for (let i = shuffleQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
  }
}

function getShuffleNext() {
  if (!shuffleQueue.length) buildShuffleQueue();
  return shuffleQueue.shift() ?? 0;
}

// ── Repeat ─────────────────────────────────────────────
const repeatIcons = ['🔁', '🔂', '🔂'];
repeatBtn.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  repeatBtn.textContent = repeatIcons[repeatMode];
  repeatBtn.classList.toggle('active', repeatMode > 0);
  repeatBtn.style.opacity = repeatMode === 0 ? '0.5' : '1';
});
repeatBtn.style.opacity = '0.5';

// ── Seek & Volume ──────────────────────────────────────
seekEl.addEventListener('input', () => {
  if (audio.duration) {
    audio.currentTime = (seekEl.value / 100) * audio.duration;
  }
});

volumeEl.addEventListener('input', () => {
  audio.volume = Math.max(0, Math.min(1, volumeEl.value / 100));
});

audio.addEventListener('timeupdate', () => {
  if (!isNaN(audio.duration) && audio.duration > 0) {
    seekEl.value = (audio.currentTime / audio.duration) * 100;
    localStorage.setItem('wave_lastPos', audio.currentTime);
    
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
      try {
        navigator.mediaSession.setPositionState({
          duration:     audio.duration,
          playbackRate: audio.playbackRate,
          position:     audio.currentTime
        });
      } catch (e) {}
    }
  }
  currentEl.textContent  = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
  
  // Update lyrics
  updateCurrentLyric();
});

function formatTime(t) {
  if (isNaN(t) || t === undefined) return '0:00';
  return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
}

// ── Search / Filter ────────────────────────────────────
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  Array.from(playlistEl.querySelectorAll('.track-item')).forEach(el => {
    const name = el.querySelector('.track-name').textContent.toLowerCase();
    el.style.display = name.includes(q) ? '' : 'none';
  });
});

// ── Clear All ──────────────────────────────────────────
clearAllBtn.addEventListener('click', async () => {
  if (!playlist.length) return;
  if (!confirm('Clear all tracks from your library?')) return;
  try {
    await dbClear();
    playlist = [];
    playlistEl.innerHTML = '';
    resetPlayer();
  } catch (e) {
    console.error('Failed to clear library:', e);
  }
});

// ── Keyboard Shortcuts ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === ' ')           { e.preventDefault(); playBtn.click(); }
  if (e.key === 'ArrowRight')  nextTrack();
  if (e.key === 'ArrowLeft')   prevTrack();
  if (e.key === 'ArrowUp')     { 
    audio.volume = Math.min(1, audio.volume + 0.1); 
    volumeEl.value = audio.volume * 100; 
  }
  if (e.key === 'ArrowDown')   { 
    audio.volume = Math.max(0, audio.volume - 0.1); 
    volumeEl.value = audio.volume * 100; 
  }
});

// ═══════════════════════════════════════════════════════
//  Waveform Visualizer (Web Audio API)
// ═══════════════════════════════════════════════════════
let audioCtx, analyser, source, animFrame;
let visualizerRunning = false;

function setupAudioContext() {
  if (audioCtx && audioCtx.state !== 'closed') return;
  try {
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    analyser  = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source    = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  } catch (e) {
    console.error('Audio context error:', e);
  }
}

function resizeCanvas() {
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  if (w === 0 || h === 0) {
    requestAnimationFrame(resizeCanvas);
    return;
  }
  canvas.width  = w * window.devicePixelRatio;
  canvas.height = h * window.devicePixelRatio;
  canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  drawIdleWave();
}

window.addEventListener('resize', () => {
  resizeCanvas();
});

function startVisualizer() {
  if (currentVisTheme !== 'wave') return;
  if (visualizerRunning) return;
  setupAudioContext();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(e => console.error('Resume context:', e));
  }
  visualizerRunning = true;
  drawWave();
}

function stopVisualizer() {
  visualizerRunning = false;
  cancelAnimationFrame(animFrame);
  drawIdleWave();
}

function drawWave() {
  if (!visualizerRunning) return;
  animFrame = requestAnimationFrame(drawWave);

  if (!analyser) {
    drawIdleWave();
    return;
  }

  const bufferLen = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLen);
  analyser.getByteTimeDomainData(dataArray);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;

  canvasCtx.clearRect(0, 0, w, h);
  canvasCtx.strokeStyle = '#00cfff';
  canvasCtx.lineWidth   = 2;
  canvasCtx.shadowBlur  = 8;
  canvasCtx.shadowColor = '#00cfff';
  canvasCtx.beginPath();

  const sliceW = w / bufferLen;
  let x = 0;

  for (let i = 0; i < bufferLen; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * h) / 2;
    i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
    x += sliceW;
  }

  canvasCtx.lineTo(w, h / 2);
  canvasCtx.stroke();
}

function drawIdleWave() {
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvasCtx.clearRect(0, 0, w, h);
  canvasCtx.strokeStyle = 'rgba(0, 207, 255, 0.25)';
  canvasCtx.lineWidth   = 1.5;
  canvasCtx.shadowBlur  = 0;
  canvasCtx.beginPath();
  for (let x = 0; x <= w; x++) {
    const y = h / 2 + Math.sin((x / w) * Math.PI * 4) * 6;
    x === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
  }
  canvasCtx.stroke();
}

// ── Service Worker ─────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .catch(e => console.warn('SW failed:', e));
  });
}

// ── Start App ──────────────────────────────────────────
init();
