// Import statements first
import './style.css';
import Phaser from 'phaser';
import Beach from './Beach.js';
import Player, { CHARACTER_SPRITES } from './object/Player.js';
import HouseScene from './scenes/HouseScene.js';
import TutorialScene from './scenes/TutorialScene.js';
import PreloadScene from './preload.js';

// ===================== GLOBAL VARIABLES & SETUP =====================
let playerName = "Ucup"; // Default player name changed to "Ucup"
let selectedCharacter = "ucup"; // Default character
let isNameInputActive = true; // Default to true since name input starts active
let isLoadingHouse = false;
let isLoadingBeach = false; // New flag for beach transition
let isTransitioning = false; // New flag to disable movement during transitions
let game; // Define game variable outside so we can access it later
let lastPlayerPos = { x: 100, y: 100 };
let lastHousePos = { x: 300, y: 200 }; // Center of house, away from exit door
let lastBeachPos = { x: 480, y: 450 }; // Default beach position
let minimapVisible = true; // Add tracking variable for minimap visibility
let isSettingsMenuOpen = false; // Track if settings menu is open
let timeMultiplier = 1; // Time multiplier for developer tools
let showDevTools = false; // Track if dev tools are visible
let currentGameDay = 1; // Track current game day globally
let completedChores = {}; // Global track of completed chores

// Global player stats object to maintain consistency across scenes
let playerStats = {
  hunger: 50,
  energy: 50,
  hygiene: 50,
  happiness: 50,
  money: 100
};

// Make global variables available to window
if (typeof window !== 'undefined') {
  window.completedChores = completedChores;
  window.playerStats = playerStats;
}

// Game constants
const GAME_SIZE = {
  width: 960,
  height: 540
};
const WORLD_SIZE = {
  width: 1600,
  height: 1600
};
const SPEED_DOWN = 150;
const PLAYER_SPEED = SPEED_DOWN + 50;

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', function() {
  // DOM element references
  const gameStartBtn = document.getElementById("gameStartBtn");
  const gameStartDiv = document.getElementById("gameStartDiv");
  const gameCanvas = document.getElementById("gameCanvas");
  const characterSelect = document.getElementById("characterSelect");
  const characterCards = document.querySelectorAll(".character-card");
  
  // Set default value for player name input
  const playerNameInput = document.getElementById('playerName');
  playerNameInput.value = "Ucup";

  // Extract and set front-facing sprites for character selection
  Player.extractFrontSprite('/assets/Player/Player.png', (frontSprite) => {
    characterCards.forEach(card => {
      const img = card.querySelector('.character-img');
      img.src = frontSprite.src;
    });
  });

  // ===================== NAME INPUT HANDLERS =====================
  document.getElementById('playerName').addEventListener('focus', () => {
    isNameInputActive = true;
  });

  document.getElementById('playerName').addEventListener('blur', () => {
    isNameInputActive = false;
  });

  // ===================== MINIMAP TOGGLE HANDLER =====================
  // Add global document-level event listener for M key
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'm') {
      // Only toggle minimap if name input is not active
      if (!isNameInputActive && game && game.scene.scenes) {
        // Find the active GameScene instance
        const gameScene = game.scene.scenes.find(scene => scene.scene.key === 'scene-game' && scene.scene.isActive());
        if (gameScene) {
          // Toggle minimap visibility
          minimapVisible = !minimapVisible;
          
          if (gameScene.minimapCamera) {
            gameScene.minimapCamera.visible = minimapVisible;
          }
          
          if (gameScene.minimapBorder) {
            gameScene.minimapBorder.visible = minimapVisible;
          }
          
          if (gameScene.minimapText) {
            gameScene.minimapText.visible = minimapVisible;
          }
        }
      }
    }
    
    // Tutorial toggle with H key
    if (event.key.toLowerCase() === 'h') {
      // Only toggle tutorial if name input is not active and game has started
      if (!isNameInputActive && game && game.scene.scenes) {
        // Find the tutorial scene
        const tutorialScene = game.scene.scenes.find(scene => scene.scene.key === 'scene-tutorial');
        
        if (tutorialScene) {
          // Make sure the tutorial scene is started if it's the first time
          if (!tutorialScene.scene.isActive()) {
            tutorialScene.scene.start();
            tutorialScene.scene.bringToTop();
          } else {
            tutorialScene.scene.bringToTop();
          }
          
          // Simply ensure the scene is started and on top
          // The scene itself will handle toggling visibility
        }
      }
    }
    
    // Settings menu handler (ESC key)
    if (event.key === 'Escape') {
      // Only toggle settings if name input is not active and game has started
      if (!isNameInputActive && game && game.scene.scenes) {
        // Find the active game scene
        const activeScene = game.scene.scenes.find(scene => (scene.scene.key === 'scene-game' || scene.scene.key === 'scene-house') && scene.scene.isActive());
        
        if (activeScene) {
          // Toggle settings menu
          isSettingsMenuOpen = !isSettingsMenuOpen;
          
          if (isSettingsMenuOpen) {
            // Pause the game and show settings
            activeScene.scene.pause();
            showSettingsMenu(activeScene);
          } else {
            // Resume the game and hide settings
            hideSettingsMenu();
            activeScene.scene.resume();
          }
        }
      }
    }
    
    // Developer tools toggle with backtick key
    if (event.key === '`') {
      // Toggle developer tools
      showDevTools = !showDevTools;
      updateDevToolsDisplay();
    }
    
    // Only handle dev tool keys if dev tools are active
    if (showDevTools && !isNameInputActive) {
      // Speed up time with = key
      if (event.key === '=' || event.key === '+') {
        timeMultiplier = Math.min(timeMultiplier + 1, 10);
        updateDevToolsDisplay();
      }
      
      // Slow down time with - key
      if (event.key === '-' || event.key === '_') {
        timeMultiplier = Math.max(timeMultiplier - 1, 1);
        updateDevToolsDisplay();
      }
      
      // Reset time multiplier with 0 key
      if (event.key === '0') {
        timeMultiplier = 1;
        updateDevToolsDisplay();
      }
    }
  });

  // Create settings menu elements (initially hidden)
  createSettingsMenu();

  // ===================== CHARACTER SELECTION HANDLER =====================
  // Handle character card selection
  characterCards.forEach(card => {
    const character = card.getAttribute('data-character');
    
    // Mark the default character as selected
    if (character === selectedCharacter) {
      card.classList.add('selected');
      document.getElementById(`${character}-choice`).checked = true;
    }
    
    card.addEventListener('click', () => {
      // Update selection visually
      characterCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      // Update the radio button
      document.getElementById(`${character}-choice`).checked = true;
      
      // Update the hidden select element to maintain compatibility
      characterSelect.value = character;
      
      // Update the global variable
      selectedCharacter = character;
      console.log(`Character selected: ${selectedCharacter}`);
    });
  });

  // Keep the hidden select in sync (for backwards compatibility)
  characterSelect.addEventListener("change", () => {
    selectedCharacter = characterSelect.value;
    console.log(`Character selected via dropdown: ${selectedCharacter}`);
    
    // Update the visual selection
    characterCards.forEach(card => {
      const cardCharacter = card.getAttribute('data-character');
      if (cardCharacter === selectedCharacter) {
        card.classList.add('selected');
        document.getElementById(`${cardCharacter}-choice`).checked = true;
      } else {
        card.classList.remove('selected');
      }
    });
  });

  gameStartBtn.addEventListener("click", () => {
    const inputName = document.getElementById('playerName').value.trim();

    if (!inputName) {
      // Use default name "Ucup" instead of showing alert
      playerName = "Ucup";
      console.log(`Using default player name: ${playerName}`);
    } else {
      playerName = inputName;
      console.log(`Player's name: ${playerName}`);
    }
    
    console.log(`Selected character: ${selectedCharacter}`);
    gameStartDiv.style.display = "none";
    
    // Delay to ensure UI updates before resuming game
    setTimeout(() => {
      isNameInputActive = false;
      console.log("isNameInputActive set to false");
      game.scene.resume("scene-game");
    }, 100);
  });

  // ===================== RESTART BUTTON HANDLER =====================
  document.getElementById("restartGameBtn").addEventListener("click", () => {
    location.reload();
  });

  // ===================== GAME INITIALIZATION =====================
  const config = {
    type: Phaser.WEBGL,
    width: GAME_SIZE.width,
    height: GAME_SIZE.height,
    canvas: gameCanvas,
    pixelArt: true, // Enable pixel art mode
    roundPixels: true, // Prevent subpixel rendering
    antialias: false, // Disable antialiasing for sharp pixels
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: SPEED_DOWN },
        debug: true,
        fps: 60,
        tileBias: 32
      }
    },
    scene: [PreloadScene, GameScene, HouseScene, Beach, TutorialScene]
  };

  // Initialize the game
  game = new Phaser.Game(config);
});

