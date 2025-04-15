import Phaser from 'phaser';
import Player from '../object/Player.js';
import Activity from '../object/Activity.js';
import StatsUI from '../ui/StatsUI.js';

class LakeScene extends Phaser.Scene {
  constructor() {
    super("scene-lake");
    
    // Configuration
    this.mapScale = 2;
    
    // External data (will be set via init)
    this.playerName = "";
    this.selectedCharacter = "ucup";
    this.playerSpeed = 350;
    this.gameSize = { width: 240, height: 160 };
    this.lastLakePos = { x: 500, y: 1600 };
    this.isTransitioning = false;
    
    // Map layers
    this.map = null;
    this.waterLayer = null;
    this.groundLayer = null;
    this.roadLayer = null;
    this.itemLayer = null;
    this.obstacleLayer = null;
    this.upLayer = null;
    
    // Game objects
    this.player = null;
    this.exitDoor = null;
    this.doorTiles = [];
    this.isGameOver = false;
    this.exitActive = false;
    
    // Chores system
    this.activities = []; 
    this.activityButtons = []; 
    this.activeActivity = null;
    this.completedChores = {};
    
    // UI elements
    this.statsUI = null;
    this.exitButton = null;
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
    if (data.lastLakePos) this.lastLakePos = data.lastLakePos;
    if (data.isTransitioning !== undefined) this.isTransitioning = data.isTransitioning;
    
    // Connect to global stats and completedChores
    if (typeof window !== 'undefined') {
      if (window.completedChores) {
        this.completedChores = window.completedChores;
      }
    }
    
    console.log("LakeScene init: Using global playerStats:", window.playerStats);
  }
  
  preload() {
    // Load tilemap data
    this.load.tilemapTiledJSON('lake-map', '/assets/tilemap/lake.json');
    
    // Load tileset images - assuming you might use the exterior tileset like in MountainScene
    // Update these according to the actual tilesets used in lake.json
    this.load.image('exterior1', '/assets/tiles/exterior1.png');
  }
  
