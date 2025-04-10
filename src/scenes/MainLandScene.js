import Phaser from 'phaser';
import Player from '../object/Player.js';

class MainLandScene extends Phaser.Scene {
  constructor() {
    super("scene-mainland");
    
    // Configuration
    this.mapScale = 2;
    
    // External data (will be set via init)
    this.playerName = "";
    this.selectedCharacter = "ucup";
    this.playerSpeed = 350;
    this.gameSize = { width: 240, height: 160 };
    this.lastMainlandPos = { x: 250, y: 250 };
    this.isTransitioning = false;
    
    // Map layers
    this.map = null;
    this.groundLayer = null;
    this.roadLayer = null;
    this.underObstaclesLayer = null;
    this.bottomLayer = null;
    this.obstaclesLayer = null;
    this.topObstaclesLayer = null;
    this.topLayer = null;
    this.signsLayer = null;
    
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
    if (data.lastMainlandPos) this.lastMainlandPos = data.lastMainlandPos;
    if (data.isTransitioning !== undefined) this.isTransitioning = data.isTransitioning;
    
    // Connect to global stats and completedChores
    if (typeof window !== 'undefined') {
      if (window.completedChores) {
        this.completedChores = window.completedChores;
      }
    }
    
    console.log("MainLandScene init: Using global playerStats:", window.playerStats);
  }
  
