import './style.css'
import Phaser, { Physics } from 'phaser'

const sizes = {
  width:500,
  height:500
}

const speedDown = 300

class GameScene extends Phaser.Scene {
  constructor(){
    super("scene-game");
    this.player
    this.cursor
    this.playerSpeed = speedDown+50
    this.target
    this.points = 0
    this.textScore
    this.textTime
    this.timeEved
    this.remainingTime
    this.coinMusic
    this.bgMusic
    this.emitter
  }

  preload(){
    this.load.image("bg2","/assets/bg2.png") //background
    this.load.audio("coin", "/assets/coin.mp3")
    this.load.audio("bgMusic", "/assets/bgMusic.mp3")
    //load spritesheet karakter
    this.load.spritesheet('player', '/assets/Player/Player.png', {frameWidth: 32, frameHeight: 32});

  }

  create(){
    // ==================== PAUSE GAME ====================
    this.scene.pause("scene-game")

    // ==================== SOUND ====================
    this.coinMusic = this.sound.add("coin")

    // ==================== BACKGROUND MUSIC ====================
    this.bgMusic = this.sound.add("bgMusic")
    this.bgMusic.play()
    //this.bgMusic.stop()

    // ==================== BACKGROUND ====================

    //background
    this.add.image(0,0,"bg2").setOrigin(0,0).setDisplaySize(sizes.width,sizes.height)

    // ==================== PLAYER ====================

    //animasi jalan player

    this.anims.create({
        key: 'walk-right',
        frames: this.anims.generateFrameNumbers('player', { start: 6, end: 11 }),
        frameRate: 60,
        repeat: -1
    });
    
    this.anims.create({
        key: 'walk-up',
        frames: this.anims.generateFrameNumbers('player', { start: 12, end: 17 }),
        frameRate: 60,
        repeat: -1
    });
    
    this.anims.create({
        key: 'walk-down',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }),
        frameRate: 60,
        repeat: -1
    });
  
    // player menggunakan spritesheet dari player.png
    this.player = this.physics.add.sprite(100, 100, 'player');
    this.player.setScale(2);
    this.player.setImmovable(true)
    this.player.body.allowGravity = false
    this.player.setCollideWorldBounds(true)
    this.player.setSize(this.player.width-this.player.width/4, this.player.height/2) //player collider
    .setOffset(this.player.width/10, this.player.height - this.player.height/2)

    // ==================== CAMERA ====================
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 500, 500);
    this.cameras.main.setZoom(1);


    // ==================== TARGET ====================

    // ==================== OVERLAP ====================

    // ==================== KEYBOARD INPUT ====================

    this.cursor = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });    

    // ==================== TEXT SCORE & TIME ====================

    this.timeEvent = this.time.delayedCall(30000,this.gameOver,[], this)

    this.emitter = this.add.particles(0,0,"money",{
      speed:100,
      gravityY:speedDown-200,
      scale:0.04,
      duration:100,
      emitting:false
    })
    this.emitter
    .startFollow(this.player,this.player.width/2,this.player.height/2,true)
  }

  update(){

    // ==================== PLAYER MOVEMENT ====================

    const { left, right, up, down } = this.cursor;
    const { left: A, right: D, up: W, down: S } = this.wasd;

    if(left.isDown || A.isDown){
      this.player.setVelocityX(-this.playerSpeed);
      this.player.setFlipX(true);
      this.player.anims.play('walk-right', true);
    } else if(right.isDown || D.isDown){
      this.player.setVelocityX(this.playerSpeed);
      this.player.setFlipX(false);
      this.player.anims.play('walk-right', true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.stop();
    }

    if(up.isDown || W.isDown){
      this.player.setVelocityY(-this.playerSpeed);
      this.player.anims.play('walk-up', true);
    } else if(down.isDown || S.isDown){
      this.player.setVelocityY(this.playerSpeed);
      this.player.anims.play('walk-down', true);
    } else {
      this.player.setVelocityY(0);
      this.player.anims.stop();
    }
}

}

const config = {
  type:Phaser.WEBGL,
  width:sizes.width,
  height:sizes.height,
  canvas:gameCanvas,
  physics: {
    default:"arcade",
    arcade: {
      gravity: {y:speedDown},
      debug:true
    }
  },
  scene:[GameScene]
}

const game = new Phaser.Game(config)

gameStartBtn.addEventListener("click", ()=>{
  gameStartDiv.style.display="none"
  game.scene.resume("scene-game")
})