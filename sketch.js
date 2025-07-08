let wetMask;
let Level;
let img;

let prevTouchX = 0;
let prevTouchY = 0;
let isFirstTouch = true;

let dirtyRegions = new Set(); 
let needsRedraw = false;
let frameSkip = 0;

const BLOCK_SIZE = 64;
let BLOCKS_PER_ROW;
const BRUSH_SIZE = 60;

function preload(){
  img = loadImage('tissue.jpg')
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 화면 크기에 맞춰 블록 개수 계산
  BLOCKS_PER_ROW = Math.ceil(windowWidth / BLOCK_SIZE);
  
  wetMask = createGraphics(windowWidth, windowHeight);
  wetMask.clear();
  
  Level = new Float32Array(windowWidth * windowHeight);
  
  pixelDensity(1);
}

function draw() {
  background(255);
  
  // 이미지를 전체 화면에 표시
  image(img, 0, 0, windowWidth, windowHeight);
  
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
  
  // 좌표 변환 제거 (이미 화면 좌표계와 일치)
  let localCurrentX = currentX;
  let localCurrentY = currentY;
  let localPrevX = prevX;
  let localPrevY = prevY;
  
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
  let maxX = Math.min(windowWidth - 1, Math.floor(centerX + BRUSH_SIZE));
  let minY = Math.max(0, Math.floor(centerY - BRUSH_SIZE));
  let maxY = Math.min(windowHeight - 1, Math.floor(centerY + BRUSH_SIZE));
  
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
        
        let index = py * windowWidth + px;
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
    let endX = Math.min(startX + BLOCK_SIZE, windowWidth);
    let endY = Math.min(startY + BLOCK_SIZE, windowHeight);
    
    for (let y = startY; y < endY; y += 4) {
      for (let x = startX; x < endX; x += 4) {
        let index = y * windowWidth + x;
        let wetness = Level[index];
        
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
  image(wetMask, 0, 0);
  pop();
}

function dryEffect() {
  let blocksToRemove = [];
  
  for (let blockIndex of dirtyRegions) {
    let blockX = blockIndex % BLOCKS_PER_ROW;
    let blockY = Math.floor(blockIndex / BLOCKS_PER_ROW);
    
    let startX = blockX * BLOCK_SIZE;
    let startY = blockY * BLOCK_SIZE;
    let endX = Math.min(startX + BLOCK_SIZE, windowWidth);
    let endY = Math.min(startY + BLOCK_SIZE, windowHeight);
    
    let hasWetPixels = false;
    
    for (let y = startY; y < endY; y += 4) {
      for (let x = startX; x < endX; x += 4) {
        let index = y * windowWidth + x;
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
}

function touchEnded() {
  isFirstTouch = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // 화면 크기가 변경될 때 재초기화
  BLOCKS_PER_ROW = Math.ceil(windowWidth / BLOCK_SIZE);
  wetMask = createGraphics(windowWidth, windowHeight);
  wetMask.clear();
  Level = new Float32Array(windowWidth * windowHeight);
  dirtyRegions.clear();
  needsRedraw = true;
}

function keyPressed() {
  if (key === ' ') {
    Level.fill(0);
    dirtyRegions.clear();
    needsRedraw = true;
  }
}
