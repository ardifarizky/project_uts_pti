import Phaser from 'phaser';
import Player from './object/Player.js';
import StatsUI from './ui/StatsUI.js';
import Activity from './object/Activity.js';

class Beach extends Phaser.Scene {
    constructor() {
        super("scene-beach");
        
        // Configuration
        this.mapScale = 2;
        
        // Player properties
        this.playerName = "";
        this.selectedCharacter = "ucup";
        this.playerSpeed = 350;
        this.lastBeachPos = { x: 480, y: 450 };
        this.isTransitioning = false;
        
        // Map dimensions
        this.mapWidth = 100;
        this.mapHeight = 100;
        this.tileSize = 16;
        
        // Map layers
        this.map = null;
        this.waterLayer = null;
        this.groundLayer = null;
        this.roadLayer = null;
        this.itemLayer = null;
        this.wallLayer = null;
        this.outerwallLayer = null;
        this.botlayerLayer = null;
        this.toplayerLayer = null;
        this.obstacleLayer = null;
        
        // Game objects
        this.player = null;
        this.exitArea = null;
        
        // Activities system
        this.activities = [];
        this.activityButtons = [];
        this.activeActivity = null;
        
        // UI elements - now use global StatsUI
        this.statsUI = null;
    }
    
    // ----------------------------------------
    // SCENE LIFECYCLE METHODS
    // ----------------------------------------
    
    init(data) {
        // Set external data 
        if (data.playerName) this.playerName = data.playerName;
        if (data.selectedCharacter) this.selectedCharacter = data.selectedCharacter;
        if (data.PLAYER_SPEED) this.playerSpeed = data.PLAYER_SPEED;
        if (data.lastBeachPos) this.lastBeachPos = data.lastBeachPos;
        if (data.isTransitioning !== undefined) this.isTransitioning = data.isTransitioning;
    }
    
    preload() {
        // Load tilemap data
        this.load.tilemapTiledJSON('beach-map', '/assets/tilemap/beach.json');
        
        // Load tileset images
        this.load.image('sea1', '/assets/tiles/sea1.png');
        this.load.image('exterior1', '/assets/tiles/exterior1.png');
    }
    
    create() {
        // Reset transition flag
        this.isTransitioning = false;
        
        // Set physics world bounds to match map size
        this.physics.world.setBounds(
          0, 
          0, 
          this.mapWidth * this.tileSize * this.mapScale, 
          this.mapHeight * this.tileSize * this.mapScale
        );
        
        // Create the scene components in order
        this.createMap();
        this.createPlayer();
        this.createExitArea();
        this.createChoreAreas();
        this.createTravelBus();
        
        // Create global stats UI
        this.createStatsUI();
        
        // Setup camera
        this.setupCamera();
        
        // Display beach name
        this.createBeachName();
        
        // Display welcome message
        this.displayWelcomeMessage();
    }
    
    update() {
        // Skip movement during transitions
        if (this.isTransitioning) {
            return;
        }
        
        // Update player
        if (this.player) {
            this.player.update();
        }
        
        // Update activities
        this.updateChoreAreas();
        
        // Update global stats UI
        if (this.statsUI) {
            this.statsUI.update();
        }
    }

