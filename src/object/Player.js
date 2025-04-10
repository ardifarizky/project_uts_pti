import Phaser from 'phaser';

// Character sprite configurations
const CHARACTER_SPRITES = {
  ucup: { spritesheet: 'player1', scale: 2 },
  aminah: { spritesheet: 'player2', scale: 2 },
  adel: { spritesheet: 'player3', scale: 2 },
  gekko: { spritesheet: 'player4', scale: 2 }
};

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, character = 'ucup') {
    // Use the proper spritesheet based on character selection
    super(scene, x, y, CHARACTER_SPRITES[character].spritesheet);
    
    // Add this sprite to the scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Player properties
    this.character = character;
    this.playerSpeed = 200; // Default speed
    this.cursor = scene.input.keyboard.createCursorKeys();
    
    // Configure player sprite
    this.setScale(CHARACTER_SPRITES[character].scale/1.2);
    
    this.setImmovable(false);
    this.body.allowGravity = false;
    this.setCollideWorldBounds(true);
    this.setDepth(10);
    
    // Adjust player collision box
    this.body.setSize(
      this.width * 0.6, 
      this.height * 0.5
    );
    this.body.setOffset(
      this.width * 0.2, 
      this.height * 0.5
    );
    
    // Create player animations if they don't exist
    this.createAnimations(scene);
  }
  
  createAnimations(scene) {
    // Define animation base key with character name to make them unique per character
    const animPrefix = `${this.character}-`;
    const spritesheet = CHARACTER_SPRITES[this.character].spritesheet;
    
    // Only create animations if they don't already exist
    if (!scene.anims.exists(`${animPrefix}walk-right`)) {
      scene.anims.create({
        key: `${animPrefix}walk-right`,
        frames: scene.anims.generateFrameNumbers(spritesheet, { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists(`${animPrefix}walk-up`)) {
      scene.anims.create({
        key: `${animPrefix}walk-up`,
        frames: scene.anims.generateFrameNumbers(spritesheet, { start: 4, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists(`${animPrefix}walk-down`)) {
      scene.anims.create({
        key: `${animPrefix}walk-down`,
        frames: scene.anims.generateFrameNumbers(spritesheet, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }
    
    // Add new animations for actions
    if (!scene.anims.exists(`${animPrefix}sleep`)) {
      scene.anims.create({
        key: `${animPrefix}sleep`,
        frames: scene.anims.generateFrameNumbers(spritesheet, { start: 16, end: 19 }),
        frameRate: 5,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists(`${animPrefix}eat`)) {
      scene.anims.create({
        key: `${animPrefix}eat`,
        frames: scene.anims.generateFrameNumbers(spritesheet, { start: 20, end: 23 }),
        frameRate: 5,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists(`${animPrefix}bath`)) {
      scene.anims.create({
        key: `${animPrefix}bath`,
        frames: scene.anims.generateFrameNumbers(spritesheet, { start: 28, end: 31 }),
        frameRate: 5,
        repeat: -1
      });
    }
  }
  
  update() {
    this.handleMovement();
  }
  
  handleMovement() {
    const { left, right, up, down } = this.cursor;
    const animPrefix = `${this.character}-`;

    // Reset velocity
    this.setVelocity(0);

    // Calculate movement speed
    let speed = this.playerSpeed;
    
    // Handle diagonal movement (normalize speed)
    const isDiagonal = 
      (left.isDown || right.isDown) && 
      (up.isDown || down.isDown);
    
    if (isDiagonal) {
      speed = speed * 0.7071; // Approximately 1/sqrt(2)
    }

    // Handle horizontal movement
    if (left.isDown) {
      this.setVelocityX(-speed);
      this.setFlipX(true);
      if (!(up.isDown || down.isDown)) {
        this.anims.play(`${animPrefix}walk-right`, true);
      }
    } else if (right.isDown) {
      this.setVelocityX(speed);
      this.setFlipX(false);
      if (!(up.isDown || down.isDown)) {
        this.anims.play(`${animPrefix}walk-right`, true);
      }
    }

    // Handle vertical movement
    if (up.isDown) {
      this.setVelocityY(-speed);
      this.anims.play(`${animPrefix}walk-up`, true);
    } else if (down.isDown) {
      this.setVelocityY(speed);
      this.anims.play(`${animPrefix}walk-down`, true);
    }
    
    // If no movement keys are pressed, stop animations
    if (!(left.isDown || right.isDown || up.isDown || down.isDown)) {
      this.anims.stop();
    }
  }
  
  stopMovement() {
    this.setVelocity(0);
    this.anims.stop();
  }
  
  // Action animations functions
  playSleepAnimation() {
    this.stopMovement();
    this.anims.play(`${this.character}-sleep`, true);
    return this;
  }
  
  playEatAnimation() {
    this.stopMovement();
    this.anims.play(`${this.character}-eat`, true);
    return this;
  }
  
  playBathAnimation() {
    this.stopMovement();
    this.anims.play(`${this.character}-bath`, true);
    return this;
  }
  
  stopActionAnimation() {
    this.anims.stop();
    return this;
  }
  
  // Static function to extract front-facing sprite for character selection
  static extractFrontSprite(imageUrl, callback) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function() {
      // Create canvas with padding for better centering
      const canvas = document.createElement('canvas');
      // Increase canvas size for higher quality
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Extract the front-facing sprite (frame 1 - more centered facing front)
      // The spritesheet has 6 frames per row, frames 0-5 are walking down animations
      // Frame 1 is a good centered front-facing pose
      ctx.drawImage(img, 32 * 1, 0, 32, 32, 0, 0, 32, 32);
      
      // Create a new image with the extracted sprite
      const frontSprite = new Image();
      frontSprite.src = canvas.toDataURL('image/png');
      callback(frontSprite);
    };
    img.src = imageUrl;
  }
}

export default Player;
export { CHARACTER_SPRITES };
