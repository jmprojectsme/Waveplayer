let playlist = [];
let currentTrack = 0;
const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const themeBtn = document.getElementById('themeBtn');
const menuBtn = document.getElementById('menuBtn');
const backBtn = document.getElementById('backBtn');
const playlistEl = document.getElementById('playlist');
const fileInput = document.getElementById('fileInput');

// 1. View Toggling
menuBtn.onclick = () => {
    document.getElementById('player-view').classList.add('hidden');
    document.getElementById('library-view').classList.remove('hidden');
};
backBtn.onclick = () => {
    document.getElementById('library-view').classList.add('hidden');
    document.getElementById('player-view').classList.remove('hidden');
};

// 2. Theme & LocalStorage Logic
themeBtn.onclick = () => {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    themeBtn.textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem('wave_theme', isLight ? 'light' : 'dark');
};

window.onload = () => {
    if(localStorage.getItem('wave_theme') === 'light') {
        document.body.classList.add('light');
        themeBtn.textContent = "☀️";
    }
    const saved = JSON.parse(localStorage.getItem('wave_playlist') || "[]");
    saved.forEach(name => addTrackToUI(name, null, true));
};

// 3. File & Playlist Handling
fileInput.onchange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const url = URL.createObjectURL(file);
        const name = file.name.replace(/\.[^/.]+$/, "");
        playlist.push({title: name, artist: "Local File", src: url});
        addTrackToUI(name, url, false);
    });
    savePlaylist();
    if(playlist.length > 0 && !audio.src) loadTrack(0);
};

// --- DELETE FUNCTIONALITY ADDED HERE ---
function addTrackToUI(name, url, isOld) {
    const container = document.createElement('div');
    container.className = 'track-item'; 
    container.style.display = 'flex';
    container.style.justifyContent = 'space-between';
    container.style.padding = '10px';
    if(isOld) container.style.opacity = "0.4";

    const textSpan = document.createElement('span');
    textSpan.textContent = name;
    textSpan.style.cursor = 'pointer';
    textSpan.onclick = () => {
        if(isOld) return alert("Please re-upload files to play them.");
        currentTrack = playlist.findIndex(t => t.src === url);
        loadTrack(currentTrack);
        playAudio();
        backBtn.click();
    };

    const delBtn = document.createElement('button');
    delBtn.textContent = "🗑️";
    delBtn.style.background = "none";
    delBtn.style.border = "none";
    delBtn.onclick = (e) => {
        e.stopPropagation(); 
        container.remove();
        playlist = playlist.filter(t => t.title !== name);
        savePlaylist();
    };

    container.appendChild(textSpan);
    container.appendChild(delBtn);
    playlistEl.appendChild(container);
}

function savePlaylist() {
    localStorage.setItem('wave_playlist', JSON.stringify(playlist.map(t => t.title)));
}

function loadTrack(i) {
    if(!playlist[i]) return;
    audio.src = playlist[i].src;
    document.getElementById('track-title').textContent = playlist[i].title;
    document.getElementById('track-artist').textContent = playlist[i].artist;
    updatePlaylistUI();
}

function updatePlaylistUI() {
    Array.from(playlistEl.children).forEach((el, i) => {
        el.classList.toggle('activeTrack', i === currentTrack);
    });
}

// 4. Playback Controls
function playAudio() { audio.play(); playBtn.textContent = "⏸️"; document.body.classList.add('playing'); }
function pauseAudio() { audio.pause(); playBtn.textContent = "▶️"; document.body.classList.remove('playing'); }

playBtn.onclick = () => audio.paused ? playAudio() : pauseAudio();

document.getElementById('next').onclick = () => { 
    if(playlist.length === 0) return;
    currentTrack = (currentTrack + 1) % playlist.length; 
    loadTrack(currentTrack); 
    playAudio(); 
};

document.getElementById('prev').onclick = () => { 
    if(playlist.length === 0) return;
    currentTrack = (currentTrack - 1 + playlist.length) % playlist.length; 
    loadTrack(currentTrack); 
    playAudio(); 
};

audio.ontimeupdate = () => {
    document.getElementById('seek').value = (audio.currentTime / audio.duration) * 100 || 0;
    document.getElementById('current').textContent = formatTime(audio.currentTime);
    document.getElementById('duration').textContent = formatTime(audio.duration);
};

// AUTO-PLAY LOGIC
audio.onended = () => {
    if (playlist.length > 0) {
        currentTrack = (currentTrack + 1) % playlist.length; 
        loadTrack(currentTrack); 
        playAudio();
    }
};

document.getElementById('seek').oninput = (e) => audio.currentTime = (e.target.value / 100) * audio.duration;
document.getElementById('volume').oninput = (e) => audio.volume = e.target.value / 100;

function formatTime(t) { return isNaN(t) ? "0:00" : Math.floor(t/60) + ":" + String(Math.floor(t%60)).padStart(2,'0'); }

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js'); }
