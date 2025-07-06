let wetMask;
let Level = [];
let img;

// 터치 이전 위치 추적을 위한 변수들
let prevTouchX = 0;
let prevTouchY = 0;
let isFirstTouch = true;

function preload(){
  img = loadImage('tissue texture.jpeg')
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  wetMask = createGraphics(900, 900);
  wetMask.clear();
  
  Level = [];
  for (let x = 0; x < 900; x++) {
    Level[x] = [];
    for (let y = 0; y < 900; y++) {
      Level[x][y] = 0;
    }
  }
}

function draw() {
  background(255);
  translate(width/2, height/2);
  
  //이미지 가운데 정렬
  image(img, -450, -450, 900, 900);
  
  drawWetEffect();
  
  if (mouseIsPressed || touches.length > 0) {
    addWetness();
  }
  dryEffect();
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
  
  //0일때 0.15 50일때 0.03
  let pressure = map(speed, 0, 50, 0.15, 0.03);
  
  //중첩될때 방지
  pressure = constrain(pressure, 0.03, 0.15);
  
  let distance = dist(localCurrentX, localCurrentY, localPrevX, localPrevY);
  let steps = max(1, distance);
  
  for (let i = 0; i <= steps; i++) {
    let x = lerp(localPrevX, localCurrentX, i / steps);
    let y = lerp(localPrevY, localCurrentY, i / steps);
    
    for (let dx = -brushSize; dx <= brushSize; dx++) {
      for (let dy = -brushSize; dy <= brushSize; dy++) {
        let px = Math.floor(x + dx);
        let py = Math.floor(y + dy);
        
        if (px >= 0 && px < 900 && py >= 0 && py < 900) {
          let distance = sqrt(dx*dx + dy*dy);
          
          //원 형태로 만들기
          if (distance <= brushSize) {
            let intensity = 1 - (distance / brushSize);
            intensity = pow(intensity, 2);
            
            //누적
            Level[px][py] = min(1, Level[px][py] + intensity * pressure);
          }
        }
      }
    }
  }
}

function drawWetEffect() {
  wetMask.clear();
  
  for (let x = 0; x < 900; x += 2) {
    for (let y = 0; y < 900; y += 2) {
      let wetness = Level[x][y];
      if (wetness > 0) {
        let darkness = wetness * 40;
        wetMask.fill(0, 0, 0, darkness);
        wetMask.noStroke();
        wetMask.rect(x, y, 2, 2);
      }
    }
  }
  
  push();
  blendMode(MULTIPLY);
  image(wetMask, -450, -450);
  pop();
}

//마르는 함수
function dryEffect() {
  for (let x = 0; x < 900; x++) {
    for (let y = 0; y < 900; y++) {
      if (Level[x][y] > 0) {
        Level[x][y] -= 0.003;
        Level[x][y] = max(0, Level[x][y]);
      }
    }
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
    for (let x = 0; x < 900; x++) {
      for (let y = 0; y < 900; y++) {
        Level[x][y] = 0;
      }
    }
  }
}