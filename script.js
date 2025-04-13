// script.js

// Generate 100 buttons
const gridContainer = document.getElementById('gridContainer');

for (let i = 1; i <= 100; i++) {
  const btn = document.createElement('button');
  btn.className = 'grid-btn';
  btn.textContent = i;
  btn.onclick = () => {
    window.location.href = `page${i}.html`;  // Changed to pageX.html
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