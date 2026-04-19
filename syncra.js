<script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

        // --- FIREBASE CONFIG ---
        const firebaseConfig = {
            apiKey: "AIzaSyDvPTE0sHKiixl6OEfreRufTh...", 
            authDomain: "syncra-1c163.firebaseapp.com",
            projectId: "syncra-1c163",
            storageBucket: "syncra-1c163.appspot.com",
            appId: "1:489014975940:web:b7fa826d5645..."
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        // --- DOM ELEMENTS ---
        const audio = document.getElementById('audio-core');
        const miniPlay = document.getElementById('mini-play-btn');
        const mainPlay = document.getElementById('fp-play-main');
        const pLoader = document.getElementById('p-loader');
        const fpProgress = document.getElementById('fp-progress');
        const statusModal = document.getElementById('status-modal');
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');

        let songQueue = [];
        let currentIndex = -1;

        // --- UTILITIES ---
        function showStatus(msg, type = 'success') {
            statusText.innerText = msg;
            statusModal.className = 'show';
            
            if(type === 'success') {
                statusModal.style.background = 'rgba(29, 185, 84, 0.9)';
                statusIcon.className = 'fas fa-check-circle';
            } else if(type === 'error') {
                statusModal.style.background = 'rgba(255, 77, 77, 0.9)';
                statusIcon.className = 'fas fa-exclamation-triangle';
            } else {
                statusModal.style.background = 'rgba(52, 152, 219, 0.9)';
                statusIcon.className = 'fas fa-info-circle';
            }

            setTimeout(() => { statusModal.className = ''; }, 3500);
        }

        window.toggleFullPlayer = (show) => {
            document.getElementById('full-player').style.display = show ? 'flex' : 'none';
        };

        window.handleMiniPlayerClick = (e) => {
            if (e.target.id !== 'mini-play-btn' && !e.target.closest('.fa-forward-step')) {
                toggleFullPlayer(true);
            }
        };

        function formatTime(secs) {
            if (isNaN(secs)) return "0:00";
            const m = Math.floor(secs / 60);
            const s = Math.floor(secs % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }

        // --- AUDIO CONTROLS ---
        window.togglePlay = () => {
            if (!audio.src) return;
            if (audio.paused) audio.play();
            else audio.pause();
        };

        audio.onplaying = () => {
            pLoader.style.display = 'none';
            miniPlay.className = 'fas fa-pause';
            mainPlay.innerHTML = '<i class="fas fa-pause"></i>';
            document.getElementById('fp-art-container').classList.add('playing');
        };

        audio.onpause = () => {
            miniPlay.className = 'fas fa-play';
            mainPlay.innerHTML = '<i class="fas fa-play"></i>';
            document.getElementById('fp-art-container').classList.remove('playing');
        };

        audio.onwaiting = () => pLoader.style.display = 'flex';

        audio.ontimeupdate = () => {
            const ratio = (audio.currentTime / audio.duration) * 100;
            fpProgress.style.width = ratio + '%';
            document.getElementById('time-curr').innerText = formatTime(audio.currentTime);
            document.getElementById('time-total').innerText = formatTime(audio.duration);
        };

        audio.onended = () => playNext();

        // --- QUEUE LOGIC ---
        window.playNext = () => {
            if (songQueue.length === 0) return;
            currentIndex = (currentIndex + 1) % songQueue.length;
            playTrack(songQueue[currentIndex]);
        };

        window.playPrevious = () => {
            if (songQueue.length === 0) return;
            currentIndex = (currentIndex - 1 + songQueue.length) % songQueue.length;
            playTrack(songQueue[currentIndex]);
        };

        async function fetchSongs() {
            try {
                const snap = await getDocs(collection(db, "songs"));
                songQueue = snap.docs.map(doc => doc.data());
                renderLibrary(songQueue);
                showStatus("Library Synced", "success");
            } catch (e) {
                showStatus("Database Connection Error", "error");
            }
        }

        function renderLibrary(songs) {
            const list = document.getElementById('songs-container');
            const cards = document.getElementById('featured-cards');
            
            songs.forEach((song, idx) => {
                // List Item
                const item = document.createElement('div');
                item.className = 'track-item';
                item.innerHTML = `
                    <div class="track-art-sm"><img src="${song.thumbnailUrl || 'syncra1.jpg'}"></div>
                    <div style="flex:1"><h4>${song.title}</h4><p>${song.artist}</p></div>
                    <i class="fas fa-ellipsis-h" style="color:var(--text-gray)"></i>
                `;
                item.onclick = () => { currentIndex = idx; playTrack(song); };
                list.appendChild(item);

                // Card Item
                const card = document.createElement('div');
                card.className = 'music-card';
                card.innerHTML = `
                    <div class="card-art"><img src="${song.thumbnailUrl || 'syncra1.jpg'}"></div>
                    <h4>${song.title}</h4>
                `;
                card.onclick = () => { 
                    currentIndex = idx; 
                    playTrack(song); 
                    toggleFullPlayer(true); 
                };
                cards.appendChild(card);
            });
        }

        function playTrack(song) {
            if(!song) return;
            pLoader.style.display = 'flex';
            
            // Update UI
            document.getElementById('p-title').innerText = song.title;
            document.getElementById('p-artist').innerText = song.artist;
            document.getElementById('p-img').src = song.thumbnailUrl || 'syncra1.jpg';
            
            document.getElementById('fp-title').innerText = song.title;
            document.getElementById('fp-artist').innerText = song.artist;
            document.getElementById('fp-img').src = song.thumbnailUrl || 'syncra1.jpg';
            
            audio.src = song.audioUrl;
            audio.play().catch(err => showStatus("Playback Restricted", "error"));

            // Set Media Session (Notification Controls)
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: song.title,
                    artist: song.artist,
                    artwork: [{ src: song.thumbnailUrl || 'syncra1.jpg', sizes: '512x512', type: 'image/jpeg' }]
                });
            }
        }

        // --- DOWNLOAD SYSTEM ---
        window.downloadCurrent = async () => {
            const song = songQueue[currentIndex];
            if (!song) return showStatus("No song selected", "info");

            const btn = document.getElementById('fp-download');
            btn.classList.add('downloading');
            showStatus(`Downloading ${song.title}...`, 'info');

            try {
                const response = await fetch(song.audioUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${song.title} - ${song.artist}.mp3`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                showStatus("Download Complete", "success");
            } catch (err) {
                showStatus("Download Failed", "error");
            } finally {
                btn.classList.remove('downloading');
            }
        };

        // --- SEEKING LOGIC ---
        document.getElementById('fp-seek-bar').onclick = (e) => {
            if (!audio.duration) return;
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            audio.currentTime = (x / width) * audio.duration;
        };

        // Connectivity Listeners
        window.addEventListener('online', () => showStatus("Back Online", "success"));
        window.addEventListener('offline', () => showStatus("You are Offline", "error"));

        fetchSongs();

        