// ===================== GAME SCENE CLASS =====================
class GameScene extends Phaser.Scene {
  constructor() {
    super("scene-game");
    
    // Player properties
    this.player = null;
    this.playerSpeed = PLAYER_SPEED;
    
    // Input controls
    this.cursor = null;
    
    // Game state
    this.isGameOver = false;
    
    // Game time
    this.initializeGameTime();
    
    // Audio
    this.coinMusic = null;
    this.bgMusic = null;
    
    // Effects
    this.emitter = null;
    
    // UI elements
    this.greetingLabel = null;
    this.timeLabel = null;
    this.moneyText = null;
    this.progressBars = null;
  }
  
  // Add init method to receive data from HouseScene
  init(data) {
    console.log("GameScene init called with data:", data);
    
    if (data && data.lastHousePos) {
      lastHousePos = data.lastHousePos;
      console.log("Updated lastHousePos:", lastHousePos);
    }
    
    // Always load stats from global playerStats
    this.syncStatsFromGlobal();
  }

  // New method to sync stats from global object
  syncStatsFromGlobal() {
    this.hunger = playerStats.hunger;
    this.energy = playerStats.energy;
    this.hygiene = playerStats.hygiene;
    this.happiness = playerStats.happiness;
    this.money = playerStats.money;
    console.log("Synced stats from global - Energy:", this.energy, "Money:", this.money);
  }

  // New method to update global stats
  updateGlobalStats() {
    playerStats.hunger = this.hunger;
    playerStats.energy = this.energy;
    playerStats.hygiene = this.hygiene;
    playerStats.happiness = this.happiness;
    playerStats.money = this.money;
    console.log("Updated global stats - Energy:", playerStats.energy, "Money:", playerStats.money);
  }

  initializeGameTime() {
    // Set game time to 8:00 AM (8 hours = 480 minutes)
    this.gameTimeMinutes = 480;
    this.gameDay = 1;
    this.weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    // Keep using current day of week for convenience
    const now = new Date();
    this.currentWeekDay = this.weekDays[now.getDay()];
    this.greetingText = "";
  }

