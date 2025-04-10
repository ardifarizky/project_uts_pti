import Phaser from 'phaser';
import Player from '../object/Player.js';
import Activity from '../object/Activity.js';
import StatsUI from '../ui/StatsUI.js';

class MountainScene extends Phaser.Scene {
  constructor() {
    super("scene-mountain");
    
    // Configuration
    this.mapScale = 2;
    
    // External data (will be set via init)
    this.playerName = "";
    this.selectedCharacter = "ucup";
    this.playerSpeed = 350;
    this.gameSize = { width: 240, height: 160 };
    this.lastMountainPos = { x: 250, y: 250 };
    this.isTransitioning = false;
    
    // Map layers
    this.map = null;
    this.groundLayer = null;
    this.wallLayer = null;
    this.roadLayer = null;
    this.obstacleLayer = null;
    
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
    
    // UI elements
    this.statsUI = null; // Using global StatsUI instead
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
    if (data.lastMountainPos) this.lastMountainPos = data.lastMountainPos;
    if (data.isTransitioning !== undefined) this.isTransitioning = data.isTransitioning;
    
    // Connect to global stats and completedChores
    if (typeof window !== 'undefined') {
      if (window.completedChores) {
        this.completedChores = window.completedChores;
      }
    }
    
    console.log("MountainScene init: Using global playerStats:", window.playerStats);
  }
  
  preload() {
    // Load tilemap data
    this.load.tilemapTiledJSON('mountain-map', '/assets/tilemap/mountain.json');
    
    // Load tileset images
    this.load.image('exterior1', '/assets/tiles/exterior1.png');
  }
  
  create() {
    // Reset transition flag when mountain scene is created
    this.isTransitioning = false;
    
    // Create the scene components in order
    this.createMap();
    this.createPlayer();
    this.createExitDoor();
    this.createChoreAreas();
    this.createStatsUI(); // Create global stats UI
    
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
    this.map = this.make.tilemap({ key: 'mountain-map' });
    
    // Add the tilesets to the map
    const exterior1Tileset = this.map.addTilesetImage('exterior1', 'exterior1');
    
    // Create layers
    this.groundLayer = this.map.createLayer('ground', [exterior1Tileset]).setDepth(0);
    this.wallLayer = this.map.createLayer('wall', [exterior1Tileset]).setDepth(1);
    this.roadLayer = this.map.createLayer('road', [exterior1Tileset]).setDepth(2);
    this.obstacleLayer = this.map.createLayer('obstacle', [exterior1Tileset]).setDepth(3);
    
    // Scale the layers by map scale factor
    this.groundLayer.setScale(this.mapScale);
    this.wallLayer.setScale(this.mapScale);
    this.roadLayer.setScale(this.mapScale);
    this.obstacleLayer.setScale(this.mapScale);
    
    // Set collision on layers
    this.wallLayer.setCollisionByProperty({ collide: true });
    this.obstacleLayer.setCollisionByProperty({ collide: true });
    this.obstacleLayer.setCollisionByExclusion([-1]);
    this.wallLayer.setCollisionByExclusion([-1]);
    
    // Set layers to their default positions (0,0)
    this.groundLayer.setPosition(0, 0);
    this.wallLayer.setPosition(0, 0);
    this.roadLayer.setPosition(0, 0);
    this.obstacleLayer.setPosition(0, 0);
    
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
      this.lastMountainPos.x * this.mapScale, 
      Math.min(this.lastMountainPos.y, 350) * this.mapScale, // Ensure player doesn't spawn below y=350
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
    this.physics.add.collider(this.player, this.obstacleLayer);
  }
  
  // ----------------------------------------
  // DOOR METHODS
  // ----------------------------------------
  
  createExitDoor() {
    // Track door tiles
    this.doorTiles = [];
    
    // Find door or exit tiles in the tilemap
    this.map.findObject('exitPoints', (obj) => {
      if (obj.name === 'exit') {
        // Create an exit trigger at this position
        const exitTrigger = this.physics.add.sprite(
          obj.x * this.mapScale, 
          obj.y * this.mapScale, 
          null
        );
        exitTrigger.setVisible(false);
        exitTrigger.setImmovable(true);
        exitTrigger.body.allowGravity = false;
        exitTrigger.body.setSize(32 * this.mapScale, 32 * this.mapScale);
        
        // Add overlap detection
        this.physics.add.overlap(
          this.player,
          exitTrigger,
          () => {
            if (this.exitActive && !this.isTransitioning) {
              this.exitMountain();
            }
          }
        );
        
        // Add visual indicator for the exit
        this.createExitIndicator(obj.x * this.mapScale, obj.y * this.mapScale);
      }
    });
  }
  
