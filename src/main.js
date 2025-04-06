// Import statements first
import './style.css';
import Phaser from 'phaser';

// ===================== GLOBAL VARIABLES & SETUP =====================
let playerName = "";
let isNameInputActive = true; // Default to true since name input starts active
let isLoadingHouse = false;
let isTransitioning = false; // New flag to disable movement during transitions
let game; // Define game variable outside so we can access it later
let lastPlayerPos = { x: 100, y: 100 };
let lastHousePos = { x: 250, y: 250 }; // Center of house, away from exit door

// Game constants
const GAME_SIZE = {
  width: 500,
  height: 500
};
const WORLD_SIZE = {
  width: 1600,
  height: 1600
};
const SPEED_DOWN = 300;
const PLAYER_SPEED = SPEED_DOWN + 50;

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', function() {
  // DOM element references
  const gameStartBtn = document.getElementById("gameStartBtn");
  const gameStartDiv = document.getElementById("gameStartDiv");
  const gameCanvas = document.getElementById("gameCanvas");

  // ===================== NAME INPUT HANDLERS =====================
  document.getElementById('playerName').addEventListener('focus', () => {
    isNameInputActive = true;
  });

  document.getElementById('playerName').addEventListener('blur', () => {
    isNameInputActive = false;
  });

  gameStartBtn.addEventListener("click", () => {
    const inputName = document.getElementById('playerName').value.trim();

    if (!inputName) {
      alert("Please enter your name!");
    } else {
      playerName = inputName;
      console.log(`Player's name: ${playerName}`);
      gameStartDiv.style.display = "none";
      
      // Delay to ensure UI updates before resuming game
      setTimeout(() => {
        isNameInputActive = false;
        console.log("isNameInputActive set to false");
        game.scene.resume("scene-game");
      }, 100);
    }
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
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: SPEED_DOWN },
        debug: true,
        fps: 60,
        tileBias: 32
      }
    },
    scene: [GameScene, HouseScene]
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
    this.wasd = null;
    
    // Game state
    this.isGameOver = false;
    
    // Character stats
    this.hunger = 50;
    this.energy = 50;
    this.hygiene = 50;
    this.happiness = 50;
    this.money = 100;
    
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
  
  initializeGameTime() {
    const now = new Date();
    this.gameTimeMinutes = now.getHours() * 60 + now.getMinutes();
    this.gameDay = 1;
    this.weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    this.currentWeekDay = this.weekDays[now.getDay()];
    this.greetingText = "";
  }

  preload() {
    // Load assets
    this.load.image("bg2", "/assets/bg2.png");
    this.load.image("house", "/assets/Outdoor decoration/House.png");
    this.load.audio("coin", "/assets/coin.mp3");
    this.load.audio("bgMusic", "/assets/bgMusic.mp3");
    this.load.spritesheet('player', '/assets/Player/Player.png', {frameWidth: 32, frameHeight: 32});
    
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
    
    // Add a few more houses in different locations
    let house2 = this.physics.add.sprite(800, 800, "house");
    house2.setScale(2);
    house2.setImmovable(true);
    house2.body.allowGravity = false;
    this.additionalHouses.push(house2);
    
    let house3 = this.physics.add.sprite(400, 1200, "house");
    house3.setScale(2);
    house3.setImmovable(true);
    house3.body.allowGravity = false;
    this.additionalHouses.push(house3);
    
    // Configure hitboxes similar to main house
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
  }
  
  createHouse() {
    // Create a physics-enabled house sprite
    this.house = this.physics.add.sprite(250, 250, "house");
    this.house.setOrigin(0.5, 0.5);
    this.house.setScale(2);
    this.house.setDepth(1);
    this.house.setImmovable(true);
    this.house.body.allowGravity = false;
    
    // Create a smaller but still effective collision box
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
    this.timeLabel = this.add.text(10, 40, "", { font: "20px Arial", fill: "#ffffff" });
    this.moneyText = this.add.text(370, 10, `Money: $${this.money}`, { font: "20px Arial", fill: "#ffffff" });
    
    // Add labels to UI container
    this.uiContainer.add([this.greetingLabel, this.timeLabel, this.moneyText]);
    
    // Update game time
    this.updateGameTime();
    
    // Create progress bars and labels
    this.createProgressBars();
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
    const hungerLabel = this.add.text(310, 48, "Hunger:", { font: "14px Arial", fill: "#ffffff" });
    const energyLabel = this.add.text(310, 68, "Energy:", { font: "14px Arial", fill: "#ffffff" });
    const hygieneLabel = this.add.text(310, 88, "Hygiene:", { font: "14px Arial", fill: "#ffffff" });
    const happinessLabel = this.add.text(310, 108, "Happiness:", { font: "14px Arial", fill: "#ffffff" });
    
    // Add to UI container so they stay fixed to the camera
    this.uiContainer.add([hungerLabel, energyLabel, hygieneLabel, happinessLabel]);
    this.uiContainer.add(Object.values(this.progressBars));
    
    // Draw initial progress bars
    this.drawProgressBars();
  }
  
  createPlayer() {
    // Create player animations
    this.createPlayerAnimations();
    
    // Create player sprite - use the saved position if returning from house
    this.player = this.physics.add.sprite(lastPlayerPos.x, lastPlayerPos.y, 'player');
    this.player.setScale(2);
    this.player.setImmovable(false);
    this.player.body.allowGravity = false;
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(3);
    
    // Adjust player collision box
    this.player.body.setSize(
      this.player.width * 0.6, 
      this.player.height * 0.5
    );
    this.player.body.setOffset(
      this.player.width * 0.2, 
      this.player.height * 0.5
    );
  }
  
  createPlayerAnimations() {
    this.anims.create({
      key: 'walk-right',
      frames: this.anims.generateFrameNumbers('player', { start: 6, end: 11 }),
      frameRate: 60,
      repeat: -1
    });
    
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('player', { start: 12, end: 17 }),
      frameRate: 60,
      repeat: -1
    });
    
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }),
      frameRate: 60,
      repeat: -1
    });
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
    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 1);
    border.strokeRect(minimapX, minimapY, minimapWidth, minimapHeight);
    border.setScrollFactor(0);
    border.setDepth(90); // Below UI but above other elements
  }
  
  setupControls() {
    this.cursor = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
  }
  
  setupTimers() {
    // Game time update timer (every 100ms = 10 game minutes)
    this.time.addEvent({
      delay: 100,
      callback: this.updateGameTime,
      callbackScope: this,
      loop: true
    });
    
    // Stats update timer (every 5 seconds)
    this.time.addEvent({
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
    this.gameTimeMinutes++;
  
    // Check for day rollover (24 hours passed)
    if (this.gameTimeMinutes >= 1440) {
      this.gameTimeMinutes = 0;
      this.gameDay++;
      let nextDayIndex = (this.weekDays.indexOf(this.currentWeekDay) + 1) % 7;
      this.currentWeekDay = this.weekDays[nextDayIndex];
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
      this.timeLabel.setText(`${this.currentWeekDay} | Day ${this.gameDay} | ${timeText}`);
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
        this.progressBars[bars[i]].fillRect(400, 50 + i * 20, stats[i], 10);
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

    this.handlePlayerMovement();
  }
  
  handlePlayerMovement() {
    const { left, right, up, down } = this.cursor;
    const { left: A, right: D, up: W, down: S } = this.wasd;

    // Reset velocity
    this.player.setVelocity(0);

    // Calculate movement speed
    let speed = this.playerSpeed;
    
    // Handle diagonal movement (normalize speed)
    const isDiagonal = 
      (left.isDown || A.isDown || right.isDown || D.isDown) && 
      (up.isDown || W.isDown || down.isDown || S.isDown);
    
    if (isDiagonal) {
      speed = speed * 0.7071; // Approximately 1/sqrt(2)
    }

    // Handle horizontal movement
    if (left.isDown || A.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
      if (!(up.isDown || W.isDown || down.isDown || S.isDown)) {
        this.player.anims.play('walk-right', true);
      }
    } else if (right.isDown || D.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
      if (!(up.isDown || W.isDown || down.isDown || S.isDown)) {
        this.player.anims.play('walk-right', true);
      }
    }

    // Handle vertical movement
    if (up.isDown || W.isDown) {
      this.player.setVelocityY(-speed);
      this.player.anims.play('walk-up', true);
    } else if (down.isDown || S.isDown) {
      this.player.setVelocityY(speed);
      this.player.anims.play('walk-down', true);
    }
    
    // If no movement keys are pressed, stop animations
    if (!(left.isDown || A.isDown || right.isDown || D.isDown || 
          up.isDown || W.isDown || down.isDown || S.isDown)) {
      this.player.anims.stop();
    }
  }

  // Add this function to GameScene to handle house entry
  canEnterHouse() {
    // Check if player is near the door - add extra conditions if needed
    return !isLoadingHouse;
  }

  // Add this function to GameScene to handle house entry
  enterHouse() {
    if (isLoadingHouse || isTransitioning) return;
    
    // Store current player position before entering house
    lastPlayerPos = { 
      x: this.player.x, 
      y: this.player.y + 50 // Add offset to prevent player from getting stuck in house collision
    };
    
    // Set transition flags to prevent movement and multiple triggers
    isLoadingHouse = true;
    isTransitioning = true;
    
    // Stop player movement immediately
    this.player.setVelocity(0);
    this.player.anims.stop();
    
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
      this.scene.start("scene-house");
    });
  }
}

