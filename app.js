const audio = document.getElementById('audioPlayer');
        const vinylView = document.getElementById('vinylView');
        const cassetteView = document.getElementById('cassetteView');
        const body = document.body;
        const vinylRecord = document.getElementById('vinylRecord');
        const vinylBase = document.getElementById('vinylBase');
        const tonearm = document.getElementById('tonearm');
        const coverArt = document.getElementById('coverArt');
        const turntableArea = document.querySelector('.turntable-area');

        const cassetteCanvas = document.getElementById('cassetteVisualizer');
        const ctxCassette = cassetteCanvas.getContext('2d');

        const DEFAULT_COVER = "";


        const SUPABASE_URL = "https://qivhbjfryuxqsoyszihf.supabase.co";
        const SUPABASE_ANON_KEY =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdmhiamZyeXV4cXNveXN6aWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTk5MjcsImV4cCI6MjA5ODkzNTkyN30.gdHvMe0RkYag7SEER6ZJiwJ32hp8wmrK-rUobePKVSM";

        const supabaseClient = (window.supabase && !SUPABASE_URL.includes('YOUR-PROJECT')) ?
            window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) :
            null;

        const MAX_UPLOAD_MB = 25;

        let isPlaying = false;
        let playlist = [];
        let currentIndex = 0;
        let currentTheme = 'vinyl';

        let session = null;
        let librarySongs = [];
        let activeTab = 'player';
        let authMode = 'login';

        let uploadPickedFile = null;
        let uploadCoverBlob = null;
        let uploadDuration = null;
        let uploadCustomCoverBlob = null;  // user-chosen cover image

        // ── PLAY COUNT (localStorage) ──
        function getPlayCounts() {
            try { return JSON.parse(localStorage.getItem('teefy_play_counts') || '{}'); }
            catch { return {}; }
        }
        function incrementPlayCount(songId) {
            const counts = getPlayCounts();
            counts[songId] = (counts[songId] || 0) + 1;
            localStorage.setItem('teefy_play_counts', JSON.stringify(counts));
        }
        function getPlayCount(songId) {
            return getPlayCounts()[songId] || 0;
        }

        let audioCtx, analyser, dataArray, animationId;

        function switchTheme(themeName) {
            currentTheme = themeName;
            body.className = `theme-${themeName}`;
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.remove('vinyl-active', 'cassette-active');
                if (btn.textContent.toLowerCase() === themeName) {
                    btn.classList.add(`${themeName}-active`);
                }
            });

            if (themeName === 'vinyl') {
                vinylView.style.visibility = 'visible';
                vinylView.style.opacity = '1';
                vinylView.style.transform = 'translateX(-50%) scale(1)';
                cassetteView.style.opacity = '0';
                cassetteView.style.transform = 'translateX(-50%) scale(0.95)';
                setTimeout(() => { if (currentTheme === 'vinyl') cassetteView.style.visibility = 'hidden'; }, 600);
            } else {
                cassetteView.style.visibility = 'visible';
                cassetteView.style.opacity = '1';
                cassetteView.style.transform = 'translateX(-50%) scale(1)';
                vinylView.style.opacity = '0';
                vinylView.style.transform = 'translateX(-50%) scale(0.95)';
                setTimeout(() => { if (currentTheme === 'cassette') vinylView.style.visibility = 'hidden'; }, 600);
            }
        }

        coverArt.addEventListener('load', function () {
            coverArt.hidden = false;
            if (currentTheme !== 'vinyl') return;

            const canvas = document.getElementById('colorCanvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 100;
            canvas.height = 100;

            try {
                ctx.drawImage(coverArt, 0, 0, 100, 100);
                const data = ctx.getImageData(0, 0, 100, 100).data;

                let r = 0,
                    g = 0,
                    b = 0;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                }

                const count = data.length / 4;
                updateNeumorphicPalette(Math.floor(r / count), Math.floor(g / count), Math.floor(b / count));
            } catch (e) {
                console.warn("Could not extract image color (likely a cross-origin cover image).", e);
            }
        });

        function updateNeumorphicPalette(r, g, b) {
            const clamp = (n) => Math.max(0, Math.min(255, n));
            const rgbToHsl = (R, G, B) => {
                R /= 255;
                G /= 255;
                B /= 255;
                const max = Math.max(R, G, B);
                const min = Math.min(R, G, B);
                const d = max - min;
                let h = 0;
                const l = (max + min) / 2;
                const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
                if (d !== 0) {
                    switch (max) {
                        case R:
                            h = ((G - B) / d) % 6;
                            break;
                        case G:
                            h = (B - R) / d + 2;
                            break;
                        case B:
                            h = (R - G) / d + 4;
                            break;
                    }
                    h *= 60;
                    if (h < 0) h += 360;
                }
                return { h, s, l };
            };

            const hslToRgb = (h, s, l) => {
                const c = (1 - Math.abs(2 * l - 1)) * s;
                const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
                const m = l - c / 2;
                let r1 = 0,
                    g1 = 0,
                    b1 = 0;
                if (h < 60) {
                    r1 = c;
                    g1 = x;
                    b1 = 0;
                } else if (h < 120) {
                    r1 = x;
                    g1 = c;
                    b1 = 0;
                } else if (h < 180) {
                    r1 = 0;
                    g1 = c;
                    b1 = x;
                } else if (h < 240) {
                    r1 = 0;
                    g1 = x;
                    b1 = c;
                } else if (h < 300) {
                    r1 = x;
                    g1 = 0;
                    b1 = c;
                } else {
                    r1 = c;
                    g1 = 0;
                    b1 = x;
                }
                return {
                    r: Math.round((r1 + m) * 255),
                    g: Math.round((g1 + m) * 255),
                    b: Math.round((b1 + m) * 255)
                };
            };

            const { h, s, l } = rgbToHsl(r, g, b);
            const targetL = Math.min(0.88, Math.max(0.55, l + 0.22));
            const targetS = Math.min(0.75, s * 0.85 + 0.05);

            const light = hslToRgb(h, targetS, targetL);
            const lightR = clamp(light.r);
            const lightG = clamp(light.g);
            const lightB = clamp(light.b);

            const darkR = clamp(lightR - 45);
            const darkG = clamp(lightG - 45);
            const darkB = clamp(lightB - 45);

            const light2R = clamp(lightR + 28);
            const light2G = clamp(lightG + 28);
            const light2B = clamp(lightB + 28);

            document.documentElement.style.setProperty('--bg-neu', `rgb(${lightR}, ${lightG}, ${lightB})`);
            document.documentElement.style.setProperty('--shadow-dark', `rgb(${darkR}, ${darkG}, ${darkB})`);
            document.documentElement.style.setProperty('--shadow-light', `rgb(${light2R}, ${light2G}, ${light2B})`);

            const relLuminance = (R, G, B) => {
                const chan = (v) => {
                    v /= 255;
                    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                };
                return 0.2126 * chan(R) + 0.7152 * chan(G) + 0.0722 * chan(B);
            };
            const contrastRatio = (l1, l2) => {
                const lighter = Math.max(l1, l2),
                    darker = Math.min(l1, l2);
                return (lighter + 0.05) / (darker + 0.05);
            };

            const bgLum = relLuminance(lightR, lightG, lightB);
            const darkTextLum = relLuminance(0, 0, 0);
            const lightTextLum = relLuminance(255, 255, 255);
            const useLightText = contrastRatio(bgLum, lightTextLum) > contrastRatio(bgLum, darkTextLum);

            const root = document.documentElement.style;
            if (useLightText) {
                root.setProperty('--text-main', 'rgba(255, 255, 255, 0.95)');
                root.setProperty('--text-muted', 'rgba(255, 255, 255, 0.72)');
                root.setProperty('--glass-overlay', 'rgba(0, 0, 0, 0.30)');
                root.setProperty('--glass-border', 'rgba(255, 255, 255, 0.18)');
                root.setProperty('--glass-shine', 'rgba(255, 255, 255, 0.12)');
            } else {
                root.setProperty('--text-main', 'rgba(0, 0, 0, 0.85)');
                root.setProperty('--text-muted', 'rgba(0, 0, 0, 0.55)');
                root.setProperty('--glass-overlay', 'rgba(255, 255, 255, 0.25)');
                root.setProperty('--glass-border', 'rgba(255, 255, 255, 0.35)');
                root.setProperty('--glass-shine', 'rgba(255, 255, 255, 0.7)');
            }
        }

        function initAudioContext() {
            if (audioCtx) return;
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(audio);
            analyser = audioCtx.createAnalyser();
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            analyser.fftSize = 64;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            drawVisualizer();
        }

        function drawVisualizer() {
            animationId = requestAnimationFrame(drawVisualizer);
            analyser.getByteFrequencyData(dataArray);

            ctxCassette.clearRect(0, 0, cassetteCanvas.width, cassetteCanvas.height);
            const barWidth = (cassetteCanvas.width / dataArray.length) * 1.5;
            let x = 0,
                bassSum = 0;

            for (let i = 0; i < dataArray.length; i++) {
                const barHeight = (dataArray[i] / 255) * cassetteCanvas.height;
                if (i < 5) bassSum += dataArray[i];

                ctxCassette.fillStyle = '#4ade80';
                const segments = Math.floor(barHeight / 4);
                for (let s = 0; s < segments; s++) {
                    ctxCassette.fillRect(x, cassetteCanvas.height - (s * 5) - 4, barWidth - 2, 3);
                }
                ctxCassette.shadowBlur = 5;
                ctxCassette.shadowColor = '#4ade80';
                x += barWidth + 1;
            }

            if (currentTheme === 'vinyl') {
                const intensity = (bassSum / 5) / 255;
                const glowSpread = 16 + (intensity * 30);
                const rgb = `rgba(255, 255, 255, ${intensity * 0.4})`;

                vinylBase.style.boxShadow = `
                    9px 9px 16px var(--shadow-dark),
                   -9px -9px 16px var(--shadow-light),
                    0 0 ${glowSpread}px ${rgb}
                `;
            } else {
                vinylBase.style.boxShadow =
                    `9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light)`;
            }
        }

        const formatTime = (sec) => {
            if (isNaN(sec)) return "0:00";
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        };

        const updateAllText = (selector, text) => {
            document.querySelectorAll(selector).forEach(el => {
                el.textContent = text;
                if (el.classList.contains('marquee-content')) {
                    if (text.length > 20) {
                        el.style.animationPlayState = 'running';
                        el.style.paddingLeft = '100%';
                    } else {
                        el.style.animationPlayState = 'paused';
                        el.style.paddingLeft = '0';
                        el.style.transform = 'translateX(0)';
                    }
                }
            });
        };

        const escapeHtml = (str) => {
            const div = document.createElement('div');
            div.textContent = str ?? '';
            return div.innerHTML;
        };

        const setTonearmAngle = (angle) => {
            if (tonearm) tonearm.style.transform = `rotate(${angle}deg)`;
        };

        const syncTonearmForPlayback = () => {
            if (currentTheme !== 'vinyl') return;
            if (!isPlaying) {
                setTonearmAngle(-25);
                return;
            }
            if (!audio.duration || Number.isNaN(audio.duration)) {
                setTonearmAngle(5);
                return;
            }
            const ratio = audio.currentTime / audio.duration;
            const startAngle = 5;
            const endAngle = 35;
            setTonearmAngle(startAngle + (ratio * (endAngle - startAngle)));
        };

        const togglePlayState = (forceState = null) => {
            if (playlist.length === 0) return alert("Please choose a track from the Library first.");
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

            isPlaying = forceState !== null ? forceState : !isPlaying;

            if (isPlaying) {
                audio.play().catch(e => console.error(e));
                vinylView.classList.add('is-playing-state');
                cassetteView.classList.add('is-playing-state');
                syncTonearmForPlayback();

                document.querySelectorAll('.js-btn-play').forEach(btn => {
                    if (btn.classList.contains('neu-flat')) {
                        btn.classList.remove('neu-flat');
                        btn.classList.add('neu-pressed', 'active-state');
                        btn.querySelector('.js-play-text').textContent = "PAUSE";
                    }
                    if (btn.classList.contains('js-cassette-play-btn')) btn.classList.add('is-active-btn');
                    btn.querySelector('.icon-play').classList.add('hidden');
                    btn.querySelector('.icon-pause').classList.remove('hidden');
                });
            } else {
                audio.pause();
                vinylView.classList.remove('is-playing-state');
                cassetteView.classList.remove('is-playing-state');
                setTonearmAngle(-25);
                const transform = window.getComputedStyle(vinylRecord).getPropertyValue('transform');
                if (transform !== 'none') vinylRecord.style.transform = transform;

                document.querySelectorAll('.js-btn-play').forEach(btn => {
                    if (btn.classList.contains('neu-pressed')) {
                        btn.classList.remove('neu-pressed', 'active-state');
                        btn.classList.add('neu-flat');
                        btn.querySelector('.js-play-text').textContent = "PLAY";
                    }
                    if (btn.classList.contains('js-cassette-play-btn')) btn.classList.remove('is-active-btn');
                    btn.querySelector('.icon-play').classList.remove('hidden');
                    btn.querySelector('.icon-pause').classList.add('hidden');
                });
            }
        };

        function loadTrack(index) {
            if (index < 0 || index >= playlist.length) return;

            const track = playlist[index];
            audio.src = track.audio_url;

            // ── increment play count ──
            if (track.id) incrementPlayCount(track.id);

            document.querySelectorAll('.js-queue-counter').forEach(el => {
                el.textContent = `${index + 1}/${playlist.length}`;
                el.classList.remove('hidden');
            });

            vinylRecord.style.transform = 'none';
            document.querySelectorAll('.js-progress-fill').forEach(bar => bar.style.width = '0%');
            updateAllText('.js-time-current', '0:00');

            updateAllText('.js-track-title', (track.title || 'Untitled').toUpperCase());
            updateAllText('.js-track-artist', (track.artist || 'Unknown Artist').toUpperCase());

            if (track.cover_url) {
                coverArt.hidden = false;
                coverArt.src = track.cover_url;
            } else {
                resetCoverArt();
            }

            if (activeTab === 'library') renderLibrary();
            togglePlayState(true);
        }

        function resetCoverArt() {
            coverArt.src = DEFAULT_COVER;
            coverArt.hidden = true;
            updateNeumorphicPalette(224, 229, 236);
        }

        function prevTrack() {
            if (audio.currentTime > 3) {
                audio.currentTime = 0;
            } else if (currentIndex > 0) {
                currentIndex--;
                loadTrack(currentIndex);
            }
        }

        function nextTrack() {
            if (currentIndex < playlist.length - 1) {
                currentIndex++;
                loadTrack(currentIndex);
            } else {
                audio.currentTime = 0;
                togglePlayState(false);
            }
        }

        function setAuthMode(mode) {
            authMode = mode;
            document.getElementById('loginModeBtn').classList.toggle('active', mode === 'login');
            document.getElementById('signupModeBtn').classList.toggle('active', mode === 'signup');
            document.getElementById('authUsername').style.display = mode === 'signup' ? 'block' : 'none';
            document.getElementById('authSubmitBtn').textContent = mode === 'signup' ? 'Sign Up' : 'Log In';
            document.getElementById('authHint').textContent = mode === 'signup' ?
                'Already have an account? Switch to Log In.' :
                'New here? Switch to Sign Up to create an account and start uploading tracks to the shared library.';
            const errorEl = document.getElementById('authError');
            errorEl.textContent = '';
            errorEl.style.color = '';
        }

        async function onLoggedIn(newSession) {
            session = newSession;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('appWrapper').style.display = 'flex';
            const username = session.user.user_metadata?.username || session.user.email.split('@')[0];
            document.getElementById('userLabel').textContent = username;
            await fetchLibrary();
        }

        function handleLogout() {
            if (!supabaseClient) return;
            supabaseClient.auth.signOut().then(() => {
                session = null;
                playlist = [];
                currentIndex = 0;
                isPlaying = false;
                audio.pause();
                audio.removeAttribute('src');
                document.getElementById('appWrapper').style.display = 'none';
                document.getElementById('authScreen').style.display = 'flex';
                document.getElementById('authEmail').value = '';
                document.getElementById('authPassword').value = '';
                switchTab('player');
            });
        }

        document.getElementById('authForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorEl = document.getElementById('authError');
            const submitBtn = document.getElementById('authSubmitBtn');
            errorEl.style.color = '';
            errorEl.textContent = '';

            if (!supabaseClient) {
                errorEl.textContent =
                    "Supabase isn't configured yet — add your project URL and anon key near the top of the <script> section.";
                return;
            }

            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            const username = document.getElementById('authUsername').value.trim();
            const originalLabel = submitBtn.textContent;

            submitBtn.disabled = true;
            submitBtn.textContent = authMode === 'signup' ? 'Signing up…' : 'Logging in…';

            try {
                if (authMode === 'signup') {
                    if (!username) { errorEl.textContent = 'Please choose a display name.'; return; }
                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: { data: { username } }
                    });
                    if (error) throw error;
                    if (data.session) {
                        await onLoggedIn(data.session);
                    } else {
                        errorEl.style.color = '#38a169';
                        errorEl.textContent = 'Account created! Check your email to confirm, then log in.';
                        setAuthMode('login');
                    }
                } else {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    await onLoggedIn(data.session);
                }
            } catch (err) {
                errorEl.textContent = err.message || 'Something went wrong.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = authMode === 'signup' ? 'Sign Up' : 'Log In';
            }
        });

        document.getElementById('authForgotBtn').addEventListener('click', async () => {
            const email = document.getElementById('authEmail').value.trim();
            const errorEl = document.getElementById('authError');
            if (!email) {
                errorEl.style.color = '#e53e3e';
                errorEl.textContent = 'Please enter your email address first.';
                return;
            }
            
            errorEl.style.color = '#38a169';
            errorEl.textContent = 'Sending reset email...';
            
            try {
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
                if (error) throw error;
                errorEl.textContent = 'Password reset email sent! Check your inbox.';
            } catch (err) {
                errorEl.style.color = '#e53e3e';
                errorEl.textContent = err.message || 'Error sending reset email.';
            }
        });

        document.getElementById('authGoogleBtn').addEventListener('click', async () => {
            const errorEl = document.getElementById('authError');
            if (!supabaseClient) {
                errorEl.style.color = '#e53e3e';
                errorEl.textContent = "Supabase isn't configured yet.";
                return;
            }
            try {
                const { error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                });
                if (error) throw error;
            } catch (err) {
                errorEl.style.color = '#e53e3e';
                errorEl.textContent = err.message || 'Error with Google login.';
            }
        });

        (async function bootstrapAuth() {
            if (!supabaseClient) return;
            const { data } = await supabaseClient.auth.getSession();
            if (data.session) await onLoggedIn(data.session);

            supabaseClient.auth.onAuthStateChange((event) => {
                if (event === 'SIGNED_OUT') session = null;
            });
        })();

        function switchTab(tab) {
            activeTab = tab;
            document.getElementById('playerSection').style.display = tab === 'player' ? 'block' : 'none';
            document.getElementById('librarySection').style.display = tab === 'library' ? 'flex' : 'none';
            document.getElementById('uploadSection').style.display = tab === 'upload' ? 'flex' : 'none';

            document.getElementById('tabBtnPlayer').classList.toggle('active', tab === 'player');
            document.getElementById('tabBtnLibrary').classList.toggle('active', tab === 'library');
            document.getElementById('tabBtnUpload').classList.toggle('active', tab === 'upload');

            if (tab === 'library') fetchLibrary();
            if (tab === 'upload') resetUploadForm();
        }

        async function fetchLibrary() {
            const listEl = document.getElementById('libraryList');
            if (!supabaseClient) {
                listEl.innerHTML =
                    `<div class="library-empty">Supabase isn't configured yet — add your project URL and anon key near the top of the &lt;script&gt; section.</div>`;
                return;
            }
            if (!session) return;

            const { data, error } = await supabaseClient
                .from('songs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                listEl.innerHTML =
                    `<div class="library-empty">Couldn't load the library: ${escapeHtml(error.message)}</div>`;
                return;
            }
            librarySongs = data || [];
            renderLibrary();
        }

        function renderLibrary() {
            const listEl = document.getElementById('libraryList');
            const searchInput = document.getElementById('librarySearch');
            const query = (searchInput.value || '').toLowerCase();

            const filtered = librarySongs.filter(s =>
                !query ||
                (s.title || '').toLowerCase().includes(query) ||
                (s.artist || '').toLowerCase().includes(query) ||
                (s.uploader_name || '').toLowerCase().includes(query)
            );

            if (filtered.length === 0) {
                listEl.innerHTML =
                    `<div class="library-empty">${librarySongs.length === 0 ? 'No tracks yet — be the first to upload one!' : 'No tracks match your search.'}</div>`;
                return;
            }

            listEl.innerHTML = filtered.map((song) => {
                const realIndex = librarySongs.indexOf(song);
                const nowPlaying = playlist === librarySongs && currentIndex === realIndex;
                const durationLabel = song.duration ? formatTime(song.duration) : '';
                const plays = song.id ? getPlayCount(song.id) : 0;
                const playsLabel = plays > 0 ? `🔥 ${plays}` : '—';
                const isOwner = session?.user?.id === song.uploader_id;
                
                return `
                        <div class="song-row ${nowPlaying ? 'playing' : ''}">
                            <img class="song-cover" src="${song.cover_url || DEFAULT_COVER}" alt="">
                            <div class="song-meta">
                                <div class="song-title">${escapeHtml(song.title)}</div>
                                <div class="song-sub">${escapeHtml(song.artist)} · uploaded by ${escapeHtml(song.uploader_name)}${durationLabel ? ' · ' + durationLabel : ''}</div>
                            </div>
                            <div class="play-count-badge" title="Times played">${playsLabel}</div>
                            ${isOwner ? `<button class="song-delete-btn" onclick="deleteTrack('${song.id}', '${song.audio_url}', '${song.cover_url}')" title="Delete Track">🗑️</button>` : ''}
                            <button class="song-play-btn" onclick="playFromLibrary(${realIndex})" title="Play">
                                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </button>
                        </div>
                    `;
            }).join('');
        }

        async function deleteTrack(songId, audioUrl, coverUrl) {
            if (!confirm("Are you sure you want to delete this track?")) return;
            try {
                // Delete from DB
                const { error: dbError } = await supabaseClient.from('songs').delete().eq('id', songId);
                if (dbError) throw dbError;

                // Extract paths from URLs
                const extractPath = (url, bucket) => url ? url.split(`/${bucket}/`)[1] : null;
                const audioPath = extractPath(audioUrl, 'audio-files');
                const coverPath = extractPath(coverUrl, 'cover-art');

                // Delete from storage
                if (audioPath) await supabaseClient.storage.from('audio-files').remove([audioPath]);
                if (coverPath) await supabaseClient.storage.from('cover-art').remove([coverPath]);

                // Update UI
                await fetchLibrary();
            } catch (err) {
                alert("Error deleting track: " + err.message);
            }
        }

        function playFromLibrary(index) {
            playlist = librarySongs;
            currentIndex = index;
            initAudioContext();
            loadTrack(currentIndex);
            switchTab('player');
        }

        document.getElementById('uploadFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('audio/')) { alert('Please choose an audio file.'); return; }

            uploadPickedFile = file;
            uploadCoverBlob = null;
            uploadDuration = null;

            document.getElementById('uploadDropzoneTitle').textContent = file.name;
            document.getElementById('uploadFileName').textContent = file.name;
            document.getElementById('uploadFileDuration').textContent = 'Reading track info…';
            document.getElementById('uploadPreview').style.display = 'flex';
            document.getElementById('uploadCoverPreview').src = DEFAULT_COVER;
            document.getElementById('uploadSubmitBtn').disabled = false;
            document.getElementById('uploadTitle').value = file.name.replace(/\.[^/.]+$/, "");
            document.getElementById('uploadArtist').value = '';

            const tempUrl = URL.createObjectURL(file);
            const tempAudio = new Audio();
            tempAudio.preload = 'metadata';
            tempAudio.src = tempUrl;
            tempAudio.addEventListener('loadedmetadata', () => {
                uploadDuration = tempAudio.duration;
                document.getElementById('uploadFileDuration').textContent = formatTime(uploadDuration);
                URL.revokeObjectURL(tempUrl);
            });

            if (window.jsmediatags) {
                window.jsmediatags.read(file, {
                    onSuccess: (tag) => {
                        const tags = tag.tags;
                        if (tags.title) document.getElementById('uploadTitle').value = tags.title;
                        if (tags.artist) document.getElementById('uploadArtist').value = tags.artist;
                        if (tags.picture) {
                            const { data, format } = tags.picture;
                            const bytes = new Uint8Array(data);
                            uploadCoverBlob = new Blob([bytes], { type: format });
                            document.getElementById('uploadCoverPreview').src = URL.createObjectURL(uploadCoverBlob);
                        }
                    },
                    onError: () => { }
                });
            }
        });

        // ── CUSTOM COVER PICKER LOGIC ──
        document.getElementById('uploadCoverInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }

            uploadCustomCoverBlob = file;
            const thumbUrl = URL.createObjectURL(file);
            document.getElementById('coverPickerThumb').src = thumbUrl;
            document.getElementById('coverPickerThumb').style.border = 'none';
            document.getElementById('coverPickerTitle').textContent = file.name;
            // also preview in upload preview card
            document.getElementById('uploadCoverPreview').src = thumbUrl;
        });

        function resetUploadForm() {
            uploadPickedFile = null;
            uploadCoverBlob = null;
            uploadCustomCoverBlob = null;
            uploadDuration = null;
            document.getElementById('uploadFileInput').value = '';
            document.getElementById('uploadCoverInput').value = '';
            document.getElementById('uploadDropzoneTitle').textContent = 'Choose an audio file';
            document.getElementById('uploadPreview').style.display = 'none';
            document.getElementById('uploadTitle').value = '';
            document.getElementById('uploadArtist').value = '';
            document.getElementById('uploadSubmitBtn').disabled = true;
            document.getElementById('coverPickerThumb').src = '';
            document.getElementById('coverPickerThumb').style.border = '';
            document.getElementById('coverPickerTitle').textContent = 'Choose a cover image';
            const statusEl = document.getElementById('uploadStatus');
            statusEl.textContent = '';
            statusEl.className = 'upload-status';
        }

        async function handleUploadSubmit() {
            const statusEl = document.getElementById('uploadStatus');
            const submitBtn = document.getElementById('uploadSubmitBtn');

            if (!supabaseClient || !session) {
                statusEl.className = 'upload-status error';
                statusEl.textContent =
                    "You need to be logged in to upload — and Supabase needs to be configured.";
                return;
            }
            if (!uploadPickedFile) {
                statusEl.className = 'upload-status error';
                statusEl.textContent = 'Choose an audio file first.';
                return;
            }
            if (uploadPickedFile.size > MAX_UPLOAD_MB * 1024 * 1024) {
                statusEl.className = 'upload-status error';
                statusEl.textContent = `That file is over ${MAX_UPLOAD_MB}MB — please pick a smaller one.`;
                return;
            }

            const title = document.getElementById('uploadTitle').value.trim() || 'Untitled';
            const artist = document.getElementById('uploadArtist').value.trim() || 'Unknown Artist';
            const uploaderName = session.user.user_metadata?.username || session.user.email.split('@')[0];

            submitBtn.disabled = true;
            statusEl.className = 'upload-status';
            statusEl.textContent = 'Uploading audio…';

            try {
                const ext = (uploadPickedFile.name.split('.').pop() || 'mp3').toLowerCase();
                const audioPath = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

                const { error: audioErr } = await supabaseClient.storage
                    .from('audio-files')
                    .upload(audioPath, uploadPickedFile, { cacheControl: '3600', upsert: false });
                if (audioErr) throw audioErr;

                const audioUrl = supabaseClient.storage.from('audio-files').getPublicUrl(audioPath).data.publicUrl;

                let coverUrl = null;
                // Custom picker overrides embedded tag art
                const coverSource = uploadCustomCoverBlob || uploadCoverBlob;
                if (coverSource) {
                    statusEl.textContent = 'Uploading cover art…';
                    const ext = uploadCustomCoverBlob ? (uploadCustomCoverBlob.name.split('.').pop() || 'jpg').toLowerCase() : 'jpg';
                    const coverPath = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
                    const { error: coverErr } = await supabaseClient.storage
                        .from('cover-art')
                        .upload(coverPath, coverSource, { cacheControl: '3600', upsert: false });
                    if (!coverErr) {
                        coverUrl = supabaseClient.storage.from('cover-art').getPublicUrl(coverPath).data.publicUrl;
                    }
                }

                statusEl.textContent = 'Saving to the library…';
                const { error: insertErr } = await supabaseClient.from('songs').insert({
                    title,
                    artist,
                    uploader_id: session.user.id,
                    uploader_name: uploaderName,
                    audio_url: audioUrl,
                    cover_url: coverUrl,
                    duration: uploadDuration || null
                });
                if (insertErr) throw insertErr;

                statusEl.className = 'upload-status success';
                statusEl.textContent = `"${title}" is live in the library!`;
                resetUploadForm();
                await fetchLibrary();
                setTimeout(() => switchTab('library'), 900);
            } catch (err) {
                statusEl.className = 'upload-status error';
                statusEl.textContent = err.message || 'Upload failed — please try again.';
                submitBtn.disabled = false;
            }
        }

        // ── VOLUME SLIDERS ──
        document.querySelectorAll('.js-volume-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = e.target.value;
                audio.volume = val;
                document.querySelectorAll('.js-volume-slider').forEach(s => s.value = val);
            });
        });

        // ── PLAY / PAUSE ──
        document.querySelectorAll('.js-btn-play').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                initAudioContext();
                togglePlayState();
            });
        });

        document.querySelectorAll('.js-btn-prev').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                prevTrack();
            });
        });

        document.querySelectorAll('.js-btn-next').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                nextTrack();
            });
        });

        vinylRecord.addEventListener('click', (e) => {
            e.preventDefault();
            initAudioContext();
            togglePlayState();
        });

        if (turntableArea) {
            turntableArea.addEventListener('click', (e) => {
                if (e.target === turntableArea) {
                    e.preventDefault();
                    initAudioContext();
                    togglePlayState();
                }
            });
        }

        // ── AUDIO EVENTS ──
        audio.addEventListener('timeupdate', () => {
            if (!audio.duration) return;
            const ratio = audio.currentTime / audio.duration;
            document.querySelectorAll('.js-progress-fill').forEach(bar => bar.style.width = `${ratio * 100}%`);
            updateAllText('.js-time-current', formatTime(audio.currentTime));

            if (currentTheme === 'vinyl') {
                syncTonearmForPlayback();
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            updateAllText('.js-time-duration', formatTime(audio.duration));
        });

        audio.addEventListener('ended', () => {
            setTonearmAngle(-25);
            vinylRecord.style.transform = 'none';
            nextTrack();
        });

        document.querySelectorAll('.js-progress-bg').forEach(bg => {
            bg.addEventListener('click', (e) => {
                if (playlist.length === 0 || !audio.duration) return;
                const rect = bg.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                audio.currentTime = x * audio.duration;
            });
            // Touch support for progress bar
            bg.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (playlist.length === 0 || !audio.duration) return;
                const touch = e.touches[0];
                const rect = bg.getBoundingClientRect();
                const x = (touch.clientX - rect.left) / rect.width;
                audio.currentTime = Math.max(0, Math.min(1, x)) * audio.duration;
            }, { passive: false });
        });