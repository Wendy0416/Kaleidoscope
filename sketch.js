/*
  Project: Kaleidoscope
  Course: DIGF-6037-301
  Team: Andy, Wendy, Rapheal
  Date: 2026/10/28
  
  References:
https://github.com/npuckett/p5-phone
https://editor.p5js.org/npuckett/sketches/-_pUgcYmW
https://editor.p5js.org/npuckett/sketches/FgraGpDkn
https://p5js.org/examples/Repetition-Kaleidoscope/
*/

const IMAGE_FILES = [
  'img1.jpeg',  'img2.jpeg',  'img4.jpeg',  'img5.jpeg',
  'img6.jpeg',  'img7.jpeg',  'img8.jpeg',  'img9.jpeg',
  'img11.jpeg','img12.jpeg', 'img14.jpeg', 'img15.jpeg', 'img16.jpeg', 'img17.jpeg', 
];
const MAX_IMAGE_SIZE = 1024;    

// Andy & Wendy
const KEEP_SCREEN_ON = true;       
const FULLSCREEN = true;          
const LOCK_ORIENTATION = 'portrait';  //screen setting
const SEGMENTS = 24;            
const MOTION_SENSITIVITY = 1.2;  
const ACCEL_GAIN = 0.15;         
const MOTION_DEADZONE = 0.04;    
const MOTION_DECAY = 0.95;       
const FADE_SPEED = 0.18;        
const SHAKE_FORCE = 18;          
const SHAKE_HITS = 3;            
const SHAKE_WINDOW = 700;        
const SHAKE_COOLDOWN = 1200; 

//createcanvas
function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  fitCanvas();
  pixelDensity(1);                 
  imageMode(CENTER);

  showDesktopQr({ label: 'Scan to open on your phone' });
  enableGyroTap('Tap to start: move the phone to make a kaleidoscope, shake hard to change the picture');
  lockGestures();
  setupScreenLocks();

  current = floor(random(IMAGE_FILES.length));
  IMAGE_FILES.forEach((file, i) => {
    images[i] = makePlaceholder(i);          // test pattern until the real file arrives
    loadImageSafe(file, (img) => { if (img && img.width) images[i] = shrink(img); }, () => {
      // fallback: same file in a folder called "source images"
      const alt = file.replace('images/', 'source images/');
      loadImageSafe(alt, (img) => { if (img && img.width) images[i] = shrink(img); }, () => {});
    });
  });
}
function loadImageSafe(path, done, fail) {
  const r = loadImage(path, done, fail);
  if (r && typeof r.then === 'function') r.then(done, fail);
}

function shrink(img) {
  if (img.width > MAX_IMAGE_SIZE || img.height > MAX_IMAGE_SIZE) {
    if (img.width >= img.height) img.resize(MAX_IMAGE_SIZE, 0);
    else img.resize(0, MAX_IMAGE_SIZE);
  }
  return img;
}


//action to the phone
let images = [];
let current = 0;
let energy = 0;          
let shown = 0;           
let spin = 0;            
let flash = 0;           
let lastChange = 0;
let shakeHits = [];

let accel = 0;             
let rotRate = 0;           
const tilt = { has: false, alpha: 0, beta: 0, gamma: 0, pAlpha: 0, pBeta: 0, pGamma: 0 };

//tilt and shake
window.addEventListener('deviceorientation', (e) => {
  if (e.beta === null) return;
  tilt.has = true;
  tilt.alpha = e.alpha || 0;   
  tilt.beta = e.beta || 0;     // for tilting 
  tilt.gamma = e.gamma || 0;  
});

// Raphael
window.addEventListener('devicemotion', (e) => {
  let a = e.acceleration;
  let force;
  if (a && a.x !== null) {
    force = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  } else {
    a = e.accelerationIncludingGravity;
    if (!a || a.x === null) return;
    force = Math.abs(Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) - 9.81);
  }

  accel += (force - accel) * 0.4;
  const rr = e.rotationRate;
  if (rr) {
    const r = Math.sqrt((rr.alpha || 0) ** 2 + (rr.beta || 0) ** 2 + (rr.gamma || 0) ** 2);
    rotRate += (r - rotRate) * 0.4;
  }

  const now = performance.now();
  const lastHit = shakeHits[shakeHits.length - 1] || 0;
  if (force > SHAKE_FORCE && now - lastHit > 90) shakeHits.push(now);
  shakeHits = shakeHits.filter((t) => now - t < SHAKE_WINDOW);
  if (shakeHits.length >= SHAKE_HITS) {
    shakeHits = [];
    nextImage();
  }
});

// Andy & Wendy
// for images loading
function loadImageSafe(path, done, fail) {
  const r = loadImage(path, done, fail);
  if (r && typeof r.then === 'function') r.then(done, fail);
}

function shrink(img) {
  if (img.width > MAX_IMAGE_SIZE || img.height > MAX_IMAGE_SIZE) {
    if (img.width >= img.height) img.resize(MAX_IMAGE_SIZE, 0);
    else img.resize(0, MAX_IMAGE_SIZE);
  }
  return img;
}

