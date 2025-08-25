// -- NEW -- Paste your YouTube API Key here
const YOUTUBE_API_KEY = "AIzaSyB-lyf_6WXVQqWNHm045iLrt6l9Lv0Y4H4";

async function loadYouTubePlaylist(playlistId) {
    const apiKey = YOUTUBE_API_KEY;
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
        );
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            playlistVideoIds = data.items.map(item => ({
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title
            }));
            currentIndex = 0;
            playByIndex(currentIndex); // Start first video
        } else {
            console.error("No videos found in this playlist.");
        }
    } catch (err) {
        console.error("Failed to load playlist:", err);
    }
}



// --- Global State Variables ---
let currentSong = new Audio();
let songs = [];
let currfolder = "";
let currentIndex = 0;

// -- NEW -- State management for player type (local vs. youtube)
let player; // This will be the YouTube player instance
let playerMode = 'local'; // Can be 'local' or 'youtube'
let isYoutubeReady = false; // Flag to check if the YT API has loaded
let timeUpdater; // This will hold our setInterval for the YouTube time updates


// ---------- UTILS ----------
function minSec(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" + s : s}`;
}

// ---------- DATA FETCHING ----------

// This function for local files remains the same
async function getSongs(folder) {
    currfolder = folder;
    const base = `http://127.0.0.1:5500/${currfolder}/`;
    const res = await fetch(base);
    const html = await res.text();
    const div = document.createElement("div");
    div.innerHTML = html;
    const list = [];
    for (const a of div.getElementsByTagName("a")) {
        const href = a.getAttribute("href");
        if (!href) continue;
        const abs = new URL(href, base).href;
        if (abs.toLowerCase().endsWith(".mp3")) list.push(abs);
    }
    return list;
}

// -- NEW -- Function to fetch a YouTube playlist
async function getYouTubePlaylist(playlistId) {
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "PASTE_YOUR_API_KEY_HERE") {
        alert("Error: YouTube API Key is missing in script.js");
        return [];
    }
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) {
            console.error("YouTube API Error:", data.error.message);
            return [];
        }
        // Format the data to be consistent with our app
        return data.items.map(item => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            artist: item.snippet.videoOwnerChannelTitle
        }));
    } catch (error) {
        console.error("Failed to fetch YouTube playlist:", error);
        return [];
    }
}


// ---------- YOUTUBE PLAYER API SETUP (NEW) ----------
// This global function is required by the YouTube IFrame API script
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        playerVars: {
            'playsinline': 1
        },
        events: {
            'onReady': () => {
                isYoutubeReady = true;
                console.log("YouTube Player is ready.");
                main();
            },
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    const playBtn = document.getElementById("play");
    if (event.data == YT.PlayerState.PLAYING) {
        playBtn.src = "img/pause.svg";
        // Start the timer to update the seekbar
        startYoutubeTimer();
    } else {
        playBtn.src = "img/playbar.svg";
        // Stop the timer when paused or ended
        clearInterval(timeUpdater);
    }
    // Auto-play next song when one ends
    if (event.data == YT.PlayerState.ENDED) {
        playNext();
    }
}

function startYoutubeTimer() {
    clearInterval(timeUpdater); // Clear any existing timer
    timeUpdater = setInterval(() => {
        if (player && player.getDuration) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            if (duration > 0) {
                const pct = (currentTime / duration) * 100;
                document.querySelector(".songTime").innerHTML = `${minSec(currentTime)} / ${minSec(duration)}`;
                document.querySelector(".circle").style.left = `${pct}%`;
                document.querySelector(".progress").style.width = `${pct}%`;
            }
        }
    }, 500);
}


// ---------- UI RENDERING ----------

