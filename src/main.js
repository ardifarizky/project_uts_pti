// Import statements first
import './style.css';
import Phaser from 'phaser';
import Beach from './Beach.js';
import Player, { CHARACTER_SPRITES } from './object/Player.js';
import HouseScene from './scenes/HouseScene.js';
import TutorialScene from './scenes/TutorialScene.js';
import PreloadScene from './preload.js';
import MainLandScene from './scenes/MainLandScene.js';
import MountainScene from './scenes/MountainScene.js';
import TempleScene from './scenes/TempleScene.js';
import LakeScene from './scenes/LakeScene.js';
import StatsUI from './ui/StatsUI.js';

// ===================== GLOBAL VARIABLES & SETUP =====================
let playerName = "Ucup"; // Default player name changed to "Ucup"
let selectedCharacter = "ucup"; // Default character
let isNameInputActive = true; // Default to true since name input starts active
let isLoadingHouse = false;
let isLoadingBeach = false; // New flag for beach transition
let isLoadingMainland = false; // New flag for mainland transition
let isLoadingMountain = false; // New flag for mountain transition
let isLoadingTemple = false; // New flag for temple transition
let isLoadingLake = false; // New flag for lake transition
let isTransitioning = false; // New flag to disable movement during transitions
let game; // Define game variable outside so we can access it later
let lastPlayerPos = { x: 1900, y: 2941 };
let lastHousePos = { x: 300, y: 200 }; // Center of house, away from exit door
let lastBeachPos = { x: 100, y: 100 }; // Default beach position
let lastMainlandPos = { x: 250, y: 250 }; // Default mainland position
let lastMountainPos = { x: 250, y: 250 }; // Default mountain position
let lastTemplePos = { x: 250, y: 250 }; // Default temple position
let lastLakePos = { x: 500, y: 1600 }; // Default lake position
let minimapVisible = true; // Add tracking variable for minimap visibility
let isSettingsMenuOpen = false; // Track if settings menu is open
let timeMultiplier = 1; // Time multiplier for developer tools
let showDevTools = false; // Track if dev tools are visible
let currentGameDay = 1; // Track current game day globally
let completedChores = {}; // Global track of completed chores
// Global statsUI reference
let globalStatsUI = null;

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

  // Update character selection cards with character info
  updateCharacterCards();

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

  // ===================== CHARACTER SELECTION HANDLERS =====================
  // Add event listeners for character selection
  characterCards.forEach(card => {
    card.addEventListener('click', function() {
      // Remove active class from all cards
      characterCards.forEach(c => c.classList.remove('active'));
      
      // Add active class to selected card
      this.classList.add('active');
      
      // Get character data from the card
      const characterId = this.getAttribute('data-character');
      selectedCharacter = characterId;
      
      // Update player name input to match character
      switch(characterId) {
        case 'ucup': 
          playerNameInput.value = "Ucup"; 
          break;
        case 'aminah': 
          playerNameInput.value = "Aminah"; 
          break;
        case 'adel': 
          playerNameInput.value = "Adel"; 
          break;
        case 'gekko': 
          playerNameInput.value = "Gekko"; 
          break;
      }
      
      playerName = playerNameInput.value;
    });
  });

  // ===================== GAME START BUTTON =====================
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
        debug: false,
        fps: 60,
        tileBias: 32
      }
    },
    scene: [PreloadScene, GameScene, HouseScene, Beach, TutorialScene, MainLandScene, MountainScene, TempleScene, LakeScene]
  };

  // Initialize the game
  game = new Phaser.Game(config);

  // Function to update character cards with sprite images
  function updateCharacterCards() {
    // Character data
    const characters = [
      { id: 'ucup', name: 'Ucup', spritesheet: 'player1', description: 'A helpful villager.' },
      { id: 'aminah', name: 'Aminah', spritesheet: 'player2', description: 'Smart and resourceful.' },
      { id: 'adel', name: 'Adel', spritesheet: 'player3', description: 'Artistic and creative.' },
      { id: 'gekko', name: 'Gekko', spritesheet: 'player4', description: 'Strong and dependable.' }
    ];
    
    // Set character data for each card
    characterCards.forEach((card, index) => {
      if (index < characters.length) {
        const character = characters[index];
        
        // Set data attribute for character selection
        card.setAttribute('data-character', character.id);
        
        // Set character name
        const nameElement = card.querySelector('.character-name');
        if (nameElement) nameElement.textContent = character.name;
        
        // Set character description
        const descElement = card.querySelector('.character-desc');
        if (descElement) descElement.textContent = character.description;
        
        // Preload and set character sprite image
        loadAndSetCharacterSprite(card, character.spritesheet);
        
        // Add active class to the default character
        if (character.id === selectedCharacter) {
          card.classList.add('active');
        }
      }
    });
  }
  
  // Function to load and set character sprite image
  function loadAndSetCharacterSprite(card, spriteKey) {
    const img = new Image();
    img.onload = function() {
      // Create a canvas to extract the front-facing sprite
      const canvas = document.createElement('canvas');
      canvas.width = 64;  // 2x scale for better quality
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      
      // Draw the character's front-facing sprite (second frame in first row)
      ctx.drawImage(img, 32 * 1, 0, 32, 32, 0, 0, 64, 64);
      
      // Set the image src
      const imgElement = card.querySelector('.character-img');
      if (imgElement) {
        imgElement.src = canvas.toDataURL('image/png');
      }
    };
    
    // Load the sprite image
    img.src = `/assets/Player/${spriteKey}.png`;
  }
});

