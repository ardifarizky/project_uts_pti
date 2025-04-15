import Phaser from 'phaser';
import Player from '../object/Player.js';
import Activity from '../object/Activity.js';
import StatsUI from '../ui/StatsUI.js';

class TempleScene extends Phaser.Scene {
  constructor() {
    super("scene-temple");
    
    // Configuration
    this.mapScale = 2;
    
    // External data (will be set via init)
    this.playerName = "";
    this.selectedCharacter = "ucup";
    this.playerSpeed = 350;
    this.gameSize = { width: 240, height: 160 };
    this.lastTemplePos = { x: 250, y: 250 };
    this.isTransitioning = false;
    
    // Map layers
    this.map = null;
    this.floorLayer = null;
    this.carpetLayer = null;
    this.wallLayer = null;
    this.ceilingLayer = null;
    this.lightLayer = null;
    
    // Game objects
    this.player = null;
    this.exitDoor = null;
    this.doorTiles = [];
    this.isGameOver = false;
    this.exitActive = false;
    
    // Chores system
    this.activities = []; // Using activities instead of choreAreas
    this.activityButtons = []; // Initialize the activityButtons array
    this.activeActivity = null;
    this.completedChores = {};
    
    // UI elements
    this.statsUI = null; // Using global StatsUI instead
    this.exitButton = null; // Add exit button reference
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
    if (data.lastTemplePos) this.lastTemplePos = data.lastTemplePos;
    if (data.isTransitioning !== undefined) this.isTransitioning = data.isTransitioning;
    
    // Connect to global stats and completedChores
    if (typeof window !== 'undefined') {
      if (window.completedChores) {
        this.completedChores = window.completedChores;
      }
    }
    
    console.log("TempleScene init: Using global playerStats:", window.playerStats);
  }
  
  preload() {
    // Load tilemap data
    this.load.tilemapTiledJSON('temple-map', '/assets/tilemap/mushola.json');
    
    // Load tileset images
    this.load.image('interior1', '/assets/tiles/interior1.png');
    this.load.image('room1', '/assets/tiles/room1.png');
  }
  
  create() {
    // Reset transition flag when temple scene is created
    this.isTransitioning = false;
    
    // Create the scene components in order
    this.createMap();
    this.createPlayer();
    this.createExitDoor();
    this.createChoreAreas();
    this.createStatsUI(); // Create global stats UI
    this.createExitButton(); // Add exit button
    
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
    // Skip movement during transitions
    if (this.isTransitioning) {
      return;
    }
    
    // Update player if it exists
    if (this.player && this.player.active) {
      this.player.update();
    }
    
    // Update chore areas if not transitioning
    try {
      this.updateChoreAreas();
    } catch (error) {
      console.error("Error updating chore areas:", error);
    }
    
    // Update global stats UI
    if (this.statsUI) {
      try {
        this.statsUI.update();
      } catch (error) {
        console.error("Error updating StatsUI:", error);
      }
    }
  }

  // Create global stats UI
  createStatsUI() {
    try {
      // Access global UI or create new one
      if (window.globalStatsUI) {
        // If UI exists from another scene, check if container is valid before destroying
        if (window.globalStatsUI.container && window.globalStatsUI.container.scene) {
          window.globalStatsUI.destroy();
        }
        window.globalStatsUI = new StatsUI(this);
      } else {
        // Create new UI
        window.globalStatsUI = new StatsUI(this);
      }
      
      this.statsUI = window.globalStatsUI;
    } catch (error) {
      console.error("Error creating StatsUI:", error);
      // Create a backup minimal UI if the main one fails
      this.statsUI = {
        update: () => {},
        destroy: () => {}
      };
    }
  }

  // ----------------------------------------
  // MAP CREATION METHODS
  // ----------------------------------------
  
