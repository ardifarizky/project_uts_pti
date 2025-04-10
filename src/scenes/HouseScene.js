import Phaser from 'phaser';
import Player from '../object/Player.js';

class HouseScene extends Phaser.Scene {
  constructor() {
    super("scene-house");
    
    // Configuration
    this.mapScale = 2;
    
    // External data (will be set via init)
    this.playerName = "";
    this.selectedCharacter = "ucup";
    this.playerSpeed = 350;
    this.gameSize = { width: 240, height: 160 };
    this.lastHousePos = { x: 250, y: 250 };
    this.isTransitioning = false;
    
    // Map layers
    this.map = null;
    this.groundsLayer = null;
    this.wallsLayer = null;
    this.furnitureLayer = null;
    this.doorLayer = null;
    this.bedLayer = null;
    
    // Game objects
    this.player = null;
    this.exitDoor = null;
    this.doorTiles = [];
    this.isGameOver = false;
    this.exitActive = false;
    
    // Chores system
    this.choreAreas = [];
    this.activeChoreArea = null;
    this.completedChores = {};
    
    // UI elements
    this.statsContainer = null;
    this.energyText = null;
    this.moneyText = null;
    this.hungerText = null;
    this.hygieneText = null;
    this.happinessText = null;
    this.choreButton = null;
    this.choreText = null;
  }

  // ----------------------------------------
  // SCENE LIFECYCLE METHODS
  // ----------------------------------------
  
  init(data) {
    // Set external data from main.js
    if (data.playerName) this.playerName = data.playerName;
    if (data.selectedCharacter) this.selectedCharacter = data.selectedCharacter;
    if (data.PLAYER_SPEED) this.playerSpeed = data.PLAYER_SPEED;
    if (data.GAME_SIZE) this.gameSize = data.GAME_SIZE;
    if (data.lastHousePos) this.lastHousePos = data.lastHousePos;
    if (data.isTransitioning !== undefined) this.isTransitioning = data.isTransitioning;
    
    // Connect to global stats and completedChores
    if (typeof window !== 'undefined') {
      if (window.completedChores) {
        this.completedChores = window.completedChores;
      }
    }
    
    console.log("HouseScene init: Using global playerStats:", window.playerStats);
  }
  
  preload() {
    // Load tilemap data
    this.load.tilemapTiledJSON('house-map', '/assets/tilemap/house.json');
    
    // Load tileset images
    this.load.image('bedroom1', '/assets/tiles/bedroom1.png');
    this.load.image('floor1', '/assets/tiles/floor1.png');
    this.load.image('wall1', '/assets/tiles/wall1.png');
    this.load.image('livingroom2', '/assets/tiles/livingroom2.png');
  }
  
  create() {
    // Reset transition flag when house scene is created
    this.isTransitioning = false;
    
    // Create the scene components in order
    this.createMap();
    this.createPlayer();
    this.createExitDoor();
    this.createChoreAreas();
    this.createUI();
    
    // Setup camera
    this.setupCamera();
    
    // Add greeting text
    this.displayWelcomeMessage();
    
    // Add a brief delay before exit is active to prevent immediate exit
    this.exitActive = false;
    this.time.delayedCall(1000, () => {
      this.exitActive = true;
    });
  }
  
  update() {
    // Update UI with latest stats
    this.updateStatsUI();
    
    // Skip movement during transitions
    if (this.isTransitioning) {
      return;
    }
    
    // Update player if it exists
    if (this.player) {
      this.player.update();
    }
    
    // Update chore areas visibility
    this.updateChoreAreas();
  }

  // ----------------------------------------
  // MAP CREATION METHODS
  // ----------------------------------------
  
