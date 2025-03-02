// Space Shooter Game
// Game variables
let player;
let bullets = [];
let enemies = [];
let stars = [];
let particles = [];
let powerups = [];
let score = 0;
let lives = 3;
let gameState = 'start'; // start, play, gameOver, leaderboard, nameInput
let enemySpawnRate = 120; // Frames between enemy spawns
let enemySpawnCounter = 0;
let powerupSpawnRate = 500; // Frames between powerup spawns
let powerupSpawnCounter = 0;
let level = 1;
let levelUpScore = 500;
let highScoreButton; // Button for viewing high scores

// Setup function - runs once at the beginning
function setup() {
  createCanvas(800, 600);
  // Create player spaceship
  player = new Player();
  
  // Create stars for background - increased number
  for (let i = 0; i < 200; i++) {
    stars.push(new Star());
  }
  
  // Initialize Supabase connection
  try {
    initSupabase();
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
}

// Draw function - runs every frame
function draw() {
  background(0); // Black background for space
  
  // Draw stars
  for (let star of stars) {
    star.show();
    star.update();
  }
  
  // Game state management
  if (gameState === 'start') {
    showStartScreen();
  } else if (gameState === 'play') {
    updateGame();
  } else if (gameState === 'gameOver') {
    showGameOverScreen();
  } else if (gameState === 'nameInput') {
    // Show the game in the background
    updateGameVisuals();
    // Show name input overlay
    displayNameInput();
  } else if (gameState === 'leaderboard') {
    // Show the game in the background
    updateGameVisuals();
    // Show leaderboard overlay
    displayLeaderboard();
  }
}

// Only update visuals without game logic (for background during overlays)
function updateGameVisuals() {
  // Update and show player
  player.show();
  
  // Show bullets
  for (let bullet of bullets) {
    bullet.show();
  }
  
  // Show enemies
  for (let enemy of enemies) {
    enemy.show();
  }
  
  // Show powerups
  for (let powerup of powerups) {
    powerup.show();
  }
  
  // Update and show particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    
    // Remove particles that fade out
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
  
  // Display score, lives, and level
  displayHUD();
}

// Handle key presses
function keyPressed() {
  if (gameState === 'nameInput') {
    handleKeyTyping();
    return;
  }
  
  if (key === ' ' || keyCode === 32) { // Space bar (using both key and keyCode for better compatibility)
    if (gameState === 'play') {
      player.shoot();
    } else if (gameState === 'start' || gameState === 'gameOver') {
      resetGame();
      gameState = 'play';
    }
  }
  
  // 'L' key to view leaderboard
  if ((key === 'l' || key === 'L') && (gameState === 'start' || gameState === 'gameOver')) {
    gameState = 'leaderboard';
  }
}

// Add mousePressed function to also allow starting with mouse clicks
function mousePressed() {
  // Check for leaderboard UI interactions first
  if (gameState === 'leaderboard' || gameState === 'nameInput') {
    if (handleLeaderboardClicks()) {
      return;
    }
  }
  
  if (gameState === 'start') {
    // Check if high score button was clicked
    if (mouseX > width/2 - 100 && mouseX < width/2 + 100 && 
        mouseY > height/2 + 150 && mouseY < height/2 + 190) {
      gameState = 'leaderboard';
      return;
    }
    
    resetGame();
    gameState = 'play';
  } else if (gameState === 'play') {
    player.shoot();
  } else if (gameState === 'gameOver') {
    // Check if high score button was clicked
    if (mouseX > width/2 - 100 && mouseX < width/2 + 100 && 
        mouseY > height/2 + 100 && mouseY < height/2 + 140) {
      gameState = 'leaderboard';
      return;
    }
    
    resetGame();
    gameState = 'play';
  }
}

// Reset game to initial state
function resetGame() {
  player = new Player();
  bullets = [];
  enemies = [];
  particles = [];
  powerups = [];
  score = 0;
  lives = 3;
  level = 1;
  enemySpawnRate = 120;
  powerupSpawnCounter = 0;
}

// Update all game elements
function updateGame() {
  // Create a space movement effect
  if (frameCount % 90 === 0) {
    // Add a few new stars occasionally to maintain density
    for (let i = 0; i < 3; i++) {
      stars.push(new Star());
    }
  }
  
  // Spawn enemies
  enemySpawnCounter++;
  if (enemySpawnCounter >= enemySpawnRate) {
    enemies.push(new Enemy());
    enemySpawnCounter = 0;
  }
  
  // Spawn powerups
  powerupSpawnCounter++;
  if (powerupSpawnCounter >= powerupSpawnRate) {
    if (random() > 0.7) { // 30% chance to spawn a powerup
      powerups.push(new Powerup());
      powerupSpawnCounter = 0;
    }
  }
  
  // Update and show player
  player.update();
  player.show();
  
  // Update and show bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    bullets[i].show();
    
    // Remove bullets that go off screen
    if (bullets[i].offScreen()) {
      bullets.splice(i, 1);
      continue;
    }
    
    // Check for bullet collisions with enemies (only player bullets)
    if (!bullets[i].isEnemyBullet) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        if (bullets[i] && bullets[i].hits(enemies[j])) {
          // Create hit particles
          for (let k = 0; k < 5; k++) {
            let p = new Particle(bullets[i].pos.x, bullets[i].pos.y);
            p.color = color(255, 255, 100);
            particles.push(p);
          }
          
          // Remove bullet
          bullets.splice(i, 1);
          
          // Damage enemy
          let enemyDestroyed = enemies[j].takeDamage();
          
          if (enemyDestroyed) {
            // Create explosion particles
            for (let k = 0; k < 20; k++) {
              particles.push(new Particle(enemies[j].pos.x, enemies[j].pos.y));
            }
            
            // Increase score based on enemy type
            score += (enemies[j].enemyType + 1) * 10;
            
            // Chance to drop powerup when enemy is destroyed
            if (random() > 0.9) { // 10% chance
              let powerupType = floor(random(3));
              let powerup = new Powerup();
              powerup.pos = createVector(enemies[j].pos.x, enemies[j].pos.y);
              powerup.type = powerupType;
              powerups.push(powerup);
            }
            
            // Remove enemy
            enemies.splice(j, 1);
          }
          
          break;
        }
      }
    } 
    // Check for enemy bullet collisions with player
    else if (bullets[i].isEnemyBullet && bullets[i].hits(player)) {
      // Create hit particles
      for (let k = 0; k < 10; k++) {
        let p = new Particle(bullets[i].pos.x, bullets[i].pos.y);
        p.color = color(255, 100, 100);
        particles.push(p);
      }
      
      // Remove bullet
      bullets.splice(i, 1);
      
      // Damage player if shield is not active
      if (player.shieldActive) {
        // Shield absorbs the hit
        player.shieldTime = max(player.shieldTime - 50, 0); // Reduce shield time
        
        // Create shield hit particles
        for (let k = 0; k < 8; k++) {
          let p = new Particle(player.pos.x, player.pos.y);
          p.color = color(0, 150, 255);
          particles.push(p);
        }
        
        if (player.shieldTime <= 0) {
          player.shieldActive = false;
        }
      } else {
        // Player takes damage
        lives--;
        
        // Create explosion particles
        for (let k = 0; k < 15; k++) {
          particles.push(new Particle(player.pos.x, player.pos.y));
        }
        
        // Flash player to indicate damage
        player.damageFlash = 10;
        
        // Check for game over
        if (lives <= 0) {
          // Create big explosion for player death
          for (let k = 0; k < 30; k++) {
            particles.push(new Particle(player.pos.x, player.pos.y));
          }
          gameState = 'gameOver';
          
          // Prompt for name input if score is significant
          if (score > 100) {
            // Delay name input prompt slightly to show game over screen
            setTimeout(() => {
              gameState = 'nameInput';
            }, 2000);
          }
        }
      }
      
      continue;
    }
  }
  
  // Update and show enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    enemies[i].show();
    
    // Check if enemy hits player
    if (enemies[i].hits(player)) {
      if (player.shieldActive) {
        // Shield absorbs the hit
        player.shieldTime = max(player.shieldTime - 100, 0); // Reduce shield time
        
        // Create shield hit particles
        for (let k = 0; k < 15; k++) {
          let p = new Particle(enemies[i].pos.x, enemies[i].pos.y);
          p.color = color(0, 150, 255);
          particles.push(p);
        }
        
        // Remove enemy
        enemies.splice(i, 1);
      } else {
        // Create explosion particles
        for (let k = 0; k < 20; k++) {
          particles.push(new Particle(player.pos.x, player.pos.y));
        }
        
        lives--;
        enemies.splice(i, 1);
        
        if (lives <= 0) {
          gameState = 'gameOver';
          
          // Prompt for name input if score is significant
          if (score > 100) {
            // Delay name input prompt slightly to show game over screen
            setTimeout(() => {
              gameState = 'nameInput';
            }, 2000);
          }
        }
      }
      continue;
    }
    
    // Remove enemies that go off screen
    if (enemies[i].offScreen()) {
      enemies.splice(i, 1);
    }
  }
  
  // Update and show powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    powerups[i].update();
    powerups[i].show();
    
    // Check if player collects powerup
    if (powerups[i].hits(player)) {
      // Apply powerup effect
      powerups[i].applyEffect(player);
      
      // Create collection particles
      for (let j = 0; j < 15; j++) {
        let p = new Particle(powerups[i].pos.x, powerups[i].pos.y);
        p.color = powerups[i].color;
        particles.push(p);
      }
      
      // Remove powerup
      powerups.splice(i, 1);
      continue;
    }
    
    // Remove powerups that go off screen
    if (powerups[i].offScreen()) {
      powerups.splice(i, 1);
    }
  }
  
  // Update and show particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    
    // Remove particles that fade out
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
  
  // Level up based on score
  if (score >= level * levelUpScore) {
    level++;
    enemySpawnRate = max(30, enemySpawnRate - 10); // Increase difficulty
    
    // Level up effect
    for (let i = 0; i < 30; i++) {
      let p = new Particle(width/2, height/2);
      p.color = color(255, 255, 100);
      particles.push(p);
    }
  }
  
  // Display score, lives, and level
  displayHUD();
}