// -- MODIFIED -- to handle both local and YouTube song titles
function renderLibrary() {
    const ul = document.querySelector(".songlist ul");
    ul.innerHTML = "";
    songs.forEach((song, i) => {
        let name, artist;
        if (playerMode === 'local') {
            name = decodeURIComponent(song.split("/").pop().replace(/\.mp3$/i, ""));
            artist = "Subrata"; // Your default artist
        } else { // youtube mode
            name = song.title;
            artist = song.artist;
        }

        ul.insertAdjacentHTML("beforeend",
            `<li data-index="${i}">
                <img class="music" src="img/music.svg" alt="">
                <div class="info">
                    <div>${name}</div>
                    <div>${artist}</div>
                </div>
                <div class="playBar">
                    <span>Play Now</span>
                    <img class="playNow" src="img/playNow.svg" alt="">
                </div>
            </li>`
        );
    });
}

// -- MODIFIED -- to display both local and YouTube playlist cards
async function displayAlbums() {
    const cardContainer = document.querySelector(".cardContainer");
    if (!cardContainer) return;
    cardContainer.innerHTML = ''; // Clear existing cards

    // --- 1. Display Local Albums (your original logic) ---
    const songsURL = `http://127.0.0.1:5500/songs/`;
    try {
        const response = await fetch(songsURL);
        const htmlText = await response.text();
        const div = document.createElement("div");
        div.innerHTML = htmlText;
        const anchors = div.getElementsByTagName("a");


        for (const element of Array.from(anchors)) {
            if (element.href.includes("/songs") && element.href !== songsURL) {
                const folderName = element.pathname.split('/').filter(Boolean).pop();

                // -- NEW FIX -- This line checks if the folder found is NOT named 'songs'
                if (folderName && folderName.toLowerCase() !== 'songs') {
                    try {
                        const metadataResponse = await fetch(`${songsURL}${folderName}/info.json`);
                        if (!metadataResponse.ok) continue;
                        const metadata = await metadataResponse.json();
                        cardContainer.innerHTML += `
                    <div data-folder="${folderName}" data-type="local" class="card">
                        <div class="play"><img src="img/play.svg" alt="Play button"></div>
                        <img class="thumbnail" src="/songs/${folderName}/cover.jpg" alt="Album cover">
                        <h2>${metadata.title}</h2>
                        <p>${metadata.description}</p>
                    </div>`;
                    } catch (e) {
                        console.error(`Could not process folder: ${folderName}`, e);
                    }
                }
            }
        }
    } catch (error) { console.error("Failed to fetch or display local albums.", error); }

    // --- 2. Display Hardcoded YouTube Playlists (NEW) ---
    // Add as many playlists as you want here. Find the Playlist ID in the YouTube URL.
    const youtubePlaylists = [
        {
            playlistId: "PL04NSSUphsoa2JaVc4ax7Afr68r0OXnWE", // Example: Top Hits playlist
            title: "Punjabi Vibe",
            description: "The most played tracks right now on YouTube.",
            cover: "img/cover.jpg" // You'll need to provide your own cover images
        },
        {
            playlistId: "PL04NSSUphsoapRrclPcTInvzsE7s3G2wz", // Example: Lofi playlist
            title: "English Songs",
            description: "Alone walk in hill station.",
            cover: "img/cover2.webp" // You'll need to provide another cover image
        }
    ];

    youtubePlaylists.forEach(pl => {
        cardContainer.innerHTML += `
            <div data-playlist-id="${pl.playlistId}" data-type="youtube" class="card">
                <div class="play"><img src="img/play.svg" alt="Play button"></div>
                <img class="thumbnail" src="${pl.cover}" alt="Playlist cover">
                <h2>${pl.title}</h2>
                <p>${pl.description}</p>
            </div>`;
    });
}


// ---------- PLAYBACK LOGIC ----------