    // Create global stats UI
    createStatsUI() {
        // Access global UI or create new one
        if (window.globalStatsUI) {
            // If UI exists from another scene, destroy it properly
            window.globalStatsUI.destroy();
        }
        
        // Create new UI
        window.globalStatsUI = new StatsUI(this);
        this.statsUI = window.globalStatsUI;
        
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

    // ----------------------------------------
    // MAP CREATION METHODS
    // ----------------------------------------
    
    createMap() {
        // Create the tilemap
        this.map = this.make.tilemap({ key: 'beach-map' });
        
        // Add the tilesets to the map
        const sea1Tileset = this.map.addTilesetImage('sea1', 'sea1');
        const exterior1Tileset = this.map.addTilesetImage('exterior1', 'exterior1');
        
        // Create layers
        this.waterLayer = this.map.createLayer('water', [sea1Tileset, exterior1Tileset]).setDepth(2);
        this.groundLayer = this.map.createLayer('ground', [sea1Tileset, exterior1Tileset]).setDepth(1);
        this.roadLayer = this.map.createLayer('road', [sea1Tileset, exterior1Tileset]).setDepth(2);
        this.itemLayer = this.map.createLayer('item', [sea1Tileset, exterior1Tileset]).setDepth(3);
        this.wallLayer = this.map.createLayer('wall', [sea1Tileset, exterior1Tileset]).setDepth(4);
        this.outerwallLayer = this.map.createLayer('outerwall', [sea1Tileset, exterior1Tileset]).setDepth(5);
        this.botlayerLayer = this.map.createLayer('botlayer', [sea1Tileset, exterior1Tileset]).setDepth(6);
        this.toplayerLayer = this.map.createLayer('toplayer', [sea1Tileset, exterior1Tileset]).setDepth(7);
        this.obstacleLayer = this.map.createLayer('obstacle', [sea1Tileset, exterior1Tileset]).setDepth(8);
        
        // Scale the layers by map scale factor
        this.waterLayer.setScale(this.mapScale);
        this.groundLayer.setScale(this.mapScale);
        this.roadLayer.setScale(this.mapScale);
        this.itemLayer.setScale(this.mapScale);
        this.wallLayer.setScale(this.mapScale);
        this.outerwallLayer.setScale(this.mapScale);
        this.botlayerLayer.setScale(this.mapScale);
        this.toplayerLayer.setScale(this.mapScale);
        this.obstacleLayer.setScale(this.mapScale);
        
        // Set collision on layers
        this.wallLayer.setCollisionByProperty({ collide: true });
        this.botlayerLayer.setCollisionByProperty({ collide: true });
        this.outerwallLayer.setCollisionByProperty({ collide: true });
        this.obstacleLayer.setCollisionByProperty({ collide: true });
        this.waterLayer.setCollisionByProperty({ collide: true });
        
        // If layers don't have collide property, set collisions by specific excluded indices
        // This is a fallback if the tilemap doesn't have proper collision properties
        if (!this.hasCollisionProperties()) {
            this.wallLayer.setCollisionByExclusion([-1]);
            this.botlayerLayer.setCollisionByExclusion([-1]);
            this.outerwallLayer.setCollisionByExclusion([-1]);
            this.obstacleLayer.setCollisionByExclusion([-1]);
            this.waterLayer.setCollisionByExclusion([-1]);
        }
        
        // Update map dimensions based on the loaded tilemap
        this.mapWidth = this.map.width;
        this.mapHeight = this.map.height;
        this.tileSize = this.map.tileWidth;
        
        // Set layers to their default positions (0,0)
        this.waterLayer.setPosition(0, 0);
        this.groundLayer.setPosition(0, 0);
        this.roadLayer.setPosition(0, 0);
        this.itemLayer.setPosition(0, 0);
        this.wallLayer.setPosition(0, 0);
        this.outerwallLayer.setPosition(0, 0);
        this.botlayerLayer.setPosition(0, 0);
        this.toplayerLayer.setPosition(0, 0);
        this.obstacleLayer.setPosition(0, 0);
    }
    
    setupCamera() {
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(
            0, 
            0, 
            this.mapWidth * this.tileSize * this.mapScale, 
            this.mapHeight * this.tileSize * this.mapScale
        );
    }

    // ----------------------------------------
    // PLAYER METHODS
    // ----------------------------------------
    
    createPlayer() {
        // Set default position if none provided
        if (!window.lastBeachPos) {
            // Place player in the middle of the map
            window.lastBeachPos = {
                x: (this.mapWidth * this.tileSize) / 2 / this.mapScale,
                y: (this.mapHeight * this.tileSize) / 2 / this.mapScale
            };
        }
        
        // Create player using the Player class
        this.player = new Player(
            this, 
            this.lastBeachPos.x * this.mapScale, 
            this.lastBeachPos.y * this.mapScale,
            this.selectedCharacter
        );
        
        // Configure scene-specific settings
        this.player.playerSpeed = this.playerSpeed;
        
        // Add collision with tilemap layers
        this.physics.add.collider(this.player, this.wallLayer);
        this.physics.add.collider(this.player, this.outerwallLayer);
        this.physics.add.collider(this.player, this.obstacleLayer);
        this.physics.add.collider(this.player, this.botlayerLayer);
        this.physics.add.collider(this.player, this.waterLayer);
    }
    
    // ----------------------------------------
    // EXIT AREA METHODS
    // ----------------------------------------
    
    createExitArea() {
        // Calculate the position for the exit area (at the bottom of the map)
        const exitY = this.mapHeight * this.tileSize * this.mapScale - 20;
        const centerX = this.mapWidth * this.tileSize * this.mapScale / 2;
        
        // Create exit area at the bottom of the beach
        this.exitArea = this.physics.add.sprite(centerX, exitY, 'player');
        this.exitArea.setScale(30, 1); // Wide but thin area
        this.exitArea.setAlpha(0.3); // Semi-transparent
        this.exitArea.setTint(0xff0000); // Red tint
        this.exitArea.setImmovable(true);
        this.exitArea.body.allowGravity = false;
        
        // Add exit text
        const exitText = this.add.text(
            centerX, exitY - 20, 
            "Exit Beach", 
            { font: "18px Arial", fill: "#000000", stroke: "#ffffff", strokeThickness: 2 }
        );
        exitText.setOrigin(0.5, 0.5);
        
        // Add interaction with exit area
        this.physics.add.overlap(
            this.player, 
            this.exitArea, 
            this.exitBeach, 
            null, 
            this
        );
    }
    
    createBeachName() {
        // Create a stylish beach name at the top center of the screen
        const nameBackground = this.add.rectangle(
            this.cameras.main.width / 2, 
            50, 
            300, 
            60, 
            0x000000
        );
        nameBackground.setAlpha(0.5);
        nameBackground.setScrollFactor(0);
        
        const beachName = this.add.text(
            this.cameras.main.width / 2, 
            50, 
            "SUNSET BEACH", 
            { font: "bold 28px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 }
        );
        beachName.setOrigin(0.5, 0.5);
        beachName.setScrollFactor(0);
        
        // Add a small animation to the beach name
        this.tweens.add({
            targets: beachName,
            y: 55,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    // ----------------------------------------
    // TRAVEL BUS METHODS
    // ----------------------------------------
    
    createTravelBus() {
        // Create a travel bus at specific coordinates
        const busPosX = 592;
        const busPosY = 61;
        
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
          () => !this.isTransitioning, // Only show travel options if not already transitioning
          this
        );
    }
    
    showTravelOptions() {
        // Skip if already showing travel options or in transition
        if (this.travelMenu || this.isTransitioning) return;
        
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
        
        // Create home button (new option)
        const homeButton = this.add.rectangle(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 40,
          300,
          50,
          0x2E8B57 // Green color for home
        );
        homeButton.setScrollFactor(0);
        homeButton.setDepth(1001);
        homeButton.setInteractive({ useHandCursor: true });
        
        const homeText = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 40,
          "Back to Home (Spawn)",
          { font: "20px Arial", fill: "#ffffff" }
        );
        homeText.setOrigin(0.5, 0.5);
        homeText.setScrollFactor(0);
        homeText.setDepth(1002);
        
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
          homeButton, homeText,
          cancelButton, cancelText
        ]);
        this.travelMenu.setDepth(1000);
        
        // Add click handlers
        mountainButton.on('pointerdown', () => {
          this.closeTravelMenu();
          this.enterMountain();
        });
        
        homeButton.on('pointerdown', () => {
          this.closeTravelMenu();
          this.teleportToSpawn();
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
    
    enterMountain() {
        // Check if already transitioning
        if (this.isTransitioning) {
          return;
        }
        
        // Save last player position for when they return from the mountains
        if (typeof window !== 'undefined') {
          window.lastMountainPos = { x: 250, y: 250 };
        }
        
        // Transition to mountain scene
        this.isTransitioning = true;
        
        // Show transition screen
        this.createTransitionScreen("Traveling to the mountains...");
        
        // Transition to mountain scene after a delay
        this.time.delayedCall(1000, () => {
          try {
            this.scene.start('scene-mountain', {
              playerName: this.playerName,
              selectedCharacter: this.selectedCharacter,
              PLAYER_SPEED: this.playerSpeed,
              lastMountainPos: window.lastMountainPos || { x: 250, y: 250 },
              isTransitioning: false
            });
          } catch (error) {
            console.error("Error starting mountain scene:", error);
            this.isTransitioning = false;
          }
        });
    }
    
    teleportToSpawn() {
        // Check if already transitioning
        if (this.isTransitioning) {
          return;
        }
        
        // Transition to home/spawn
        this.isTransitioning = true;
        
        // Show transition screen
        this.createTransitionScreen("Returning to home...");
        
        // Transition to main game scene after a delay
        this.time.delayedCall(1000, () => {
          try {
            // Reset to default spawn position in the main game
            if (typeof window !== 'undefined') {
              window.lastPlayerPos = { x: 1900, y: 2941 }; // Default spawn position
            }
            
            this.scene.start('scene-game', {
              playerName: this.playerName,
              selectedCharacter: this.selectedCharacter,
              PLAYER_SPEED: this.playerSpeed,
              isTransitioning: false
            });
          } catch (error) {
            console.error("Error returning to home:", error);
            this.isTransitioning = false;
          }
        });
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
    
    // ----------------------------------------
    // ACTIVITY SYSTEM
    // ----------------------------------------
    
    createChoreAreas() {
        // Initialize the activities array if it doesn't exist
        this.activities = [];
        this.activityButtons = [];
        this.activeActivity = null;
        
        // Define activities for the beach scene
        const beachActivities = [
            {
                id: 'beach-explore',
                name: 'Explore the Area',
                x: 400,
                y: 400,
                width: 800, // Large width to cover the whole map horizontally
                height: 600, // Large height to cover the whole map vertically
                description: 'Explore the scenic beach area (+15 Happiness, -10 Energy, -5 Hygiene)',
                energyCost: 10,
                happinessReward: 15,
                hygieneCost: 5,
                color: 0x4682B4 // Steel blue for explore
            },
            {
                id: 'beach-souvenirs',
                name: 'Buy Souvenirs',
                x: 400,
                y: 400,
                width: 800, // Large width to cover the whole map horizontally
                height: 600, // Large height to cover the whole map vertically
                description: 'Purchase beach souvenirs to remember your trip (-$25, +10 Happiness)',
                energyCost: 5,
                moneyCost: 25,
                happinessReward: 10,
                color: 0xDAA520 // Goldenrod for shopping
            },
            {
                id: 'beach-restaurant',
                name: 'Eat at Local Restaurant',
                x: 400,
                y: 400,
                width: 800, // Large width to cover the whole map horizontally
                height: 600, // Large height to cover the whole map vertically
                description: 'Enjoy a meal at a beach restaurant (-$20, +25 Hunger)',
                energyCost: 5,
                moneyCost: 20,
                hungerReward: 25,
                color: 0x8FBC8F // Dark sea green for restaurant
            }
        ];
        
        // Create activities using the Activity class
        beachActivities.forEach(config => {
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
    
    // ----------------------------------------
    // UTILITY METHODS
    // ----------------------------------------
    
    // Helper method to check if any tiles have collision properties
    hasCollisionProperties() {
        // Check a few layers for collision properties
        const layersToCheck = [this.wallLayer, this.outerwallLayer, this.obstacleLayer];
        
        for (const layer of layersToCheck) {
            if (!layer) continue;
            
            // Check if any tiles have the collide property
            let hasCollideProperty = false;
            layer.forEachTile(tile => {
                if (tile && tile.properties && tile.properties.collide) {
                    hasCollideProperty = true;
                }
            });
            
            if (hasCollideProperty) return true;
        }
        
        return false;
    }
    
    exitBeach() {
        // Prevent multiple triggers
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        
        // Store current player position before exiting
        window.lastBeachPos = { 
            x: this.player.x / this.mapScale, 
            y: this.player.y / this.mapScale 
        };
        
        // Stop player movement
        this.player.stopMovement();
        
        // Create a loading screen
        const loadingScreen = this.add.rectangle(
            0, 0, 
            this.cameras.main.width, this.cameras.main.height, 
            0x000000, 0.8
        );
        loadingScreen.setOrigin(0, 0);
        loadingScreen.setScrollFactor(0);
        loadingScreen.setDepth(1000);
        
        const loadingText = this.add.text(
            this.cameras.main.width / 2, this.cameras.main.height / 2, 
            "Leaving beach...", 
            { font: "24px Arial", fill: "#ffffff" }
        );
        loadingText.setOrigin(0.5);
        loadingText.setScrollFactor(0);
        loadingText.setDepth(1001);
        
        // Wait a moment, then switch back to the game scene
        this.time.delayedCall(1000, () => {
            // Properly shut down current scene
            this.scene.stop('scene-beach');
            this.scene.start('scene-game');
        });
    }

    displayWelcomeMessage() {
        // Display a welcome message when entering the scene
        this.showTemporaryMessage(
            `Welcome to Sunset Beach, ${this.playerName || 'Adventurer'}!`,
            '#ffffff'
        );
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
        
        // Call parent destroy
        super.destroy();
    }
}

export default Beach; 