// Display Heads-Up Display (score, lives, level)
function displayHUD() {
  // HUD background
  push();
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, 40);
  
  // Score display
  fill(255);
  textSize(20);
  textAlign(LEFT);
  text(`SCORE: ${score}`, 20, 28);
  
  // Level display
  textAlign(CENTER);
  fill(255, 255, 100);
  text(`LEVEL ${level}`, width/2, 28);
  
  // Lives display
  textAlign(RIGHT);
  fill(255, 100, 100);
  text(`LIVES: `, width - 120, 28);
  
  // Draw life icons
  for (let i = 0; i < lives; i++) {
    fill(255, 50, 50);
    noStroke();
    beginShape();
    vertex(width - 110 + i * 25, 28 - 5);
    bezierVertex(width - 110 + i * 25 + 5, 28 - 15, width - 110 + i * 25 + 15, 28 - 5, width - 110 + i * 25, 28 + 5);
    bezierVertex(width - 110 + i * 25 - 15, 28 - 5, width - 110 + i * 25 - 5, 28 - 15, width - 110 + i * 25, 28 - 5);
    endShape();
  }
  
  // Powerup indicators
  if (player.shieldActive) {
    // Shield indicator
    fill(0, 150, 255);
    stroke(255);
    strokeWeight(1);
    ellipse(width - 30, 60, 20, 20);
    noFill();
    arc(width - 30, 60, 12, 12, PI * 0.25, PI * 1.75);
    
    // Shield timer bar
    noStroke();
    fill(0, 0, 0, 150);
    rect(width - 80, 60 - 5, 40, 10);
    fill(0, 150, 255);
    let shieldPercent = player.shieldTime / 300;
    rect(width - 80, 60 - 5, 40 * shieldPercent, 10);
  }
  
  if (player.weaponPower > 1) {
    // Weapon upgrade indicator
    fill(255, 200, 0);
    stroke(255);
    strokeWeight(1);
    ellipse(width - 30, 90, 20, 20);
    
    // Draw weapon level
    fill(0);
    noStroke();
    textSize(12);
    textAlign(CENTER, CENTER);
    text(player.weaponPower, width - 30, 90);
    
    // Weapon timer bar
    noStroke();
    fill(0, 0, 0, 150);
    rect(width - 80, 90 - 5, 40, 10);
    fill(255, 200, 0);
    let weaponPercent = player.weaponTime / 600;
    rect(width - 80, 90 - 5, 40 * weaponPercent, 10);
  }
  
  pop();
}