  createMap() {
    // Create the tilemap
    this.map = this.make.tilemap({ key: 'house-map' });
    
    // Add the tilesets to the map
    const bedroom1Tileset = this.map.addTilesetImage('bedroom1', 'bedroom1');
    const floor1Tileset = this.map.addTilesetImage('floor1', 'floor1');
    const wall1Tileset = this.map.addTilesetImage('wall1', 'wall1');
    const livingroom2Tileset = this.map.addTilesetImage('livingroom2', 'livingroom2');
    
    // Create layers
    this.groundsLayer = this.map.createLayer('grounds', [floor1Tileset, bedroom1Tileset, livingroom2Tileset]).setDepth(0);
    this.wallsLayer = this.map.createLayer('walls', [wall1Tileset, bedroom1Tileset, livingroom2Tileset]).setDepth(1);
    this.furnitureLayer = this.map.createLayer('furniture', [bedroom1Tileset, livingroom2Tileset]).setDepth(2);
    this.doorLayer = this.map.createLayer('door', [wall1Tileset, bedroom1Tileset, livingroom2Tileset, floor1Tileset]);
    this.bedLayer = this.map.createLayer('bed', [bedroom1Tileset]).setDepth(3);
    
    // Scale the layers by map scale factor
    this.groundsLayer.setScale(this.mapScale);
    this.wallsLayer.setScale(this.mapScale);
    this.furnitureLayer.setScale(this.mapScale);
    this.doorLayer.setScale(this.mapScale);
    this.bedLayer.setScale(this.mapScale);
    
    // Set collision on layers
    this.wallsLayer.setCollisionByProperty({ collide: true });
    this.furnitureLayer.setCollisionByProperty({ collide: true });
    this.bedLayer.setCollisionByProperty({ collide: true });
    
    // Set layers to their default positions (0,0)
    this.doorLayer.setPosition(0, 0);
    this.groundsLayer.setPosition(0, 0);
    this.wallsLayer.setPosition(0, 0);
    this.furnitureLayer.setPosition(0, 0);
  }
  
  setupCamera() {
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(
      0, 
      0, 
      this.map.widthInPixels * this.mapScale, 
      this.map.heightInPixels * this.mapScale
    );
  }

  // ----------------------------------------
  // PLAYER METHODS
  // ----------------------------------------
  
  createPlayer() {
    // Create player using the Player class
    this.player = new Player(
      this, 
      this.lastHousePos.x * this.mapScale, 
      Math.min(this.lastHousePos.y, 350) * this.mapScale, // Ensure player doesn't spawn below y=350
      this.selectedCharacter
    );
    
    // Configure scene-specific settings
    this.player.playerSpeed = this.playerSpeed;
    
    // Add collision with tilemap layers
    this.physics.add.collider(this.player, this.wallsLayer);
    this.physics.add.collider(this.player, this.furnitureLayer);
    this.physics.add.collider(this.player, this.bedLayer);
  }
  
  // ----------------------------------------
  // DOOR METHODS
  // ----------------------------------------
  
  createExitDoor() {
    // Track door tiles
    this.doorTiles = [];
    
    // Find door tiles and create invisible trigger zones
    this.doorLayer.forEachTile(tile => {
      if (tile.index !== -1) {
        // Track this tile
        this.doorTiles.push(tile);
        
        // Create door trigger and indicators
        this.createDoorTrigger(tile);
      }
    });
    
    // Add debug message if no doors found
    this.displayDoorDebugInfo();
  }
  
  createDoorTrigger(tile) {
    // Create an invisible physics body for this door
    const worldX = (tile.x * tile.width + tile.width / 2) * this.mapScale;
    const worldY = (tile.y * tile.height + tile.height / 2) * this.mapScale;
    
    const doorTrigger = this.physics.add.sprite(worldX, worldY, null);
    doorTrigger.setVisible(false);
    doorTrigger.setImmovable(true);
    doorTrigger.body.allowGravity = false;
    
    // Adjust the size of the trigger area - make it larger than the tile for easier interaction
    doorTrigger.body.setSize(tile.width * this.mapScale * 1.5, tile.height * this.mapScale * 1.5);
    
    // Add overlap detection with debug log
    this.physics.add.overlap(
      this.player,
      doorTrigger,
      () => {
        console.log("Door overlap detected");
        if (this.exitActive && !this.isTransitioning) {
          console.log("Exiting house");
          this.exitHouse();
        }
      }
    );
    
    // Add indicators for each door
    this.createDoorIndicators(worldX, worldY);
    
    // Add a visible debug rectangle to show the door collision area in dev mode
    this.createDoorDebugVisual(worldX, worldY, tile);
  }
  
