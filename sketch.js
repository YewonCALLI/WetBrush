let wetMask;
let Level = [];
let img;

// 터치 이전 위치 추적을 위한 변수들
let prevTouchX = 0;
let prevTouchY = 0;
let isFirstTouch = true;

// 최적화를 위한 변수들
let activePixels = new Set(); // 젖은 픽셀들만 추적
let needsRedraw = false; // 화면 갱신 필요 여부
let frameSkip = 0; // 프레임 스킵 카운터

function preload(){
  img = loadImage('tissue texture.jpeg')
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  wetMask = createGraphics(900, 900);
  wetMask.clear();
  
  // 1차원 배열로 변경 (더 빠른 접근)
  Level = new Float32Array(900 * 900);
  
  // 픽셀 밀도 최적화
  pixelDensity(1);
}

function draw() {
  background(255);
  translate(width/2, height/2);
  
  //이미지 가운데 정렬
  image(img, -450, -450, 900, 900);
  
  // 젖은 영역이 있을 때만 업데이트
  if (needsRedraw || activePixels.size > 0) {
    drawWetEffect();
    needsRedraw = false;
  }
  
  if (mouseIsPressed || touches.length > 0) {
    addWetness();
  }
  
  // 마르는 효과는 3프레임마다 한 번씩만 실행
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
  
  let brushSize = 60;
  
  let speed = dist(currentX, currentY, prevX, prevY);
  let pressure = map(speed, 0, 50, 0.15, 0.03);
  pressure = constrain(pressure, 0.03, 0.15);
  
  let distance = dist(localCurrentX, localCurrentY, localPrevX, localPrevY);
  let steps = max(1, Math.floor(distance / 2)); // 스텝 수 줄임
  
  for (let i = 0; i <= steps; i++) {
    let x = lerp(localPrevX, localCurrentX, i / steps);
    let y = lerp(localPrevY, localCurrentY, i / steps);
    
    // 브러시 크기 최적화 - 더 큰 스텝으로 처리
    for (let dx = -brushSize; dx <= brushSize; dx += 2) {
      for (let dy = -brushSize; dy <= brushSize; dy += 2) {
        let px = Math.floor(x + dx);
        let py = Math.floor(y + dy);
        
        if (px >= 0 && px < 900 && py >= 0 && py < 900) {
          let distance = Math.sqrt(dx*dx + dy*dy);
          
          if (distance <= brushSize) {
            let intensity = 1 - (distance / brushSize);
            intensity = intensity * intensity; // pow(intensity, 2) 대신
            
            let index = py * 900 + px;
            let newValue = Math.min(1, Level[index] + intensity * pressure);
            
            if (newValue > Level[index]) {
              Level[index] = newValue;
              activePixels.add(index);
              needsRedraw = true;
            }
          }
        }
      }
    }
  }
}

function drawWetEffect() {
  wetMask.clear();
  
  // 활성 픽셀만 처리
  for (let index of activePixels) {
    let x = index % 900;
    let y = Math.floor(index / 900);
    
    let wetness = Level[index];
    if (wetness > 0.01) { // 임계값 이하는 무시
      let darkness = wetness * 40;
      wetMask.fill(0, 0, 0, darkness);
      wetMask.noStroke();
      wetMask.rect(x, y, 2, 2);
    }
  }
  
  push();
  blendMode(MULTIPLY);
  image(wetMask, -450, -450);
  pop();
}

function dryEffect() {
  let pixelsToRemove = [];
  
  for (let index of activePixels) {
    Level[index] -= 0.003;
    
    if (Level[index] <= 0) {
      Level[index] = 0;
      pixelsToRemove.push(index);
    }
  }
  
  // 완전히 마른 픽셀 제거
  for (let index of pixelsToRemove) {
    activePixels.delete(index);
  }
  
  if (pixelsToRemove.length > 0) {
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
    // 빠른 초기화
    Level.fill(0);
    activePixels.clear();
    needsRedraw = true;
  }
}