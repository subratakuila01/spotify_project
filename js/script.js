let currentSong = new Audio();
let currfolder = "";
let songs = [];
let currentIndex = 0;

// ---------- utils ----------
function minSec(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" + s : s}`;
}

// ---------- data ----------
async function getSongs(folder) {

    currfolder = folder;
    const base = `/${currfolder}/`;

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

    songs = list;
    return list;
}

// ---------- UI render ----------
function renderLibrary() {
    const ul = document.querySelector(".songlist ul");
    if (!ul) return;

    ul.innerHTML = "";
    songs.forEach((song, i) => {
        const name = decodeURIComponent(song.split("/").pop().replace(/\.mp3$/i, ""));
        ul.insertAdjacentHTML(
            "beforeend",
            `<li data-index="${i}">
                <img class="music" src="img/music.svg" alt="">
                <div class="info">
                    <div>${name}</div>
                    <div>Subrata</div>
                </div>
                <div class="playBar">
                    <span>Play Now</span>
                    <img class="playNow" src="img/playNow.svg" alt="">
                </div>
            </li>`
        );
    });
}


// ---------- playback ----------
function playByIndex(index, autoplay = true) {
    if (!songs.length) return;
    currentIndex = Math.max(0, Math.min(index, songs.length - 1));

    const track = songs[currentIndex];
    currentSong.src = track;

    const name = decodeURIComponent(track.split("/").pop().replace(/\.mp3$/i, ""));
    const songInfo = document.querySelector(".songInfo");
    if (songInfo) songInfo.innerHTML = `<h2>${name}</h2>`;

    const setDuration = () => {
        const st = document.querySelector(".songTime");
        if (st) st.innerHTML = `0:00 / ${minSec(currentSong.duration)}`;
    };
    if (currentSong.readyState >= 1) setDuration();
    else currentSong.addEventListener("loadedmetadata", setDuration, { once: true });

    const playBtn = document.getElementById("play");
    if (autoplay) {
        currentSong.play().catch(err => console.error("Play failed:", err));
        if (playBtn) playBtn.src = src = "img/pause.svg";
    } else {
        if (playBtn) playBtn.src = src = "img/playbar.svg";
    }
}


