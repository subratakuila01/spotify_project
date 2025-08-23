let currentSong = new Audio();

function minSec(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "0:00";
    }

    let minutes = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);

    return `${minutes}:${secs < 10 ? "0" + secs : secs}`;
}


async function getSongs() {
    // Define the folder you are fetching from
    const songsURL = "http://127.0.0.1:5500/songs/";

    let a = await fetch(songsURL);
    let response = await a.text();

    let div = document.createElement("div");
    div.innerHTML = response;

    let as = div.getElementsByTagName("a");
    let songs = [];
    for (let i = 0; i < as.length; i++) {
        const element = as[i];
        if (element.href.endsWith(".mp3")) {
            songs.push(songsURL + element.getAttribute("href"));
        }
    }
    return songs;
}

const playMusic = (track, pause = false) => {
    currentSong.src = track;
    if (!pause) {
        currentSong.play();
        play.src = "pause.svg";
    }
    document.querySelector(".songInfo").innerHTML = `
        <h2>${decodeURI(currentSong.src.split("/").pop()).replaceAll(".mp3", "")}</h2>
    `;
    document.querySelector(".songTime").innerHTML = `0:00 / ${minSec(currentSong.duration)}`;
}

async function main() {

    // get the list of all songs
    let songs = await getSongs();
    console.log(songs);
    playMusic(songs[0], true);

    let songUl = document.querySelector(".songlist").getElementsByTagName("ul")[0];
    for (const song of songs) {

        let songName = song.split("/").pop().replaceAll(".mp3", "");
        songName = decodeURI(songName);                  // Decode characters like %20 into spaces
        // songName = songName.replaceAll(".mp3", "");     // Remove the file extension
        songUl.innerHTML += `<li data-song="${song}">
                            <img class="music" src="music.svg" alt="">
                            <div class="info">
                                <div>${songName}</div>
                                <div>Subrata</div>
                            </div>
                            <div class="playBar">
                                <span>Play Now</span>
                                <img class="playNow" src="playNow.svg" alt="">
                            </div>
                        </li>`;
    }

    // Attach a eventLitsner to each song

    Array.from(document.querySelector(".songlist").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            let trackToPlay = e.dataset.song;
            console.log("Playing:", trackToPlay);
            playMusic(trackToPlay);
        });
    });

    // Attach an event litsner to play, next, previous

    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "pause.svg";
        }
        else {
            currentSong.pause();
            play.src = "playbar.svg";
        }

    });

    // Litsen for time update

    currentSong.addEventListener("timeupdate", () => {
        let percent = (currentSong.currentTime / currentSong.duration) * 100;

        document.querySelector(".songTime").innerHTML = `${minSec(currentSong.currentTime)} / ${minSec(currentSong.duration)}`;

        document.querySelector(".circle").style.left = `${(currentSong.currentTime / currentSong.duration) * 100}%`;

        document.querySelector(".circle").style.left = `${percent}%`;
        document.querySelector(".progress").style.width = `${percent}%`;

    });

    // Add event listener for seekbar

    document.querySelector(".seekbar").addEventListener("click", (e) => {
        // Get the position and size of the entire seekbar.
        const seekbarRect = e.currentTarget.getBoundingClientRect();

        // Calculate the click's horizontal position starting from the left of the seekbar.
        const clickX = e.clientX - seekbarRect.left;

        // Calculate the percentage of the bar that was clicked.
        let percent = (clickX / seekbarRect.width) * 100;

        // Ensure the percentage stays between 0 and 100.
        percent = Math.max(0, Math.min(100, percent));

        // Move the circle and progress bar to the clicked position for instant feedback.
        document.querySelector(".circle").style.left = `${percent}%`;
        document.querySelector(".progress").style.width = `${percent}%`;

        // Update the song's current time based on the calculated percentage.
        if (currentSong.duration) {
            currentSong.currentTime = (currentSong.duration * percent) / 100;
        }
    });


    
    // Add a variable to track the dragging state
    let isDragging = false;

    // 1. Mouse Down: When the user first clicks the seekbar
    document.querySelector(".seekbar").addEventListener("mousedown", (e) => {
        isDragging = true;

        // Immediately move to the clicked position
        updateSeekbar(e);
    });

    // 2. Mouse Move: When the user moves the mouse while holding it down
    window.addEventListener("mousemove", (e) => {
        // Only run the code if we are currently dragging
        if (isDragging) {
            updateSeekbar(e);
        }
    });

    // 3. Mouse Up: When the user releases the mouse button
    window.addEventListener("mouseup", (e) => {
        if (isDragging) {
            isDragging = false;

            // Set the final song time
            const seekbarRect = document.querySelector(".seekbar").getBoundingClientRect();
            const clickX = e.clientX - seekbarRect.left;
            let percent = (clickX / seekbarRect.width) * 100;
            percent = Math.max(0, Math.min(100, percent)); // Clamp between 0 and 100

            if (currentSong.duration) {
                currentSong.currentTime = (currentSong.duration * percent) / 100;
            }
        }
    });

    // Helper function to update the UI
    function updateSeekbar(e) {
        const seekbar = document.querySelector(".seekbar");
        const seekbarRect = seekbar.getBoundingClientRect();

        // Calculate the click's horizontal position within the seekbar
        const clickX = e.clientX - seekbarRect.left;

        // Calculate the percentage clicked
        let percent = (clickX / seekbarRect.width) * 100;

        // Ensure the percentage stays between 0 and 100
        percent = Math.max(0, Math.min(100, percent));

        // Update the UI for instant feedback
        document.querySelector(".circle").style.left = `${percent}%`;
        document.querySelector(".progress").style.width = `${percent}%`;
    }

}

main();