  createMap() {
    // Create the tilemap
    this.map = this.make.tilemap({ key: 'temple-map' });
    
    // Add the tilesets to the map
    const interior1Tileset = this.map.addTilesetImage('interior1', 'interior1');
    const room1Tileset = this.map.addTilesetImage('room1', 'room1');
    
    // Create layers with correct names and depths (bottom to top)
    this.floorLayer = this.map.createLayer('floor', [interior1Tileset, room1Tileset]).setDepth(0);
    this.carpetLayer = this.map.createLayer('carpet', [interior1Tileset, room1Tileset]).setDepth(1);
    this.lightLayer = this.map.createLayer('light', [interior1Tileset, room1Tileset]).setDepth(2);
    this.wallLayer = this.map.createLayer('wall', [interior1Tileset, room1Tileset]).setDepth(3);
    this.ceilingLayer = this.map.createLayer('ceiling', [interior1Tileset, room1Tileset]).setDepth(4);
    
    // Scale all layers by map scale factor
    this.floorLayer.setScale(this.mapScale);
    this.carpetLayer.setScale(this.mapScale);
    this.wallLayer.setScale(this.mapScale);
    this.ceilingLayer.setScale(this.mapScale);
    this.lightLayer.setScale(this.mapScale);
    
    // Set collision on layers
    this.wallLayer.setCollisionByProperty({ collide: true });
    this.wallLayer.setCollisionByExclusion([-1]);
    
    // Set layers to their default positions (0,0)
    this.floorLayer.setPosition(0, 0);
    this.carpetLayer.setPosition(0, 0);
    this.wallLayer.setPosition(0, 0);
    this.ceilingLayer.setPosition(0, 0);
    this.lightLayer.setPosition(0, 0);
    
    // Set physics world bounds to match the map size
    const mapWidth = this.map.widthInPixels * this.mapScale;
    const mapHeight = this.map.heightInPixels * this.mapScale;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
  }
  
  setupCamera() {
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(
      0, 
      0, 
      this.map.widthInPixels * this.mapScale, 
      this.map.heightInPixels * this.mapScale
    );
    
    // Set camera zoom level for better visibility
    this.cameras.main.setZoom(1);
  }

  // ----------------------------------------
  // PLAYER METHODS
  // ----------------------------------------
  
  createPlayer() {
    // Create player using the Player class
    this.player = new Player(
      this, 
      this.lastTemplePos.x * this.mapScale, 
      this.lastTemplePos.y * this.mapScale,
      this.selectedCharacter
    );
    
    // Configure scene-specific settings
    this.player.playerSpeed = this.playerSpeed;
    
    // Enable physics for the player if not already enabled
    if (!this.player.body) {
      this.physics.world.enable(this.player);
    }
    
    // Make sure player has proper physics settings
    this.player.body.setCollideWorldBounds(true);
    
    // Add collision with tilemap layers
    this.physics.add.collider(this.player, this.wallLayer);
  }
  
  // ----------------------------------------
  // DOOR METHODS
  // ----------------------------------------
  
  createExitDoor() {
    // Create an exit trigger at the specified entrance position
    const exitX = 2879 * this.mapScale;
    const exitY = 672 * this.mapScale;
    
    // Create an exit trigger
    const exitTrigger = this.physics.add.sprite(exitX, exitY, null);
    exitTrigger.setSize(50, 50);
    exitTrigger.body.setAllowGravity(false);
    exitTrigger.body.setImmovable(true);
    
    // Create a visual indicator for the exit
    this.createExitIndicator(exitX, exitY);
    
    // Add overlap detection
    this.physics.add.overlap(this.player, exitTrigger, () => {
      if (this.exitActive && !this.isTransitioning) {
        this.exitTemple();
      }
    });
    
    // Store the exit door
    this.exitDoor = exitTrigger;
  }
  
