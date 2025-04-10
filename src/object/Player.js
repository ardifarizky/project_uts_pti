import Phaser from 'phaser';

// Character sprite configurations
const CHARACTER_SPRITES = {
  ucup: { spritesheet: 'player', scale: 2 },
  budi: { spritesheet: 'player', scale: 2, tint: 0xadd8e6 }, // Light blue tint
  doni: { spritesheet: 'player', scale: 2, tint: 0xffa500 }  // Orange tint
};

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, character = 'ucup') {
    super(scene, x, y, 'player');
    
    // Add this sprite to the scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Player properties
    this.character = character;
    this.playerSpeed = 200; // Default speed
    this.cursor = scene.input.keyboard.createCursorKeys();
    
    // Configure player sprite
    this.setScale(CHARACTER_SPRITES[character].scale/1.2);
    
    // Apply character tint if specified
    if (CHARACTER_SPRITES[character].tint) {
      this.setTint(CHARACTER_SPRITES[character].tint/1.2);
    }
    
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
    // Only create animations if they don't already exist
    if (!scene.anims.exists('walk-right')) {
      scene.anims.create({
        key: 'walk-right',
        frames: scene.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists('walk-up')) {
      scene.anims.create({
        key: 'walk-up',
        frames: scene.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists('walk-down')) {
      scene.anims.create({
        key: 'walk-down',
        frames: scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }
    
    // Add new animations for actions
    if (!scene.anims.exists('sleep')) {
      scene.anims.create({
        key: 'sleep',
        frames: scene.anims.generateFrameNumbers('player', { start: 16, end: 19 }),
        frameRate: 5,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists('eat')) {
      scene.anims.create({
        key: 'eat',
        frames: scene.anims.generateFrameNumbers('player', { start: 20, end: 23 }),
        frameRate: 5,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists('bath')) {
      scene.anims.create({
        key: 'bath',
        frames: scene.anims.generateFrameNumbers('player', { start: 28, end: 31 }),
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
        this.anims.play('walk-right', true);
      }
    } else if (right.isDown) {
      this.setVelocityX(speed);
      this.setFlipX(false);
      if (!(up.isDown || down.isDown)) {
        this.anims.play('walk-right', true);
      }
    }

    // Handle vertical movement
    if (up.isDown) {
      this.setVelocityY(-speed);
      this.anims.play('walk-up', true);
    } else if (down.isDown) {
      this.setVelocityY(speed);
      this.anims.play('walk-down', true);
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
    this.anims.play('sleep', true);
    return this;
  }
  
  playEatAnimation() {
    this.stopMovement();
    this.anims.play('eat', true);
    return this;
  }
  
  playBathAnimation() {
    this.stopMovement();
    this.anims.play('bath', true);
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
