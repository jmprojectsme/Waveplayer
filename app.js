// ═══════════════════════════════════════════════════════
//  WavePlayer — app.js  v1.0.5
//  Fixes: IndexedDB persistence, volume init, track overflow,
//         activeTrack highlight, waveform visualizer, shuffle/repeat
//  New:   Media Session API — notification bar with song title,
//         prev/play/pause/next controls, lock screen support
//         Wave centering fix (canvas resize timing)
// ═══════════════════════════════════════════════════════

// ── DOM ────────────────────────────────────────────────
const audio       = document.getElementById('audio');
const playBtn     = document.getElementById('play');
const themeBtn    = document.getElementById('themeBtn');
const menuBtn     = document.getElementById('menuBtn');
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

// ── State ──────────────────────────────────────────────
let playlist     = [];   // { id, title, artist }
let currentTrack = 0;
let shuffleOn    = false;
let repeatMode   = 0;    // 0 = off, 1 = repeat all, 2 = repeat one
let shuffleQueue = [];

// ── IndexedDB Setup ────────────────────────────────────
// FIX: Store actual File/Blob objects in IndexedDB so music
//      persists across sessions without re-uploading
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
    req.onsuccess = e => resolve(e.target.result); // returns new id
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

function dbClear() {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).clear();
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

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
  db = await openDB();

  // Restore dark/light theme
  if (localStorage.getItem('wave_theme') === 'light') {
    document.body.classList.add('light');
    themeBtn.textContent = '☀️';
  }

  // Restore visual theme
  applyVisTheme(currentVisTheme);

  // FIX: volume init — match slider default (80) to actual audio
  audio.volume = 0.8;

  // Load saved tracks from IndexedDB
  const saved = await dbGetAll();
  saved.forEach(record => {
    const url = URL.createObjectURL(record.blob);
    playlist.push({ id: record.id, title: record.title, artist: record.artist, src: url });
    renderTrackItem(playlist.length - 1);
  });

  if (playlist.length > 0) loadTrack(0);


  // Delay canvas resize until layout is fully painted
  requestAnimationFrame(() => requestAnimationFrame(resizeCanvas));
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

// ── Theme ──────────────────────────────────────────────
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  themeBtn.textContent = isLight ? '☀️' : '🌙';
  localStorage.setItem('wave_theme', isLight ? 'light' : 'dark');
});

// ── File Upload → IndexedDB ────────────────────────────
fileInput.addEventListener('change', async e => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    const title  = file.name.replace(/\.[^/.]+$/, '');
    const artist = 'Local File';
    const record = { title, artist, blob: file };
    const newId  = await dbAdd(record);
    const url    = URL.createObjectURL(file);
    playlist.push({ id: newId, title, artist, src: url });
    renderTrackItem(playlist.length - 1);
  }
  fileInput.value = '';
  if (playlist.length === files.length) loadTrack(0); // first load
});

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
  name.title       = track.title; // tooltip for long names

  const del = document.createElement('button');
  del.className   = 'del-btn';
  del.textContent = '✕';
  del.title       = 'Remove track';
  del.addEventListener('click', async e => {
    e.stopPropagation();
    await dbDelete(track.id);
    playlist.splice(index, 1);
    if (currentTrack >= playlist.length) currentTrack = playlist.length - 1;
    rebuildPlaylistUI();
    if (playlist.length === 0) resetPlayer();
  });

  item.addEventListener('click', () => {
    currentTrack = index;
    loadTrack(currentTrack);
    playAudio();
    backBtn.click();
  });

  item.appendChild(num);
  item.appendChild(name);
  item.appendChild(del);
  playlistEl.appendChild(item);
}

// Rebuild full playlist UI (after delete)
function rebuildPlaylistUI() {
  playlistEl.innerHTML = '';
  playlist.forEach((_, i) => renderTrackItem(i));
  updateActiveTrack();
}