// ===================== HOUSE SCENE CLASS =====================
class HouseScene extends Phaser.Scene {
  constructor() {
    super("scene-house");
    
    // Player properties
    this.player = null;
    this.playerSpeed = PLAYER_SPEED;
    
    // Input controls
    this.cursor = null;
    this.wasd = null;
    
    // Game state
    this.isGameOver = false;
    this.exitDoor = null;
  }
  
  create() {
    // Reset transition flag when house scene is created
    isTransitioning = false;
    
    // Create a house floor
    const floorTile = this.add.rectangle(0, 0, 500, 500, 0xc2a37c);
    floorTile.setOrigin(0, 0);
    
    // Add walls
    this.createWalls();
    
    // Create player
    this.createPlayer();
    
    // Create exit door
    this.createExitDoor();
    
    // Setup camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, 500, 500);
    
    // Setup controls
    this.setupControls();
    
    // Add furniture and decorations
    this.createFurniture();
    
    // Add greeting text
    const houseGreeting = this.add.text(
      250, 30, 
      `Welcome home, ${playerName}!`, 
      { font: "20px Arial", fill: "#000000" }
    );
    houseGreeting.setOrigin(0.5, 0);
    houseGreeting.setScrollFactor(0);
    
    // Add a brief delay before exit is active to prevent immediate exit
    this.exitActive = false;
    this.time.delayedCall(1000, () => {
      this.exitActive = true;
    });
  }
  
