let wetMask;
let Level;
let img;

let prevTouchX = 0;
let prevTouchY = 0;
let isFirstTouch = true;

let dirtyRegions = new Set(); 
let needsRedraw = false;
let frameSkip = 0;

const CANVAS_SIZE = 900;
const BLOCK_SIZE = 64;
const BLOCKS_PER_ROW = Math.ceil(CANVAS_SIZE / BLOCK_SIZE);
const BRUSH_SIZE = 60;

function preload(){
  img = loadImage('tissue texture.jpeg')
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  wetMask = createGraphics(CANVAS_SIZE, CANVAS_SIZE);
  wetMask.clear();
  
  Level = new Float32Array(CANVAS_SIZE * CANVAS_SIZE);
  
  pixelDensity(1);
}

function draw() {
  background(255);
  translate(width/2, height/2);
  
  image(img, -450, -450, CANVAS_SIZE, CANVAS_SIZE);
  
  if (needsRedraw || dirtyRegions.size > 0) {
    drawWetEffect();
    needsRedraw = false;
  }
  
  if (mouseIsPressed || touches.length > 0) {
    addWetness();
  }
  
  frameSkip++;
  if (frameSkip >= 3) {
    dryEffect();
    frameSkip = 0;
  }
}

function addWetness() {
  let currentX, currentY, prevX, prevY;
  
  if (touches.length > 0) {
    currentX = touches[0].x;
    currentY = touches[0].y;
    
    if (isFirstTouch) {
      prevX = currentX;
      prevY = currentY;
      isFirstTouch = false;
    } else {
      prevX = prevTouchX;
      prevY = prevTouchY;
    }
    
    prevTouchX = currentX;
    prevTouchY = currentY;
    
  } else {
    currentX = mouseX;
    currentY = mouseY;
    prevX = pmouseX;
    prevY = pmouseY;
  }
  
  let localCurrentX = currentX - width/2 + 450;
  let localCurrentY = currentY - height/2 + 450;
  let localPrevX = prevX - width/2 + 450;
  let localPrevY = prevY - height/2 + 450;
  
  let speed = Math.sqrt((currentX - prevX) * (currentX - prevX) + (currentY - prevY) * (currentY - prevY));
  let pressure = speed > 50 ? 0.03 : 0.15 - (speed * 0.12 / 50);
  
  let distance = Math.sqrt((localCurrentX - localPrevX) * (localCurrentX - localPrevX) + (localCurrentY - localPrevY) * (localCurrentY - localPrevY));
  let steps = Math.max(1, Math.floor(distance));
  
  for (let i = 0; i <= steps; i++) {
    let t = i / steps;
    let x = localPrevX + (localCurrentX - localPrevX) * t;
    let y = localPrevY + (localCurrentY - localPrevY) * t;
    
    applyBrush(x, y, pressure);
  }
}

function applyBrush(centerX, centerY, pressure) {
  let minX = Math.max(0, Math.floor(centerX - BRUSH_SIZE));
  let maxX = Math.min(CANVAS_SIZE - 1, Math.floor(centerX + BRUSH_SIZE));
  let minY = Math.max(0, Math.floor(centerY - BRUSH_SIZE));
  let maxY = Math.min(CANVAS_SIZE - 1, Math.floor(centerY + BRUSH_SIZE));
  
  let blockMinX = Math.floor(minX / BLOCK_SIZE);
  let blockMaxX = Math.floor(maxX / BLOCK_SIZE);
  let blockMinY = Math.floor(minY / BLOCK_SIZE);
  let blockMaxY = Math.floor(maxY / BLOCK_SIZE);
  
  for (let blockY = blockMinY; blockY <= blockMaxY; blockY++) {
    for (let blockX = blockMinX; blockX <= blockMaxX; blockX++) {
      dirtyRegions.add(blockY * BLOCKS_PER_ROW + blockX);
    }
  }
  
  let brushSizeSquared = BRUSH_SIZE * BRUSH_SIZE;
  
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      let dx = px - centerX;
      let dy = py - centerY;
      let distanceSquared = dx*dx + dy*dy;
      
      if (distanceSquared <= brushSizeSquared) {
        let distance = Math.sqrt(distanceSquared);
        let intensity = 1 - (distance / BRUSH_SIZE);
        intensity = intensity * intensity;
        
        let index = py * CANVAS_SIZE + px;
        let newValue = Level[index] + intensity * pressure;
        
        if (newValue > Level[index]) {
          Level[index] = Math.min(1, newValue);
          needsRedraw = true;
        }
      }
    }
  }
}

function drawWetEffect() {
  wetMask.clear();
  

  for (let blockIndex of dirtyRegions) {
    let blockX = blockIndex % BLOCKS_PER_ROW;
    let blockY = Math.floor(blockIndex / BLOCKS_PER_ROW);
    
    let startX = blockX * BLOCK_SIZE;
    let startY = blockY * BLOCK_SIZE;
    let endX = Math.min(startX + BLOCK_SIZE, CANVAS_SIZE);
    let endY = Math.min(startY + BLOCK_SIZE, CANVAS_SIZE);
    
    for (let y = startY; y < endY; y += 4) {
      for (let x = startX; x < endX; x += 4) {
        let index = y * CANVAS_SIZE + x;
        let wetness = Level[index];
        
        //최적화 (4픽셀)
        if (wetness > 0.01) {
          let darkness = wetness * 40;
          wetMask.fill(0, 0, 0, darkness);
          wetMask.noStroke();
          wetMask.rect(x, y, 4, 4);
        }
      }
    }
  }
  
  push();
  blendMode(MULTIPLY);
  image(wetMask, -450, -450);
  pop();
}

function dryEffect() {
  let blocksToRemove = [];
  
  for (let blockIndex of dirtyRegions) {
    let blockX = blockIndex % BLOCKS_PER_ROW;
    let blockY = Math.floor(blockIndex / BLOCKS_PER_ROW);
    
    let startX = blockX * BLOCK_SIZE;
    let startY = blockY * BLOCK_SIZE;
    let endX = Math.min(startX + BLOCK_SIZE, CANVAS_SIZE);
    let endY = Math.min(startY + BLOCK_SIZE, CANVAS_SIZE);
    
    let hasWetPixels = false;
    
    for (let y = startY; y < endY; y += 4) {
      for (let x = startX; x < endX; x += 4) {
        let index = y * CANVAS_SIZE + x;
        Level[index] -= 0.01;
        
        if (Level[index] <= 0) {
          Level[index] = 0;
        } else {
          hasWetPixels = true;
        }
      }
    }
    
    if (!hasWetPixels) {
      blocksToRemove.push(blockIndex);
    }
  }
  
  for (let blockIndex of blocksToRemove) {
    dirtyRegions.delete(blockIndex);
  }
  
  if (blocksToRemove.length > 0) {
    needsRedraw = true;
  }
}

function touchStarted() {
  isFirstTouch = true;
  return false; 
}

function touchEnded() {
  isFirstTouch = true;
  return false; 
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  if (key === ' ') {
    Level.fill(0);
    dirtyRegions.clear();
    needsRedraw = true;
  }
}

function resetCanvas() {
  Level.fill(0);
  dirtyRegions.clear();
  needsRedraw = true;
}