// ✅ FIXED AND IMPROVED FUNCTION
async function displayAlbums() {
    const cardContainer = document.querySelector(".cardContainer");
    if (!cardContainer) {
        console.error("Error: The .cardContainer element was not found in your HTML.");
        return;
    }

    // ✅ FIX 1: Corrected the IP Address
    const songsURL = `http://127.0.0.1:5500/songs/`;
    console.log("Starting to fetch albums...");  //debug

    try {
        const response = await fetch(songsURL);
        const htmlText = await response.text();
        const div = document.createElement("div");
        div.innerHTML = htmlText;
        const anchors = div.getElementsByTagName("a");

        // ✅ FIX 2: Used a 'for...of' loop to correctly handle async/await
        for (const element of Array.from(anchors)) {

            // A more reliable way to find only the folder links
            if (element.href.includes("/songs")) {

                if (element.href === songsURL) {
                    continue;
                }

                // This correctly gets the folder name (e.g., "Bollywood")
                const folderName = element.pathname.split('/').filter(Boolean).pop();
                console.log(`Found potential folder: ${folderName}`);  //debug

                if (folderName) {
                    try {
                        // Fetch the metadata for each album
                        const metadataResponse = await fetch(`${songsURL}${folderName}/info.json`);
                        if (!metadataResponse.ok) continue; // Skip if info.json doesn't exist

                        const metadata = await metadataResponse.json();

                        // Append the new card to the container
                        cardContainer.innerHTML += `
                            <div data-folder="${folderName}" class="card">
                                <div class="play"><img src="img/play.svg" alt="Play button"></div>
                                <img class="thumbnail" src="/songs/${folderName}/cover.webp" alt="Album cover">
                                <h2>${metadata.title}</h2>
                                <p>${metadata.description}</p>
                            </div>`;
                    } catch (e) {
                        console.error(`Could not process folder: ${folderName}`, e);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Failed to fetch or display albums.", error);
    }
}



// ---------- main wiring ----------
async function main() {

    // ✅ CALL THE FUNCTION TO DISPLAY ALBUMS ON THE PAGE
    await displayAlbums();

    // Using event delegation on the container is more efficient
    const cardContainer = document.querySelector(".cardContainer");
    if (cardContainer) {
        cardContainer.addEventListener("click", async (event) => {
            // Find the card that was actually clicked on
            const card = event.target.closest(".card");

            if (card) {
                const folder = card.dataset.folder;
                if (!folder) return;

                // Load songs from the clicked card's folder
                await getSongs(`songs/${folder}`);
                renderLibrary();
                playByIndex(0, true); // Autoplay the first song of the new playlist
            }
        });
    }


    // Default playlist on load (optional, you can remove this if you want)
    await getSongs("songs/1_Global_Vibes");
    renderLibrary();
    playByIndex(0, false); // load first but don't autoplay

    // Library click (delegation) — plays clicked song
    const ul = document.querySelector(".songlist ul");
    ul.addEventListener("click", (e) => {
        const li = e.target.closest("li[data-index]");
        if (!li) return;
        const idx = Number(li.dataset.index);
        playByIndex(idx, true);
    });

    // Controls
    const playBtn = document.getElementById("play");
    const prevBtn = document.getElementById("previous");
    const nextBtn = document.getElementById("next");

    playBtn.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            playBtn.src = src = "img/pause.svg";
        } else {
            currentSong.pause();
            playBtn.src = src = "img/playbar.svg";
        }
    });

    nextBtn.addEventListener("click", () => {
        const next = (currentIndex + 1) % songs.length;
        playByIndex(next, true);
    });

    prevBtn.addEventListener("click", () => {
        const prev = (currentIndex - 1 + songs.length) % songs.length;
        playByIndex(prev, true);
    });

    // Progress updates
    currentSong.addEventListener("timeupdate", () => {
        if (!currentSong.duration) return;
        const pct = (currentSong.currentTime / currentSong.duration) * 100;
        const st = document.querySelector(".songTime");
        if (st) st.innerHTML = `${minSec(currentSong.currentTime)} / ${minSec(currentSong.duration)}`;
        const circle = document.querySelector(".circle");
        const progress = document.querySelector(".progress");
        if (circle) circle.style.left = `${pct}%`;
        if (progress) progress.style.width = `${pct}%`;
    });

    // Auto-play next song when current ends
    currentSong.addEventListener("ended", () => {
        if (currentIndex < songs.length - 1) {
            // Play the next song if not at the end
            playByIndex(currentIndex + 1, true);
        } else {
            // Stop at the last song
            const playBtn = document.getElementById("play");
            if (playBtn) playBtn.src = "img/playbar.svg"; // change to play icon
            currentSong.pause();
            currentSong.currentTime = 0; // reset to start
        }
    });



    // --- Seekbar ---
    let isSeekDragging = false;
    const seekBar = document.querySelector(".seekbar");
    const seekCircle = document.querySelector(".circle");
    const seekProgress = document.querySelector(".progress");

    // Update UI based on percentage
    function updateSeekUI(percent) {
        const barWidth = seekBar.offsetWidth;
        const circleWidth = seekCircle.offsetWidth;
        const leftPx = (percent / 100) * barWidth - circleWidth / 2;
        seekCircle.style.left = `${Math.max(-circleWidth / 2, Math.min(leftPx, barWidth - circleWidth / 2))}px`;
        seekProgress.style.width = `${percent}%`;
    }

    // Update seek position from mouse
    function updateSeek(e) {
        const r = seekBar.getBoundingClientRect();
        let pct = ((e.clientX - r.left) / r.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        updateSeekUI(pct);
        if (currentSong.duration) {
            currentSong.currentTime = (currentSong.duration * pct) / 100;
        }
    }

    // Mouse events
    seekBar.addEventListener("mousedown", (e) => { isSeekDragging = true; updateSeek(e); });
    window.addEventListener("mousemove", (e) => { if (isSeekDragging) updateSeek(e); });
    window.addEventListener("mouseup", () => { isSeekDragging = false; });


    // Sidebar toggles (unchanged)
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });
    document.querySelector(".hamburgerClose").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-100%";
    });

    // --- Volume (keep your existing CSS/HTML) ---
    let isVolumeDragging = false;
    let lastVolume = 1;
    const volumeBar = document.querySelector(".volumeBar");
    const volumeCircle = document.querySelector(".volumeCircle");
    const volumeProgress = document.querySelector(".volumeProgress");
    const volumeIcon = document.querySelector(".volume");
    const muteIcon = document.querySelector(".mute");
    muteIcon.style.display = "none";

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
        const vol = pct / 100;
        currentSong.volume = vol;
        if (vol > 0) lastVolume = vol;
        updateVolumeUI(pct);
        if (vol === 0) { volumeIcon.style.display = "none"; muteIcon.style.display = "inline"; }
        else { muteIcon.style.display = "none"; volumeIcon.style.display = "inline"; }
    }
    volumeBar.addEventListener("mousedown", (e) => { isVolumeDragging = true; updateVolume(e); });
    window.addEventListener("mousemove", (e) => { if (isVolumeDragging) updateVolume(e); });
    window.addEventListener("mouseup", () => { isVolumeDragging = false; });
    volumeIcon.addEventListener("click", () => {
        lastVolume = currentSong.volume || lastVolume || 1;
        currentSong.volume = 0;
        volumeIcon.style.display = "none";
        muteIcon.style.display = "inline";
        // UI stays where it was (per your requirement)
    });
    muteIcon.addEventListener("click", () => {
        currentSong.volume = lastVolume || 1;
        muteIcon.style.display = "none";
        volumeIcon.style.display = "inline";
        updateVolumeUI(currentSong.volume * 100); // sync UI back if needed
    });

    // Optional: show full volume UI on load
    updateVolumeUI(100);
}


// Disable right-click
document.addEventListener("contextmenu", event => event.preventDefault());

// Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+Shift+J
document.addEventListener("keydown", event => {
    if (
        event.key === "F12" ||
        (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "i") ||
        (event.ctrlKey && event.key.toLowerCase() === "u") ||
        (event.ctrlKey && event.key.toLowerCase() === "s") ||
        (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "j")
    ) {
        event.preventDefault();
        event.stopPropagation();
        alert("Developer tools are disabled on this site.");
    }
});


main();