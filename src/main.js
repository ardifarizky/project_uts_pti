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
    this.hunger = 50;
    this.energy = 50;
    this.hygiene = 50;
    this.happiness = 50;
    this.money = 100; // Uang dimulai dari 100

    // ====== WAKTU GAME ======
    let now = new Date();
    this.gameTimeMinutes = 480; // Konversi jam ke menit
    this.gameDay = 1;
    this.weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    this.currentWeekDay = this.weekDays[now.getDay()]; // Ambil hari sesuai real-time
    this.greetingText = "";

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

    // ==================== TEXT GREETING & TIME ====================
    this.greetingLabel = this.add.text(10, 10, "", { font: "20px Arial", fill: "#ffffff" });
    this.timeLabel = this.add.text(10, 40, "", { font: "20px Arial", fill: "#ffffff" });

    this.updateGameTime();

    // TEXT MONEY
    this.moneyText = this.add.text(370, 10, `Money: $${this.money}`, { font: "20px Arial", fill: "#ffffff" });

    // GRAPHICS FOR PROGRESS BARS
    this.progressBars = {
      hunger: this.add.graphics(),
      energy: this.add.graphics(),
      hygiene: this.add.graphics(),
      happiness: this.add.graphics(),
    };

    // LABELS
    this.add.text(310, 48, "Hunger:", { font: "14px Arial", fill: "#ffffff" });
    this.add.text(310, 68, "Energy:", { font: "14px Arial", fill: "#ffffff" });
    this.add.text(310, 88, "Hygiene:", { font: "14px Arial", fill: "#ffffff" });
    this.add.text(310, 108, "Happiness:", { font: "14px Arial", fill: "#ffffff" });

    // Gambar pertama kali
    this.drawProgressBars();

    // Running update game time
    this.time.addEvent({
      delay: 100, //1 detik real-time = 10 menit di game
      callback: this.updateGameTime,
      callbackScope: this,
      loop: true
    });

    // Setiap 5 detik, kurangi progress bar
    this.time.addEvent({
      delay: 5000, // 5 detik real-time
      callback: this.updateStats,
      callbackScope: this,
      loop: true
    });
    
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

  updateGameTime() {
    console.log("Game time updated!"); // Debugging untuk memastikan ini hanya berjalan tiap 5 detik.
    this.gameTimeMinutes++;
  
    // Jika sudah mencapai 24 jam (1440 menit), pindah ke hari berikutnya
    if (this.gameTimeMinutes >= 1440) {
      this.gameTimeMinutes = 0; // Reset ke 00:00
      this.gameDay++; // Tambah hari
      let nextDayIndex = (this.weekDays.indexOf(this.currentWeekDay) + 1) % 7;
      this.currentWeekDay = this.weekDays[nextDayIndex]; // Update hari
    }
  
    // Hitung jam dan menit dalam game
    let hours = Math.floor(this.gameTimeMinutes / 60);
    let minutes = this.gameTimeMinutes % 60;
  
    // Format waktu (contoh: "08:00")
    let timeText = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  
    // Perbarui greeting berdasarkan jam
    if (hours >= 5 && hours < 12) {
      this.greetingText = "Good Morning";
    } else if (hours >= 12 && hours < 18) {
      this.greetingText = "Good Afternoon";
    } else if (hours >= 18 && hours < 22) {
      this.greetingText = "Good Evening";
    } else {
      this.greetingText = "Good Night";
    }
  
    // Update teks di layar
    this.greetingLabel.setText(`${this.greetingText}`);
    this.timeLabel.setText(`${this.currentWeekDay} | Day ${this.gameDay} | ${timeText}`);
  }  

  updateStats() {
    this.hunger = Math.max(0, this.hunger - 2);
    this.energy = Math.max(0, this.energy - 1);
    this.hygiene = Math.max(0, this.hygiene - 3);
    this.happiness = Math.max(0, this.happiness - 1);
  
    // Perbarui tampilan progress bar
    this.drawProgressBars();
  
    // Update tampilan uang
    this.moneyText.setText(`Money: $${this.money}`);
  }
  
  drawProgressBars() {
    // Bersihkan progress bar sebelumnya
    this.progressBars.hunger.clear();
    this.progressBars.energy.clear();
    this.progressBars.hygiene.clear();
    this.progressBars.happiness.clear();
  
    // Warna progress bar (merah, kuning, hijau, biru)
    const colors = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff];
  
    // Gambar setiap progress bar
    const stats = [this.hunger, this.energy, this.hygiene, this.happiness];
    const bars = ["hunger", "energy", "hygiene", "happiness"];
    
    for (let i = 0; i < bars.length; i++) {
      this.progressBars[bars[i]].fillStyle(colors[i], 1);
      this.progressBars[bars[i]].fillRect(400, 50 + i * 20, stats[i], 10); // X, Y, width, height
    }
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
  const playerName = document.getElementById('playerName').value.trim();

  if (!playerName) {
    alert("Please enter your name!");
  } else {
    console.log(`Player's name: ${playerName}`);

  gameStartDiv.style.display="none"
  game.scene.resume("scene-game")
  }
});