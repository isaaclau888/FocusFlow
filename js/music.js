// Music Player

// App state for the music player.
let musicCurrentIndex = 0;
let musicIsPlaying = false;

const musicTracks = [
  { title: "Deep Focus", artist: "FocusFlow", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Morning Sprint", artist: "FocusFlow", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "Quiet Coding", artist: "FocusFlow", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { title: "Night Review", artist: "FocusFlow", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" }
];

/**
 * Initialize music player UI
 */
function initMusicApp() {
  const audio = safeEl("music-audio");
  if (!audio) return;

  if (!audio.dataset.bound) {
    audio.dataset.bound = "1";
    audio.onended = () => nextTrack();
  }

  renderMusicPlaylist();
  setMusicVolume(safeEl("music-volume")?.value || 0.6);

  if (!audio.src) {
    playTrack(musicCurrentIndex, false);
  } else {
    updateMusicNowPlaying();
  }
}

function renderMusicPlaylist() {
  const list = safeEl("music-playlist");
  if (!list) return;
  list.innerHTML = "";
  musicTracks.forEach((t, idx) => {
    const row = document.createElement("div");
    row.className = "music-track-row" + (idx === musicCurrentIndex ? " active" : "");
    row.innerHTML = `<div><strong>${t.title}</strong><div style='font-size:11px;color:#667085;'>${t.artist}</div></div>`;
    row.onclick = () => playTrack(idx, true);
    list.appendChild(row);
  });
}

function updateMusicNowPlaying() {
  const track = musicTracks[musicCurrentIndex];
  if (safeEl("music-track-title")) safeEl("music-track-title").innerText = track?.title || "No track selected";
  if (safeEl("music-track-meta")) safeEl("music-track-meta").innerText = track ? `${track.artist}` : "Pick a song from the playlist";
  if (safeEl("music-play-btn")) safeEl("music-play-btn").innerText = musicIsPlaying ? "Pause" : "Play";
  renderMusicPlaylist();
}

function playTrack(index, autoPlay = true) {
  const audio = safeEl("music-audio");
  if (!audio || !musicTracks[index]) return;
  musicCurrentIndex = index;
  audio.src = musicTracks[index].url;
  if (autoPlay) {
    audio.play().then(() => {
      musicIsPlaying = true;
      updateMusicNowPlaying();
    }).catch(() => {
      musicIsPlaying = false;
      updateMusicNowPlaying();
    });
  } else {
    musicIsPlaying = false;
    updateMusicNowPlaying();
  }
}

function togglePlayPause() {
  const audio = safeEl("music-audio");
  if (!audio) return;
  if (!audio.src) playTrack(musicCurrentIndex, false);
  if (audio.paused) {
    audio.play().then(() => {
      musicIsPlaying = true;
      updateMusicNowPlaying();
    }).catch(() => {});
  } else {
    audio.pause();
    musicIsPlaying = false;
    updateMusicNowPlaying();
  }
}

function nextTrack() {
  if (!musicTracks.length) return;
  const next = (musicCurrentIndex + 1) % musicTracks.length;
  playTrack(next, true);
}

function prevTrack() {
  if (!musicTracks.length) return;
  const prev = (musicCurrentIndex - 1 + musicTracks.length) % musicTracks.length;
  playTrack(prev, true);
}

function setMusicVolume(value) {
  const audio = safeEl("music-audio");
  if (!audio) return;
  audio.volume = Math.max(0, Math.min(1, parseFloat(value) || 0));
}