  preload() {
    // Load tilemap data
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
    // Reset transition flag when mainland scene is created
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

  // ----------------------------------------
  // MAP CREATION METHODS
  // ----------------------------------------
  
  createMap() {
    // Create the tilemap
    this.map = this.make.tilemap({ key: 'mainland-map' });
    
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
    
    // Scale the layers by map scale factor
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
    
    // Set layers to their default positions (0,0)
    this.groundLayer.setPosition(0, 0);
    this.roadLayer.setPosition(0, 0);
    this.underObstaclesLayer.setPosition(0, 0);
    this.bottomLayer.setPosition(0, 0);
    this.obstaclesLayer.setPosition(0, 0);
    this.topObstaclesLayer.setPosition(0, 0);
    this.topLayer.setPosition(0, 0);
    this.signsLayer.setPosition(0, 0);
  }

  // ----------------------------------------
  // PLAYER METHODS
  // ----------------------------------------
  
  createPlayer() {
    // Create player using the Player class
    this.player = new Player(
      this, 
      this.lastMainlandPos.x * this.mapScale, 
      Math.min(this.lastMainlandPos.y, 350) * this.mapScale, // Ensure player doesn't spawn below y=350
      this.selectedCharacter
    );
    
    // Configure scene-specific settings
    this.player.playerSpeed = this.playerSpeed;
    
    // Enable physics body for the player if not already enabled
    if (!this.player.body) {
      this.physics.world.enable(this.player);
    }
    
    // Add collision with tilemap layers
    this.physics.add.collider(this.player, this.obstaclesLayer);
    this.physics.add.collider(this.player, this.topObstaclesLayer);
    this.physics.add.collider(this.player, this.bottomLayer);
    this.physics.add.collider(this.player, this.underObstaclesLayer);
  }
  
  createExitDoor() {
    // Find door tile objects
    this.doorTiles = [];
    
    const doorObjects = this.map.getObjectLayer('exit');
    if (doorObjects && doorObjects.objects) {
      doorObjects.objects.forEach(doorObj => {
        // Create a zone for the door
        const doorZone = this.add.zone(
          doorObj.x * this.mapScale, 
          doorObj.y * this.mapScale,
          doorObj.width * this.mapScale,
          doorObj.height * this.mapScale
        );
        
        // Enable physics on the zone
        this.physics.world.enable(doorZone);
        doorZone.body.setImmovable(true);
        doorZone.body.moves = false;
        
        // Add to doorTiles array
        this.doorTiles.push(doorZone);
        
        // Add overlap with player
        this.physics.add.overlap(
          this.player,
          doorZone,
          this.exitToMainGame,
          null,
          this
        );
      });
    }
  }
  
  createChoreAreas() {
    // Clear previous chore areas
    this.choreAreas = [];
    
    // Initialize completed chores if not already done
    if (!this.completedChores) {
      this.completedChores = {};
    }
    
    // Get chore interaction areas from object layer
    const choreLayer = this.map.getObjectLayer('chores');
    
    if (choreLayer && choreLayer.objects) {
      choreLayer.objects.forEach(choreObj => {
        // Create zone for the chore
        const choreZone = this.add.zone(
          choreObj.x * this.mapScale,
          choreObj.y * this.mapScale,
          choreObj.width * this.mapScale,
          choreObj.height * this.mapScale
        );
        
        // Enable physics on the zone
        this.physics.world.enable(choreZone);
        choreZone.body.setImmovable(true);
        choreZone.body.moves = false;
        
        // Store chore properties from Tiled
        choreZone.choreName = choreObj.name || 'Unknown Chore';
        choreZone.choreType = choreObj.properties?.find(p => p.name === 'type')?.value || 'generic';
        choreZone.energyCost = choreObj.properties?.find(p => p.name === 'energyCost')?.value || 10;
        choreZone.moneyReward = choreObj.properties?.find(p => p.name === 'moneyReward')?.value || 5;
        choreZone.hungerCost = choreObj.properties?.find(p => p.name === 'hungerCost')?.value || 5;
        choreZone.happinessChange = choreObj.properties?.find(p => p.name === 'happinessChange')?.value || 0;
        choreZone.hygieneChange = choreObj.properties?.find(p => p.name === 'hygieneChange')?.value || 0;
        
        // Add zone to chore areas array
        this.choreAreas.push(choreZone);
        
        // Add overlap with player
        this.physics.add.overlap(
          this.player,
          choreZone,
          this.enterChoreArea,
          null,
          this
        );
      });
    }
  }
  
  setupCamera() {
    // Configure camera to follow player
    this.cameras.main.startFollow(this.player);
    
    // Set camera bounds to map size
    const mapWidth = this.map.widthInPixels * this.mapScale;
    const mapHeight = this.map.heightInPixels * this.mapScale;
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    
    // Set physics world bounds
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
  }
  
  createUI() {
    // Create a container for all UI elements
    this.statsContainer = this.add.container(10, 10);
    this.statsContainer.setScrollFactor(0); // Fix to camera
    
    // Display player stats from global playerStats
    const stats = this.getPlayerStats();
    
    // Create text elements for stats
    this.energyText = this.add.text(0, 0, `Energy: ${stats.energy}`, {
      font: '16px Arial',
      fill: '#ffffff'
    });
    
    this.moneyText = this.add.text(0, 20, `Money: $${stats.money}`, {
      font: '16px Arial',
      fill: '#ffffff'
    });
    
    this.hungerText = this.add.text(0, 40, `Hunger: ${stats.hunger}`, {
      font: '16px Arial',
      fill: '#ffffff'
    });
    
    this.hygieneText = this.add.text(0, 60, `Hygiene: ${stats.hygiene}`, {
      font: '16px Arial',
      fill: '#ffffff'
    });
    
    this.happinessText = this.add.text(0, 80, `Happiness: ${stats.happiness}`, {
      font: '16px Arial',
      fill: '#ffffff'
    });
    
    // Add chore interaction button (initially hidden)
    this.choreButton = this.add.text(
      this.gameSize.width / 2, 
      this.gameSize.height - 50,
      'Do Chore',
      {
        font: '18px Arial',
        fill: '#ffffff',
        backgroundColor: '#4a4a4a',
        padding: { left: 10, right: 10, top: 5, bottom: 5 }
      }
    );
    
    this.choreButton.setOrigin(0.5, 0.5);
    this.choreButton.setScrollFactor(0);
    this.choreButton.setInteractive({ useHandCursor: true });
    this.choreButton.on('pointerdown', this.doChore, this);
    this.choreButton.visible = false;
    
    // Info text for chores (initially empty)
    this.choreText = this.add.text(
      this.gameSize.width / 2,
      this.gameSize.height - 80,
      '',
      {
        font: '16px Arial',
        fill: '#ffffff'
      }
    );
    
    this.choreText.setOrigin(0.5, 0.5);
    this.choreText.setScrollFactor(0);
    this.choreText.visible = false;
    
    // Add all UI elements to the container
    this.statsContainer.add([
      this.energyText,
      this.moneyText,
      this.hungerText,
      this.hygieneText,
      this.happinessText
    ]);
  }
  
  displayWelcomeMessage() {
    // Create a welcome message
    const messageText = this.add.text(
      this.gameSize.width / 2,
      100,
      `Welcome to the mainland, ${this.playerName}!`,
      {
        font: '20px Arial',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    
    messageText.setOrigin(0.5, 0.5);
    messageText.setScrollFactor(0);
    
    // Fade out after a few seconds
    this.tweens.add({
      targets: messageText,
      alpha: 0,
      delay: 3000,
      duration: 1000,
      onComplete: () => {
        messageText.destroy();
      }
    });
  }
  
  exitToMainGame() {
    // Don't allow exit if not active yet or during transition
    if (!this.exitActive || this.isTransitioning) return;
    
    // Prepare data to pass to the next scene
    const data = {
      lastMainlandPos: { 
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
    this.createTransitionScreen("Exiting mainland...");
    
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
  
  addSafetyResetTimer(data) {
    // Add a safety timer in case the transition gets stuck
    console.log("Safety timer started for mainland scene");
    this.time.delayedCall(5000, () => {
      if (this.scene.key === 'scene-mainland') {
        console.log("Safety timeout triggered - forcing transition to game scene");
        this.scene.start('scene-game', data);
      }
    });
  }
  
  createTransitionScreen(message) {
    // Create black overlay
    const overlay = this.add.rectangle(
      0, 0,
      this.gameSize.width, this.gameSize.height,
      0x000000, 0.8
    );
    overlay.setOrigin(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);
    
    // Add loading text
    const loadingText = this.add.text(
      this.gameSize.width / 2,
      this.gameSize.height / 2,
      message,
      { font: "24px Arial", fill: "#ffffff" }
    );
    loadingText.setOrigin(0.5, 0.5);
    loadingText.setScrollFactor(0);
    loadingText.setDepth(1001);
  }
  
  enterChoreArea(player, choreZone) {
    // Don't allow chore interactions if we're transitioning
    if (this.isTransitioning) return;
    
    // Set as the active chore area
    this.activeChoreArea = choreZone;
    
    // Check if this chore is already completed today
    const isCompleted = this.completedChores[choreZone.choreName] === true;
    
    // Show chore information and interaction button
    this.choreText.setText(
      isCompleted
      ? `${choreZone.choreName} - Already completed today`
      : `${choreZone.choreName} - Energy: -${choreZone.energyCost}, Money: +$${choreZone.moneyReward}`
    );
    this.choreText.visible = true;
    
    // Only show the button if chore is not completed
    this.choreButton.visible = !isCompleted;
  }
  
  doChore() {
    // Safety check
    if (!this.activeChoreArea) return;
    
    // Get current stats
    const stats = this.getPlayerStats();
    
    // Check if player has enough energy
    if (stats.energy < this.activeChoreArea.energyCost) {
      // Show not enough energy message
      this.showStatusMessage("Not enough energy!");
      return;
    }
    
    // Apply chore effects
    stats.energy = Math.max(0, stats.energy - this.activeChoreArea.energyCost);
    stats.money += this.activeChoreArea.moneyReward;
    stats.hunger = Math.max(0, stats.hunger - this.activeChoreArea.hungerCost);
    stats.happiness += this.activeChoreArea.happinessChange;
    stats.hygiene += this.activeChoreArea.hygieneChange;
    
    // Cap stats at 100
    stats.hunger = Math.min(100, stats.hunger);
    stats.energy = Math.min(100, stats.energy);
    stats.hygiene = Math.min(100, stats.hygiene);
    stats.happiness = Math.min(100, stats.happiness);
    
    // Update UI
    this.updateStatsDisplay(stats);
    
    // Mark chore as completed
    this.completedChores[this.activeChoreArea.choreName] = true;
    
    // Update global completedChores
    if (typeof window !== 'undefined') {
      window.completedChores = this.completedChores;
    }
    
    // Update global playerStats
    if (typeof window !== 'undefined') {
      window.playerStats = stats;
    }
    
    // Show completion message
    this.showStatusMessage(`${this.activeChoreArea.choreName} completed! Earned $${this.activeChoreArea.moneyReward}`);
    
    // Hide chore UI
    this.choreText.visible = false;
    this.choreButton.visible = false;
    
    // Clear active chore
    this.activeChoreArea = null;
  }
  
  showStatusMessage(message) {
    // Add status message that fades out
    const statusText = this.add.text(
      this.gameSize.width / 2,
      this.gameSize.height / 2,
      message,
      { 
        font: '20px Arial',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        backgroundColor: '#333333',
        padding: { left: 15, right: 15, top: 10, bottom: 10 }
      }
    );
    
    statusText.setOrigin(0.5, 0.5);
    statusText.setScrollFactor(0);
    statusText.setDepth(100);
    
    // Fade out and destroy after a moment
    this.tweens.add({
      targets: statusText,
      alpha: 0,
      y: statusText.y - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        statusText.destroy();
      }
    });
  }
  
  updateStatsDisplay(stats) {
    // Update UI with new stats
    this.energyText.setText(`Energy: ${stats.energy}`);
    this.moneyText.setText(`Money: $${stats.money}`);
    this.hungerText.setText(`Hunger: ${stats.hunger}`);
    this.hygieneText.setText(`Hygiene: ${stats.hygiene}`);
    this.happinessText.setText(`Happiness: ${stats.happiness}`);
  }
  
  update() {
    // Skip updates if we're transitioning
    if (this.isTransitioning) return;
    
    // Update player if it exists
    if (this.player) {
      this.player.update();
    }
    
    // Clear active chore area if player walks away
    if (this.activeChoreArea && this.player) {
      // Calculate distance between player and active chore area
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.activeChoreArea.x, this.activeChoreArea.y
      );
      
      // If player moves too far, hide chore UI
      if (distance > 100) {
        this.choreText.visible = false;
        this.choreButton.visible = false;
        this.activeChoreArea = null;
      }
    }
    
    // Get current stats and update UI
    const stats = this.getPlayerStats();
    this.updateStatsDisplay(stats);
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
}

export default MainLandScene; 