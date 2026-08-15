const hero = document.getElementById('hero');
const spotlightLayer = document.getElementById('spotlight-layer');
const maskCircle = document.getElementById('maskCircle');
const turb = document.getElementById('turb');
const disp = document.getElementById('disp');

const isMobile = window.matchMedia("(max-width: 768px)").matches;
const BASE_RADIUS = isMobile ? 180 : 130;
const EXPANDED_RADIUS = isMobile ? 200 : 260; /* Shrunk phone radius */

let currentRadius = 0;
let targetRadius = 0;

let currentScale = 40;
let targetScale = 40;

let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let isPressing = false;
let isHovering = false;
let interactionMode = 'mouse'; // Dynamically tracks input type

// Update the DOM mask properties directly
function applyStyles() {
  if (maskCircle) {
    maskCircle.setAttribute('cx', pointerX);
    maskCircle.setAttribute('cy', pointerY);
    maskCircle.setAttribute('r', currentRadius);
  }

  const maskCircle2 = document.getElementById('maskCircle2');
  const page2 = document.getElementById('page2');
  if (maskCircle2 && page2) {
    // Transform global coordinates into page2's local bounds
    const localY = pointerY - page2.offsetTop;
    maskCircle2.setAttribute('cx', pointerX);
    maskCircle2.setAttribute('cy', localY);
    maskCircle2.setAttribute('r', currentRadius);
  }

  if (disp) {
    disp.setAttribute('scale', currentScale);
  }
}

// Ensure the mask Units update to window size incase of resize
function updateMaskSizes() {
  const w = window.innerWidth * 2;
  const h = Math.max(window.innerHeight, document.documentElement.scrollHeight) * 2;

  const m1 = document.getElementById('waterMask');
  if (m1) { m1.setAttribute('width', w); m1.setAttribute('height', h); }

  const m2 = document.getElementById('waterMask2');
  if (m2) { m2.setAttribute('width', w); m2.setAttribute('height', h); }
}

updateMaskSizes();
window.addEventListener('resize', updateMaskSizes);

function updatePointer(x, y) {
  pointerX = x;
  pointerY = y;
}

// Apply tracking globally across the entire document to persist interactiveness past the hero
document.addEventListener('mousemove', (e) => {
  interactionMode = 'mouse';
  isHovering = true;
  updatePointer(e.pageX, e.pageY);
});

document.addEventListener('mousedown', () => {
  isPressing = true;
});

document.addEventListener('mouseup', () => {
  isPressing = false;
});

document.addEventListener('mouseleave', () => {
  isHovering = false;
  isPressing = false;
});

document.addEventListener('touchstart', (e) => {
  interactionMode = 'touch';
  isHovering = true;
  isPressing = true;
  const touch = e.touches[0];
  updatePointer(touch.pageX, touch.pageY);
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  updatePointer(touch.pageX, touch.pageY);
}, { passive: true });

document.addEventListener('touchend', (e) => {
  isPressing = false;
  if (e.changedTouches.length === 0) {
    isHovering = false;
  }
});

let frames = 0;
function animate() {
  frames++;
  // Smooth, slow moving glass warp
  turb.setAttribute('baseFrequency', `0.008 ${0.008 + Math.sin(frames * 0.03) * 0.004}`);

  if (interactionMode === 'touch') {
    // Phone logic: ONLY strictly show on active touch
    if (isPressing) {
      targetRadius = EXPANDED_RADIUS;
      targetScale = 50;
    } else {
      targetRadius = 0;
      targetScale = 15;
    }
  } else {
    // Desktop logic: Show baseline hover, expand on click
    if (isHovering) {
      targetRadius = isPressing ? EXPANDED_RADIUS : BASE_RADIUS;
      targetScale = isPressing ? 50 : 25;
    } else {
      targetRadius = 0;
      targetScale = 15;
    }
  }

  currentRadius += (targetRadius - currentRadius) * 0.15;
  currentScale += (targetScale - currentScale) * 0.1;

  if (currentRadius > 0.1 || targetRadius > 0) {
    applyStyles();
  }

  requestAnimationFrame(animate);
}

animate();