  preload() {
    // Assets are now loaded in PreloadScene
    // Set world bounds
    this.physics.world.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
  }

  create() {
    console.log("Game scene create called");
    
    // Reset transition flag when game scene is created
    isTransitioning = false;
    isLoadingHouse = false;
    
    // Only pause if this is the initial game load
    if (isNameInputActive) {
      this.scene.pause("scene-game");
    }
    
    // Start the tutorial scene but keep it hidden
    if (!this.scene.isActive('scene-tutorial')) {
      this.scene.launch('scene-tutorial');
    }
    
    // Make sure any existing transition overlays are removed
    this.children.each(child => {
      if (child.depth >= 1000) {
        child.destroy();
      }
    });
    
    // Create UI container first (but add elements later)
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setScrollFactor(0);
    this.uiContainer.setDepth(100);
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Setup audio
    this.setupAudio();
    
    // Create environment (without decorations yet)
    this.createEnvironment();
    
    // Create player and animations
    this.createPlayer();
    
    // Add world decorations (after player exists)
    this.createWorldDecorations();
    
    // Create house
    this.createHouse();

    // Setup camera and minimap
    this.setupCamera();
    
    // Now add UI elements to the container we created earlier
    this.populateUI();
    
    // Setup input controls
    this.setupControls();
    
    // Setup game timers
    this.setupTimers();
    
    // Create particle emitter
    this.createEmitter();
  }

  setupEventListeners() {
    document.getElementById('playerName').addEventListener('focus', () => {
      isNameInputActive = true;
      console.log("Input name active");
    });

    document.getElementById('playerName').addEventListener('blur', () => {
      isNameInputActive = false;
      console.log("Input name inactive");
    });
  }
  
  setupAudio() {
    // Sound effects
    this.coinMusic = this.sound.add("coin");
    
    // Background music - only play if not already playing
    if (!this.bgMusic || !this.bgMusic.isPlaying) {
      try {
        // Stop any existing background music first
        if (this.bgMusic) {
          this.bgMusic.stop();
        }
        
        this.bgMusic = this.sound.add("bgMusic", {
          loop: true,
          volume: 0.5
        });
        this.bgMusic.play();
      } catch (error) {
        console.error("Error playing background music:", error);
      }
    }
  }
  
  createEnvironment() {
    // Create a much larger world
    this.physics.world.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    
    // Add background - repeat it to fill the world
    let bgTile = this.add.tileSprite(0, 0, WORLD_SIZE.width, WORLD_SIZE.height, "bg2");
    bgTile.setOrigin(0, 0);
    bgTile.setDepth(0);
  }
  
  createWorldDecorations() {
    // Store additional houses for collision
    this.additionalHouses = [];
    
    // Add a few more houses in different locations - removed scaling
    let house2 = this.physics.add.sprite(800, 800, "house");
    // Remove scale and adjust collision box directly
    house2.setImmovable(true);
    house2.body.allowGravity = false;
    this.additionalHouses.push(house2);
    
    let house3 = this.physics.add.sprite(400, 1200, "house");
    // Remove scale and adjust collision box directly
    house3.setImmovable(true);
    house3.body.allowGravity = false;
    this.additionalHouses.push(house3);
    
    // Configure hitboxes with absolute sizes instead of relative to scale
    this.additionalHouses.forEach(house => {
      house.body.setSize(
        house.width * 0.7, 
        house.height * 0.4
      );
      house.body.setOffset(
        house.width * 0.15,
        house.height * 0.4
      );
    });
    
    // Create beach entrance area
    this.createBeachEntrance();
  }
  