// ── Load & Play ────────────────────────────────────────
function loadTrack(i) {
  if (!playlist[i]) return;
  audio.src            = playlist[i].src;
  titleEl.textContent  = playlist[i].title;
  artistEl.textContent = playlist[i].artist;
  updateActiveTrack();
  updateMediaSession();
}

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const track = playlist[currentTrack];
  if (!track) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title:  track.title,
    artist: track.artist || 'WavePlayer',
    album:  'WavePlayer',
    artwork: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  });

  navigator.mediaSession.setActionHandler('play',          () => playAudio());
  navigator.mediaSession.setActionHandler('pause',         () => pauseAudio());
  navigator.mediaSession.setActionHandler('nexttrack',     () => nextTrack());
  navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
  navigator.mediaSession.setActionHandler('seekto', e => {
    if (e.seekTime !== undefined) audio.currentTime = e.seekTime;
  });
}

function updateActiveTrack() {
  // FIX: match by data-index attribute, not DOM position
  Array.from(playlistEl.querySelectorAll('.track-item')).forEach(el => {
    el.classList.toggle('activeTrack', +el.dataset.index === currentTrack);
  });
}

function playAudio() {
  audio.play().catch(() => {});
  playBtn.textContent = '⏸️';
  document.body.classList.add('playing');
  startVisualizer();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
}

function pauseAudio() {
  audio.pause();
  playBtn.textContent = '▶️';
  document.body.classList.remove('playing');
  stopVisualizer();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
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
  audio.paused ? playAudio() : pauseAudio();
});

document.getElementById('next').addEventListener('click', nextTrack);
document.getElementById('prev').addEventListener('click', prevTrack);

function nextTrack() {
  if (!playlist.length) return;
  if (repeatMode === 2) { audio.currentTime = 0; playAudio(); return; }
  if (shuffleOn) {
    currentTrack = getShuffleNext();
  } else {
    currentTrack = (currentTrack + 1) % playlist.length;
  }
  loadTrack(currentTrack);
  playAudio();
}

function prevTrack() {
  if (!playlist.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrack);
  playAudio();
}

// Auto-play next
audio.addEventListener('ended', () => {
  if (repeatMode === 2) { audio.currentTime = 0; playAudio(); return; }
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
  audio.currentTime = (seekEl.value / 100) * audio.duration;
});

volumeEl.addEventListener('input', () => {
  audio.volume = volumeEl.value / 100;
});

audio.addEventListener('timeupdate', () => {
  if (!isNaN(audio.duration)) {
    seekEl.value = (audio.currentTime / audio.duration) * 100;
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
      navigator.mediaSession.setPositionState({
        duration:     audio.duration,
        playbackRate: audio.playbackRate,
        position:     audio.currentTime
      });
    }
  }
  currentEl.textContent  = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
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
  await dbClear();
  playlist = [];
  playlistEl.innerHTML = '';
  resetPlayer();
});

// ── Keyboard Shortcuts ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === ' ')           { e.preventDefault(); playBtn.click(); }
  if (e.key === 'ArrowRight')  nextTrack();
  if (e.key === 'ArrowLeft')   prevTrack();
  if (e.key === 'ArrowUp')     { audio.volume = Math.min(1, audio.volume + 0.1); volumeEl.value = audio.volume * 100; }
  if (e.key === 'ArrowDown')   { audio.volume = Math.max(0, audio.volume - 0.1); volumeEl.value = audio.volume * 100; }
});

// ═══════════════════════════════════════════════════════
//  Waveform Visualizer (Web Audio API)
// ═══════════════════════════════════════════════════════
let audioCtx, analyser, source, animFrame;
let visualizerRunning = false;

function setupAudioContext() {
  if (audioCtx) return;
  audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
  analyser  = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source    = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function resizeCanvas() {
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  if (w === 0 || h === 0) {
    // Layout not ready yet, try again next frame
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
  if (currentVisTheme !== 'wave') return; // don't run if cassette theme active
  if (visualizerRunning) return;
  setupAudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
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

  const bufferLen = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLen);
  analyser.getByteTimeDomainData(dataArray);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;

  canvasCtx.clearRect(0, 0, w, h);

  const isLight = document.body.classList.contains('light');
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

// Draw a static idle wave when not playing
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
      .then(r  => console.log('SW registered:', r.scope))
      .catch(e => console.warn('SW failed:', e));
  });
}

// ── Start App ──────────────────────────────────────────
init();
