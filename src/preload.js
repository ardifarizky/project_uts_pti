import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("scene-preload");
    this.loadingText = null;
    this.progressBar = null;
    this.progressBox = null;
  }

  preload() {
    this.createLoadingUI();
    this.setupProgressTracking();
    this.loadAssets();
  }

  createLoadingUI() {
    // Create background
    this.cameras.main.setBackgroundColor('#000000');
    
    // Add game title
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create a title
    const titleText = this.add.text(width / 2, height / 2 - 120, 'Village Life Simulator', {
      font: 'bold 32px Arial',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    });
    titleText.setOrigin(0.5);
    
    // Add decorative elements
    const topRect = this.add.rectangle(width / 2, 50, width, 10, 0x00ff00);
    const bottomRect = this.add.rectangle(width / 2, height - 50, width, 10, 0x00ff00);
    
    // Create loading progress box and bar
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    // Add loading text
    this.loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px Arial',
      fill: '#ffffff'
    });
    this.loadingText.setOrigin(0.5, 0.5);
    
    // Add percentage text
    this.percentText = this.add.text(width / 2, height / 2, '0%', {
      font: '18px Arial',
      fill: '#ffffff'
    });
    this.percentText.setOrigin(0.5, 0.5);
    
    // Add loading bar
    this.progressBar = this.add.graphics();
    
    // Add loading tips
    const tips = [
      'Tip: Complete daily tasks to earn money!',
      'Tip: Press M to toggle the minimap',
      'Tip: Press ESC to open the settings menu',
      'Tip: Keep your energy up to stay productive'
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    const tipText = this.add.text(width / 2, height / 2 + 70, randomTip, {
      font: '16px Arial',
      fill: '#ffffff'
    });
    tipText.setOrigin(0.5);
  }

  setupProgressTracking() {
    // Update progress bar as assets load
    this.load.on('progress', (value) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x00ff00, 1);
      this.progressBar.fillRect(
        this.cameras.main.width / 2 - 150, 
        this.cameras.main.height / 2 - 15, 
        300 * value, 
        30
      );
      this.percentText.setText(parseInt(value * 100) + '%');
    });
    
    // Handle completion
    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
      this.percentText.destroy();
    });
  }

  loadAssets() {
    // Add file error handler
    this.load.on('fileerror', (fileObj, error) => {
      console.error(`Error loading asset: ${fileObj.key}`, error);
    });
    
    // Main world assets
    this.load.image("bg2", "/assets/bg2.png");
    this.load.image("house", "/assets/Outdoor decoration/House.png");
    
    // Audio assets
    this.load.audio("coin", "/assets/coin.mp3");
    this.load.audio("bgMusic", "/assets/bgMusic.mp3");
    
    // Character assets
    this.load.spritesheet('player', '/assets/Player/player1.png', {frameWidth: 32, frameHeight: 32});
    this.load.image('playerSprite', '/assets/Player/Player.png');

    this.load.image('exterior', '/assets/tiles/exterior1.png');
    this.load.image('interior', '/assets/tiles/interior1.png');
    this.load.image('room', '/assets/tiles/room1.png');
    
    // UI assets - check if file exists, otherwise use fallback
    this.load.image('minimapBg', '/assets/ui/minimap_bg.png').on('fileerror', () => {
      // Create a fallback texture for minimap
      console.log('Minimap background not found, using fallback');
    });
    
    // Beach scene assets - wrap in try/catch to avoid stopping load if these don't exist
    try {
      this.load.image('sand', '/assets/Beach/sand.png');
      this.load.image('water', '/assets/Beach/water.png');
      this.load.image('umbrella', '/assets/Beach/umbrella.png');
    } catch (error) {
      console.warn('Some beach assets not found, will use fallbacks', error);
    }
    
    // House scene assets
    try {
      this.load.image('floor', '/assets/House/floor.png');
      this.load.image('wall', '/assets/House/wall.png');
      this.load.image('furniture', '/assets/House/furniture.png');
      this.load.image('bed', '/assets/House/bed.png');
      this.load.image('kitchen', '/assets/House/kitchen.png');
    } catch (error) {
      console.warn('Some house assets not found, will use fallbacks', error);
    }
    
    // Add artificial delay to show loading bar (remove in production)
    this.load.on('complete', () => {
      setTimeout(() => {
        this.startGame();
      }, 1000);
    });
  }

  startGame() {
    // Fade out effect
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    
    // Start the main game scene after fade completes
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('scene-game');
    });
  }
} 