  createBeachEntrance() {
    // Create a beach entrance area
    const beachEntrancePos = { x: 600, y: 400 };
    this.beachEntrance = this.physics.add.sprite(beachEntrancePos.x, beachEntrancePos.y, 'player');
    // Instead of scaling by 3, set width and height directly
    this.beachEntrance.displayWidth = this.beachEntrance.width * 3;
    this.beachEntrance.displayHeight = this.beachEntrance.height * 3;
    this.beachEntrance.setTint(0xf7e26b); // Sand color
    this.beachEntrance.setAlpha(0.7);
    this.beachEntrance.setImmovable(true);
    this.beachEntrance.body.allowGravity = false;
    
    // Add beach sign
    const beachSign = this.add.text(
      beachEntrancePos.x, beachEntrancePos.y - 30, 
      "→ BEACH →", 
      { font: "bold 16px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 3 }
    );
    beachSign.setOrigin(0.5, 0.5);
    
    // Add interaction with beach entrance
    this.physics.add.overlap(
      this.player, 
      this.beachEntrance, 
      this.enterBeach, 
      this.canEnterBeach, 
      this
    );
  }
  
  createHouse() {
    // Create a physics-enabled house sprite
    this.house = this.physics.add.sprite(250, 250, "house");
    this.house.setOrigin(0.5, 0.5);
    // Instead of scaling by 2, set width and height directly
    this.house.displayWidth = this.house.width * 2;
    this.house.displayHeight = this.house.height * 2;
    this.house.setDepth(1);
    this.house.setImmovable(true);
    this.house.body.allowGravity = false;
    
    // Create a collision box adjusted for the new size
    this.house.body.setSize(
      this.house.width * 0.7, 
      this.house.height * 0.4
    );
    this.house.body.setOffset(
      this.house.width * 0.15,
      this.house.height * 0.4
    );
    
    // Add overlap (instead of collision) for house entry
    this.physics.add.overlap(
      this.player, 
      this.house, 
      this.enterHouse, 
      this.canEnterHouse, 
      this
    );
  }

  populateUI() {
    // Create greeting and time labels
    this.greetingLabel = this.add.text(10, 10, "", { font: "20px Arial", fill: "#ffffff" });
    this.timeLabel = this.add.text(10, 40, "", { font: "18px Arial", fill: "#ffffff" });
    this.moneyText = this.add.text(GAME_SIZE.width - 150, 10, `Money: $${this.money}`, { font: "20px Arial", fill: "#ffffff" });
    
    // Add labels to UI container
    this.uiContainer.add([this.greetingLabel, this.timeLabel, this.moneyText]);
    
    // Update game time
    this.updateGameTime();
    
    // Create progress bars and labels
    this.createProgressBars();
    
    // Make sure UI displays current values
    this.updateUI();
  }
  
  createProgressBars() {
    // Graphics for progress bars
    this.progressBars = {
      hunger: this.add.graphics(),
      energy: this.add.graphics(),
      hygiene: this.add.graphics(),
      happiness: this.add.graphics(),
    };
    
    // Set high depth for all progress bars
    Object.values(this.progressBars).forEach(bar => {
      bar.setDepth(100);
    });
    
    // Labels
    const hungerLabel = this.add.text(GAME_SIZE.width - 220, 48, "Hunger:", { font: "14px Arial", fill: "#ffffff" });
    const energyLabel = this.add.text(GAME_SIZE.width - 220, 68, "Energy:", { font: "14px Arial", fill: "#ffffff" });
    const hygieneLabel = this.add.text(GAME_SIZE.width - 220, 88, "Hygiene:", { font: "14px Arial", fill: "#ffffff" });
    const happinessLabel = this.add.text(GAME_SIZE.width - 220, 108, "Happiness:", { font: "14px Arial", fill: "#ffffff" });
    
    // Add to UI container so they stay fixed to the camera
    this.uiContainer.add([hungerLabel, energyLabel, hygieneLabel, happinessLabel]);
    this.uiContainer.add(Object.values(this.progressBars));
    
    // Draw initial progress bars
    this.drawProgressBars();
  }
  
  createPlayer() {
    // Create player using the new Player class
    this.player = new Player(this, lastPlayerPos.x, lastPlayerPos.y, selectedCharacter);
    
    // Configure any additional scene-specific settings
    this.player.playerSpeed = PLAYER_SPEED;
  }
  
  setupCamera() {
    // Main camera - follows player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    this.cameras.main.setZoom(1);
    
    // Add minimap camera in the corner
    this.createMinimap();
  }
  
  createMinimap() {
    // Create a minimap in the bottom-right corner
    const minimapWidth = 150;
    const minimapHeight = 150;
    const minimapX = GAME_SIZE.width - minimapWidth - 10;
    const minimapY = GAME_SIZE.height - minimapHeight - 10;
    
    // Create minimap camera
    this.minimapCamera = this.cameras.add(
      minimapX, minimapY, minimapWidth, minimapHeight
    );
    
    // Configure minimap
    this.minimapCamera.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    this.minimapCamera.setZoom(0.1); // Zoom out to see more of the world
    this.minimapCamera.setBackgroundColor('rgba(0, 0, 0, 0.5)');
    this.minimapCamera.startFollow(this.player);
    
    // Ignore UI layer in minimap (only if it exists)
    if (this.uiContainer) {
      this.minimapCamera.ignore(this.uiContainer);
    }
    
    // Create border around minimap
    this.minimapBorder = this.add.graphics();
    this.minimapBorder.lineStyle(2, 0xffffff, 1);
    this.minimapBorder.strokeRect(minimapX, minimapY, minimapWidth, minimapHeight);
    this.minimapBorder.setScrollFactor(0);
    this.minimapBorder.setDepth(90); // Below UI but above other elements
    
    // Add text instruction for minimap toggle
    this.minimapText = this.add.text(
      minimapX + 5, 
      minimapY + minimapHeight - 20, 
      "Press M to toggle", 
      { font: "10px Arial", fill: "#ffffff" }
    );
    this.minimapText.setScrollFactor(0);
    this.minimapText.setDepth(91);
  }
  
  setupControls() {
    // No need to create cursor keys here as Player class handles its own input
  }
  
  setupTimers() {
    // Game time update timer (every 100ms = 10 game minutes)
    this.gameTimeEvent = this.time.addEvent({
      delay: 100,
      callback: this.updateGameTime,
      callbackScope: this,
      loop: true
    });
    
    // Stats update timer (every 5 seconds)
    this.statsUpdateEvent = this.time.addEvent({
      delay: 5000,
      callback: this.updateStats,
      callbackScope: this,
      loop: true
    });
    
    // Game over check timer
    this.timeEvent = this.time.delayedCall(30000, () => {
      if (this.hunger === 0 || this.energy === 0 || this.hygiene === 0 || this.happiness === 0) {
        this.gameOver();
      }
    }, [], this);
  }
  
  createEmitter() {
    // Check if 'money' texture exists, if not, use a generic particle
    const particleKey = this.textures.exists('money') ? 'money' : 'player';
    
    this.emitter = this.add.particles(0, 0, particleKey, {
      speed: 100,
      gravityY: SPEED_DOWN - 200,
      scale: 0.04,
      duration: 100,
      emitting: false
    });
    
    this.emitter.startFollow(this.player, this.player.width / 2, this.player.height / 2, true);
  }

  updateGameTime() {
    // Apply time multiplier to make time pass faster or slower
    this.gameTimeMinutes += timeMultiplier;
  
    // Check for day rollover (24 hours passed)
    if (this.gameTimeMinutes >= 1440) {
      this.gameTimeMinutes = 0;
      this.gameDay++;
      let nextDayIndex = (this.weekDays.indexOf(this.currentWeekDay) + 1) % 7;
      this.currentWeekDay = this.weekDays[nextDayIndex];
      
      // Day has changed - update global day tracker and reset chores
      if (currentGameDay !== this.gameDay) {
        currentGameDay = this.gameDay;
        // Reset all completed chores when day changes
        completedChores = {};
        // Also update the window reference if it exists
        if (typeof window !== 'undefined') {
          window.completedChores = completedChores;
        }
        console.log("New day started. All housework has been reset.");
      }
    }
  
    // Calculate hours and minutes
    let hours = Math.floor(this.gameTimeMinutes / 60);
    let minutes = this.gameTimeMinutes % 60;
    let timeText = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  
    // Update greeting based on time of day
    if (hours >= 5 && hours < 12) {
      this.greetingText = `Good Morning ${playerName}`;
    } else if (hours >= 12 && hours < 18) {
      this.greetingText = `Good Afternoon ${playerName}`;
    } else if (hours >= 18 && hours < 22) {
      this.greetingText = `Good Evening ${playerName}`;
    } else {
      this.greetingText = `Good Night ${playerName}`;
    }
  
    // Update text labels if they exist
    if (this.greetingLabel && this.timeLabel) {
      this.greetingLabel.setText(this.greetingText);
      this.timeLabel.setText(`${this.currentWeekDay} | Day ${this.gameDay} | ${timeText}${showDevTools ? ` (${timeMultiplier}x)` : ''}`);
    }
  }  

  updateStats() {
    // Decrease stats over time
    this.hunger = Math.max(0, this.hunger - 2);
    this.energy = Math.max(0, this.energy - 1);
    this.hygiene = Math.max(0, this.hygiene - 3);
    this.happiness = Math.max(0, this.happiness - 1);

    // Update UI if elements exist
    if (this.moneyText) {
      this.moneyText.setText(`Money: $${this.money}`);
    }
    
    // Update progress bars if they exist
    if (this.progressBars) {
      this.drawProgressBars();
    }

    // Update global stats after local stats change
    this.updateGlobalStats();

    // Check for game over condition
    if (this.hunger === 0 || this.energy === 0 || this.hygiene === 0 || this.happiness === 0) {
      this.gameOver();
    }
  }
  
  drawProgressBars() {
    // Safety check - make sure progress bars exist
    if (!this.progressBars) return;
    
    // Clear previous bars
    Object.values(this.progressBars).forEach(bar => bar.clear());
  
    // Colors for bars: red, yellow, green, blue
    const colors = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff];
    const stats = [this.hunger, this.energy, this.hygiene, this.happiness];
    const bars = ["hunger", "energy", "hygiene", "happiness"];
    
    // Draw each bar
    for (let i = 0; i < bars.length; i++) {
      if (this.progressBars[bars[i]]) {
        this.progressBars[bars[i]].fillStyle(colors[i], 1);
        this.progressBars[bars[i]].fillRect(GAME_SIZE.width - 140, 50 + i * 20, stats[i], 10);
      }
    }
  }  

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    
    // Pause game scene
    this.scene.pause();