// Show start screen
function showStartScreen() {
  fill(255);
  textAlign(CENTER);
  textSize(40);
  text("SPACE SHOOTER", width/2, height/2 - 60);
  
  textSize(24);
  text("Use arrow keys to move", width/2, height/2);
  text("Press SPACE to shoot", width/2, height/2 + 40);
  text("Press SPACE to start", width/2, height/2 + 100);
  
  // Add high scores button
  fill(100, 100, 200);
  rect(width/2 - 100, height/2 + 150, 200, 40, 10);
  fill(255);
  textSize(20);
  text("HIGH SCORES", width/2, height/2 + 175);
}

// Show game over screen
function showGameOverScreen() {
  fill(255);
  textAlign(CENTER);
  textSize(40);
  text("GAME OVER", width/2, height/2 - 60);
  
  textSize(24);
  text(`Final Score: ${score}`, width/2, height/2);
  text("Press SPACE to play again", width/2, height/2 + 60);
  
  // Add high scores button
  fill(100, 100, 200);
  rect(width/2 - 100, height/2 + 100, 200, 40, 10);
  fill(255);
  textSize(20);
  text("HIGH SCORES", width/2, height/2 + 125);
}

// Player class
class Player {
  constructor() {
    this.pos = createVector(width/2, height - 50);
    this.size = 40;
    this.speed = 6;
    this.thrusterAnimation = 0;
    this.shieldActive = false;
    this.shieldTime = 0;
    this.weaponPower = 1; // 1 = normal, 2 = double, 3 = triple
    this.weaponTime = 0;
    this.damageFlash = 0; // Counter for damage flash effect
  }
  
