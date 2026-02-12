let playlist = [];
let currentTrack = 0;
const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const themeBtn = document.getElementById('themeBtn');
const menuBtn = document.getElementById('menuBtn');
const backBtn = document.getElementById('backBtn');
const playlistEl = document.getElementById('playlist');
const fileInput = document.getElementById('fileInput');

// 1. View Toggling (Your original logic)
menuBtn.onclick = () => {
    document.getElementById('player-view').classList.add('hidden');
    document.getElementById('library-view').classList.remove('hidden');
};
backBtn.onclick = () => {
    document.getElementById('library-view').classList.add('hidden');
    document.getElementById('player-view').classList.remove('hidden');
};

// 2. Theme & LocalStorage Logic (Your original logic)
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

// 3. File & Playlist Handling (Your original logic)
fileInput.onchange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const url = URL.createObjectURL(file);
        const name = file.name.replace(/\.[^/.]+$/, "");
        playlist.push({title: name, artist: "Local File", src: url});
        addTrackToUI(name, url, false);
    });
    localStorage.setItem('wave_playlist', JSON.stringify(playlist.map(t => t.title)));
    if(playlist.length > 0 && !audio.src) loadTrack(0);
};

function addTrackToUI(name, url, isOld) {
    const div = document.createElement('div');
    div.textContent = name;
    if(isOld) div.style.opacity = "0.4";
    div.onclick = () => {
        if(isOld) return alert("Please re-upload files to play them.");
        currentTrack = playlist.findIndex(t => t.src === url);
        loadTrack(currentTrack);
        playAudio();
        backBtn.click();
    };
    playlistEl.appendChild(div);
}

function loadTrack(i) {
    audio.src = playlist[i].src;
    document.getElementById('track-title').textContent = playlist[i].title;
    document.getElementById('track-artist').textContent = playlist[i].artist;
    updatePlaylistUI();
}

function updatePlaylistUI() {
    Array.from(playlistEl.children).forEach((el, i) => el.classList.toggle('activeTrack', i === currentTrack));
}

// 4. Playback Controls (Your original logic)
function playAudio() { audio.play(); playBtn.textContent = "⏸️"; document.body.classList.add('playing'); }
function pauseAudio() { audio.pause(); playBtn.textContent = "▶️"; document.body.classList.remove('playing'); }

playBtn.onclick = () => audio.paused ? playAudio() : pauseAudio();
document.getElementById('next').onclick = () => { currentTrack = (currentTrack + 1) % playlist.length; loadTrack(currentTrack); playAudio(); };
document.getElementById('prev').onclick = () => { currentTrack = (currentTrack - 1 + playlist.length) % playlist.length; loadTrack(currentTrack); playAudio(); };

audio.ontimeupdate = () => {
    document.getElementById('seek').value = (audio.currentTime / audio.duration) * 100 || 0;
    document.getElementById('current').textContent = formatTime(audio.currentTime);
    document.getElementById('duration').textContent = formatTime(audio.duration);
};
document.getElementById('seek').oninput = (e) => audio.currentTime = (e.target.value / 100) * audio.duration;
document.getElementById('volume').oninput = (e) => audio.volume = e.target.value / 100;

function formatTime(t) { return isNaN(t) ? "0:00" : Math.floor(t/60) + ":" + String(Math.floor(t%60)).padStart(2,'0'); }

// 5. Service Worker Registration
if ('serviceWorker' in navigator) { 
    navigator.serviceWorker.register('./sw.js'); 
}

// 6. AUTO-PLAY NEXT LOGIC (The Fix)
audio.onended = () => {
    if (playlist.length > 0) {
        currentTrack = (currentTrack + 1) % playlist.length; 
        loadTrack(currentTrack); 
        playAudio();
    }
};
