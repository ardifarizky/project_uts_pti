// ===================== GLOBAL VARIABLES & SETUP =====================
let playerName = "";
let isNameInputActive = true; // Default to true since name input starts active

// DOM element references
const gameStartBtn = document.getElementById("gameStartBtn");
const gameStartDiv = document.getElementById("gameStartDiv");

// Game constants
const GAME_SIZE = {
  width: 500,
  height: 500
};
const SPEED_DOWN = 300;
const PLAYER_SPEED = SPEED_DOWN + 50;

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

// ===================== GAME SCENE CLASS =====================
import './style.css';
import Phaser from 'phaser';

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
  }

  create() {
    // Initially pause game until name is entered
    this.scene.pause("scene-game");
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Setup audio
    this.setupAudio();
    
    // Create environment
    this.createEnvironment();
    
    // Create UI elements
    this.createUI();
    
    // Create player and animations
    this.createPlayer();
    
    // Create house
    this.createHouse();

    // Add collision between player and house
    this.physics.add.collider(this.player, this.house);

    // Setup camera
    this.setupCamera();
    
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
      console.log("Input nama aktif");
    });

    document.getElementById('playerName').addEventListener('blur', () => {
      isNameInputActive = false;
      console.log("Input nama tidak aktif");
    });
  }
  
  setupAudio() {
    // Sound effects
    this.coinMusic = this.sound.add("coin");
    
    // Background music
    this.bgMusic = this.sound.add("bgMusic");
    this.bgMusic.play();
  }
  
  createEnvironment() {
    // Add background
    this.add.image(0, 0, "bg2").setOrigin(0, 0).setDisplaySize(GAME_SIZE.width, GAME_SIZE.height);
  }
  
  createHouse() {
    // Create a physics-enabled house sprite
    this.house = this.physics.add.sprite(250, 250, "house");
    this.house.setOrigin(0.5, 0.5);
    this.house.setScale(2);
    this.house.setDepth(1);
    this.house.setImmovable(true);
    this.house.body.allowGravity = false;
    
    // Adjust collision box
    this.house.setSize(
      this.house.width * 0.8, 
      this.house.height * 0.5
    ).setOffset(
      this.house.width * 0.1,
      this.house.height * 0.5
    );
  }

  createUI() {
    // Create greeting and time labels
    this.greetingLabel = this.add.text(10, 10, "", { font: "20px Arial", fill: "#ffffff" });
    this.timeLabel = this.add.text(10, 40, "", { font: "20px Arial", fill: "#ffffff" });
    this.updateGameTime();
    
    // Create money text
    this.moneyText = this.add.text(370, 10, `Money: $${this.money}`, { font: "20px Arial", fill: "#ffffff" });
    
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
    
    // Labels
    this.add.text(310, 48, "Hunger:", { font: "14px Arial", fill: "#ffffff" });
    this.add.text(310, 68, "Energy:", { font: "14px Arial", fill: "#ffffff" });
    this.add.text(310, 88, "Hygiene:", { font: "14px Arial", fill: "#ffffff" });
    this.add.text(310, 108, "Happiness:", { font: "14px Arial", fill: "#ffffff" });
    
    // Draw initial progress bars
    this.drawProgressBars();
  }
  
  createPlayer() {
    // Create player animations
    this.createPlayerAnimations();
    
    // Create player sprite
    this.player = this.physics.add.sprite(100, 100, 'player');
    this.player.setScale(2);
    this.player.setImmovable(true);
    this.player.body.allowGravity = false;
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(3)
    
    // Adjust player collision box
    this.player.setSize(
      this.player.width - this.player.width / 4, 
      this.player.height / 2
    ).setOffset(
      this.player.width / 10, 
      this.player.height - this.player.height / 2
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
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 500, 500);
    this.cameras.main.setZoom(1);
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
    this.emitter = this.add.particles(0, 0, "money", {
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
  
    // Update text labels
    this.greetingLabel.setText(this.greetingText);
    this.timeLabel.setText(`${this.currentWeekDay} | Day ${this.gameDay} | ${timeText}`);
  }  

  updateStats() {
    // Decrease stats over time
    this.hunger = Math.max(0, this.hunger - 2);
    this.energy = Math.max(0, this.energy - 1);
    this.hygiene = Math.max(0, this.hygiene - 3);
    this.happiness = Math.max(0, this.happiness - 1);

    // Update UI
    this.drawProgressBars();
    this.moneyText.setText(`Money: $${this.money}`);

    // Check for game over condition
    if (this.hunger === 0 || this.energy === 0 || this.hygiene === 0 || this.happiness === 0) {
      this.gameOver();
    }
  }
  
  drawProgressBars() {
    // Clear previous bars
    Object.values(this.progressBars).forEach(bar => bar.clear());
  
    // Colors for bars: red, yellow, green, blue
    const colors = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff];
    const stats = [this.hunger, this.energy, this.hygiene, this.happiness];
    const bars = ["hunger", "energy", "hygiene", "happiness"];
    
    // Draw each bar
    for (let i = 0; i < bars.length; i++) {
      this.progressBars[bars[i]].fillStyle(colors[i], 1);
      this.progressBars[bars[i]].fillRect(400, 50 + i * 20, stats[i], 10);
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
    // Skip movement if name input is active
    if (isNameInputActive) {
      return;
    }

    this.handlePlayerMovement();
  }
  
  handlePlayerMovement() {
    const { left, right, up, down } = this.cursor;
    const { left: A, right: D, up: W, down: S } = this.wasd;

    // Handle horizontal movement
    if (left.isDown || A.isDown) {
      this.player.setVelocityX(-this.playerSpeed);
      this.player.setFlipX(true);
      this.player.anims.play('walk-right', true);
    } else if (right.isDown || D.isDown) {
      this.player.setVelocityX(this.playerSpeed);
      this.player.setFlipX(false);
      this.player.anims.play('walk-right', true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.stop();
    }

    // Handle vertical movement
    if (up.isDown || W.isDown) {
      this.player.setVelocityY(-this.playerSpeed);
      this.player.anims.play('walk-up', true);
    } else if (down.isDown || S.isDown) {
      this.player.setVelocityY(this.playerSpeed);
      this.player.anims.play('walk-down', true);
    } else {
      this.player.setVelocityY(0);
      this.player.anims.stop();
    }
  }
}

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
      debug: true
    }
  },
  scene: [GameScene]
};

const game = new Phaser.Game(config);