  update() {
    // Move player with arrow keys
    if (keyIsDown(LEFT_ARROW)) {
      this.pos.x -= this.speed;
    }
    if (keyIsDown(RIGHT_ARROW)) {
      this.pos.x += this.speed;
    }
    if (keyIsDown(UP_ARROW)) {
      this.pos.y -= this.speed;
    }
    if (keyIsDown(DOWN_ARROW)) {
      this.pos.y += this.speed;
    }
    
    // Keep player within canvas
    this.pos.x = constrain(this.pos.x, this.size/2, width - this.size/2);
    this.pos.y = constrain(this.pos.y, height/2, height - this.size/2);
    
    // Update animations
    this.thrusterAnimation += 0.1;
    
    // Update powerups
    if (this.shieldActive) {
      this.shieldTime--;
      if (this.shieldTime <= 0) {
        this.shieldActive = false;
      }
    }
    
    if (this.weaponPower > 1) {
      this.weaponTime--;
      if (this.weaponTime <= 0) {
        this.weaponPower = 1;
      }
    }
    
    // Update damage flash
    if (this.damageFlash > 0) {
      this.damageFlash--;
    }
  }
  
  show() {
    // Draw player spaceship
    push();
    translate(this.pos.x, this.pos.y);
    
    // Draw shield if active
    if (this.shieldActive) {
      noFill();
      stroke(0, 150, 255, 150 + sin(frameCount * 0.1) * 50);
      strokeWeight(3);
      ellipse(0, 0, this.size * 1.5, this.size * 1.5);
    }
    
    // Damage flash effect
    if (this.damageFlash > 0 && frameCount % 2 === 0) {
      fill(255, 0, 0, 150);
      noStroke();
      ellipse(0, 0, this.size * 1.2, this.size * 1.2);
    }
    
    // Thruster flames (animated)
    let flameSize = 5 + sin(this.thrusterAnimation * 5) * 2;
    fill(255, 150, 0, 200);
    noStroke();
    beginShape();
    vertex(-this.size/4, this.size/2);
    vertex(-this.size/6, this.size/2 + flameSize);
    vertex(-this.size/8, this.size/2);
    endShape(CLOSE);
    
    beginShape();
    vertex(this.size/8, this.size/2);
    vertex(this.size/6, this.size/2 + flameSize);
    vertex(this.size/4, this.size/2);
    endShape(CLOSE);
    
    // Main thruster
    beginShape();
    vertex(-this.size/8, this.size/2);
    vertex(0, this.size/2 + flameSize * 1.5);
    vertex(this.size/8, this.size/2);
    endShape(CLOSE);
    
    // Ship body
    fill(50, 100, 200);
    stroke(100, 150, 255);
    strokeWeight(2);
    
    // Main hull
    beginShape();
    vertex(0, -this.size/2); // Nose
    vertex(this.size/4, -this.size/4); // Right front
    vertex(this.size/3, this.size/4); // Right wing
    vertex(this.size/5, 0); // Right indent
    vertex(this.size/4, this.size/2); // Right back
    vertex(-this.size/4, this.size/2); // Left back
    vertex(-this.size/5, 0); // Left indent
    vertex(-this.size/3, this.size/4); // Left wing
    vertex(-this.size/4, -this.size/4); // Left front
    endShape(CLOSE);
    
    // Cockpit
    fill(200, 230, 255);
    stroke(150, 200, 255);
    ellipse(0, -this.size/6, this.size/3, this.size/4);
    
    // Wing details
    stroke(100, 150, 255);
    line(-this.size/3, this.size/4, -this.size/4, -this.size/8);
    line(this.size/3, this.size/4, this.size/4, -this.size/8);
    
    // Engine glow
    noStroke();
    fill(100, 150, 255, 100);
    ellipse(-this.size/6, this.size/3, this.size/5, this.size/8);
    ellipse(this.size/6, this.size/3, this.size/5, this.size/8);
    
    // Weapon indicators
    if (this.weaponPower > 1) {
      fill(255, 200, 0);
      noStroke();
      ellipse(-this.size/4, 0, this.size/10, this.size/10);
      ellipse(this.size/4, 0, this.size/10, this.size/10);
      
      if (this.weaponPower > 2) {
        ellipse(-this.size/3, this.size/6, this.size/10, this.size/10);
        ellipse(this.size/3, this.size/6, this.size/10, this.size/10);
      }
    }
    
    pop();
  }
  