  createExitIndicator(x, y) {
    // Create a visual indicator for the exit
    const exitLabel = this.add.text(x, y - 30, "EXIT", {
      font: "16px Arial",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4
    });
    exitLabel.setOrigin(0.5, 0.5);
    
    // Add a simple animation to make it more noticeable
    this.tweens.add({
      targets: exitLabel,
      y: y - 40,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }
  
  exitTemple() {
    // Prevent multiple exits
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    
    // Create transition screen
    this.createTransitionScreen("Leaving the Temple...");
    
    // Store player position for returning
    window.lastTemplePos = {
      x: this.player.x / this.mapScale,
      y: this.player.y / this.mapScale
    };
    
    // Transition back to world scene after delay
    this.time.delayedCall(1000, () => {
      this.scene.start('scene-world', {
        playerName: this.playerName,
        selectedCharacter: this.selectedCharacter,
        isTransitioning: true,
        lastWorldPos: { x: 350, y: 250 }  // Default world position
      });
    });
  }
  
  // ----------------------------------------
  // CHORE METHODS
  // ----------------------------------------
  
  createChoreAreas() {
    // Define temple-wide activities using the Activity class
    // These activities will be available throughout the temple
    const templeActivities = [
      {
        id: 'temple-explore',
        name: 'Explore the Area',
        x: 250,   // These coordinates cover the whole temple
        y: 250,
        width: 5000,  // Large zone covering the temple
        height: 5000,
        description: 'Explore the temple (+15 Happiness, -10 Energy, -5 Hygiene)',
        energyCost: 10,
        happinessReward: 15,
        hygieneCost: 5,
        color: 0x4682B4
      },
      {
        id: 'temple-souvenirs',
        name: 'Buy Souvenirs',
        x: 250,   // These coordinates cover the whole temple
        y: 250,
        width: 5000,  // Large zone covering the temple
        height: 5000,
        description: 'Purchase temple souvenirs (-$25, +10 Happiness)',
        energyCost: 5,
        moneyCost: 25,
        happinessReward: 10,
        color: 0xDAA520
      },
      {
        id: 'temple-restaurant',
        name: 'Eat at Local Restaurant',
        x: 250,   // These coordinates cover the whole temple
        y: 250,
        width: 5000,  // Large zone covering the temple
        height: 5000,
        description: 'Enjoy a meal at the temple restaurant (-$20, +25 Hunger)',
        energyCost: 5,
        moneyCost: 20,
        hungerReward: 25,
        color: 0x8FBC8F
      }
    ];
    
    // Create activities using the Activity class
    templeActivities.forEach(config => {
      const activity = new Activity(this, config);
      this.activities.push(activity);
      
      // Add overlap detection with player
      this.physics.add.overlap(
        this.player,
        activity.zone,
        (player, zone) => {
          this.activeActivity = zone.getData('activity');
        }
      );
    });
  }
  
  updateChoreAreas() {
    // Hide all activity buttons first
    this.hideAllChoreButtons();
    
    // Find active activities the player is overlapping with
    const activeZones = this.activities.filter(activity => {
      return Phaser.Geom.Rectangle.Overlaps(
        this.player.getBounds(),
        activity.zone.getBounds()
      );
    });
    
    // Display activity buttons if we have active zones
    if (activeZones.length > 0) {
      this.displayActivityButtonsForLocation(activeZones);
    } else {
      this.activeActivity = null;
    }
  }
  
  hideAllChoreButtons() {
    // Hide all activity buttons
    this.activityButtons.forEach(buttonObj => {
      if (buttonObj) {
        buttonObj.button.setVisible(false);
        buttonObj.text.setVisible(false);
      }
    });
  }
  
  displayActivityButtonsForLocation(activities) {
    // Display buttons for each activity
    activities.forEach((activity, index) => {
      this.displayActivityButton(activity, index, activities.length);
    });
  }
  
  displayActivityButton(activity, index, totalButtons) {
    let buttonObj;
    
    // Initialize activityButtons array if it doesn't exist
    if (!this.activityButtons) {
      this.activityButtons = [];
    }
    
    if (this.activityButtons[index]) {
      // Update existing button
      buttonObj = this.activityButtons[index];
      buttonObj.button.setVisible(true);
      buttonObj.text.setVisible(true);
      activity.button = buttonObj.button;
      activity.buttonText = buttonObj.text;
      activity.updateButton();
    } else {
      // Create a new button
      try {
        buttonObj = activity.createButton(
          this.game.config.width / 2,
          this.game.config.height - 100,
          index
        );
        this.activityButtons[index] = buttonObj;
      } catch (error) {
        console.error("Error creating activity button:", error);
      }
    }
  }

  // ----------------------------------------
  // UI METHODS
  // ----------------------------------------
  
  displayWelcomeMessage() {
    // Display a welcome message when entering the scene
    this.showTemporaryMessage(
      `Welcome to the Temple, ${this.playerName || 'Adventurer'}!`,
      '#ffffff'
    );
  }
  
  createTransitionScreen(message) {
    // Create a full-screen black rectangle for transition
    const rect = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000
    );
    rect.setScrollFactor(0);
    rect.setDepth(1000);
    
    // Add transition message
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      message,
      {
        fontSize: '24px',
        fill: '#ffffff',
        align: 'center'
      }
    );
    text.setOrigin(0.5, 0.5);
    text.setScrollFactor(0);
    text.setDepth(1001);
    
    // Animate the opacity
    this.tweens.add({
      targets: [rect, text],
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Linear'
    });
  }
  