  createWalls() {
    // Create wall graphics
    const walls = this.physics.add.staticGroup();
    
    // Top wall
    walls.add(this.add.rectangle(0, 0, 500, 20, 0x8c6d46));
    // Bottom wall
    walls.add(this.add.rectangle(0, 480, 500, 20, 0x8c6d46));
    // Left wall
    walls.add(this.add.rectangle(0, 0, 20, 500, 0x8c6d46));
    // Right wall
    walls.add(this.add.rectangle(480, 0, 20, 500, 0x8c6d46));
    
    // Set wall origins
    walls.getChildren().forEach(wall => {
      wall.setOrigin(0, 0);
    });
    
    this.walls = walls;
  }
  
  createPlayer() {
    // Create player sprite - use saved position or default
    // Move player spawn position away from the exit door
    this.player = this.physics.add.sprite(
      lastHousePos.x, 
      Math.min(lastHousePos.y, 350), // Ensure player doesn't spawn below y=350 to stay away from exit
      'player'
    );
    this.player.setScale(2);
    this.player.body.allowGravity = false;
    this.player.setCollideWorldBounds(true);
    
    // Add collision with walls
    this.physics.add.collider(this.player, this.walls);
    
    // Adjust player collision box
    this.player.body.setSize(
      this.player.width * 0.6, 
      this.player.height * 0.5
    );
    this.player.body.setOffset(
      this.player.width * 0.2, 
      this.player.height * 0.5
    );
  }
  