  shoot() {
    // Create bullets based on weapon power
    if (this.weaponPower == 1) {
      // Single bullet
      bullets.push(new Bullet(this.pos.x, this.pos.y - this.size/2, 0, -10));
    } else if (this.weaponPower == 2) {
      // Double bullets
      bullets.push(new Bullet(this.pos.x - this.size/4, this.pos.y - this.size/4, -0.5, -10));
      bullets.push(new Bullet(this.pos.x + this.size/4, this.pos.y - this.size/4, 0.5, -10));
    } else {
      // Triple bullets
      bullets.push(new Bullet(this.pos.x, this.pos.y - this.size/2, 0, -10));
      bullets.push(new Bullet(this.pos.x - this.size/3, this.pos.y - this.size/4, -1, -9));
      bullets.push(new Bullet(this.pos.x + this.size/3, this.pos.y - this.size/4, 1, -9));
    }
  }
  
  activateShield() {
    this.shieldActive = true;
    this.shieldTime = 300; // Shield lasts for 300 frames (5 seconds)
  }
  
  upgradeWeapon() {
    this.weaponPower = min(this.weaponPower + 1, 3);
    this.weaponTime = 600; // Weapon upgrade lasts for 600 frames (10 seconds)
  }
}

// Bullet class
class Bullet {
  constructor(x, y, dx, dy) {
    this.pos = createVector(x, y);
    this.vel = createVector(dx || 0, dy || -10); // Default to straight up if no direction provided
    this.size = 8;
    this.color = color(255, 200, 0);
    this.trail = [];
    this.trailLength = 5;
    this.isEnemyBullet = false; // Flag to identify enemy bullets
  }
  
  update() {
    // Save current position for trail
    this.trail.push(createVector(this.pos.x, this.pos.y));
    
    // Keep trail at fixed length
    if (this.trail.length > this.trailLength) {
      this.trail.shift();
    }
    
    // Update position
    this.pos.add(this.vel);
  }
  
  show() {
    // Draw bullet trail
    noStroke();
    for (let i = 0; i < this.trail.length; i++) {
      let alpha = map(i, 0, this.trail.length, 50, 200);
      let size = map(i, 0, this.trail.length, this.size/2, this.size);
      fill(255, 150, 0, alpha);
      ellipse(this.trail[i].x, this.trail[i].y, size, size);
    }
    
    // Draw bullet
    push();
    noStroke();
    fill(255, 200, 0);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
    
    // Bullet glow
    fill(255, 255, 200, 100);
    ellipse(this.pos.x, this.pos.y, this.size * 1.5, this.size * 1.5);
    pop();
  }
  
  offScreen() {
    return this.pos.y < 0 || this.pos.x < 0 || this.pos.x > width || this.pos.y > height;
  }
  
  hits(enemy) {
    // Check if bullet hits enemy
    let d = dist(this.pos.x, this.pos.y, enemy.pos.x, enemy.pos.y);
    return d < this.size/2 + enemy.size/2;
  }
}

// Enemy class
class Enemy {
  constructor() {
    this.pos = createVector(random(width), -20);
    this.vel = createVector(random(-1, 1), random(1, 3 + level/2));
    this.size = random(30, 50);
    this.rotation = PI; // Start pointing downward
    this.rotationSpeed = random(-0.03, 0.03);
    this.enemyType = floor(random(3)); // 0, 1, or 2 for different enemy types
    this.health = this.enemyType + 1; // Health based on enemy type
    this.thrusterAnimation = 0;
    this.shootCooldown = random(60, 120); // Frames between shots
    this.shootTimer = this.shootCooldown; // Initialize timer
  }
  
  update() {
    // Update position
    this.pos.add(this.vel);
    
    // Always point downward (PI rotation)
    this.rotation = PI;
    
    // Update thruster animation
    this.thrusterAnimation += 0.1;
    
    // Update shoot timer
    this.shootTimer--;
    
    // Shoot at player when timer reaches zero and enemy is on screen
    if (this.shootTimer <= 0 && this.pos.y > 0 && this.pos.y < height && gameState === 'play') {
      this.shoot();
      // Reset timer with some randomness
      this.shootTimer = this.shootCooldown * (0.8 + random(0.4));
    }
  }
  