// ===================== GAME SCENE CLASS =====================
class GameScene extends Phaser.Scene {
  constructor() {
    super("scene-game");
    
    // Game map configuration
    this.mapScale = 3;
    
    // Player configuration
    this.playerName = playerName;
    this.selectedCharacter = selectedCharacter;
    this.PLAYER_SPEED = PLAYER_SPEED;
    
    // Player stats (now using global playerStats)
    this.money = playerStats.money;
    
    // Time configuration
    this.gameTimeEnabled = true;
    this.gameTimeMinutes = 480; // Start at 8am (8 hours * 60 minutes)
    this.gameHour = 8; // Start at 8am
    this.gameMinute = 0;
    this.gameDay = currentGameDay;
    this.lastDayUpdateTime = 0;
    this.weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    // Keep using current day of week for convenience
    const now = new Date();
    this.currentWeekDay = this.weekDays[now.getDay()];
    this.greetingText = "";
    
    // Map elements
    this.map = null;
    this.groundsLayer = null;
    this.bottomLayer = null;
    this.obstaclesLayer = null;
    this.topObstaclesLayer = null;
    this.underObstaclesLayer = null;
    
    // Game objects
    this.player = null;
    this.house = null;
    this.travelBus = null;
    this.travelMenu = null;
    
    // UI elements
    this.uiContainer = null;
    this.greetingLabel = null; 
    this.timeLabel = null;
    this.moneyText = null;
    
    // Stats UI (will now use global StatsUI)
    this.statsUI = null;
    
    // Time variables for day/night cycle
    this.dayColor = 0xFFFFFF;
    this.nightColor = 0x555588;
    this.currentLightColor = this.dayColor;
    
    // Setup minimap variables
    this.minimapCamera = null;
    this.minimapBorder = null;
    
    // Particle effects
    this.emitter = null;
    
    // Game timers
    this.gameTimeEvent = null;
    this.statsUpdateEvent = null;
  }
  
