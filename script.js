// script.js - Combined version

/***********************
 * INDEX PAGE FUNCTIONALITY
 ***********************/
function initializeIndexPage() {
  // Only run if we're on the index page
  if (!document.getElementById('gridContainer')) return;

  // Generate 100 buttons
  const gridContainer = document.getElementById('gridContainer');

  for (let i = 1; i <= 100; i++) {
    const btn = document.createElement('button');
    btn.className = 'index-btn';
    btn.textContent = i;
    btn.onclick = () => {
      window.location.href = `page${i}.html`;
    };
    gridContainer.appendChild(btn);
  }

  // Mobile optimizations
  document.addEventListener('touchmove', function(event) {
    if (event.scale !== 1) {
      event.preventDefault();
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

/***********************
 * MP3 PLAYER FUNCTIONALITY
 ***********************/
function initializeMP3Player() {
  // Only run if we're on the MP3 player page
  if (!document.getElementById('fileLoader')) return;

  // DOM Elements
  const fileLoader = document.getElementById('fileLoader');
  const groupA = document.getElementById('groupA');
  const groupB = document.getElementById('groupB');
  const groupC = document.getElementById('groupC');
  const playAllBtn = document.getElementById('playAll');
  const forwardBtn = document.getElementById('forward');
  const homeBtn = document.getElementById('home');
  const filenameDisplay = document.querySelector('.filename-display');
  const totalTimeDisplay = document.querySelector('.total-time-display');

  // Player State
  const audios = Array(30).fill(null);
  const fileNames = Array(30).fill('');
  let enabled = JSON.parse(localStorage.getItem('mp3_enabled')) || Array(30).fill(true);
  let currentAudio = null;
  let currentIndex = 0;
  let stopFlag = false;
  let db;
  let updateInterval;
  let totalPlaylistTime = 0;
  let elapsedTime = 0;
  let isPlayingAll = false;

  // Initialize IndexedDB
  const request = indexedDB.open('AudioDB', 1);

  request.onerror = () => console.error('IndexedDB error');
  request.onsuccess = () => {
    db = request.result;
    loadStoredAudios();
  };
  request.onupgradeneeded = (event) => {
    db = event.target.result;
    db.createObjectStore('audios', { keyPath: 'index' });
  };

  function saveToIndexedDB(index, file) {
    const reader = new FileReader();
    reader.onload = () => {
      const transaction = db.transaction(['audios'], 'readwrite');
      const store = transaction.objectStore('audios');
      store.put({ index, name: file.name, blob: reader.result });
    };
    reader.readAsArrayBuffer(file);
  }

  function loadStoredAudios() {
    const transaction = db.transaction(['audios'], 'readonly');
    const store = transaction.objectStore('audios');
    const req = store.getAll();

    req.onsuccess = () => {
      req.result.forEach(data => {
        const blob = new Blob([data.blob], { type: 'audio/mp3' });
        audios[data.index] = new Audio(URL.createObjectURL(blob));
        fileNames[data.index] = data.name;
        audios[data.index].addEventListener('loadedmetadata', calculateTotalTime);
      });
      createButtons();
    };
    req.onerror = () => console.error('Failed to load stored audios');
  }

  function calculateTotalTime() {
    totalPlaylistTime = 0;
    audios.forEach((audio, index) => {
      if (audio && enabled[index] && !isNaN(audio.duration)) {
        totalPlaylistTime += audio.duration;
      }
    });
    updateTotalTimeDisplay();
  }

  function updateTotalTimeDisplay() {
    const remainingTime = Math.max(0, Math.round(totalPlaylistTime - elapsedTime));
    totalTimeDisplay.textContent = `Total: ${remainingTime}s`;
  }

  function updateFilenameDisplay() {
    if (currentAudio && fileNames[currentIndex]) {
      filenameDisplay.textContent = fileNames[currentIndex];
    } else if (currentAudio) {
      filenameDisplay.textContent = `Track ${currentIndex + 1}`;
    } else {
      filenameDisplay.textContent = 'No file playing';
    }
  }

  function startPlaybackUpdates() {
    elapsedTime = 0;
    clearInterval(updateInterval);
    updateInterval = setInterval(() => {
      if (currentAudio && currentAudio.currentTime) {
        elapsedTime += 0.2;
        updateTotalTimeDisplay();
      }
    }, 200);
  }

  function stopPlaybackUpdates() {
    clearInterval(updateInterval);
    updateTotalTimeDisplay();
  }

  fileLoader.onchange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file, i) => {
      const group = i % 3;
      const num = Math.floor(i / 3) + 1;
      const index = (num - 1) * 3 + group;
      
      if (index >= 30) return;
      audios[index] = new Audio(URL.createObjectURL(file));
      fileNames[index] = file.name;
      saveToIndexedDB(index, file);
      audios[index].addEventListener('loadedmetadata', calculateTotalTime);
    });
    createButtons();
  };

  function createButtons() {
    groupA.innerHTML = '';
    groupB.innerHTML = '';
    groupC.innerHTML = '';
    
    for (let i = 0; i < 10; i++) {
      createButton(groupA, 'A', i, i * 3);
      createButton(groupB, 'B', i, i * 3 + 1);
      createButton(groupC, 'C', i, i * 3 + 2);
    }
    calculateTotalTime();
  }

  function createButton(container, prefix, num, index) {
    const btn = document.createElement('button');
    btn.textContent = `${prefix}${num + 1}`;
    btn.dataset.index = index;
    btn.classList.add('mp3-btn', `mp3-group-${prefix.toLowerCase()}`);
    if (!enabled[index]) btn.classList.add('mp3-disabled');
    btn.onclick = () => {
      toggleButton(btn, index);
      if (enabled[index] && audios[index]) {
        if (isPlayingAll) {
          stopPlayAll();
        }
        if (currentAudio) currentAudio.pause();
        currentAudio = audios[index];
        currentIndex = index;
        currentAudio.play();
        startPlaybackUpdates();
        updateFilenameDisplay();
        currentAudio.addEventListener('ended', () => {
          stopPlaybackUpdates();
          calculateTotalTime();
        });
      }
    };
    container.appendChild(btn);
  }

  function toggleButton(btn, index) {
    enabled[index] = !enabled[index];
    localStorage.setItem('mp3_enabled', JSON.stringify(enabled));
    btn.classList.toggle('mp3-disabled', !enabled[index]);
    calculateTotalTime();
  }

  playAllBtn.onclick = function() {
    if (isPlayingAll) {
      stopPlayAll();
    } else {
      playAll();
    }
  };

  function playAll() {
    isPlayingAll = true;
    stopFlag = false;
    playAllBtn.textContent = 'Stop';
    playAllBtn.classList.add('stopping');
    playFromIndex(0);
  }

  function stopPlayAll() {
    isPlayingAll = false;
    stopFlag = true;
    playAllBtn.textContent = 'Play All';
    playAllBtn.classList.remove('stopping');
    if (currentAudio) {
      currentAudio.pause();
    }
    stopPlaybackUpdates();
    calculateTotalTime();
  }

  function playFromIndex(index) {
    if (stopFlag) {
      isPlayingAll = false;
      return;
    }

    const order = [];
    for (let i = 0; i < 10; i++) {
      order.push(i * 3, i * 3 + 1, i * 3 + 2);
    }

    const playNext = (i) => {
      if (stopFlag || !isPlayingAll) {
        isPlayingAll = false;
        return;
      }
      
      if (i >= order.length) {
        return playFromIndex(0);
      }

      const idx = order[i];
      if (enabled[idx] && audios[idx]) {
        currentAudio = audios[idx];
        currentIndex = idx;
        updateFilenameDisplay();
        currentAudio.currentTime = 0;
        currentAudio.play();
        currentAudio.onended = () => playNext(i + 1);
      } else {
        playNext(i + 1);
      }
    };

    playNext(index);
  }

  function playNext(step) {
    let i = currentIndex + step;
    while (i >= 0 && i < audios.length) {
      if (enabled[i] && audios[i]) {
        currentIndex = i;
        if (currentAudio) currentAudio.pause();
        currentAudio = audios[i];
        currentAudio.play();
        startPlaybackUpdates();
        updateFilenameDisplay();
        currentAudio.addEventListener('ended', () => {
          stopPlaybackUpdates();
          calculateTotalTime();
        });
        break;
      }
      i += step;
    }
  }

  forwardBtn.onclick = () => playNext(1);

  homeBtn.onclick = () => {
    window.location.href = 'index.html';
  };

  function resetAll() {
    if (confirm('Are you sure you want to delete all audio files and reset settings?')) {
      localStorage.clear();
      const req = indexedDB.deleteDatabase('AudioDB');
      req.onsuccess = () => location.reload();
      req.onerror = () => console.error('Failed to delete database');
    }
  }

  // Initialize with silent audio
  const silentBlob = new Blob([new Uint8Array(1)], { type: 'audio/mp3' });
  for (let i = 0; i < 30; i++) {
    if (!audios[i]) {
      audios[i] = new Audio(URL.createObjectURL(silentBlob));
    }
  }

  // Initial update
  updateFilenameDisplay();
  calculateTotalTime();
}

/***********************
 * INITIALIZE APPROPRIATE FUNCTIONALITY
 * BASED ON CURRENT PAGE
 ***********************/
document.addEventListener('DOMContentLoaded', function() {
  initializeIndexPage();
  initializeMP3Player();
});