  shoot() {
    // Calculate direction toward player
    let dir = createVector(player.pos.x - this.pos.x, player.pos.y - this.pos.y);
    dir.normalize();
    dir.mult(5); // Bullet speed
    
    // Create enemy bullet
    let enemyBullet = new Bullet(this.pos.x, this.pos.y, dir.x, dir.y);
    enemyBullet.color = color(255, 50, 50); // Red enemy bullets
    enemyBullet.isEnemyBullet = true; // Mark as enemy bullet
    
    // Make enemy bullets more visible and threatening
    enemyBullet.size = 10;
    
    bullets.push(enemyBullet);
    
    // Add muzzle flash effect
    for (let i = 0; i < 5; i++) {
      let p = new Particle(this.pos.x, this.pos.y);
      p.color = color(255, 100, 50);
      p.lifespan = 100;
      particles.push(p);
    }
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation);
    
    if (this.enemyType === 0) {
      // Scout ship - fast and small
      fill(150, 150, 200);
      stroke(100, 100, 255);
      strokeWeight(2);
      
      // Main body
      beginShape();
      vertex(-this.size/2, -this.size/4);
      vertex(0, -this.size/2);
      vertex(this.size/2, -this.size/4);
      vertex(this.size/2, this.size/4);
      vertex(0, this.size/2);
      vertex(-this.size/2, this.size/4);
      endShape(CLOSE);
      
      // Cockpit
      fill(200, 0, 0, 200);
      ellipse(0, 0, this.size/2, this.size/3);
      
      // Thrusters
      fill(255, 100 + sin(this.thrusterAnimation * 5) * 50, 0, 200);
      ellipse(-this.size/3, this.size/3, this.size/5, this.size/3);
      ellipse(this.size/3, this.size/3, this.size/5, this.size/3);
      
      // Wing details
      stroke(100, 100, 255);
      line(-this.size/2, 0, -this.size/3, 0);
      line(this.size/2, 0, this.size/3, 0);
    } 
    else if (this.enemyType === 1) {
      // Destroyer - medium ship with weapons
      fill(100, 100, 100);
      stroke(150, 150, 150);
      strokeWeight(2);
      
      // Main hull
      beginShape();
      vertex(0, -this.size/2);
      vertex(this.size/3, -this.size/4);
      vertex(this.size/2, this.size/4);
      vertex(0, this.size/2);
      vertex(-this.size/2, this.size/4);
      vertex(-this.size/3, -this.size/4);
      endShape(CLOSE);
      
      // Cockpit
      fill(50, 150, 200, 200);
      ellipse(0, -this.size/4, this.size/3, this.size/4);
      
      // Weapon pods
      fill(150, 50, 50);
      ellipse(-this.size/3, 0, this.size/4, this.size/6);
      ellipse(this.size/3, 0, this.size/4, this.size/6);
      
      // Thrusters
      fill(255, 150 + sin(this.thrusterAnimation * 5) * 50, 0, 200);
      rect(-this.size/4, this.size/3, this.size/6, this.size/6);
      rect(this.size/4 - this.size/6, this.size/3, this.size/6, this.size/6);
      
      // Detail lines
      stroke(200, 200, 200, 150);
      line(-this.size/4, -this.size/3, this.size/4, -this.size/3);
      line(-this.size/3, this.size/6, this.size/3, this.size/6);
    } 
    else {
      // Battleship - large and heavily armed
      fill(70, 70, 90);
      stroke(100, 100, 120);
      strokeWeight(2);
      
      // Main hull
      beginShape();
      vertex(0, -this.size/2);
      vertex(this.size/4, -this.size/3);
      vertex(this.size/2, 0);
      vertex(this.size/4, this.size/3);
      vertex(0, this.size/2);
      vertex(-this.size/4, this.size/3);
      vertex(-this.size/2, 0);
      vertex(-this.size/4, -this.size/3);
      endShape(CLOSE);
      
      // Command tower
      fill(50, 50, 70);
      rect(-this.size/6, -this.size/4, this.size/3, this.size/2);
      
      // Bridge windows
      fill(200, 200, 255, 200);
      rect(-this.size/8, -this.size/5, this.size/4, this.size/10);
      
      // Weapon turrets
      fill(100, 100, 120);
      ellipse(-this.size/3, -this.size/6, this.size/6, this.size/6);
      ellipse(this.size/3, -this.size/6, this.size/6, this.size/6);
      ellipse(-this.size/3, this.size/6, this.size/6, this.size/6);
      ellipse(this.size/3, this.size/6, this.size/6, this.size/6);
      
      // Thrusters
      fill(255, 100 + sin(this.thrusterAnimation * 5) * 50, 0, 200);
      rect(-this.size/3, this.size/3, this.size/6, this.size/8);
      rect(-this.size/8, this.size/3, this.size/4, this.size/8);
      rect(this.size/6, this.size/3, this.size/6, this.size/8);
    }
    