    // Show game over UI
    document.getElementById("gameEndDiv").style.display = "flex";
    document.getElementById("gameWinLoseSpan").innerText = "Lost";
    document.getElementById("gameEndScoreSpan").innerText = this.money;
    document.getElementById("restartGameBtn").style.display = "block";
  }

  update() {
    // Skip movement if name input is active or during transitions
    if (isNameInputActive || isTransitioning) {
      return;
    }

    // Update timer delays based on time multiplier
    if (this.gameTimeEvent && this.gameTimeEvent.delay !== 100 / timeMultiplier) {
      this.gameTimeEvent.reset({
        delay: 100 / timeMultiplier,
        callback: this.updateGameTime,
        callbackScope: this,
        loop: true
      });
    }
    
    // Update stats timer based on time multiplier
    if (this.statsUpdateEvent && this.statsUpdateEvent.delay !== 5000 / timeMultiplier) {
      this.statsUpdateEvent.reset({
        delay: 5000 / timeMultiplier,
        callback: this.updateStats,
        callbackScope: this,
        loop: true
      });
    }

    // Update player if it exists
    if (this.player) {
      this.player.update();
    }
  }

  // Add this function to GameScene to handle house entry
  canEnterHouse() {
    // Check if player is near the door - add extra conditions if needed
    return !isLoadingHouse;
  }

  // Update enterHouse method to pass player stats to house scene
  enterHouse() {
    if (isLoadingHouse || isTransitioning) return;
    
    // Store current player position before entering house
    lastPlayerPos = { 
      x: this.player.x, 
      y: this.player.y + 50 // Add offset to prevent player from getting stuck in house collision
    };
    
    // Update global stats before scene change
    this.updateGlobalStats();
    
    // Set transition flags to prevent movement and multiple triggers
    isLoadingHouse = true;
    isTransitioning = true;
    
    // Stop player movement
    this.player.stopMovement();
    
    // Create a loading screen overlay
    const loadingScreen = this.add.rectangle(
      0, 0, 
      GAME_SIZE.width, GAME_SIZE.height, 
      0x000000, 0.8
    );
    loadingScreen.setOrigin(0, 0);
    loadingScreen.setScrollFactor(0);
    loadingScreen.setDepth(1000);
    
    const loadingText = this.add.text(
      GAME_SIZE.width/2, GAME_SIZE.height/2, 
      "Entering house...", 
      { font: "24px Arial", fill: "#ffffff" }
    );
    loadingText.setOrigin(0.5);
    loadingText.setScrollFactor(0);
    loadingText.setDepth(1001);
    
    // Wait a moment before transitioning to house scene
    this.time.delayedCall(1500, () => {
      isLoadingHouse = false;
      // Keep isTransitioning true until the house scene has fully loaded
      this.scene.start("scene-house", {
        isTransitioning: isTransitioning,
        lastHousePos: lastHousePos,
        playerName: playerName,
        selectedCharacter: selectedCharacter,
        PLAYER_SPEED: PLAYER_SPEED,
        GAME_SIZE: GAME_SIZE
      });
    });
  }

  // Update enterBeach method
  enterBeach() {
    if (isLoadingBeach || isTransitioning) return;
    
    // Store current player position before entering beach
    lastPlayerPos = { 
      x: this.player.x, 
      y: this.player.y
    };
    
    // Update global stats before scene change
    this.updateGlobalStats();
    
    // Set transition flags
    isLoadingBeach = true;
    isTransitioning = true;
    
    // Stop player movement
    this.player.stopMovement();
    
    // Create a loading screen overlay
    const loadingScreen = this.add.rectangle(
      0, 0, 
      GAME_SIZE.width, GAME_SIZE.height, 
      0x000000, 0.8
    );
    loadingScreen.setOrigin(0, 0);
    loadingScreen.setScrollFactor(0);
    loadingScreen.setDepth(1000);
    
    const loadingText = this.add.text(
      GAME_SIZE.width/2, GAME_SIZE.height/2, 
      "Going to the beach...", 
      { font: "24px Arial", fill: "#ffffff" }
    );
    loadingText.setOrigin(0.5);
    loadingText.setScrollFactor(0);
    loadingText.setDepth(1001);
    
    // Wait a moment before transitioning to beach scene
    this.time.delayedCall(1500, () => {
      isLoadingBeach = false;
      // Keep isTransitioning true until the beach scene has fully loaded
      this.scene.start("scene-beach");
    });
  }

  canEnterBeach() {
    // Only allow entry if not already loading and not in transition
    return !isLoadingBeach && !isTransitioning;
  }

  // Add a helper method to update all UI elements
  updateUI() {
    // Update money text
    if (this.moneyText) {
      this.moneyText.setText(`Money: $${this.money}`);
    }
    
    // Update progress bars
    if (this.progressBars) {
      this.drawProgressBars();
    }
  }
}