  createDoorIndicators(x, y) {
    const doorText = this.add.text(
      x,
      y - 20,
      "Exit",
      { font: "18px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 }
    );
    doorText.setOrigin(0.5, 0.5);
    
    const doorArrow = this.add.text(
      x,
      y - 40,
      "⬇️",
      { font: "16px Arial" }
    );
    doorArrow.setOrigin(0.5, 0.5);
  }
  
  createDoorDebugVisual(x, y, tile) {
    const debugRect = this.add.rectangle(
      x, 
      y,
      tile.width * this.mapScale * 1.5,
      tile.height * this.mapScale * 1.5,
      0xff0000,
      0.3
    );
  }
  
  displayDoorDebugInfo() {
    if (this.doorTiles.length === 0) {
      console.warn("No door tiles found in door layer!");
      
      // Add debug text to help with troubleshooting
      const debugText = this.add.text(
        this.gameSize.width / 2, 20,
        "No door tiles found!",
        { font: "16px Arial", fill: "#ff0000" }
      );
      debugText.setScrollFactor(0);
      debugText.setOrigin(0.5, 0);
    } else {
      console.log(`Found ${this.doorTiles.length} door tiles`);
      
      // Add debug text to help with troubleshooting
      const debugText = this.add.text(
        this.gameSize.width / 2, 20,
        `Found ${this.doorTiles.length} door tiles!`,
        { font: "16px Arial", fill: "#00ff00" }
      );
      debugText.setScrollFactor(0);
      debugText.setOrigin(0.5, 0);
    }
  }
  
  exitHouse() {
    // Don't allow exit if not active yet or during transition
    if (!this.exitActive || this.isTransitioning) return;
    
    // Prepare data to pass to the next scene
    const data = {
      lastHousePos: { 
        x: this.player.x / this.mapScale, 
        y: this.player.y / this.mapScale 
      },
      completedChores: this.completedChores
    };
    
    // Set transition flag to prevent movement
    this.isTransitioning = true;
    
    // Start the safety timer
    this.addSafetyResetTimer(data);
    
    // Stop player movement
    this.player.stopMovement();
    
    // Create transition screen
    this.createTransitionScreen("Exiting house...");
    
    // Wait a moment, then switch back to the game scene
    this.time.delayedCall(1000, () => {
      // Start the game scene with our data
      try {
        this.scene.start('scene-game', data);
        console.log("Starting game scene with data:", data);
      } catch (error) {
        console.error("Error transitioning to game scene:", error);
      }
    });
  }
  
  // ----------------------------------------
  // CHORES SYSTEM METHODS
  // ----------------------------------------
  
  createChoreAreas() {
    // Define chores with their locations, rewards, and energy costs
    const chores = [
      {
        name: 'Make Bed',
        x: 272,
        y: 192,
        width: 36*3,
        height: 36*2,
        reward: 20,
        energyCost: 15
      },
      {
        name: 'Dust Bookshelf',
        x: 490,
        y: 192,
        width: 36*4,
        height: 36*2,
        reward: 10,
        energyCost: 5
      }
    ];
    
    // Create interaction area for each chore
    chores.forEach(chore => this.createChoreArea(chore));
  }
  
  createChoreArea(chore) {
    // Create invisible physics area for overlap detection
    const area = this.add.rectangle(
      chore.x,
      chore.y,
      chore.width,
      chore.height,
      0xffffff, // White color
      0.0 // Completely transparent
    );
    
    // Set origin to top-left (0,0) instead of default center (0.5,0.5)
    area.setOrigin(0, 0);
    
    // Add physics to the area
    this.physics.add.existing(area, true); // true = static body
    
    // Store chore data with the area
    area.chore = chore;
    
    // Add to the list of chore areas
    this.choreAreas.push(area);
    
    // Add overlap detection with player
    this.physics.add.overlap(
      this.player,
      area,
      this.enterChoreArea,
      null,
      this
    );
    
    // Add a small indicator to show where chores can be done (optional)
    const indicator = this.add.text(
      chore.x,
      chore.y - 30,
      '✨',
      { font: '20px Arial' }
    );
    indicator.setOrigin(0.5, 0.5);
  }
  
  updateChoreAreas() {
    // Check if player is still in any chore area
    let playerInChoreArea = false;
    this.choreAreas.forEach(area => {
      if (Phaser.Geom.Rectangle.Overlaps(
        this.player.getBounds(),
        area.getBounds()
      )) {
        playerInChoreArea = true;
        this.activeChoreArea = area;
      }
    });
    
    // Hide chore button if player is not in a chore area
    if (!playerInChoreArea) {
      this.choreButton.setVisible(false);
      this.choreText.setVisible(false);
      this.activeChoreArea = null;
    }
  }
  
  // Called when player enters a chore area
  enterChoreArea(player, area) {
    // Set this as the active chore area
    this.activeChoreArea = area;
    
    const choreId = area.chore.name;
    const isCompleted = this.isChoreCompletedToday(choreId);
    
    // Update and show the chore button with appropriate text
    if (isCompleted) {
      this.choreText.setText(`${area.chore.name} (Done for today)`);
      this.choreButton.setFillStyle(0x888888); // Gray out the button
    } else {
      this.choreText.setText(`${area.chore.name} ($${area.chore.reward})`);
      this.choreButton.setFillStyle(0x00aa00); // Green button for available chores
    }
    
    this.choreButton.setVisible(true);
    this.choreText.setVisible(true);
  }
  
  // Check if a chore has been completed today
  isChoreCompletedToday(choreId) {
    if (!this.completedChores[choreId]) {
      return false;
    }
    
    const lastCompletionTime = this.completedChores[choreId];
    const now = new Date();
    const lastCompletion = new Date(lastCompletionTime);
    
    // Reset at midnight - check if it's a different day
    return now.toDateString() === lastCompletion.toDateString();
  }
  
  // Called when player performs a chore
  doChore() {
    if (!this.activeChoreArea) return;
    
    const chore = this.activeChoreArea.chore;
    const choreId = chore.name;
    const playerStats = this.getPlayerStats();
    
    // Check if the chore has already been completed today
    if (this.isChoreCompletedToday(choreId)) {
      this.showTemporaryMessage('Already done for today!', '#ffaa00');
      return;
    }
    
    // Check if player has enough energy
    if (playerStats.energy < chore.energyCost) {
      this.showTemporaryMessage('Not enough energy!', '#ff0000');
      return;
    }
    
    // Decrease energy and update global
    this.updatePlayerStat('energy', playerStats.energy - chore.energyCost);
    
    // Increase money and update global
    this.updatePlayerStat('money', playerStats.money + chore.reward);
    
    // Update UI
    this.updateStatsUI();
    
    // Show success message
    this.showTemporaryMessage(
      `Completed ${chore.name}!\n+$${chore.reward}`, 
      '#00ff00'
    );
    
    // Mark the chore as completed today
    this.completedChores[chore.name] = new Date().toISOString();
    
    // Update the button appearance
    this.choreText.setText(`${chore.name} (Done for today)`);
    this.choreButton.setFillStyle(0x888888);
  }
  
  // ----------------------------------------
  // UI METHODS
  // ----------------------------------------
  
  createUI() {
    this.createStatsDisplay();
    this.createChoreButton();
  }
  
  createStatsDisplay() {
    // Get current stats from global
    const playerStats = this.getPlayerStats();
    
    // Create stats container
    this.statsContainer = this.add.container(20, 20);
    this.statsContainer.setScrollFactor(0);
    this.statsContainer.setDepth(100);
    
    // Create stats text elements
    const textStyle = { 
      font: '18px Arial', 
      fill: '#ffffff', 
      stroke: '#000000', 
      strokeThickness: 3 
    };
    
    this.energyText = this.add.text(0, 0, `Energy: ${playerStats.energy}`, textStyle);
    this.moneyText = this.add.text(0, 30, `Money: $${playerStats.money}`, textStyle);
    this.hungerText = this.add.text(0, 60, `Hunger: ${playerStats.hunger}`, textStyle);
    this.hygieneText = this.add.text(0, 90, `Hygiene: ${playerStats.hygiene}`, textStyle);
    this.happinessText = this.add.text(0, 120, `Happiness: ${playerStats.happiness}`, textStyle);
    
    // Add texts to container
    this.statsContainer.add([
      this.energyText, 
      this.moneyText,
      this.hungerText,
      this.hygieneText,
      this.happinessText
    ]);
  }
  
  createChoreButton() {
    // Create chore button (initially hidden)
    this.choreButton = this.add.rectangle(
      this.gameSize.width / 2, 
      this.gameSize.height - 100,
      200, 
      50,
      0x00aa00
    );
    this.choreButton.setScrollFactor(0);
    this.choreButton.setDepth(100);
    this.choreButton.setInteractive({ useHandCursor: true });
    this.choreButton.on('pointerdown', () => this.doChore());
    
    this.choreText = this.add.text(
      this.gameSize.width / 2, 
      this.gameSize.height - 100,
      'Do Chore',
      { font: '18px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 2 }
    );
    this.choreText.setOrigin(0.5, 0.5);
    this.choreText.setScrollFactor(0);
    this.choreText.setDepth(101);
    
    // Hide chore button initially
    this.choreButton.setVisible(false);
    this.choreText.setVisible(false);
  }
  
  displayWelcomeMessage() {
    const houseGreeting = this.add.text(
      this.gameSize.width/2, 
      30, 
      `Welcome home, ${this.playerName}!`, 
      { font: "20px Arial", fill: "#000000" }
    );
    houseGreeting.setOrigin(0.5, 0);
    houseGreeting.setScrollFactor(0);
  }
  
  createTransitionScreen(message) {
    // Create a loading screen
    const loadingScreen = this.add.rectangle(
      0, 0, 
      this.gameSize.width, this.gameSize.height, 
      0x000000, 0.8
    );
    loadingScreen.setOrigin(0, 0);
    loadingScreen.setScrollFactor(0);
    loadingScreen.setDepth(1000);
    
    const loadingText = this.add.text(
      this.gameSize.width/2, this.gameSize.height/2, 
      message, 
      { font: "24px Arial", fill: "#ffffff" }
    );
    loadingText.setOrigin(0.5);
    loadingText.setScrollFactor(0);
    loadingText.setDepth(1001);
  }
  
  showTemporaryMessage(text, color = '#ffffff') {
    const message = this.add.text(
      this.gameSize.width / 2,
      this.gameSize.height / 2,
      text,
      { 
        font: '24px Arial', 
        fill: color, 
        stroke: '#000000', 
        strokeThickness: 3, 
        align: 'center' 
      }
    );
    message.setOrigin(0.5, 0.5);
    message.setScrollFactor(0);
    message.setDepth(200);
    
    // Remove the message after a delay
    this.time.delayedCall(1500, () => {
      message.destroy();
    });
  }
  
  updateStatsUI() {
    if (!this.statsContainer) return;
    
    const playerStats = this.getPlayerStats();
    
    // Update all stats text
    if (this.energyText) this.energyText.setText(`Energy: ${playerStats.energy}`);
    if (this.moneyText) this.moneyText.setText(`Money: $${playerStats.money}`);
    if (this.hungerText) this.hungerText.setText(`Hunger: ${playerStats.hunger}`);
    if (this.hygieneText) this.hygieneText.setText(`Hygiene: ${playerStats.hygiene}`);
    if (this.happinessText) this.happinessText.setText(`Happiness: ${playerStats.happiness}`);
  }
  
  // ----------------------------------------
  // UTILITY METHODS
  // ----------------------------------------
  
  // Helper method to get playerStats from global
  getPlayerStats() {
    return typeof window !== 'undefined' && window.playerStats 
      ? window.playerStats 
      : { energy: 50, money: 100, hunger: 50, hygiene: 50, happiness: 50 };
  }
  
  // Helper method to update a specific stat
  updatePlayerStat(stat, value) {
    if (typeof window !== 'undefined' && window.playerStats) {
      window.playerStats[stat] = value;
    }
  }
  
  // Safety timer function to handle transition issues
  addSafetyResetTimer(data) {
    // If transition takes too long, force a reset
    console.log("Safety timer started");
    setTimeout(() => {
      if (this.isTransitioning) {
        console.log("Safety timeout triggered - resetting game state");
        this.isTransitioning = false;
        if (this.scene) {
          try {
            // Don't call stop first, just start the new scene
            this.scene.start('scene-game', data);
          } catch (error) {
            console.error("Error resetting game:", error);
          }
        }
      }
    }, 5000); // 5 seconds timeout
  }
}

export default HouseScene;
