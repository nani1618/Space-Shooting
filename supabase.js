// Supabase integration for Space Shooter Game
// This file handles the connection to Supabase and leaderboard functionality

// Initialize Supabase client
let supabase;

// Leaderboard data
let leaderboardData = [];
let isLeaderboardLoaded = false;
let playerName = '';
let isSubmittingScore = false;
let leaderboardVisible = false;

// Initialize Supabase connection
function initSupabase() {
  try {
    supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    console.log('Supabase initialized');
    
    // Load leaderboard data on initialization
    loadLeaderboard();
  } catch (error) {
    console.error('Error initializing Supabase:', error);
  }
}

// Load leaderboard data from Supabase
async function loadLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(CONFIG.LEADERBOARD_MAX_ENTRIES);
    
    if (error) throw error;
    
    leaderboardData = data;
    isLeaderboardLoaded = true;
    console.log('Leaderboard loaded:', leaderboardData);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

// Submit a new score to the leaderboard
async function submitScore(name, score, level) {
  if (!name || name.trim() === '') {
    console.error('Player name cannot be empty');
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([
        { 
          player_name: name.trim(),
          score: score,
          level: level,
          created_at: new Date()
        }
      ]);
    
    if (error) throw error;
    
    console.log('Score submitted successfully');
    
    // Reload the leaderboard to include the new score
    await loadLeaderboard();
    return true;
  } catch (error) {
    console.error('Error submitting score:', error);
    return false;
  }
}

// Display the leaderboard on screen
function displayLeaderboard() {
  if (!isLeaderboardLoaded) {
    push();
    fill(255);
    textAlign(CENTER);
    textSize(24);
    text('Loading leaderboard...', width/2, height/2);
    pop();
    return;
  }
  
  // Background for leaderboard
  push();
  fill(0, 0, 0, 200);
  rect(width/2 - 200, height/2 - 250, 400, 500, 10);
  
  // Title
  fill(255, 255, 100);
  textAlign(CENTER);
  textSize(32);
  text('HIGH SCORES', width/2, height/2 - 200);
  
  // Headers
  fill(150, 150, 255);
  textSize(18);
  textAlign(LEFT);
  text('RANK', width/2 - 170, height/2 - 150);
  text('NAME', width/2 - 120, height/2 - 150);
  text('SCORE', width/2 + 50, height/2 - 150);
  text('LEVEL', width/2 + 140, height/2 - 150);
  
  // Draw line under headers
  stroke(150, 150, 255, 100);
  line(width/2 - 170, height/2 - 140, width/2 + 170, height/2 - 140);
  noStroke();
  
  // List entries
  for (let i = 0; i < leaderboardData.length; i++) {
    const entry = leaderboardData[i];
    const y = height/2 - 110 + i * 40;
    
    // Highlight current player's score
    if (entry.player_name === playerName) {
      fill(50, 100, 150, 100);
      rect(width/2 - 180, y - 15, 360, 30, 5);
    }
    
    // Rank
    fill(255);
    textAlign(LEFT);
    text(`${i + 1}`, width/2 - 170, y);
    
    // Name (truncate if too long)
    let displayName = entry.player_name;
    if (displayName.length > 15) {
      displayName = displayName.substring(0, 12) + '...';
    }
    text(displayName, width/2 - 120, y);
    
    // Score
    textAlign(RIGHT);
    text(entry.score, width/2 + 100, y);
    
    // Level
    text(entry.level, width/2 + 170, y);
  }
  
  // Back button
  fill(100, 100, 200);
  rect(width/2 - 80, height/2 + 200, 160, 40, 10);
  fill(255);
  textAlign(CENTER, CENTER);
  text('BACK TO GAME', width/2, height/2 + 220);
  
  pop();
}

// Handle name input for score submission
function displayNameInput() {
  push();
  // Background
  fill(0, 0, 0, 200);
  rect(width/2 - 200, height/2 - 100, 400, 200, 10);
  
  // Title
  fill(255);
  textAlign(CENTER);
  textSize(24);
  text('ENTER YOUR NAME', width/2, height/2 - 60);
  
  // Input box
  fill(50, 50, 70);
  rect(width/2 - 150, height/2 - 30, 300, 40, 5);
  
  // Input text
  fill(255);
  textAlign(LEFT);
  textSize(20);
  text(playerName + (frameCount % 60 < 30 ? '|' : ''), width/2 - 140, height/2 - 5);
  
  // Submit button
  if (playerName.trim().length > 0) {
    fill(100, 200, 100);
  } else {
    fill(100, 100, 100);
  }
  rect(width/2 - 80, height/2 + 30, 160, 40, 10);
  fill(255);
  textAlign(CENTER, CENTER);
  text('SUBMIT', width/2, height/2 + 50);
  
  pop();
}

// Check if mouse is over a button
function isMouseOverButton(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}

// Handle key typing for name input
function handleKeyTyping() {
  // Only process if we're in name input mode
  if (gameState !== 'nameInput') return;
  
  if (keyCode === BACKSPACE) {
    playerName = playerName.slice(0, -1);
    return;
  }
  
  if (keyCode === ENTER) {
    submitPlayerScore();
    return;
  }
  
  // Only allow letters, numbers, and some special characters
  if ((key >= 'a' && key <= 'z') || 
      (key >= 'A' && key <= 'Z') || 
      (key >= '0' && key <= '9') ||
      key === ' ' || key === '_' || key === '-') {
    
    // Limit name length
    if (playerName.length < 20) {
      playerName += key;
    }
  }
}

// Submit the player's score
function submitPlayerScore() {
  if (playerName.trim().length > 0) {
    submitScore(playerName, score, level).then(success => {
      if (success) {
        gameState = 'leaderboard';
      }
    });
  }
}

// Handle mouse clicks for leaderboard and name input
function handleLeaderboardClicks() {
  // Back button in leaderboard
  if (gameState === 'leaderboard' && 
      isMouseOverButton(width/2 - 80, height/2 + 200, 160, 40)) {
    gameState = 'start';
    return true;
  }
  
  // Submit button in name input
  if (gameState === 'nameInput' && 
      isMouseOverButton(width/2 - 80, height/2 + 30, 160, 40) &&
      playerName.trim().length > 0) {
    submitPlayerScore();
    return true;
  }
  
  return false;
}

// Toggle leaderboard visibility
function toggleLeaderboard() {
  leaderboardVisible = !leaderboardVisible;
  if (leaderboardVisible) {
    loadLeaderboard(); // Refresh data when showing
  }
} 