  createExitDoor() {
    // Create exit door at the bottom of the house
    this.exitDoor = this.physics.add.sprite(250, 460, 'player');
    this.exitDoor.setScale(2);
    this.exitDoor.setTint(0x964B00);
    this.exitDoor.setImmovable(true);
    this.exitDoor.body.allowGravity = false;
    
    // Make the door hitbox smaller
    this.exitDoor.body.setSize(
      this.exitDoor.width * 0.5,
      this.exitDoor.height * 0.5
    );
    
    // Add interaction with exit door - add the canExitHouse check function
    this.physics.add.overlap(
      this.player, 
      this.exitDoor, 
      this.exitHouse, 
      this.canExitHouse, 
      this
    );
    
    // Add door text and make it more visible
    const doorText = this.add.text(
      250, 430, 
      "Exit", 
      { font: "18px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 }
    );
    doorText.setOrigin(0.5, 0);
    
    // Add a visual indicator for the door
    const doorArrow = this.add.text(
      250, 415,
      "⬇️",
      { font: "16px Arial" }
    );
    doorArrow.setOrigin(0.5, 0);
  }
  
  createFurniture() {
    // Add some basic furniture
    // Bed
    const bed = this.add.rectangle(400, 100, 80, 120, 0x6d9eeb);
    // Table
    const table = this.add.rectangle(150, 200, 100, 60, 0xa52a2a);
    // Chair
    const chair = this.add.rectangle(150, 270, 40, 40, 0xa52a2a);
    
    // Make furniture collidable
    [bed, table, chair].forEach(item => {
      this.physics.add.existing(item, true);
      this.physics.add.collider(this.player, item);
    });
  }
  
  setupControls() {
    this.cursor = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
  }
  
  exitHouse() {
    // Don't allow exit if not active yet or during transition
    if (!this.exitActive || isTransitioning) return;
    
    // Store house position before exiting
    lastHousePos = { x: this.player.x, y: this.player.y };
    
    // Set transition flag to prevent movement
    isTransitioning = true;
    
    // Start the safety timer
    addSafetyResetTimer();
    
    // Stop player movement immediately
    this.player.setVelocity(0);
    this.player.anims.stop();
    
    // Create a loading screen
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
      "Exiting house...", 
      { font: "24px Arial", fill: "#ffffff" }
    );
    loadingText.setOrigin(0.5);
    loadingText.setScrollFactor(0);
    loadingText.setDepth(1001);
    
    // Wait a moment, then switch back to the game scene
    this.time.delayedCall(1000, () => {
      // Properly shut down current scene and restart the game scene
      try {
        // Stop all running timers
        this.time.removeAllEvents();
        
        // Remove all game objects
        this.children.removeAll(true);
        
        // Switch to the game scene with a restart
        this.scene.stop('scene-house');
        this.scene.start('scene-game');
        
        console.log("Transition to main game complete");
      } catch (error) {
        console.error("Error during scene transition:", error);
      }
    });
  }
  
  update() {
    // Skip movement during transitions
    if (isTransitioning) {
      return;
    }
    
    this.handlePlayerMovement();
  }
  
  handlePlayerMovement() {
    const { left, right, up, down } = this.cursor;
    const { left: A, right: D, up: W, down: S } = this.wasd;

    // Reset velocity
    this.player.setVelocity(0);

    // Calculate movement speed
    let speed = this.playerSpeed;
    
    // Handle diagonal movement (normalize speed)
    const isDiagonal = 
      (left.isDown || A.isDown || right.isDown || D.isDown) && 
      (up.isDown || W.isDown || down.isDown || S.isDown);
    
    if (isDiagonal) {
      speed = speed * 0.7071; // Approximately 1/sqrt(2)
    }

    // Handle horizontal movement
    if (left.isDown || A.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
      if (!(up.isDown || W.isDown || down.isDown || S.isDown)) {
        this.player.anims.play('walk-right', true);
      }
    } else if (right.isDown || D.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
      if (!(up.isDown || W.isDown || down.isDown || S.isDown)) {
        this.player.anims.play('walk-right', true);
      }
    }

    // Handle vertical movement
    if (up.isDown || W.isDown) {
      this.player.setVelocityY(-speed);
      this.player.anims.play('walk-up', true);
    } else if (down.isDown || S.isDown) {
      this.player.setVelocityY(speed);
      this.player.anims.play('walk-down', true);
    }
    
    // If no movement keys are pressed, stop animations
    if (!(left.isDown || A.isDown || right.isDown || D.isDown || 
          up.isDown || W.isDown || down.isDown || S.isDown)) {
      this.player.anims.stop();
    }
  }

  // Add new function to prevent exit overlap from triggering immediately
  canExitHouse() {
    // Only allow exit if the flag is active
    return this.exitActive && !isTransitioning;
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