    pop();
  }
  
  offScreen() {
    return this.pos.y > height + this.size;
  }
  
  hits(player) {
    // Check if enemy hits player
    let d = dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y);
    return d < this.size/2 + player.size/2;
  }
  
  takeDamage() {
    this.health--;
    return this.health <= 0;
  }
}

// Star class for background
class Star {
  constructor() {
    this.reset();
    // Start stars at random positions
    this.pos.y = random(height);
    this.z = random(0.1, 3); // Z-depth for parallax effect
    
    // Add more variety to star colors
    this.colorType = floor(random(5));
    switch(this.colorType) {
      case 0: // Blue-white (hot stars)
        this.color = color(
          random(200, 255),
          random(220, 255),
          random(240, 255)
        );
        break;
      case 1: // Yellow (sun-like)
        this.color = color(
          random(240, 255),
          random(220, 255),
          random(180, 220)
        );
        break;
      case 2: // Orange-red (cooler stars)
        this.color = color(
          random(230, 255),
          random(150, 200),
          random(100, 150)
        );
        break;
      case 3: // Red dwarf
        this.color = color(
          random(200, 255),
          random(100, 150),
          random(80, 120)
        );
        break;
      case 4: // Bluish
        this.color = color(
          random(150, 200),
          random(180, 230),
          random(230, 255)
        );
        break;
    }
  }
  
  reset() {
    this.pos = createVector(random(width), -10);
    this.prevPos = createVector(this.pos.x, this.pos.y);
    this.z = random(0.1, 3); // Z-depth for parallax effect
    this.size = map(this.z, 0.1, 3, 1, 3); // Size based on depth
    this.speed = map(this.z, 0.1, 3, 0.2, 1.5); // Reduced speed based on depth
    this.brightness = map(this.z, 0.1, 3, 150, 255); // Brightness based on depth
    this.twinkleSpeed = random(0.01, 0.05);
    this.twinkleAmount = random(20, 50);
    this.twinkleOffset = random(TWO_PI);
    
    // Occasionally create a larger star
    if (random() > 0.97) {
      this.size *= random(2, 4);
      this.isBright = true;
    } else {
      this.isBright = false;
    }
  }
  
  update() {
    // Save previous position for trail
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;
    
    // Move stars down and slightly to the side to create a sense of movement
    this.pos.y += this.speed;
    
    // Add slight horizontal movement based on z-depth (reduced)
    if (frameCount % 60 < 30) {
      this.pos.x += sin(frameCount * 0.005) * 0.1 * this.z;
    } else {
      this.pos.x -= sin(frameCount * 0.005) * 0.1 * this.z;
    }
    
    // Reset stars that go off screen
    if (this.pos.y > height || this.pos.x < 0 || this.pos.x > width) {
      this.reset();
    }
  }
  
  show() {
    // Twinkle effect
    let twinkle = sin(frameCount * this.twinkleSpeed + this.twinkleOffset) * this.twinkleAmount;
    
    // Draw star with trail for faster stars
    if (this.z > 1.5) {
      // Draw trail
      stroke(red(this.color), green(this.color), blue(this.color), 100);
      strokeWeight(this.size * 0.7);
      line(this.prevPos.x, this.prevPos.y, this.pos.x, this.pos.y);
    }
    
    // Draw star
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.brightness + twinkle);
    
    // Larger stars get a glow effect
    if (this.z > 2 || this.isBright) {
      fill(red(this.color), green(this.color), blue(this.color), 50);
      ellipse(this.pos.x, this.pos.y, this.size * 3, this.size * 3);
      fill(red(this.color), green(this.color), blue(this.color), 100);
      ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
      
      // Add cross-shaped light rays for very bright stars
      if (this.isBright) {
        let rayLength = this.size * random(4, 8);
        stroke(red(this.color), green(this.color), blue(this.color), 100);
        strokeWeight(1);
        line(this.pos.x - rayLength, this.pos.y, this.pos.x + rayLength, this.pos.y);
        line(this.pos.x, this.pos.y - rayLength, this.pos.x, this.pos.y + rayLength);
      }
    }
    
    fill(red(this.color), green(this.color), blue(this.color), this.brightness + twinkle);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }
}

