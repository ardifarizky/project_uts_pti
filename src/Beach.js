import Phaser from 'phaser';
import Player from './object/Player.js';

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
        
        // UI elements
        this.statsContainer = null;
        this.energyText = null;
        this.moneyText = null;
        this.hungerText = null;
        this.hygieneText = null;
        this.happinessText = null;
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
        this.createStatsUI();
        
        // Setup camera
        this.setupCamera();
        
        // Display beach name
        this.createBeachName();
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
        
        // Update stats UI
        this.updateStatsUI();
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
    // UI METHODS
    // ----------------------------------------
    
    createStatsUI() {
        // Create a container for stats UI elements
        this.statsContainer = this.add.container(10, 10);
        this.statsContainer.setScrollFactor(0);
        this.statsContainer.setDepth(100);
        
        // Get current player stats
        const playerStats = this.getPlayerStats();
        
        // Create stat display texts
        this.energyText = this.add.text(0, 0, `Energy: ${playerStats.energy}`, { 
            font: '16px Arial', 
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        
        this.moneyText = this.add.text(0, 25, `Money: $${playerStats.money}`, { 
            font: '16px Arial', 
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        
        this.hungerText = this.add.text(0, 50, `Hunger: ${playerStats.hunger}`, { 
            font: '16px Arial', 
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        
        this.hygieneText = this.add.text(0, 75, `Hygiene: ${playerStats.hygiene}`, { 
            font: '16px Arial', 
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        
        this.happinessText = this.add.text(0, 100, `Happiness: ${playerStats.happiness}`, { 
            font: '16px Arial', 
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        
        // Add texts to container
        this.statsContainer.add([
            this.energyText,
            this.moneyText,
            this.hungerText,
            this.hygieneText,
            this.happinessText
        ]);
    }
    
    updateStatsUI() {
        if (!this.statsContainer) return;
        
        // Get current player stats
        const playerStats = this.getPlayerStats();
        
        // Update text displays
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
        return typeof window !== 'undefined' && window.playerStats ? window.playerStats : { 
            energy: 50, 
            money: 100,
            hunger: 50,
            hygiene: 50,
            happiness: 50
        };
    }
    
    // Helper method to update a specific stat
    updatePlayerStat(stat, value) {
        if (typeof window !== 'undefined' && window.playerStats) {
            window.playerStats[stat] = value;
        }
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
}

export default Beach; 