  // Add init method to receive data from HouseScene
  init(data) {
    console.log("GameScene init called with data:", data);
    
    if (data) {
      // Check if we should spawn at the default position
      if (data.spawnAtStart) {
        console.log("Spawning player at default position");
        lastPlayerPos = { x: 1900, y: 2941 }; // Reset to default spawn position
      } 
      // Still store lastHousePos for when player returns to house
      else if (data.lastHousePos) {
        lastHousePos = data.lastHousePos;
        console.log("Updated lastHousePos:", lastHousePos);
      }
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
    
    // Load tilemap data - copying approach from MainLandScene.js
    this.load.tilemapTiledJSON('mainland-map', '/assets/tilemap/mainland.json');
    
    // Load tileset images
    this.load.image('bedroom1', '/assets/tiles/bedroom1.png');
    this.load.image('floor1', '/assets/tiles/floor1.png');
    this.load.image('wall1', '/assets/tiles/wall1.png');
    this.load.image('livingroom2', '/assets/tiles/livingroom2.png');
    this.load.image('exterior1', '/assets/tiles/exterior1.png');
    this.load.image('interior1', '/assets/tiles/interior1.png');
    this.load.image('room1', '/assets/tiles/room1.png');
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
    
    // Initialize game time if not already set
    if (!this.gameTimeMinutes) {
      this.initializeGameTime();
    }
    
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
    
    // Create the global stats UI if not already created
    this.createStatsUI();
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
    // Create a tilemap using the same approach as in MainLandScene.js
    this.map = this.make.tilemap({ key: 'mainland-map' });
    
    // Add map scale factor
    this.mapScale = 2;
    
    // Add the tilesets to the map
    const bedroom1Tileset = this.map.addTilesetImage('bedroom1', 'bedroom1');
    const floor1Tileset = this.map.addTilesetImage('floor1', 'floor1');
    const wall1Tileset = this.map.addTilesetImage('wall1', 'wall1');
    const livingroom2Tileset = this.map.addTilesetImage('livingroom2', 'livingroom2');
    const exterior1Tileset = this.map.addTilesetImage('exterior1', 'exterior1');
    const interior1Tileset = this.map.addTilesetImage('interior1', 'interior1');
    const room1Tileset = this.map.addTilesetImage('room1', 'room1');
    
    // Create layers - adjust layer names based on mainland.json structure
    this.groundLayer = this.map.createLayer('ground', [exterior1Tileset, interior1Tileset, room1Tileset]).setDepth(0);
    this.roadLayer = this.map.createLayer('road', [exterior1Tileset, interior1Tileset, room1Tileset]).setDepth(1);
    this.underObstaclesLayer = this.map.createLayer('underobstacle', [exterior1Tileset, interior1Tileset, room1Tileset]).setDepth(2);
    this.bottomLayer = this.map.createLayer('botlayer', [exterior1Tileset, interior1Tileset, room1Tileset]).setDepth(3);
    this.obstaclesLayer = this.map.createLayer('obstacle', [exterior1Tileset, interior1Tileset, room1Tileset]).setDepth(4);
    this.topObstaclesLayer = this.map.createLayer('topobstacle', [exterior1Tileset, interior1Tileset, room1Tileset]).setDepth(5);
    this.topLayer = this.map.createLayer('toplayer', [exterior1Tileset, interior1Tileset, room1Tileset]).setDepth(11);
    this.signsLayer = this.map.createLayer('signs', [exterior1Tileset, interior1Tileset, room1Tileset]).setDepth(12);
    
    // Scale all layers by the map scale factor
    this.groundLayer.setScale(this.mapScale);
    this.roadLayer.setScale(this.mapScale);
    this.underObstaclesLayer.setScale(this.mapScale);
    this.bottomLayer.setScale(this.mapScale);
    this.obstaclesLayer.setScale(this.mapScale);
    this.topObstaclesLayer.setScale(this.mapScale);
    this.topLayer.setScale(this.mapScale);
    this.signsLayer.setScale(this.mapScale);
    
    // Set collision on layers
    this.obstaclesLayer.setCollisionByProperty({ collide: true });
    this.obstaclesLayer.setCollisionByExclusion([-1]);
    
    this.topObstaclesLayer.setCollisionByProperty({ collide: true });
    this.topObstaclesLayer.setCollisionByExclusion([-1]);
    
    this.bottomLayer.setCollisionByProperty({ collide: true });
    this.bottomLayer.setCollisionByExclusion([-1]);
    
    this.underObstaclesLayer.setCollisionByProperty({ collide: true });
    this.underObstaclesLayer.setCollisionByExclusion([-1]);
    
    // Set physics world bounds
    const mapWidth = this.map.widthInPixels * this.mapScale;
    const mapHeight = this.map.heightInPixels * this.mapScale;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
  }
  
  createWorldDecorations() {
    // Create house entrance at specific coordinates
    this.createHouseEntrance();
    
    // Create temple entrance
    this.createTempleEntrance();
    
    // Create lake entrance
    this.createLakeEntrance();
    
    // Create travel bus station
    this.createTravelBus();
    
    // Note: Individual beach and mountain entrances have been replaced by the travel bus
  }
  
  createHouseEntrance() {
    // Create a house entrance at specific coordinates
    const houseEntrancePos = { x: 1830, y: 2880 };
    this.houseEntrance = this.physics.add.sprite(houseEntrancePos.x, houseEntrancePos.y, 'player');
    // Set size and appearance
    this.houseEntrance.displayWidth = this.houseEntrance.width * 2;
    this.houseEntrance.displayHeight = this.houseEntrance.height * 2;
    this.houseEntrance.setTint(0xC05A53); // Reddish color for house
    this.houseEntrance.setAlpha(0); // Make the entrance sprite invisible
    this.houseEntrance.setImmovable(true);
    this.houseEntrance.body.allowGravity = false;
    this.houseEntrance.setDepth(6); // Set a higher depth to ensure collision works
    
    // Add a debug visual to show hitbox clearly but make it invisible
    const debugRect = this.add.rectangle(
      houseEntrancePos.x,
      houseEntrancePos.y,
      this.houseEntrance.displayWidth,
      this.houseEntrance.displayHeight,
      0xff0000,
      0 // Set alpha to 0 to hide debug rectangle
    );
    debugRect.setDepth(5);
    
    // Add house sign (keep visible)
    const houseSign = this.add.text(
      houseEntrancePos.x, houseEntrancePos.y - 30, 
      "→ HOUSE →", 
      { font: "bold 16px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 3 }
    );
    houseSign.setOrigin(0.5, 0.5);
    houseSign.setDepth(7); // Set above the entrance
    
    // Add interaction with house entrance
    this.physics.add.overlap(
      this.player, 
      this.houseEntrance, 
      this.enterHouse, 
      this.canEnterHouse, 
      this
    );
  }
  
  createTempleEntrance() {
    // Create a temple entrance at specific coordinates
    const templeEntrancePos = { x: 2879, y: 672 };
    this.templeEntrance = this.physics.add.sprite(templeEntrancePos.x, templeEntrancePos.y, 'player');
    // Set size and appearance
    this.templeEntrance.displayWidth = this.templeEntrance.width * 2;
    this.templeEntrance.displayHeight = this.templeEntrance.height * 2;
    this.templeEntrance.setTint(0xFFD700); // Gold color for temple
    this.templeEntrance.setAlpha(0); // Make the entrance sprite invisible
    this.templeEntrance.setImmovable(true);
    this.templeEntrance.body.allowGravity = false;
    this.templeEntrance.setDepth(6); // Set a higher depth to ensure collision works
    
    // Add a debug visual to show hitbox clearly but make it invisible
    const debugRect = this.add.rectangle(
      templeEntrancePos.x,
      templeEntrancePos.y,
      this.templeEntrance.displayWidth,
      this.templeEntrance.displayHeight,
      0xff0000,
      0 // Set alpha to 0 to hide debug rectangle
    );
    debugRect.setDepth(5);
    
    // Add temple sign with floating animation
    const templeSign = this.add.text(
      templeEntrancePos.x, templeEntrancePos.y - 30, 
      "TEMPLE", 
      { font: "bold 16px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 3 }
    );
    templeSign.setOrigin(0.5, 0.5);
    templeSign.setDepth(7); // Set above the entrance
    
    // Add floating animation to the temple sign
    this.tweens.add({
      targets: templeSign,
      y: templeEntrancePos.y - 40, // Float up by 10 pixels
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add interaction with temple entrance
    this.physics.add.overlap(
      this.player, 
      this.templeEntrance, 
      this.enterTemple, 
      () => !isTransitioning, // Only enter if not already transitioning
      this
    );
  }
  
  createLakeEntrance() {
    // Create a lake entrance at specific coordinates
    const lakeEntrancePos = { x: 1677, y: 133 };
    this.lakeEntrance = this.physics.add.sprite(lakeEntrancePos.x, lakeEntrancePos.y, 'player');
    // Set size and appearance
    this.lakeEntrance.displayWidth = this.lakeEntrance.width * 2;
    this.lakeEntrance.displayHeight = this.lakeEntrance.height * 2;
    this.lakeEntrance.setTint(0x4169E1); // Royal blue color for lake
    this.lakeEntrance.setAlpha(0); // Make the entrance sprite invisible
    this.lakeEntrance.setImmovable(true);
    this.lakeEntrance.body.allowGravity = false;
    this.lakeEntrance.setDepth(6); // Set a higher depth to ensure collision works
    
    // Add a debug visual to show hitbox clearly but make it invisible
    const debugRect = this.add.rectangle(
      lakeEntrancePos.x,
      lakeEntrancePos.y,
      this.lakeEntrance.displayWidth,
      this.lakeEntrance.displayHeight,
      0xff0000,
      0 // Set alpha to 0 to hide debug rectangle
    );
    debugRect.setDepth(5);
    
    // Add lake sign with floating animation
    const lakeSign = this.add.text(
      lakeEntrancePos.x, lakeEntrancePos.y - 30, 
      "LAKE", 
      { font: "bold 16px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 3 }
    );
    lakeSign.setOrigin(0.5, 0.5);
    lakeSign.setDepth(7); // Set above the entrance
    
    // Add floating animation to the lake sign
    this.tweens.add({
      targets: lakeSign,
      y: lakeEntrancePos.y - 40, // Float up by 10 pixels
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add interaction with lake entrance
    this.physics.add.overlap(
      this.player, 
      this.lakeEntrance, 
      this.enterLake, 
      () => !isTransitioning, // Only enter if not already transitioning
      this
    );
  }
  
  createTravelBus() {
    // Create a travel bus hitbox at specific coordinates
    const busPosX = 2904;
    const busPosY = 2915;
    
    // Create the hitbox
    this.travelBus = this.physics.add.sprite(busPosX, busPosY, 'player');
    this.travelBus.displayWidth = this.travelBus.width * 3;
    this.travelBus.displayHeight = this.travelBus.height * 3;
    this.travelBus.setTint(0x4682B4); // Steel blue color
    this.travelBus.setAlpha(0.7);
    this.travelBus.setImmovable(true);
    this.travelBus.body.allowGravity = false;
    
    // Add travel bus sign
    const busSign = this.add.text(
      busPosX, busPosY - 50, 
      "TRAVEL BUS", 
      { font: "bold 20px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 3 }
    );
    busSign.setOrigin(0.5, 0.5);
    busSign.setDepth(100);
    
    // Add floating animation to the bus sign
    this.tweens.add({
      targets: busSign,
      y: busPosY - 60, // Float up by 10 pixels
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add interaction with travel bus
    this.physics.add.overlap(
      this.player, 
      this.travelBus, 
      this.showTravelOptions, 
      () => !isTransitioning, // Only show travel options if not already transitioning
      this
    );
  }
  
  showTravelOptions() {
    // Skip if already showing travel options or in transition
    if (this.travelMenu || isTransitioning) return;
    
    // Create a semi-transparent background
    const menuBg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      400,
      300,
      0x000000,
      0.8
    );
    menuBg.setScrollFactor(0);
    menuBg.setDepth(1000);
    
    // Create title text
    const titleText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 100,
      "Select Destination",
      { font: "bold 24px Arial", fill: "#ffffff" }
    );
    titleText.setOrigin(0.5, 0.5);
    titleText.setScrollFactor(0);
    titleText.setDepth(1001);
    
    // Create mountain button
    const mountainButton = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 30,
      300,
      50,
      0xA9A9A9 // Gray color for mountains
    );
    mountainButton.setScrollFactor(0);
    mountainButton.setDepth(1001);
    mountainButton.setInteractive({ useHandCursor: true });
    
    const mountainText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 30,
      "Mountains",
      { font: "20px Arial", fill: "#ffffff" }
    );
    mountainText.setOrigin(0.5, 0.5);
    mountainText.setScrollFactor(0);
    mountainText.setDepth(1002);
    
    // Create beach button
    const beachButton = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 40,
      300,
      50,
      0xf7e26b // Sand color
    );
    beachButton.setScrollFactor(0);
    beachButton.setDepth(1001);
    beachButton.setInteractive({ useHandCursor: true });
    
    const beachText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 40,
      "Beach",
      { font: "20px Arial", fill: "#000000" }
    );
    beachText.setOrigin(0.5, 0.5);
    beachText.setScrollFactor(0);
    beachText.setDepth(1002);
    
    // Create cancel button
    const cancelButton = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 110,
      300,
      50,
      0xff6347 // Tomato red
    );
    cancelButton.setScrollFactor(0);
    cancelButton.setDepth(1001);
    cancelButton.setInteractive({ useHandCursor: true });
    
    const cancelText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 110,
      "Cancel",
      { font: "20px Arial", fill: "#ffffff" }
    );
    cancelText.setOrigin(0.5, 0.5);
    cancelText.setScrollFactor(0);
    cancelText.setDepth(1002);
    
    // Store all UI elements in a container
    this.travelMenu = this.add.container(0, 0, [
      menuBg, titleText, 
      mountainButton, mountainText,
      beachButton, beachText,
      cancelButton, cancelText
    ]);
    this.travelMenu.setDepth(1000);
    
    // Add click handlers
    mountainButton.on('pointerdown', () => {
      this.closeTravelMenu();
      this.enterMountain();
    });
    
    beachButton.on('pointerdown', () => {
      this.closeTravelMenu();
      this.enterBeach();
    });
    
    cancelButton.on('pointerdown', () => {
      this.closeTravelMenu();
    });
  }
  
  closeTravelMenu() {
    if (this.travelMenu) {
      this.travelMenu.destroy();
      this.travelMenu = null;
    }
  }
  
  createPlayer() {
    // Create player using the new Player class
    this.player = new Player(this, lastPlayerPos.x, lastPlayerPos.y, selectedCharacter);
    
    // Configure any additional scene-specific settings
    this.player.playerSpeed = PLAYER_SPEED;
    
    // Add collision with tilemap layers
    this.physics.add.collider(this.player, this.obstaclesLayer);
    this.physics.add.collider(this.player, this.topObstaclesLayer);
    this.physics.add.collider(this.player, this.bottomLayer);
    this.physics.add.collider(this.player, this.underObstaclesLayer);
  }
  
  setupCamera() {
    // Main camera - follows player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    
    // Set camera bounds to map size
    const mapWidth = this.map.widthInPixels * this.mapScale;
    const mapHeight = this.map.heightInPixels * this.mapScale;
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
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
    
    // Configure minimap - adjust zoom to account for the map scaling
    const minimapZoom = 0.1 / this.mapScale; // Adjust zoom to compensate for map scaling
    this.minimapCamera.setBounds(0, 0, this.map.widthInPixels * this.mapScale, this.map.heightInPixels * this.mapScale);
    this.minimapCamera.setZoom(minimapZoom); // Zoom out more to see the scaled world
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
    // Clear any existing timers to prevent duplicates
    if (this.gameTimeEvent) {
      this.gameTimeEvent.remove();
    }
    if (this.statsUpdateEvent) {
      this.statsUpdateEvent.remove();
    }
    
    // Ensure timeMultiplier is defined
    if (typeof timeMultiplier === 'undefined') {
      timeMultiplier = 1;
    }
    
    // Game time update timer (every 100ms = 10 game minutes)
    this.gameTimeEvent = this.time.addEvent({
      delay: 100 / timeMultiplier,
      callback: this.updateGameTime,
      callbackScope: this,
      loop: true
    });
    
    // Stats update timer (every 5 seconds)
    this.statsUpdateEvent = this.time.addEvent({
      delay: 5000 / timeMultiplier,
      callback: this.updateStats,
      callbackScope: this,
      loop: true
    });
    
    // Game over check timer
    if (this.timeEvent) {
      this.timeEvent.remove();
    }
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
    // Safety check - if any required values are undefined, initialize them
    if (this.gameTimeMinutes === undefined) {
      this.gameTimeMinutes = 480; // 8:00 AM
    }
    if (this.gameDay === undefined) {
      this.gameDay = 1;
    }
    if (!this.weekDays) {
      this.weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const now = new Date();
      this.currentWeekDay = this.weekDays[now.getDay()];
    }
    if (!this.currentWeekDay) {
      const now = new Date();
      this.currentWeekDay = this.weekDays[now.getDay()];
    }
    
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
    let minutes = Math.floor(this.gameTimeMinutes % 60);
    let timeText = `${String(hours).padStart(2, "0")}:${String(Math.floor(minutes)).padStart(2, "0")}`;
  
    // Update greeting based on time of day
    if (hours >= 5 && hours < 12) {
      this.greetingText = `Good Morning ${playerName || "Player"}`;
    } else if (hours >= 12 && hours < 18) {
      this.greetingText = `Good Afternoon ${playerName || "Player"}`;
    } else if (hours >= 18 && hours < 22) {
      this.greetingText = `Good Evening ${playerName || "Player"}`;
    } else {
      this.greetingText = `Good Night ${playerName || "Player"}`;
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
    
    // Update global stats after local stats change
    this.updateGlobalStats();

    // Check for game over condition
    if (this.hunger === 0 || this.energy === 0 || this.hygiene === 0 || this.happiness === 0) {
      this.gameOver();
    }
  }
  
  drawProgressBars() {
    // No longer needed as we're using StatsUI
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
    if (this.isGameOver) {
      return;
    }
    
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
    
    // Update the global stats UI
    if (this.statsUI) {
      this.statsUI.update();
    }
  }

  // Add this function to GameScene to handle house entry
  canEnterHouse() {
    // Check if player is near the door - add extra conditions if needed
    return !isLoadingHouse;
  }

  // Update enterHouse method to pass player stats to house scene
  enterHouse() {
    if (isTransitioning || !this.canEnterHouse()) {
      return;
    }
    
    // Save current player position for when they return from the house
    if (lastPlayerPos && this.player) {
      lastPlayerPos = { x: this.player.x, y: this.player.y };
    }
    
    // Transition to house scene
    isTransitioning = true;
    isLoadingHouse = true;
    
    // Use a safety timer to handle transition issues
    addSafetyResetTimer();
    
    // Show transition screen
    this.createTransitionMessage("Entering house...");
    
    // Transition to house scene after a delay
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

  enterBeach() {
    // Check if already transitioning
    if (isTransitioning) {
      return;
    }
    
    // Save last player position for when they return from the beach
    if (typeof window !== 'undefined') {
      window.lastBeachPos = { x: 250, y: 250 };
    }
    
    // Transition to beach scene
    isTransitioning = true;
    
    // Use a safety timer to handle transition issues
    addSafetyResetTimer();
    
    // Show transition screen
    this.createTransitionMessage("Traveling to the beach...");
    
    // Transition to beach scene after a delay
    this.time.delayedCall(1000, () => {
      try {
        this.scene.start('scene-beach', {
          playerName: this.playerName,
          selectedCharacter: this.selectedCharacter,
          PLAYER_SPEED: this.PLAYER_SPEED,
          GAME_SIZE: this.GAME_SIZE,
          lastBeachPos: window.lastBeachPos || { x: 250, y: 250 },
          isTransitioning: false
        });
      } catch (error) {
        console.error("Error starting beach scene:", error);
        isTransitioning = false;
      }
    });
  }
  
  enterMountain() {
    // Check if already transitioning
    if (isTransitioning) {
      return;
    }
    
    // Save last player position for when they return from the mountains
    if (typeof window !== 'undefined') {
      window.lastMountainPos = { x: 250, y: 250 };
    }
    
    // Transition to mountain scene
    isTransitioning = true;
    
    // Use a safety timer to handle transition issues
    addSafetyResetTimer();
    
    // Show transition screen
    this.createTransitionMessage("Traveling to the mountains...");
    
    // Transition to mountain scene after a delay
    this.time.delayedCall(1000, () => {
      try {
        this.scene.start('scene-mountain', {
          playerName: this.playerName,
          selectedCharacter: this.selectedCharacter,
          PLAYER_SPEED: this.PLAYER_SPEED,
          GAME_SIZE: this.GAME_SIZE,
          lastMountainPos: window.lastMountainPos || { x: 250, y: 250 },
          isTransitioning: false
        });
      } catch (error) {
        console.error("Error starting mountain scene:", error);
        isTransitioning = false;
      }
    });
  }
  
  enterTemple() {
    // Check if already transitioning
    if (isTransitioning) {
      return;
    }
    
    // Save last player position for when they return from the temple
    if (typeof window !== 'undefined') {
      window.lastTemplePos = { x: 250, y: 250 };
    }
    
    // Transition to temple scene
    isTransitioning = true;
    
    // Use a safety timer to handle transition issues
    addSafetyResetTimer();
    
    // Show transition screen
    this.createTransitionMessage("Entering the Temple...");
    
    // Transition to temple scene after a delay
    this.time.delayedCall(1000, () => {
      try {
        this.scene.start('scene-temple', {
          playerName: this.playerName,
          selectedCharacter: this.selectedCharacter,
          PLAYER_SPEED: this.PLAYER_SPEED,
          GAME_SIZE: this.GAME_SIZE,
          lastTemplePos: window.lastTemplePos || { x: 250, y: 250 },
          isTransitioning: false
        });
      } catch (error) {
        console.error("Error starting temple scene:", error);
        isTransitioning = false;
      }
    });
  }
  
  enterLake() {
    // Check if already transitioning
    if (isTransitioning) {
      return;
    }
    
    // Save last player position for when they return from the lake
    if (typeof window !== 'undefined') {
      window.lastLakePos = { x: 250, y: 250 };
    }
    
    // Transition to lake scene
    isTransitioning = true;
    
    // Use a safety timer to handle transition issues
    addSafetyResetTimer();
    
    // Show transition screen
    this.createTransitionMessage("Heading to the lake...");
    
    // Transition to lake scene after a delay
    this.time.delayedCall(1000, () => {
      try {
        this.scene.start('scene-lake', {
          playerName: this.playerName,
          selectedCharacter: this.selectedCharacter,
          PLAYER_SPEED: this.PLAYER_SPEED,
          GAME_SIZE: this.GAME_SIZE,
          lastLakePos: window.lastLakePos || { x: 250, y: 250 },
          isTransitioning: false
        });
      } catch (error) {
        console.error("Error starting lake scene:", error);
        isTransitioning = false;
      }
    });
  }
  
  createTransitionMessage(message) {
    // Create a semi-transparent black overlay
    const overlay = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(999);
    
    // Add message text
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      message,
      { font: "bold 24px Arial", fill: "#ffffff", align: "center" }
    );
    text.setOrigin(0.5, 0.5);
    text.setScrollFactor(0);
    text.setDepth(1000);
  }

  // Add a helper method to update all UI elements
  updateUI() {
    // Update money text
    if (this.moneyText) {
      this.moneyText.setText(`Money: $${this.money}`);
    }
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
    
    // Make sure UI displays current values
    this.updateUI();
  }
  
  createProgressBars() {
    // No longer needed as we're using StatsUI
  }

  // Add method to create stats UI
  createStatsUI() {
    // Create new stats UI or use existing global one
    if (globalStatsUI) {
      // If we already have a global UI, destroy it properly to prevent memory leaks
      globalStatsUI.destroy();
    }
    
    // Create a fresh stats UI for this scene
    globalStatsUI = new StatsUI(this);
    this.statsUI = globalStatsUI;
    
    // Add window resize handler to reposition UI
    const resizeHandler = () => {
      if (this.statsUI) {
        // Reposition UI to remain in top-right corner
        const gameWidth = this.cameras.main.width;
        this.statsUI.container.x = gameWidth - 255;
      }
    };
    
    // Add the resize listener
    window.addEventListener('resize', resizeHandler);
    
    // Store the handler to remove it later
    this.statsUI.resizeHandler = resizeHandler;
  }
}

// Add a global safety timer function at the top level
function addSafetyResetTimer() {
  // After 5 seconds, force reset the transition state if it's still true
  setTimeout(() => {
    if (isTransitioning) {
      console.warn("Safety timer triggered: resetting transition state");
      isTransitioning = false;
    }
  }, 5000);
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