// Add a global safety timer function at the top level
function addSafetyResetTimer() {
  // If transition takes too long, force a reset
  console.log("Safety timer started");
  setTimeout(() => {
    if (isTransitioning) {
      console.log("Safety timeout triggered - resetting game state");
      isTransitioning = false;
      isLoadingHouse = false;
      if (game && game.scene) {
        try {
          game.scene.start('scene-game');
        } catch (error) {
          console.error("Error resetting game:", error);
          location.reload(); // Last resort - reload the page
        }
      }
    }
  }, 5000); // 5 seconds timeout
}

// Create settings menu elements
function createSettingsMenu() {
  // Create settings menu container
  const settingsMenu = document.createElement('div');
  settingsMenu.id = 'settingsMenu';
  settingsMenu.style.position = 'absolute';
  settingsMenu.style.top = '50%';
  settingsMenu.style.left = '50%';
  settingsMenu.style.transform = 'translate(-50%, -50%)';
  settingsMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  settingsMenu.style.padding = '20px';
  settingsMenu.style.borderRadius = '10px';
  settingsMenu.style.color = '#ffffff';
  settingsMenu.style.display = 'none';
  settingsMenu.style.zIndex = '1000';
  settingsMenu.style.width = '300px';
  settingsMenu.style.textAlign = 'center';
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = 'Settings';
  title.style.marginBottom = '20px';
  settingsMenu.appendChild(title);
  
  // Minimap toggle option
  const minimapDiv = document.createElement('div');
  minimapDiv.style.marginBottom = '15px';
  
  const minimapLabel = document.createElement('label');
  minimapLabel.textContent = 'Minimap: ';
  minimapLabel.style.marginRight = '10px';
  
  const minimapToggle = document.createElement('button');
  minimapToggle.textContent = 'Toggle';
  minimapToggle.style.padding = '5px 10px';
  minimapToggle.style.backgroundColor = '#4CAF50';
  minimapToggle.style.border = 'none';
  minimapToggle.style.borderRadius = '5px';
  minimapToggle.style.cursor = 'pointer';
  
  minimapToggle.addEventListener('click', () => {
    // Toggle minimap using the same logic as M key press
    if (game && game.scene.scenes) {
      const gameScene = game.scene.scenes.find(scene => scene.scene.key === 'scene-game');
      if (gameScene) {
        minimapVisible = !minimapVisible;
        
        if (gameScene.minimapCamera) {
          gameScene.minimapCamera.visible = minimapVisible;
        }
        
        if (gameScene.minimapBorder) {
          gameScene.minimapBorder.visible = minimapVisible;
        }
        
        if (gameScene.minimapText) {
          gameScene.minimapText.visible = minimapVisible;
        }
        
        minimapStatus.textContent = minimapVisible ? 'ON' : 'OFF';
      }
    }
  });
  
  const minimapStatus = document.createElement('span');
  minimapStatus.style.marginLeft = '10px';
  minimapStatus.textContent = 'ON';
  
  minimapDiv.appendChild(minimapLabel);
  minimapDiv.appendChild(minimapToggle);
  minimapDiv.appendChild(minimapStatus);
  
  // Volume control
  const volumeDiv = document.createElement('div');
  volumeDiv.style.marginBottom = '15px';
  
  const volumeLabel = document.createElement('label');
  volumeLabel.textContent = 'Volume: ';
  volumeLabel.style.marginRight = '10px';
  
  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '100';
  volumeSlider.value = '50';
  volumeSlider.style.verticalAlign = 'middle';
  
  const volumeValue = document.createElement('span');
  volumeValue.style.marginLeft = '10px';
  volumeValue.textContent = '50%';
  
  volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value;
    volumeValue.textContent = volume + '%';
    
    // Update game volume if available
    if (game && game.sound) {
      game.sound.volume = volume / 100;
    }
  });
  
  volumeDiv.appendChild(volumeLabel);
  volumeDiv.appendChild(volumeSlider);
  volumeDiv.appendChild(volumeValue);
  
  // Developer tools section
  const devToolsDiv = document.createElement('div');
  devToolsDiv.style.marginBottom = '15px';
  
  const devToolsLabel = document.createElement('label');
  devToolsLabel.textContent = 'Developer Tools: ';
  devToolsLabel.style.marginRight = '10px';
  
  const devToolsToggle = document.createElement('button');
  devToolsToggle.textContent = 'Toggle';
  devToolsToggle.style.padding = '5px 10px';
  devToolsToggle.style.backgroundColor = '#ff9800';
  devToolsToggle.style.border = 'none';
  devToolsToggle.style.borderRadius = '5px';
  devToolsToggle.style.cursor = 'pointer';
  
  devToolsToggle.addEventListener('click', () => {
    showDevTools = !showDevTools;
    updateDevToolsDisplay();
    devToolsStatus.textContent = showDevTools ? 'ON' : 'OFF';
  });
  
  const devToolsStatus = document.createElement('span');
  devToolsStatus.style.marginLeft = '10px';
  devToolsStatus.textContent = showDevTools ? 'ON' : 'OFF';
  
  const devToolsInfo = document.createElement('div');
  devToolsInfo.style.fontSize = '12px';
  devToolsInfo.style.marginTop = '5px';
  devToolsInfo.innerHTML = 'Use ` (backtick) to toggle dev tools<br>+ / - to adjust time speed<br>0 to reset time speed<br>C to copy player coordinates';
  
  devToolsDiv.appendChild(devToolsLabel);
  devToolsDiv.appendChild(devToolsToggle);
  devToolsDiv.appendChild(devToolsStatus);
  devToolsDiv.appendChild(devToolsInfo);
  
  // Resume button
  const resumeButton = document.createElement('button');
  resumeButton.textContent = 'Resume Game';
  resumeButton.style.padding = '10px 15px';
  resumeButton.style.backgroundColor = '#4CAF50';
  resumeButton.style.border = 'none';
  resumeButton.style.borderRadius = '5px';
  resumeButton.style.cursor = 'pointer';
  resumeButton.style.marginTop = '15px';
  resumeButton.style.marginRight = '10px';
  
  resumeButton.addEventListener('click', () => {
    hideSettingsMenu();
    isSettingsMenuOpen = false;
    
    // Find and resume active scene
    if (game && game.scene.scenes) {
      const pausedScene = game.scene.scenes.find(scene => 
        (scene.scene.key === 'scene-game' || scene.scene.key === 'scene-house') && 
        scene.scene.isPaused()
      );
      
      if (pausedScene) {
        pausedScene.scene.resume();
      }
    }
  });
  
  // Main menu button
  const mainMenuButton = document.createElement('button');
  mainMenuButton.textContent = 'Main Menu';
  mainMenuButton.style.padding = '10px 15px';
  mainMenuButton.style.backgroundColor = '#f44336';
  mainMenuButton.style.border = 'none';
  mainMenuButton.style.borderRadius = '5px';
  mainMenuButton.style.cursor = 'pointer';
  mainMenuButton.style.marginTop = '15px';
  
  mainMenuButton.addEventListener('click', () => {
    // Reload the page to return to main menu
    location.reload();
  });
  
  // Add all elements to settings menu
  settingsMenu.appendChild(minimapDiv);
  settingsMenu.appendChild(volumeDiv);
  settingsMenu.appendChild(devToolsDiv);
  settingsMenu.appendChild(resumeButton);
  settingsMenu.appendChild(mainMenuButton);
  
  // Add the settings menu to the document body
  document.body.appendChild(settingsMenu);
}