// -- MODIFIED -- to handle both players
function playByIndex(index, autoplay = true) {
    if (!songs.length) return;

    currentIndex = Math.max(0, Math.min(index, songs.length - 1));
    const track = songs[currentIndex];

    // Stop any previously playing audio/video
    currentSong.pause();
    if (isYoutubeReady && player.stopVideo) player.stopVideo();
    clearInterval(timeUpdater);

    if (playerMode === 'local') {
        // For local MP3
        currentSong.src = track; // Your local file path
        const name = decodeURIComponent(track.split("/").pop().replace(/\.mp3$/i, ""));
        document.querySelector(".songInfo").innerHTML = `<h2>${name}</h2>`;
        if (autoplay) {
            currentSong.play();
            document.getElementById("play").src = "img/pause.svg";
        }
    } else if (playerMode === 'youtube') {
        // For YouTube Playlist
        if (!isYoutubeReady) {
            console.error("YouTube player is not ready yet.");
            return;
        }
        document.querySelector(".songInfo").innerHTML = `<h2>${track.title}</h2>`;
        document.querySelector(".songTime").innerHTML = "0:00 / 0:00";

        if (autoplay) {
            player.loadVideoById(track.id);
            player.playVideo(); // Ensure it starts playing
        } else {
            player.cueVideoById(track.id);
        }
    }
}




// -- NEW -- Helper functions for clarity
function playNext() {
    // const next = (currentIndex + 1) % songs.length;
    // playByIndex(next, true);
    if (!songs.length) return;
    const nextIndex = (currentIndex + 1) % songs.length;
    playByIndex(nextIndex, true);
}
function playPrevious() {
    // const prev = (currentIndex - 1 + songs.length) % songs.length;
    // playByIndex(prev, true);
    if (!songs.length) return;
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    playByIndex(prevIndex, true);
}