// Particle class for explosions
class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 5));
    this.acc = createVector(0, 0.05); // Slight gravity
    this.size = random(3, 8);
    this.initialSize = this.size;
    this.color = color(255, random(100, 255), 0, 255);
    this.lifespan = 255;
    this.decay = random(5, 10);
    this.sparkle = random() > 0.7; // Some particles sparkle
    this.rotation = random(TWO_PI);
    this.rotationSpeed = random(-0.2, 0.2);
    this.shape = floor(random(3)); // 0: circle, 1: square, 2: triangle
  }
  
  update() {
    // Add acceleration to velocity
    this.vel.add(this.acc);
    
    // Add velocity to position
    this.pos.add(this.vel);
    
    // Slow down over time
    this.vel.mult(0.98);
    
    // Update lifespan
    this.lifespan -= this.decay;
    
    // Update rotation
    this.rotation += this.rotationSpeed;
    
    // Shrink size as particle ages
    this.size = map(this.lifespan, 0, 255, 0, this.initialSize);
  }
  
  show() {
    if (this.lifespan > 0) {
      push();
      translate(this.pos.x, this.pos.y);
      rotate(this.rotation);
      
      // Set color with alpha based on lifespan
      this.color.setAlpha(this.lifespan);
      noStroke();
      
      // Sparkle effect
      if (this.sparkle && frameCount % 3 === 0) {
        fill(255, 255, 255, this.lifespan);
        this.size *= 1.5;
      } else {
        fill(this.color);
      }
      
      // Draw different shapes based on particle type
      if (this.shape === 0 || this.sparkle) {
        // Circle
        ellipse(0, 0, this.size, this.size);
      } else if (this.shape === 1) {
        // Square
        rectMode(CENTER);
        rect(0, 0, this.size, this.size);
      } else {
        // Triangle
        triangle(
          0, -this.size/2,
          -this.size/2, this.size/2,
          this.size/2, this.size/2
        );
      }
      
      // Add glow for some particles
      if (random() > 0.7) {
        fill(red(this.color), green(this.color), blue(this.color), this.lifespan * 0.3);
        ellipse(0, 0, this.size * 2, this.size * 2);
      }
      
      pop();
    }
  }
  
  isDead() {
    return this.lifespan <= 0;
  }
}

// Add Powerup class
class Powerup {
  constructor() {
    this.pos = createVector(random(width * 0.1, width * 0.9), -20);
    this.vel = createVector(random(-0.5, 0.5), random(1, 2));
    this.size = 20;
    this.rotation = 0;
    this.rotationSpeed = random(-0.05, 0.05);
    this.type = floor(random(3)); // 0: shield, 1: weapon upgrade, 2: extra life
    
    // Set color based on type
    if (this.type === 0) {
      this.color = color(0, 150, 255); // Blue for shield
    } else if (this.type === 1) {
      this.color = color(255, 200, 0); // Yellow for weapon
    } else {
      this.color = color(255, 50, 50); // Red for life
    }
    
    this.pulseAmount = 0;
    this.pulseSpeed = random(0.05, 0.1);
  }
  
  update() {
    this.pos.add(this.vel);
    this.rotation += this.rotationSpeed;
    this.pulseAmount = sin(frameCount * this.pulseSpeed) * 5;
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation);
    
    // Glow effect
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), 100);
    ellipse(0, 0, this.size * 1.5 + this.pulseAmount, this.size * 1.5 + this.pulseAmount);
    
    // Main powerup shape
    fill(this.color);
    stroke(255);
    strokeWeight(2);
    
    if (this.type === 0) {
      // Shield powerup (circle with shield symbol)
      ellipse(0, 0, this.size, this.size);
      noFill();
      arc(0, 0, this.size * 0.6, this.size * 0.6, PI * 0.25, PI * 1.75);
    } else if (this.type === 1) {
      // Weapon powerup (star shape)
      beginShape();
      for (let i = 0; i < 5; i++) {
        let angle = i * TWO_PI / 5 - PI / 2;
        let x1 = cos(angle) * (this.size/2);
        let y1 = sin(angle) * (this.size/2);
        vertex(x1, y1);
        
        angle += TWO_PI / 10;
        let x2 = cos(angle) * (this.size/4);
        let y2 = sin(angle) * (this.size/4);
        vertex(x2, y2);
      }
      endShape(CLOSE);
    } else {
      // Extra life powerup (heart shape)
      beginShape();
      vertex(0, this.size/4);
      bezierVertex(this.size/4, -this.size/4, this.size/2, 0, 0, this.size/2);
      bezierVertex(-this.size/2, 0, -this.size/4, -this.size/4, 0, this.size/4);
      endShape();
    }
    
    pop();
  }
  
  offScreen() {
    return this.pos.y > height + this.size;
  }
  
  hits(player) {
    let d = dist(this.pos.x, this.pos.y, player.pos.x, player.pos.y);
    return d < this.size/2 + player.size/2;
  }
  
  applyEffect(player) {
    if (this.type === 0) {
      // Shield powerup
      player.activateShield();
    } else if (this.type === 1) {
      // Weapon upgrade
      player.upgradeWeapon();
    } else {
      // Extra life
      lives = min(lives + 1, 5); // Maximum 5 lives
    }
  }
} 