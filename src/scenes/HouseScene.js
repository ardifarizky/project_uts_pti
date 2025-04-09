import Phaser from 'phaser';
import Player from '../object/Player.js';

// External variables that will be passed in from main.js
let isTransitioning = false;
let lastHousePos = { x: 250, y: 250 };
let playerName = "";
let selectedCharacter = "ucup";
let PLAYER_SPEED = 350;
let GAME_SIZE = {
  width: 960,
  height: 540
};

class HouseScene extends Phaser.Scene {
  constructor() {
    super("scene-house");
    
    // Player properties
    this.player = null;
    this.playerSpeed = PLAYER_SPEED;
    
    // Input controls
    this.cursor = null;
    
    // Game state
    this.isGameOver = false;
    this.exitDoor = null;
  }

  // Function to initialize external variables from main.js
  init(data) {
    if (data.isTransitioning !== undefined) isTransitioning = data.isTransitioning;
    if (data.lastHousePos) lastHousePos = data.lastHousePos;
    if (data.playerName) playerName = data.playerName;
    if (data.selectedCharacter) selectedCharacter = data.selectedCharacter;
    if (data.PLAYER_SPEED) PLAYER_SPEED = data.PLAYER_SPEED;
    if (data.GAME_SIZE) GAME_SIZE = data.GAME_SIZE;
  }
  
  create() {
    // Reset transition flag when house scene is created
    isTransitioning = false;
    
    // Create a house floor
    const floorTile = this.add.rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, 0xc2a37c);
    floorTile.setOrigin(0, 0);
    
    // Add walls
    this.createWalls();
    
    // Create player
    this.createPlayer();
    
    // Create exit door
    this.createExitDoor();
    
    // Setup camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, GAME_SIZE.width, GAME_SIZE.height);
    
    // Setup controls
    this.setupControls();
    
    // Add furniture and decorations
    this.createFurniture();
    
    // Add greeting text
    const houseGreeting = this.add.text(
      GAME_SIZE.width/2, 30, 
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
    walls.add(this.add.rectangle(0, 0, GAME_SIZE.width, 20, 0x8c6d46));
    // Bottom wall
    walls.add(this.add.rectangle(0, GAME_SIZE.height - 20, GAME_SIZE.width, 20, 0x8c6d46));
    // Left wall
    walls.add(this.add.rectangle(0, 0, 20, GAME_SIZE.height, 0x8c6d46));
    // Right wall
    walls.add(this.add.rectangle(GAME_SIZE.width - 20, 0, 20, GAME_SIZE.height, 0x8c6d46));
    
    // Set wall origins
    walls.getChildren().forEach(wall => {
      wall.setOrigin(0, 0);
    });
    
    this.walls = walls;
  }
  
  createPlayer() {
    // Create player using the new Player class
    this.player = new Player(
      this, 
      lastHousePos.x, 
      Math.min(lastHousePos.y, 350), // Ensure player doesn't spawn below y=350
      selectedCharacter
    );
    
    // Configure scene-specific settings
    this.player.playerSpeed = PLAYER_SPEED;
    
    // Add collision with walls
    this.physics.add.collider(this.player, this.walls);
  }
  
  createExitDoor() {
    // Create exit door at the bottom of the house
    this.exitDoor = this.physics.add.sprite(GAME_SIZE.width / 2, GAME_SIZE.height - 40, 'player');
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
      GAME_SIZE.width / 2, GAME_SIZE.height - 70, 
      "Exit", 
      { font: "18px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 }
    );
    doorText.setOrigin(0.5, 0);
    
    // Add a visual indicator for the door
    const doorArrow = this.add.text(
      GAME_SIZE.width / 2, GAME_SIZE.height - 85,
      "⬇️",
      { font: "16px Arial" }
    );
    doorArrow.setOrigin(0.5, 0);
  }
  
  createFurniture() {
    // Add some basic furniture
    // Bed
    const bed = this.add.rectangle(GAME_SIZE.width * 0.8, GAME_SIZE.height * 0.2, 120, 180, 0x6d9eeb);
    // Table
    const table = this.add.rectangle(GAME_SIZE.width * 0.3, GAME_SIZE.height * 0.4, 150, 80, 0xa52a2a);
    // Chair
    const chair = this.add.rectangle(GAME_SIZE.width * 0.3, GAME_SIZE.height * 0.5, 60, 60, 0xa52a2a);
    
    // Add more furniture for the larger space
    const sofa = this.add.rectangle(GAME_SIZE.width * 0.6, GAME_SIZE.height * 0.6, 200, 70, 0x964B00);
    const tv = this.add.rectangle(GAME_SIZE.width * 0.6, GAME_SIZE.height * 0.3, 120, 20, 0x333333);
    const bookshelf = this.add.rectangle(GAME_SIZE.width * 0.15, GAME_SIZE.height * 0.2, 40, 120, 0x8B4513);
    
    // Make furniture collidable
    ;
  }
  
  setupControls() {
    // No need to create cursor keys here as Player class handles its own input
  }
  
  exitHouse() {
    // Don't allow exit if not active yet or during transition
    if (!this.exitActive || isTransitioning) return;
    
    // Set data to be sent back to main scene
    this.data = {
      lastHousePos: { x: this.player.x, y: this.player.y }
    };
    
    // Set transition flag to prevent movement
    isTransitioning = true;
    
    // Start the safety timer
    this.addSafetyResetTimer();
    
    // Stop player movement
    this.player.stopMovement();
    
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
        this.scene.start('scene-game', this.data);
        
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
    
    // Update player if it exists
    if (this.player) {
      this.player.update();
    }
  }

  // Add new function to prevent exit overlap from triggering immediately
  canExitHouse() {
    // Only allow exit if the flag is active
    return this.exitActive && !isTransitioning;
  }
  
  // Safety timer function moved from main.js to inside the class
  addSafetyResetTimer() {
    // If transition takes too long, force a reset
    console.log("Safety timer started");
    setTimeout(() => {
      if (isTransitioning) {
        console.log("Safety timeout triggered - resetting game state");
        isTransitioning = false;
        if (this.scene) {
          try {
            this.scene.stop('scene-house');
            this.scene.start('scene-game');
          } catch (error) {
            console.error("Error resetting game:", error);
            location.reload(); // Last resort - reload the page
          }
        }
      }
    }, 5000); // 5 seconds timeout
  }
}

export default HouseScene;