// ---------- MAIN WIRING ----------
async function main() {
    await displayAlbums();

    // -- MODIFIED -- Card container click listener to handle both types
    document.querySelector(".cardContainer").addEventListener("click", async (event) => {
    const card = event.target.closest(".card");
    if (!card) return;

    const type = card.dataset.type;
    if (type === 'local') {
        playerMode = 'local';
        const folder = card.dataset.folder;
        songs = await getSongs(`songs/${folder}`);
        renderLibrary();
        playByIndex(0, true);
    } else if (type === 'youtube') {
        playerMode = 'youtube';
        const playlistId = card.dataset.playlistId;
        songs = await getYouTubePlaylist(playlistId);

        if (songs.length > 0) {
            renderLibrary();
            // Wait until YouTube player is ready
            if (!isYoutubeReady) {
                console.log("Waiting for YouTube player...");
                const waitForYT = setInterval(() => {
                    if (isYoutubeReady) {
                        clearInterval(waitForYT);
                        playByIndex(0, true);
                    }
                }, 300);
            } else {
                playByIndex(0, true);
            }
        }
    }
});


    // Library song click (works for both modes)
    document.querySelector(".songlist ul").addEventListener("click", (e) => {
        const li = e.target.closest("li[data-index]");
        if (li) {
            playByIndex(Number(li.dataset.index), true);
        }
    });


    document.querySelectorAll(".play-now").forEach(button => {
        button.addEventListener("click", () => {
            const index = parseInt(button.getAttribute("data-index"), 10);
            if (playerMode === 'youtube' && !isYoutubeReady) {
                console.warn("YouTube player is not ready yet!");
                return;
            }
            playByIndex(index, true);
        });
    });



    // -- MODIFIED -- Playback controls to handle both players
    document.getElementById("play").addEventListener("click", () => {
        if (playerMode === 'local') {
            if (currentSong.paused) {
                currentSong.play();
                document.getElementById("play").src = "img/pause.svg";
            } else {
                currentSong.pause();
                document.getElementById("play").src = "img/playbar.svg";
            }
        } else { // youtube mode
            const playerState = player.getPlayerState();
            if (playerState === YT.PlayerState.PLAYING) {
                player.pauseVideo();
                document.getElementById("play").src = "img/playbar.svg";
            } else {
                player.playVideo();
                document.getElementById("play").src = "img/pause.svg";
            }
        }
    });


    document.getElementById("next").addEventListener("click", playNext);
    document.getElementById("previous").addEventListener("click", playPrevious);

    // -- MODIFIED -- Local song time update event
    currentSong.addEventListener("timeupdate", () => {
        if (playerMode !== 'local' || !currentSong.duration) return;
        const pct = (currentSong.currentTime / currentSong.duration) * 100;
        document.querySelector(".songTime").innerHTML = `${minSec(currentSong.currentTime)} / ${minSec(currentSong.duration)}`;
        document.querySelector(".circle").style.left = `${pct}%`;
        document.querySelector(".progress").style.width = `${pct}%`;
    });

    // -- MODIFIED -- Seekbar click to handle both players
    document.querySelector(".seekbar").addEventListener("click", (e) => {
        const r = document.querySelector(".seekbar").getBoundingClientRect();
        const pct = (e.clientX - r.left) / r.width;

        if (playerMode === 'local' && currentSong.duration) {
            currentSong.currentTime = currentSong.duration * pct;
        } else if (playerMode === 'youtube' && player.getDuration) {
            player.seekTo(player.getDuration() * pct);
        }
    });

    // -- MODIFIED -- Volume controls to handle both players
    // --- Volume Control with Single Toggle Icon ---
    let isVolumeDragging = false;
    let lastVolume = 1; // last saved volume (0–1 for local, 0–100 for YouTube)
    const volumeBar = document.querySelector(".volumeBar");
    const volumeCircle = document.querySelector(".volumeCircle");
    const volumeProgress = document.querySelector(".volumeProgress");
    const volumeIcon = document.querySelector(".volume"); // single icon element

    // Set default icon
    volumeIcon.src = "img/volume.svg";

    function updateVolumeUI(percent) {
        volumeProgress.style.width = `${percent}%`;
        const barWidth = volumeBar.offsetWidth;
        const circleWidth = volumeCircle.offsetWidth;
        const leftPx = (percent / 100) * barWidth - circleWidth / 2;
        volumeCircle.style.left = `${Math.max(-circleWidth / 2, Math.min(leftPx, barWidth - circleWidth / 2))}px`;
    }

    function updateVolume(e) {
        const r = volumeBar.getBoundingClientRect();
        let pct = ((e.clientX - r.left) / r.width) * 100;
        pct = Math.max(0, Math.min(100, pct));

        if (playerMode === 'local') {
            const vol = pct / 100;
            currentSong.volume = vol;
            if (vol > 0) lastVolume = vol;
        } else if (playerMode === 'youtube' && player.setVolume) {
            player.setVolume(pct);
            if (pct > 0) lastVolume = pct;
        }

        updateVolumeUI(pct);
        volumeIcon.src = pct === 0 ? "img/mute.svg" : "img/volume.svg";
    }

    // Drag to set volume
    volumeBar.addEventListener("mousedown", (e) => { isVolumeDragging = true; updateVolume(e); });
    window.addEventListener("mousemove", (e) => { if (isVolumeDragging) updateVolume(e); });
    window.addEventListener("mouseup", () => { isVolumeDragging = false; });

    // Click to mute/unmute
    volumeIcon.addEventListener("click", () => {
        if (playerMode === 'local') {
            if (currentSong.volume > 0) {
                lastVolume = currentSong.volume;
                currentSong.volume = 0;
                updateVolumeUI(0);
                volumeIcon.src = "img/mute.svg";
            } else {
                currentSong.volume = lastVolume || 1;
                updateVolumeUI((lastVolume || 1) * 100);
                volumeIcon.src = "img/volume.svg";
            }
        } else if (playerMode === 'youtube' && player.getVolume) {
            if (player.getVolume() > 0) {
                lastVolume = player.getVolume();
                player.setVolume(0);
                updateVolumeUI(0);
                volumeIcon.src = "img/mute.svg";
            } else {
                player.setVolume(lastVolume || 100);
                updateVolumeUI(lastVolume || 100);
                volumeIcon.src = "img/volume.svg";
            }
        }
    });

    // Start with full volume
    updateVolumeUI(100);


    // Hamburger menu (no changes needed)
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });
    document.querySelector(".hamburgerClose").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-100%";
    });

    // Load a default local playlist on startup
    songs = await getSongs("songs/Hollywood");
    renderLibrary();
    playByIndex(0, false); // Load first song but don't play
}