  showTemporaryMessage(text, color = '#ffffff') {
    // Create a text object in the center of the screen
    const message = this.add.text(
      this.cameras.main.width / 2,
      100,
      text,
      {
        fontSize: '20px',
        fill: color,
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      }
    );
    message.setOrigin(0.5, 0.5);
    message.setScrollFactor(0);
    message.setDepth(200);
    
    // Fade out and destroy after a delay
    this.tweens.add({
      targets: message,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      delay: 2000,
      onComplete: () => {
        message.destroy();
      }
    });
  }

  // Create exit button to return to spawn
  createExitButton() {
    // Create a button in the corner of the screen
    const buttonX = this.cameras.main.width - 80;
    const buttonY = this.cameras.main.height - 40;
    
    // Create the button background
    const buttonBg = this.add.rectangle(buttonX, buttonY, 120, 40, 0xFFD700, 0.8);
    buttonBg.setScrollFactor(0);
    buttonBg.setDepth(1000);
    buttonBg.setStrokeStyle(2, 0xFFFFFF);
    
    // Create button text
    const buttonText = this.add.text(buttonX, buttonY, "EXIT TEMPLE", {
      font: "16px Arial",
      fill: "#000000"
    });
    buttonText.setOrigin(0.5);
    buttonText.setScrollFactor(0);
    buttonText.setDepth(1001);
    
    // Make the button interactive
    buttonBg.setInteractive({ useHandCursor: true });
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0xDAA520, 0.9); // Darken on hover
    });
    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0xFFD700, 0.8); // Restore on mouse out
    });
    buttonBg.on('pointerdown', () => {
      this.teleportToSpawn();
    });
    
    // Save references to button elements
    this.exitButton = {
      bg: buttonBg,
      text: buttonText
    };
  }

  // Teleport back to main spawn
  teleportToSpawn() {
    // Check if already transitioning
    if (this.isTransitioning) {
      return;
    }
    
    // Transition to home/spawn
    this.isTransitioning = true;
    
    // Show transition screen
    this.createTransitionScreen("Returning to town...");
    
    // Save player position for when they return
    if (typeof window !== 'undefined') {
      window.lastTemplePos = {
        x: this.player.x / this.mapScale,
        y: this.player.y / this.mapScale
      };
    }
    
    // Transition to main scene after a delay
    this.time.delayedCall(1000, () => {
      try {
        this.scene.start('scene-game', {
          playerName: this.playerName,
          selectedCharacter: this.selectedCharacter,
          PLAYER_SPEED: this.playerSpeed,
          GAME_SIZE: this.gameSize,
          isTransitioning: false
        });
      } catch (error) {
        console.error("Error transitioning to main scene:", error);
        // If we can't transition, just reset transition flag
        this.isTransitioning = false;
      }
    });
  }

  // ----------------------------------------
  // CLEANUP METHODS
  // ----------------------------------------
  
  // Clean up resources when scene is about to be shut down
  shutdown() {
    // Clean up activities
    if (this.activities) {
      this.activities.forEach(activity => {
        if (activity && activity.zone) {
          activity.zone.destroy();
        }
      });
    }
    
    // Hide UI elements
    if (this.statsUI) {
      this.statsUI.hide();
    }
    
    // Hide exit button
    if (this.exitButton) {
      this.exitButton.bg.setVisible(false);
      this.exitButton.text.setVisible(false);
    }
    
    // Reset flags
    this.isTransitioning = false;
    this.exitActive = false;
  }
  
  // Final cleanup when scene is destroyed
  destroy() {
    // Clean up all resources
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    // Clean up UI
    if (this.statsUI) {
      // Only destroy the StatsUI if we're completely removing the scene
      if (!window.globalStatsUI || window.globalStatsUI === this.statsUI) {
        this.statsUI.destroy();
      }
      this.statsUI = null;
    }
    
    // Destroy exit button
    if (this.exitButton) {
      this.exitButton.bg.destroy();
      this.exitButton.text.destroy();
      this.exitButton = null;
    }
    
    // Clear arrays
    this.activities = [];
    this.activityButtons = [];
    this.doorTiles = [];
    
    // Call parent destroy
    super.destroy();
  }
}

export default TempleScene; 