  create() {
    // Reset transition flag when lake scene is created
    this.isTransitioning = false;
    
    // Create the scene components in order
    this.createMap();
    this.createPlayer();
    this.createExitDoor();
    this.createChoreAreas();
    this.createStatsUI();
    this.createExitButton();
    
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

  // Create exit button to return to spawn
  createExitButton() {
    // Create a button in the corner of the screen
    const buttonX = this.cameras.main.width - 80;
    const buttonY = this.cameras.main.height - 40;
    
    // Create the button background
    const buttonBg = this.add.rectangle(buttonX, buttonY, 120, 40, 0xFF6347, 0.8);
    buttonBg.setScrollFactor(0);
    buttonBg.setDepth(1000);
    buttonBg.setStrokeStyle(2, 0xFFFFFF);
    
    // Create button text
    const buttonText = this.add.text(buttonX, buttonY, "EXIT LAKE", {
      font: "16px Arial",
      fill: "#FFFFFF"
    });
    buttonText.setOrigin(0.5);
    buttonText.setScrollFactor(0);
    buttonText.setDepth(1001);
    
    // Make the button interactive
    buttonBg.setInteractive({ useHandCursor: true });
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0xFF4500, 0.9); // Darken on hover
    });
    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0xFF6347, 0.8); // Restore on mouse out
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

  // ----------------------------------------
  // MAP CREATION METHODS
  // ----------------------------------------
  
  createMap() {
    // Create the tilemap
    this.map = this.make.tilemap({ key: 'lake-map' });
    
    // Add the tilesets to the map - update these based on the actual tilesets used in lake.json
    const exterior1Tileset = this.map.addTilesetImage('exterior1', 'exterior1');
    
    // Create layers with the specified order: water, ground, road, item, obstacle, up
    this.waterLayer = this.map.createLayer('water', [exterior1Tileset]).setDepth(0);
    this.groundLayer = this.map.createLayer('ground', [exterior1Tileset]).setDepth(1);
    this.roadLayer = this.map.createLayer('road', [exterior1Tileset]).setDepth(2);
    this.itemLayer = this.map.createLayer('item', [exterior1Tileset]).setDepth(3);
    this.obstacleLayer = this.map.createLayer('obstacle', [exterior1Tileset]).setDepth(4);
    this.upLayer = this.map.createLayer('up', [exterior1Tileset]).setDepth(5);
    
    // Scale all layers by map scale factor
    this.waterLayer.setScale(this.mapScale);
    this.groundLayer.setScale(this.mapScale);
    this.roadLayer.setScale(this.mapScale);
    this.itemLayer.setScale(this.mapScale);
    this.obstacleLayer.setScale(this.mapScale);
    this.upLayer.setScale(this.mapScale);
    
    // Set collision on layers
    this.obstacleLayer.setCollisionByProperty({ collide: true });
    this.obstacleLayer.setCollisionByExclusion([-1]);
    
    // Set layers to their default positions (0,0)
    this.waterLayer.setPosition(0, 0);
    this.groundLayer.setPosition(0, 0);
    this.roadLayer.setPosition(0, 0);
    this.itemLayer.setPosition(0, 0);
    this.obstacleLayer.setPosition(0, 0);
    this.upLayer.setPosition(0, 0);
    
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
      this.lastLakePos.x * this.mapScale, 
      this.lastLakePos.y * this.mapScale,
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
              this.exitLake();
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
  
  exitLake() {
    // Set transition flag to prevent multiple exits
    this.isTransitioning = true;
    
    // Save player position for when they return
    if (typeof window !== 'undefined') {
      window.lastLakePos = {
        x: this.player.x / this.mapScale,
        y: this.player.y / this.mapScale
      };
    }
    
    // Create transition screen
    this.createTransitionScreen("Leaving the lake...");
    
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
      
      // Reset the transition flag
      if (typeof window !== 'undefined') {
        window.isLoadingLake = false;
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
      window.lastLakePos = {
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
  // ACTIVITY SYSTEM
  // ----------------------------------------
  
  createChoreAreas() {
    // Initialize the activities array if it doesn't exist
    this.activities = [];
    this.activityButtons = [];
    this.activeActivity = null;
    
    // Define activities for the lake scene using the Activity class
    const lakeActivities = [
      {
        id: 'lake-fishing',
        name: 'Go Fishing',
        x: 500,
        y: 500,
        width: 1600, // Large width to cover the whole map horizontally
        height: 1600, // Large height to cover the whole map vertically
        description: 'Fish in the calm lake waters (+15 Happiness, -10 Energy, -5 Hunger)',
        energyCost: 10,
        happinessReward: 15,
        hungerCost: 5,
        hygieneCost: 0,
        duration: 10000, // 10 seconds
        cooldown: 30000, // 30 seconds
        color: 0x4169E1 // Royal blue for fishing
      },
      {
        id: 'lake-swimming',
        name: 'Go Swimming',
        x: 500,
        y: 500,
        width: 1600, // Large width to cover the whole map horizontally
        height: 1600, // Large height to cover the whole map vertically
        description: 'Swim in the refreshing water (+10 Happiness, -15 Energy, +10 Hygiene)',
        energyCost: 15,
        happinessReward: 10,
        hungerCost: 5,
        hygieneCost: -10, // Negative cost means gain
        duration: 8000, // 8 seconds
        cooldown: 25000, // 25 seconds
        color: 0x00BFFF // Deep sky blue for swimming
      },
      {
        id: 'lake-picnic',
        name: 'Have a Picnic',
        x: 500,
        y: 500,
        width: 1600, // Large width to cover the whole map horizontally
        height: 1600, // Large height to cover the whole map vertically
        description: 'Have a relaxing picnic by the lake (+20 Hunger, +8 Happiness, -$15)',
        energyCost: 5,
        happinessReward: 8,
        hungerReward: 20,
        moneyCost: 15,
        duration: 12000, // 12 seconds
        cooldown: 35000, // 35 seconds
        color: 0x32CD32 // Lime green for picnic
      }
    ];
    
    // Create activity objects and add them to the scene
    lakeActivities.forEach(activityData => {
      const activity = new Activity(this, activityData);
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
    // Skip if transitioning or player doesn't exist
    if (this.isTransitioning || !this.player) return;
    
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
  
  displayWelcomeMessage() {
    this.showTemporaryMessage(`Welcome to the Lake, ${this.playerName}!`, '#ffffff');
  }
  
  createTransitionScreen(message) {
    // Create a semi-transparent overlay
    const overlay = this.add.rectangle(
      0, 
      0, 
      this.game.config.width * 2,
      this.game.config.height * 2,
      0x000000, 
      0.7
    );
    overlay.setOrigin(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);
    
    // Add the message text
    const text = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      message,
      {
        font: '32px Arial',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(1001);
    
    // Add loading spinner/animation
    const loadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      '...',
      {
        font: '24px Arial',
        fill: '#ffffff'
      }
    );
    loadingText.setOrigin(0.5);
    loadingText.setScrollFactor(0);
    loadingText.setDepth(1001);
    
    // Animate the loading dots
    this.tweens.add({
      targets: loadingText,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }
  
  showTemporaryMessage(text, color = '#ffffff') {
    // Create text object
    const message = this.add.text(
      this.cameras.main.centerX,
      100,
      text,
      {
        font: '18px Arial',
        fill: color,
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
      }
    );
    message.setOrigin(0.5);
    message.setScrollFactor(0);
    message.setDepth(1000);
    
    // Add fade-in animation
    message.setAlpha(0);
    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        // Add fade-out animation after a delay
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: message,
            alpha: 0,
            duration: 500,
            onComplete: () => {
              message.destroy();
            }
          });
        });
      }
    });
  }
  
  shutdown() {
    // Clean up any event listeners, timers, etc.
    if (this.activeActivity) {
      this.activeActivity.cancel();
      this.activeActivity = null;
    }
    
    // Clean up all activities
    if (this.activities) {
      this.activities.forEach(activity => {
        if (activity && activity.destroy) {
          activity.destroy();
        }
      });
      this.activities = [];
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
    
    // Additional cleanup
    this.events.off();
    this.hideAllChoreButtons();
  }
  
  destroy() {
    this.shutdown();
    
    // Additional cleanup specific to this scene
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    // Destroy activity buttons if they exist
    if (this.activityButtons) {
      this.activityButtons.forEach(button => {
        if (button) button.destroy();
      });
      this.activityButtons = [];
    }
    
    // Destroy exit button
    if (this.exitButton) {
      this.exitButton.bg.destroy();
      this.exitButton.text.destroy();
      this.exitButton = null;
    }
  }
}

export default LakeScene; 