function showSettingsMenu(activeScene) {
  const settingsMenu = document.getElementById('settingsMenu');
  if (settingsMenu) {
    // Update minimap status before showing
    const minimapStatus = settingsMenu.querySelector('span:nth-of-type(1)');
    if (minimapStatus) {
      minimapStatus.textContent = minimapVisible ? 'ON' : 'OFF';
    }
    
    // Show the menu
    settingsMenu.style.display = 'block';
  }
}

function hideSettingsMenu() {
  const settingsMenu = document.getElementById('settingsMenu');
  if (settingsMenu) {
    settingsMenu.style.display = 'none';
  }
}

// Function to update dev tools display
function updateDevToolsDisplay() {
  let devToolsElement = document.getElementById('devTools');
  
  // Create dev tools display if it doesn't exist
  if (!devToolsElement) {
    devToolsElement = document.createElement('div');
    devToolsElement.id = 'devTools';
    devToolsElement.style.position = 'absolute';
    devToolsElement.style.top = '10px';
    devToolsElement.style.right = '10px';
    devToolsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    devToolsElement.style.color = '#fff';
    devToolsElement.style.padding = '10px';
    devToolsElement.style.borderRadius = '5px';
    devToolsElement.style.fontFamily = 'monospace';
    devToolsElement.style.fontSize = '14px';
    devToolsElement.style.zIndex = '2000';
    document.body.appendChild(devToolsElement);
    
    // Add C key listener for copying player coordinates
    document.addEventListener('keydown', (event) => {
      if (showDevTools && event.key.toLowerCase() === 'c') {
        copyPlayerCoordinates();
      }
    });
    
    // Setup real-time coordinate updates
    if (showDevTools) {
      startCoordinateUpdates();
    }
  }
  
  // Update visibility
  devToolsElement.style.display = showDevTools ? 'block' : 'none';
  
  // Update content if visible
  if (showDevTools) {
    updateCoordinatesDisplay();
    startCoordinateUpdates();
  } else {
    stopCoordinateUpdates();
  }
}

