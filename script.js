window.addEventListener('load', () => {
    const audioPlayer = document.getElementById('audio-player');
    const lyricsContainer = document.getElementById('lyrics-container');
    let lyricsData = [];
    let currentLyricIndex = 0;
    let totalNumberOfSongs = 22;
    var preventblur = false;
    var nameOutput = document.getElementById('name');
    var artistOutput = document.getElementById('artist');
    var imageOutput = document.getElementById('image');
    audioPlayer.addEventListener('loadedmetadata', function () {
        jsmediatags.read(audioPlayer.src, {
            onSuccess: function (tag) {
                var title = tag.tags.title || 'Unknown Title';
                var artist = tag.tags.artist || 'Unknown Artist';
                document.title = title + " -  Rhythmix";
                var image = tag.tags.picture;
                nameOutput.innerText = title;
                artistOutput.innerText = artist;
                if (image) {
                    var base64String = '';
                    for (var i = 0; i < image.data.length; i++) {
                        base64String += String.fromCharCode(image.data[i]);
                    }
                    var base64 = 'data:' + image.format + ';base64,' + window.btoa(base64String);
                    imageOutput.src = base64;
                    Effect(base64);
                }
                tryfetch(title, artist);
            },
            onError: function (error) {
                console.error('Error reading tags:', error);
            }
        });
    });
    function tryfetch(title, artist) {
        const songname = title;
        const artistname = artist.toLowerCase();

        const url = 'https://www.hhlqilongzhu.cn/api/dg_geci.php?msg=' + encodeURIComponent(songname) + '&type=2';

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.text(); // Handle response as text
            })
            .then(data => {
                const lineNumber = checkMatchLine(data, artistname);
                if (lineNumber !== -1) {
                    fetchLineData(lineNumber);
                } else {
                    console.log("Artist not found in the list");
                }
            })
            .catch(error => {
                console.log("Error");
            });

        function checkMatchLine(data, artist) {
            const lines = data.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(artist)) {
                    return i + 1; // Line numbers are 1-based
                }
            }
            return -1; // Not found
        }

        function fetchLineData(lineNumber) {
            const secondUrl = 'https://www.hhlqilongzhu.cn/api/dg_geci.php?msg=' + encodeURIComponent(songname) + '&type=1&n=' + lineNumber;

            fetch(secondUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                    return response.text();
                })
                .then(data => {
                    console.log(data);
                })
                .catch(error => {
                    console.log("Error");
                });
        }
    }
    var currentImage = null;
    var animationId = null;
    const colorThief = new ColorThief();
    const GRAY_TOLERANCE = 10;
    let blobs = [];

    function Effect(imageData) {
        if (currentImage) {
            currentImage.onload = null;
        }
        currentImage = new Image();
        currentImage.onload = function () {
            var canvas = document.getElementById('visual');
            var context = canvas.getContext('2d');
            var scale = 1;
            var smallCanvas = document.createElement('canvas');
            var smallContext = smallCanvas.getContext('2d');
            smallCanvas.width = currentImage.width * scale;
            smallCanvas.height = currentImage.height * scale;
            smallContext.drawImage(currentImage, 0, 0, smallCanvas.width, smallCanvas.height);
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            applyEffect(smallContext, smallCanvas.width, smallCanvas.height, context, canvas.width, canvas.height);
        };
        currentImage.src = imageData;
    }

    function applyEffect(smallContext, smallWidth, smallHeight, context, width, height) {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        var smallImageData = smallContext.getImageData(0, 0, smallWidth, smallHeight);
        var data = smallImageData.data;
        var colors = colorThief.getPalette(currentImage, 12);
        var dominantColor = colorThief.getColor(currentImage);
        var originalDominantColor = dominantColor;

        if (isGray(dominantColor)) {
            for (let color of colors) {
                if (!isGray(color)) {
                    dominantColor = color;
                    break;
                }
            }
        }

        if (colors.length > 1 && isGray(colors[1])) {
            dominantColor = originalDominantColor;
        }

        document.getElementById('visual').style.backgroundColor = `rgb(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]})`;

        colors = colors.filter(color =>
            !(color[0] === dominantColor[0] && color[1] === dominantColor[1] && color[2] === dominantColor[2])
        );

        if (blobs.length === 0) {
            blobs = createBlobs(20, colors);
        } else {
            updateBlobsColors(colors);
        }

        startLavaLampEffect(context, width, height);
    }

    function isGray(color) {
        return Math.abs(color[0] - color[1]) < GRAY_TOLERANCE &&
            Math.abs(color[1] - color[2]) < GRAY_TOLERANCE &&
            Math.abs(color[0] - color[2]) < GRAY_TOLERANCE;
    }

    function updateBlobsColors(colors) {
        blobs.forEach((blob, index) => {
            let newColor = colors[index % colors.length];
            blob.targetColor = newColor;
            blob.colorTransitionProgress = 0;
        });
    }

    function startLavaLampEffect(context, width, height) {
        animateBlobs(context, width, height);
    }

    function animateBlobs(context, width, height) {
        context.clearRect(0, 0, width, height);
        blobs.forEach(blob => {
            context.beginPath();
            context.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);

            // Smooth transition between colors
            blob.colorTransitionProgress = Math.min(blob.colorTransitionProgress + 0.01, 1);
            let r = interpolate(blob.color[0], blob.targetColor[0], blob.colorTransitionProgress);
            let g = interpolate(blob.color[1], blob.targetColor[1], blob.colorTransitionProgress);
            let b = interpolate(blob.color[2], blob.targetColor[2], blob.colorTransitionProgress);
            context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
            context.fill();

            blob.dx += (blob.targetDx - blob.dx) * 0.001;
            blob.dy += (blob.targetDy - blob.dy) * 0.001;
            blob.x += blob.dx;
            blob.y += blob.dy;

            if (blob.x - blob.radius > width) {
                blob.x = -blob.radius;
            } else if (blob.x + blob.radius < 0) {
                blob.x = width + blob.radius;
            }

            if (blob.y - blob.radius > height) {
                blob.y = -blob.radius;
            } else if (blob.y + blob.radius < 0) {
                blob.y = height + blob.radius;
            }

            if (Math.random() < 0.001) {
                changeDirection(blob);
            }

            // Update blob color
            if (blob.colorTransitionProgress === 1) {
                blob.color = blob.targetColor;
            }
        });
        animationId = requestAnimationFrame(() => animateBlobs(context, width, height));
    }

    function changeDirection(blob) {
        blob.targetDx = (Math.random() * 2 - 1) * 1.5;
        blob.targetDy = (Math.random() * 2 - 1) * 1.5;
        blob.angle = Math.random() * Math.PI * 2;
    }

    function createBlobs(numBlobs, colors) {
        const blobs = [];
        for (let i = 0; i < numBlobs; i++) {
            let dx = (Math.random() * 2 - 1) * 1.5;
            let dy = (Math.random() * 2 - 1) * 1.5;
            let blobSize = Math.sqrt(window.innerHeight * window.innerWidth) / 10;
            let initialColor = colors[i % colors.length];
            blobs.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                radius: Math.random() * 70 + blobSize,
                dx: dx,
                dy: dy,
                targetDx: dx,
                targetDy: dy,
                color: initialColor, // Initialize with a color from the palette
                targetColor: initialColor, // Set target color to the same initial color
                colorTransitionProgress: 1, // Start with the color fully applied
                angle: Math.random() * Math.PI * 2
            });
        }
        return blobs;
    }

    function interpolate(start, end, progress) {
        return Math.round(start + (end - start) * progress);
    }

    function parseLRC(lrcText) {
        const lines = lrcText.split('\n');
        let lyrics = [];
        lines.forEach(line => {
            const matches = line.match(/\[(\d+:\d+\.\d+)\]([^[]+)/g);
            if (matches) {
                matches.forEach(match => {
                    const parts = match.match(/\[(\d+:\d+\.\d+)\]([^[]+)/);
                    if (parts) {
                        const time = parseTime(parts[1]);
                        const text = parts[2].trim();
                        lyrics.push({ time, text });
                    }
                });
            }
        });
        for (let i = 0; i < lyrics.length; i++) {
            const startTime = lyrics[i].time;
            const endTime = (i < lyrics.length - 1) ? lyrics[i + 1].time : startTime + 1;
            lyrics[i].duration = Math.round((endTime - startTime) * 1000);
        }
        return lyrics;
    }
    function parseTime(timeString) {
        const [minutes, seconds] = timeString.split(':').map(parseFloat);
        return minutes * 60 + seconds;
    }
    function displayLyrics(lyrics) {
        let currentLine = document.createElement('div');
        currentLine.classList.add('line');
        let lineNumber = 1;
        lyrics.forEach((line, index) => {
            if (line.text.trim() === '') {
                currentLine.dataset.line = lineNumber;
                lyricsContainer.appendChild(currentLine);
                currentLine = document.createElement('div');
                currentLine.classList.add('line');
                lineNumber++;
            } else {
                const words = line.text.trim().split(' ');
                words.forEach(word => {
                    const duration = lyrics[index].duration;
                    if (duration > 1200 && word.length > 1) {
                        const wordElement = document.createElement('span');
                        wordElement.dataset.index = index;
                        wordElement.style.setProperty('--word-duration', duration + 'ms');
                        wordElement.classList.add('word');
                        const letters = word.split('');
                        const letterDuration = Math.round(duration / letters.length);
                        letters.forEach(letter => {
                            const letterElement = document.createElement('span');
                            letterElement.textContent = letter;
                            letterElement.classList.add('letter');
                            letterElement.dataset.letterDuration = letterDuration;
                            wordElement.appendChild(letterElement);
                        });
                        currentLine.appendChild(wordElement);
                    } else {
                        const wordElement = document.createElement('span');
                        wordElement.textContent = word + ' ';
                        wordElement.dataset.index = index;
                        wordElement.style.setProperty('--word-duration', duration + 'ms');
                        wordElement.classList.add('word');
                        currentLine.appendChild(wordElement);
                    }
                });
            }
        });
        if (currentLine.textContent.trim() !== '') {
            currentLine.dataset.line = lineNumber;
            lyricsContainer.appendChild(currentLine);
        }
    }
    function highlightCurrentLyric() {
        const currentTime = audioPlayer.currentTime;
        const futureLyricElements = document.querySelectorAll('.word.played');
        futureLyricElements.forEach(element => {
            const index = parseInt(element.dataset.index);
            if (lyricsData[index].time > currentTime) {
                element.classList.remove('played');
            }
        });
        document.querySelectorAll('.letter').forEach(letter => {
            const index = parseInt(letter.closest('.word').dataset.index);
            if (lyricsData[index].time > currentTime - 0.01) {
                letter.classList.remove('letter-played');
            }
        });
        let previousWordEndTime = 0;
        lyricsData.forEach((lyric, index) => {
            const wordStartTime = lyric.time;
            const wordEndTime = (index < lyricsData.length - 1) ? lyricsData[index + 1].time : Number.POSITIVE_INFINITY;
            if (wordStartTime <= currentTime && currentTime < wordEndTime) {
                const lyricElements = document.querySelectorAll(`.word[data-index="${index}"]`);
                lyricElements.forEach(element => {
                    element.classList.add('played');
                    const wordDuration = wordEndTime - wordStartTime;
                    const elapsedTime = currentTime - wordStartTime;
                    const wordProcess = (elapsedTime / wordDuration);
                    element.style.setProperty("--gradient-progress", `${wordProcess * 120 - 20}%`);
                    const letters = element.querySelectorAll('.letter');
                    if (letters.length > 0) {
                        const letterDuration = parseFloat(letters[0].dataset.letterDuration);
                        letters.forEach((letter, letterIndex) => {
                            const letterStartTime = wordStartTime + (letterIndex * letterDuration) / 1000;
                            const letterEndTime = letterStartTime + letterDuration / 1000;
                            const letterElapsedTime = currentTime - letterStartTime;
                            if (currentTime >= letterStartTime && currentTime < letterEndTime) {
                                const letterProcess = (letterElapsedTime / (letterDuration / 1000));
                                if (letterDuration > 300) {
                                    letter.style.transform = 'matrix(1, 0, 0, 1, 0, -5)';
                                    letter.style.textShadow = '0px 0px 20px #FFFFFF66';
                                } else {
                                    letter.style.transform = 'matrix(1, 0, 0, 1, 0, -5)';
                                }
                                letter.style.setProperty("--letter-progress", `${letterProcess * 140 - 40}%`);
                                letter.classList.add('letter-played');
                                letter.classList.add('letter-highlight');
                            } else if (currentTime >= letterEndTime) {
                                if (letterDuration > 300) {
                                    letter.style.transform = 'matrix(1, 0, 0, 1, 0, -5)';
                                } else {
                                    letter.style.transform = 'matrix(1, 0, 0, 1, 0, -5)';
                                }
                                letter.classList.remove('letter-highlight');
                                letter.classList.add('letter-played');
                                letter.style.removeProperty('text-shadow');
                            } else {
                                letter.style.transform = 'matrix(1, 0, 0, 1, 0, 0)';
                                letter.classList.remove('letter-highlight');
                                letter.style.removeProperty('text-shadow');
                            }
                        });
                    }
                });
            } else {
                const lyricElements = document.querySelectorAll(`.word[data-index="${index}"]`);
                lyricElements.forEach(element => {
                    element.style.removeProperty('--gradient-progress');
                    const letters = element.querySelectorAll('.letter');
                    letters.forEach(letter => {
                        letter.style.removeProperty('transform')
                        letter.style.removeProperty('text-shadow');
                        letter.style.removeProperty('--letter-progress');
                        letter.classList.remove('letter-highlight');
                    });
                });
            }
        });
        lyricsData.forEach((lyric, index) => {
            if (lyric.time <= currentTime) {
                const lyricElements = document.querySelectorAll(`.word[data-index="${index}"]`);
                lyricElements.forEach(element => {
                    element.classList.add('played');
                    const letters = element.querySelectorAll('.letter');
                    const letterDuration = parseFloat(letters[0]?.dataset.letterDuration || 0);
                    letters.forEach((letter, letterIndex) => {
                        const letterStartTime = lyric.time + (letterIndex * letterDuration) / 1000;
                        if (letterStartTime <= currentTime) {
                            letter.classList.add('letter-played');
                        }
                    });
                });
            }
        });
        for (let i = 1; i < lyricsData.length; i++) {
            const lyric = lyricsData[i];
            const nextLyricTime = (i < lyricsData.length - 1) ? lyricsData[i + 1].time : Number.POSITIVE_INFINITY;
            if (currentTime >= lyric.time && currentTime <= nextLyricTime) {
                currentLyricIndex = i;
                break;
            }
        }
        const lyricsElements = lyricsContainer.querySelectorAll('.word');
        lyricsElements.forEach((element, index) => {
            const isCurrentWord = parseInt(element.dataset.index) === currentLyricIndex;
            if (isCurrentWord) {
                element.classList.add('highlight');
                element.classList.add('played');
            } else {
                element.classList.remove('highlight');
            }
        });
        const lines = document.querySelectorAll('.line');
        lines.forEach(line => {
            const highlightedChild = line.querySelector('.highlight');
            if (highlightedChild) {
                line.classList.add('playing');
            } else {
                line.classList.remove('playing');
            }
        });
    }
    setInterval(highlightCurrentLyric, 20);
    audioPlayer.addEventListener('timeupdate', () => {
        autoscroll()
    });
    function isElementInViewport(el) {
        var rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    let lastScrollTime = 0;
    function autoscroll() {
        if (Date.now() - lastScrollTime < 500) return;
        var playingElement = document.querySelector('.playing');
        if (playingElement && isElementInViewport(playingElement)) {
            playingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastScrollTime = Date.now();
            preventblur = true;
        }
    }
    window.addEventListener('scroll', function () {
        lastScrollTime = Date.now();
    });
    lyricsContainer.addEventListener('click', event => {
        let clickedElement = event.target;
        while (clickedElement && !clickedElement.classList.contains('line')) {
            clickedElement = clickedElement.parentElement;
        }
        if (clickedElement) {
            const clickedIndex = parseInt(clickedElement.querySelector('.word').dataset.index);
            const clickedTime = lyricsData[clickedIndex].time;
            audioPlayer.currentTime = clickedTime;
        }
    });
    const playPauseButton = document.getElementById('play');
    const nextButton = document.getElementById('next');
    const previousButton = document.getElementById('previous');
    const progressBar = document.querySelector('.progress-bar');
    const progress = document.querySelector('.progress');
    let isDragging = false;
    let startX = 0;
    let currentSongIndex = 1;
    let isButtonDisabled = false;
    nextButton.addEventListener('click', function () {
        if (isButtonDisabled) return;
        isButtonDisabled = true;
        currentSongIndex = (currentSongIndex % totalNumberOfSongs) + 1;
        audioPlayer.src = `music/${currentSongIndex}.mp3`;
        loadLyrics(`lyrics/${currentSongIndex}.lrc`);
        scrollToTop();
        scrollToTop();
        scrollToTop();
        updateURL(currentSongIndex);
        audioPlayer.play();
        playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        setTimeout(() => {
            isButtonDisabled = false;
        }, 300);
    });
    previousButton.addEventListener('click', function () {
        if (isButtonDisabled) return;
        isButtonDisabled = true;
        currentSongIndex = (currentSongIndex - 2 + totalNumberOfSongs) % totalNumberOfSongs + 1;
        audioPlayer.src = `music/${currentSongIndex}.mp3`;
        loadLyrics(`lyrics/${currentSongIndex}.lrc`);
        scrollToTop();
        scrollToTop();
        scrollToTop();
        updateURL(currentSongIndex);
        audioPlayer.play();
        playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        setTimeout(() => {
            isButtonDisabled = false;
        }, 300);
    });
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        preventblur = true;
    }
    function loadLyrics(lyricsFile) {
        fetch(lyricsFile)
            .then(response => response.text())
            .then(data => {
                lyricsContainer.innerHTML = '';
                currentLyricIndex = 0;
                lyricsData = parseLRC(data);
                displayLyrics(lyricsData);
            })
            .catch(error => console.error('Error loading lyrics:', error));
    }
    function playNextSong() {
        currentSongIndex++;
        if (currentSongIndex > totalNumberOfSongs) {
            currentSongIndex = 1;
        }
        updateURL(currentSongIndex);
        audioPlayer.src = `music/${currentSongIndex}.mp3`;
        loadLyrics(`lyrics/${currentSongIndex}.lrc`);
        audioPlayer.play();
    }
    function updateURL(songId) {
        const newUrl = window.location.pathname + `?id=${songId}`;
        history.pushState({}, '', newUrl);
    }
    audioPlayer.addEventListener('ended', playNextSong);
    function seek(event) {
        const clientX = event.clientX || event.touches[0].clientX;
        const clickX = clientX - progressBar.getBoundingClientRect().left;
        const width = progressBar.clientWidth;
        const percent = (clickX / width) * 100;
        progress.style.width = percent + '%';
        const currentTime = (percent / 100) * audioPlayer.duration;
        audioPlayer.currentTime = currentTime;
    }
    playPauseButton.addEventListener('click', function () {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audioPlayer.pause();
            playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    progressBar.addEventListener('click', seek);
    progressBar.addEventListener('mousedown', function (event) {
        isDragging = true;
        startX = event.clientX;
        handleDrag(event);
    });
    progressBar.addEventListener('touchstart', function (event) {
        isDragging = true;
        startX = event.touches[0].clientX;
        handleDrag(event);
    });
    progressBar.addEventListener('mousemove', function (event) {
        if (isDragging) {
            handleDrag(event);
        }
    });
    progressBar.addEventListener('touchmove', function (event) {
        if (isDragging) {
            handleDrag(event);
        }
    });
    progressBar.addEventListener('mouseup', function () {
        4
        isDragging = false;
    });
    progressBar.addEventListener('touchend', function () {
        isDragging = false;
    });
    function handleDrag(event) {
        seek(event);
    }
    audioPlayer.addEventListener('timeupdate', function () {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progress.style.width = percent + '%';
    });
    const currentTimeDisplay = document.querySelector('.current-time');
    const totalTimeDisplay = document.querySelector('.total-time');
    function updateTimeDisplay() {
        const currentTime = formatTime(audioPlayer.currentTime);
        const duration = audioPlayer.duration;
        if (!isNaN(duration)) {
            const formattedDuration = formatTime(duration);
            totalTimeDisplay.textContent = formattedDuration;
        } else {
            totalTimeDisplay.textContent = '00:00';
        }
        currentTimeDisplay.textContent = currentTime;
    }
    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${padZero(minutes)}:${padZero(seconds)}`;
    }
    function padZero(num) {
        return (num < 10 ? '0' : '') + num;
    }
    audioPlayer.addEventListener('timeupdate', updateTimeDisplay);
    updateTimeDisplay();
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }
    const songId = getUrlParameter('id');
    if (songId && !isNaN(songId) && songId > 0 && songId <= totalNumberOfSongs) {
        currentSongIndex = parseInt(songId);
        audioPlayer.src = `music/${currentSongIndex}.mp3`;
        loadLyrics(`lyrics/${currentSongIndex}.lrc`);
    } else {
        currentSongIndex = 1;
        audioPlayer.src = `music/${currentSongIndex}.mp3`;
        loadLyrics(`lyrics/${currentSongIndex}.lrc`);
    }
    audioPlayer.addEventListener('timeupdate', updateBlurEffect);
    let scrollTimeout;
    let lastPlayingElement;
    window.addEventListener('scroll', function () {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function () {
            updateBlurEffect();
        }, 2000);
        if (preventblur) {
            setTimeout(function () { preventblur = false; }, 500)
            return;
        } else {
            cancelBlurEffect();
        }
    });
    function cancelBlurEffect() {
        const lines = document.querySelectorAll('.line');
        lines.forEach(line => {
            line.style.filter = 'blur(0px)';
            line.style.webkitFilter = 'blur(0px)';
        });
    }
    function updateBlurEffect() {
        const playingElement = document.querySelector('.playing');
        if (playingElement && isElementInViewport(playingElement)) {
            if (lastPlayingElement && lastPlayingElement !== playingElement) {
                audioPlayer.addEventListener('loadeddata', function removeBlur() {
                    lastPlayingElement.style.filter = 'blur(0px)';
                    lastPlayingElement.style.webkitFilter = 'blur(0px)';
                    audioPlayer.removeEventListener('loadeddata', removeBlur);
                });
            }
            lastPlayingElement = playingElement;
            const playingLine = parseInt(playingElement.dataset.line);
            const lines = document.querySelectorAll('.line');
            lines.forEach(line => {
                const lineNumber = parseInt(line.dataset.line);
                const distance = Math.abs(lineNumber - playingLine);
                const blurAmount = Math.min(6, distance * 1.5);
                line.style.filter = `blur(${blurAmount}px)`;
                line.style.webkitFilter = `blur(${blurAmount}px)`;
            });
        }
    }
    function isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    const contextMenu = document.getElementById('context-menu');
    const copyLineBtn = document.getElementById('copy-line-btn');
    const copyAllBtn = document.getElementById('copy-all-btn');
    lyricsContainer.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        let clickedLine = event.target;
        while (clickedLine && !clickedLine.classList.contains('line')) {
            clickedLine = clickedLine.parentElement;
        }
        if (clickedLine) {
            contextMenu.dataset.clickedLine = clickedLine.textContent;
            contextMenu.style.top = event.clientY + 'px';
            contextMenu.style.left = event.clientX + 'px';
            contextMenu.style.opacity = "1";
        }
    });
    document.addEventListener('click', function (event) {
        if (!contextMenu.contains(event.target)) {
            contextMenu.style.opacity = "0";
        }
    });
    copyLineBtn.addEventListener('click', function () {
        const clickedLine = contextMenu.dataset.clickedLine;
        if (clickedLine) {
            copyToClipboard(clickedLine.trim());
        }
        contextMenu.style.opacity = "0";
    });
    copyAllBtn.addEventListener('click', function () {
        const allLyrics = Array.from(document.querySelectorAll('.line')).map(line => line.textContent.trim()).join('\n');
        if (allLyrics) {
            copyToClipboard(allLyrics);
        }
        contextMenu.style.opacity = "0";
    });
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
});