// the kaleidoscope movement
function draw() {
  background(0);
  const img = images[current];
  if (!img) return;
  let motion = 0;
  if (tilt.has) {
    motion += Math.abs(angleDiff(tilt.beta, tilt.pBeta));
    motion += Math.abs(angleDiff(tilt.gamma, tilt.pGamma));
    motion += Math.abs(angleDiff(tilt.alpha, tilt.pAlpha));
    tilt.pAlpha = tilt.alpha; tilt.pBeta = tilt.beta; tilt.pGamma = tilt.gamma;
  }
  motion += (rotRate / 60) * 0.5;      
  motion += accel * ACCEL_GAIN;
  accel *= 0.9; rotRate *= 0.9;        

  const level = constrain(Math.sqrt(Math.max(0, motion - MOTION_DEADZONE)) * MOTION_SENSITIVITY, 0, 1);
  energy = Math.max(energy * MOTION_DECAY, level);
  shown = lerp(shown, energy, FADE_SPEED);     // extra easing = no abrupt snap
  spin += shown * 0.03;

  // img keep still
  drawCover(img, width / 2, height / 2, width, height);

if (shown > 0.02) {
    drawingContext.globalAlpha = easeInOut(shown);
    drawKaleidoscope(img);
    drawingContext.globalAlpha = 1;
  }

  // white flash after picture change
if (flash > 0) {
    noStroke();
    fill(255, flash);
    rect(0, 0, width, height);
    flash -= 25;
  }
}

// images become kaleidoscope pattern
// Raphael
function drawKaleidoscope(img) {
  const radius = Math.sqrt(width * width + height * height) / 2 + 2;
  const slice = TWO_PI / SEGMENTS;
//Andy &  Wendy
  const offX = constrain(tilt.gamma, -90, 90) / 90 * img.width * 0.25;
  const offY = constrain(tilt.beta - 45, -90, 90) / 90 * img.height * 0.25;
// Raphael
   const turn = radians(tilt.alpha) + spin;

  const s = Math.max(radius * 2 / img.width, radius * 2 / img.height) * (1 + shown * 0.4);
  const source = img.canvas || img.elt;

  const ctx = drawingContext;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  for (let i = 0; i < SEGMENTS; i++) {
    ctx.save();
    ctx.rotate(i * slice);
    if (i % 2 === 1) ctx.scale(1, -1);      

    ctx.beginPath(); 
    
 // Andy & Wendy
 ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -slice / 2 - 0.01, slice / 2 + 0.01);
    ctx.closePath();
    ctx.clip();

    ctx.rotate(turn);
    ctx.drawImage(
      source,
      -img.width * s / 2 + offX * s,
      -img.height * s / 2 + offY * s,
      img.width * s,
      img.height * s
    );
    ctx.restore();
  }
  ctx.restore();
}
// shake and change to random images 
function nextImage() {
  if (images.length < 2) return;
  if (millis() - lastChange < SHAKE_COOLDOWN) return;
  lastChange = millis();
  let next;
  do { next = floor(random(images.length)); } while (next === current);
  current = next;
  flash = 160;
}
// other canvas setting
function drawCover(img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  image(img, x, y, img.width * s, img.height * s);
}

function angleDiff(a, b) {
  let d = a - b;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function easeInOut(t) { return t * t * (3 - 2 * t); }


function makePlaceholder(i) {
  const g = createGraphics(800, 800);
  g.colorMode(HSB, 360, 100, 100);
  g.background((i * 23) % 360, 60, 95);
  g.noStroke();
  for (let k = 0; k < 40; k++) {
    g.fill((i * 23 + k * 9) % 360, 80, 90);
    g.circle(random(800), random(800), random(40, 220));
  }
  g.fill(0);
  g.textSize(120);
  g.textAlign(CENTER, CENTER);
  g.text('IMG ' + (i + 1), 400, 400);
  return g;
}


function fitCanvas() {
  const w = window.innerWidth, h = window.innerHeight;
  document.documentElement.style.cssText += ';margin:0;padding:0;overflow:hidden;background:#000;';
  document.body.style.cssText += ';margin:0;padding:0;overflow:hidden;background:#000;';
  const c = document.querySelector('canvas');
  if (c) c.style.cssText += ';position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;display:block;';
  if (w !== width || h !== height) resizeCanvas(w, h);
}

function windowResized() { fitCanvas(); }

// keep the phone awake
let wakeLock = null;
let locksRequested = false;

function setupScreenLocks() {

  ['orientationchange', 'fullscreenchange'].forEach((ev) =>
    window.addEventListener(ev, () => { fitCanvas(); setTimeout(fitCanvas, 300); }));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitCanvas);

  ['pointerup', 'touchend', 'click'].forEach((ev) =>
    window.addEventListener(ev, requestScreenLocks, { passive: true }));


  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && locksRequested) requestWakeLock();
  });
}

async function requestScreenLocks() {
  if (locksRequested) return;
  locksRequested = true;
  if (KEEP_SCREEN_ON) requestWakeLock();
  if (FULLSCREEN || LOCK_ORIENTATION) await enterFullscreen();
  if (LOCK_ORIENTATION) lockOrientation();
}

async function enterFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch (err) {
    console.log('Fullscreen not available:', err.message);
  }
  fitCanvas();
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch (err) {
    console.log('Wake lock not available:', err.message);
  }
}


async function lockOrientation() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock(LOCK_ORIENTATION);
    }
  } catch (err) {
    console.log('Orientation lock not available:', err.message);
  }
}
  
  