// Global variable for coordinate update interval
let coordinateUpdateInterval = null;

// Function to start real-time coordinate updates
function startCoordinateUpdates() {
  // Clear any existing interval first
  stopCoordinateUpdates();
  
  // Start a new interval that updates every 100ms (10 times per second)
  coordinateUpdateInterval = setInterval(updateCoordinatesDisplay, 100);
}

// Function to stop coordinate updates
function stopCoordinateUpdates() {
  if (coordinateUpdateInterval) {
    clearInterval(coordinateUpdateInterval);
    coordinateUpdateInterval = null;
  }
}

// Function to update just the coordinates display
function updateCoordinatesDisplay() {
  const devToolsElement = document.getElementById('devTools');
  if (!devToolsElement || !showDevTools) return;
  
  // Get player coordinates if available
  let playerX = 'N/A';
  let playerY = 'N/A';
  let screenX = 'N/A';
  let screenY = 'N/A';
  let currentScene = 'N/A';
  
  if (game && game.scene.scenes) {
    const activeScene = game.scene.scenes.find(scene => 
      (scene.scene.key === 'scene-game' || scene.scene.key === 'scene-house' || scene.scene.key === 'scene-beach') && 
      scene.scene.isActive()
    );
    
    if (activeScene && activeScene.player) {
      // World coordinates
      playerX = Math.round(activeScene.player.x);
      playerY = Math.round(activeScene.player.y);
      currentScene = activeScene.scene.key;
      
      // Calculate screen coordinates
      const camera = activeScene.cameras.main;
      if (camera) {
        screenX = Math.round(activeScene.player.x - camera.scrollX);
        screenY = Math.round(activeScene.player.y - camera.scrollY);
      }
    }
  }
  
  devToolsElement.innerHTML = `
    <div>DEVELOPER TOOLS</div>
    <div>Time Speed: ${timeMultiplier}x</div>
    <div>Scene: ${currentScene}</div>
    <div>World X: ${playerX} | Y: ${playerY}</div>
    <div>Screen X: ${screenX} | Y: ${screenY}</div>
    <div>Controls:</div>
    <div>+ : Speed up time</div>
    <div>- : Slow down time</div>
    <div>0 : Reset time speed</div>
    <div>C : Copy coordinates</div>
  `;
}

// Update copyPlayerCoordinates to include screen coordinates
function copyPlayerCoordinates() {
  if (game && game.scene.scenes) {
    const activeScene = game.scene.scenes.find(scene => 
      (scene.scene.key === 'scene-game' || scene.scene.key === 'scene-house' || scene.scene.key === 'scene-beach') && 
      scene.scene.isActive()
    );
    
    if (activeScene && activeScene.player) {
      // World coordinates
      const worldX = Math.round(activeScene.player.x);
      const worldY = Math.round(activeScene.player.y);
      const sceneName = activeScene.scene.key;
      
      // Screen coordinates
      let screenX = 'N/A';
      let screenY = 'N/A';
      const camera = activeScene.cameras.main;
      if (camera) {
        screenX = Math.round(activeScene.player.x - camera.scrollX);
        screenY = Math.round(activeScene.player.y - camera.scrollY);
      }
      
      const coordText = `Scene: ${sceneName}\nWorld X: ${worldX}, Y: ${worldY}\nScreen X: ${screenX}, Y: ${screenY}`;
      
      // Create temporary textarea to copy to clipboard
      const textarea = document.createElement('textarea');
      textarea.value = coordText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      // Show feedback that coordinates were copied
      const notification = document.createElement('div');
      notification.textContent = 'Coordinates copied to clipboard!';
      notification.style.position = 'absolute';
      notification.style.top = '50px';
      notification.style.right = '10px';
      notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      notification.style.color = '#fff';
      notification.style.padding = '10px';
      notification.style.borderRadius = '5px';
      notification.style.fontFamily = 'monospace';
      notification.style.zIndex = '2001';
      document.body.appendChild(notification);
      
      // Remove notification after 2 seconds
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    }
  }
}