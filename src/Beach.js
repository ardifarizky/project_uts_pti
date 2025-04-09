import Phaser from 'phaser';
import Player from './object/Player.js';

class Beach extends Phaser.Scene {
    constructor() {
        super("scene-beach");
        
        // Player properties
        this.player = null;
        this.playerSpeed = 350;
        
        // Input controls
        this.cursor = null;
        
        // Game elements
        this.exitArea = null;
        this.waterArea = null;
        this.isTransitioning = false;
    }
    
    create() {
        // Reset transition flag
        this.isTransitioning = false;
        
        // Create beach environment
        this.createEnvironment();
        
        // Create player
        this.createPlayer();
        
        // Create exit area to return to main world
        this.createExitArea();
        
        // Create water area with hitbox
        this.createWaterArea();
        
        // Display beach name
        this.createBeachName();
        
        // Setup camera
        this.setupCamera();
        
        // Setup controls
        this.setupControls();
    }
    
    createEnvironment() {
        // Create beach sand background
        const beachSand = this.add.rectangle(0, 0, 960, 540, 0xf7e26b);
        beachSand.setOrigin(0, 0);
        
        // Create some decorative elements
        
        // Palm trees
        for (let i = 0; i < 5; i++) {
            const palmTree = this.add.circle(100 + i * 200, 100, 20, 0x2e8b57);
            const palmLeaves = this.add.circle(100 + i * 200, 80, 35, 0x32cd32);
            
            // Make palm trees collidable
            this.physics.add.existing(palmTree, true);
            this.physics.add.collider(palmTree, this.player);
        }
        
        // Beach umbrellas
        for (let i = 0; i < 3; i++) {
            const umbrellaStand = this.add.rectangle(150 + i * 250, 250, 5, 30, 0x8b4513);
            const umbrellaTop = this.add.circle(150 + i * 250, 235, 40, 0xff6347);
            
            // Make umbrella stands collidable
            this.physics.add.existing(umbrellaStand, true);
        }
    }
    
    createPlayer() {
        // Get last position from main scene or use default
        const lastPos = window.lastBeachPos || { x: 480, y: 450 };
        
        // Create player using Player class
        this.player = new Player(
            this, 
            lastPos.x, 
            lastPos.y, 
            window.selectedCharacter || 'ucup'
        );
        
        // Set beach-specific player speed
        this.player.playerSpeed = this.playerSpeed;
    }
    
    createExitArea() {
        // Create exit area at the bottom of the beach
        this.exitArea = this.physics.add.sprite(480, 520, 'player');
        this.exitArea.setScale(30, 1); // Wide but thin area
        this.exitArea.setAlpha(0.3); // Semi-transparent
        this.exitArea.setTint(0xff0000); // Red tint
        this.exitArea.setImmovable(true);
        this.exitArea.body.allowGravity = false;
        
        // Add exit text
        const exitText = this.add.text(
            480, 500, 
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
    
    createWaterArea() {
        // Create water area with hitbox
        this.waterArea = this.add.rectangle(480, 150, 960, 200, 0x1ca3ec);
        this.waterArea.setAlpha(0.8);
        
        // Make water area a physics object
        this.physics.add.existing(this.waterArea);
        this.waterArea.body.setImmovable(true);
        this.waterArea.body.allowGravity = false;
        
        // Add overlap with water
        this.physics.add.overlap(
            this.player, 
            this.waterArea, 
            this.enterWater, 
            null, 
            this
        );
    }
    
    createBeachName() {
        // Create a stylish beach name
        const nameBackground = this.add.rectangle(480, 50, 300, 60, 0x000000);
        nameBackground.setAlpha(0.5);
        
        const beachName = this.add.text(
            480, 50, 
            "SUNSET BEACH", 
            { font: "bold 28px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 }
        );
        beachName.setOrigin(0.5, 0.5);
        
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
    
    setupCamera() {
        // Main camera follows player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, 960, 540);
    }
    
    enterWater(player, water) {
        // Slow down player in water
        if (this.player) {
            this.player.playerSpeed = 150;
        }
        
        // Could add splash particles or swimming animation here
    }
    
    setupControls() {
        // No need to create cursor keys as Player class handles its own input
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
        
        // Reset player speed when out of water
        if (this.player && this.waterArea && !this.physics.overlap(this.player, this.waterArea)) {
            this.player.playerSpeed = 350;
        }
    }
    
    exitBeach() {
        // Prevent multiple triggers
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        
        // Store current player position before exiting
        window.lastBeachPos = { x: this.player.x, y: this.player.y };
        
        // Stop player movement
        this.player.stopMovement();
        
        // Create a loading screen
        const loadingScreen = this.add.rectangle(
            0, 0, 
            960, 540, 
            0x000000, 0.8
        );
        loadingScreen.setOrigin(0, 0);
        loadingScreen.setScrollFactor(0);
        loadingScreen.setDepth(1000);
        
        const loadingText = this.add.text(
            480, 270, 
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
}

export default Beach; 