  createExitIndicator(x, y) {
    // Optional: Add a visual indicator for exits
    const exitIndicator = this.add.sprite(x, y - 20, 'exterior1', 123);
    exitIndicator.setScale(0.5);
    exitIndicator.setDepth(100);
    
    // Add a simple animation to make it more visible
    this.tweens.add({
      targets: exitIndicator,
      y: y - 30,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }
  
  exitMountain() {
    // Set transition flag to prevent multiple exits
    this.isTransitioning = true;
    
    // Save player position for when they return
    if (typeof window !== 'undefined') {
      window.lastMountainPos = {
        x: this.player.x / this.mapScale,
        y: this.player.y / this.mapScale
      };
    }
    
    // Create transition screen
    this.createTransitionScreen("Leaving the mountains...");
    
    // Properly clean up resources before transitioning
    if (this.player) {
      this.player.disableMovement();
    }
    
    // Transition to the mainland scene
    this.time.delayedCall(1000, () => {
      // Clean up resources
      if (this.statsUI) {
        // Don't destroy the StatsUI, just hide it - it will be handled by the next scene
        this.statsUI.hide();
      }
      
      // Reset the transition flag in main.js
      if (typeof window !== 'undefined') {
        window.isLoadingMountain = false;
        window.isTransitioning = false;
      }
      
      // Start the next scene
      this.scene.start('scene-game', {
        playerName: this.playerName,
        selectedCharacter: this.selectedCharacter,
        PLAYER_SPEED: this.playerSpeed,
        GAME_SIZE: this.gameSize
      });
    });
  }

  // ----------------------------------------
  // ACTIVITY SYSTEM
  // ----------------------------------------
  
  createChoreAreas() {
    // Initialize the activities array if it doesn't exist
    this.activities = [];
    this.activityButtons = [];
    this.activeActivity = null;
    
    // Define activities for the mountain scene using the Activity class
    const mountainActivities = [
      {
        id: 'mountain-explore',
        name: 'Explore the Area',
        x: 400,
        y: 400,
        width: 800, // Large width to cover the whole map horizontally
        height: 600, // Large height to cover the whole map vertically
        description: 'Explore the scenic mountains (+15 Happiness, -10 Energy, -5 Hygiene)',
        energyCost: 10,
        happinessReward: 15,
        hungerCost: 5,
        hygieneCost: 5,
        color: 0x4682B4 // Steel blue for explore
      },
      {
        id: 'mountain-souvenirs',
        name: 'Buy Souvenirs',
        x: 400,
        y: 400,
        width: 800, // Large width to cover the whole map horizontally
        height: 600, // Large height to cover the whole map vertically
        description: 'Purchase mountain souvenirs to remember your trip (-$25, +10 Happiness)',
        energyCost: 5,
        moneyCost: 25,
        happinessReward: 10,
        color: 0xDAA520 // Goldenrod for shopping
      },
      {
        id: 'mountain-restaurant',
        name: 'Eat at Local Restaurant',
        x: 400,
        y: 400,
        width: 800, // Large width to cover the whole map horizontally
        height: 600, // Large height to cover the whole map vertically
        description: 'Enjoy a meal at a mountain restaurant (-$20, +25 Hunger)',
        energyCost: 5,
        moneyCost: 20,
        hungerReward: 25,
        color: 0x8FBC8F // Dark sea green for restaurant
      }
    ];
    
    // Create activities using the Activity class
    mountainActivities.forEach(config => {
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
    // Skip if we're transitioning
    if (this.isTransitioning) return;
    
    // Hide all activity buttons first
    this.hideAllChoreButtons();
    
    // Find active activities the player is overlapping with
    const activeZones = this.activities ? this.activities.filter(activity => {
      return Phaser.Geom.Rectangle.Overlaps(
        this.player.getBounds(),
        activity.zone.getBounds()
      );
    }) : [];
    
    // Display activity buttons if we have active zones
    if (activeZones.length > 0) {
      this.displayActivityButtonsForLocation(activeZones);
    } else {
      this.activeActivity = null;
    }
  }
  
  hideAllChoreButtons() {
    // Hide all activity buttons
    if (this.activityButtons) {
      this.activityButtons.forEach(buttonObj => {
        if (buttonObj) {
          buttonObj.button.setVisible(false);
          buttonObj.text.setVisible(false);
        }
      });
    }
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
      `Welcome to the Mountains, ${this.playerName || 'Adventurer'}!`,
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
      delay: 1500,
      ease: 'Linear',
      onComplete: () => {
        message.destroy();
      }
    });
    
    return message;
  }

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
    
    // Clear arrays
    this.activities = [];
    this.activityButtons = [];
    this.doorTiles = [];
    
    // Call parent destroy
    super.destroy();
  }
}

export default MountainScene;