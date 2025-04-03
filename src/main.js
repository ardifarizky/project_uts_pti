import Phaser from 'phaser';
import './style.css'
import { GameScene } from './GameScene.js'; // Import the scene

const sizes = {
  width: 500,
  height: 500
};

const speedDown = 300;

const config = {
  type: Phaser.WEBGL,
  width: sizes.width,
  height: sizes.height,
  canvas: document.getElementById('gameCanvas'), // Assuming you're using an HTML canvas with id 'gameCanvas'
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: speedDown },
      debug: false,
    }
  },
  scene: [GameScene]
};

const game = new Phaser.Game(config);

// Handle game start button
const gameStartBtn = document.getElementById('gameStartBtn');
const gameStartDiv = document.getElementById('gameStartDiv');

gameStartBtn.addEventListener('click', () => {
  const playerName = document.getElementById('playerName').value.trim();

  if (!playerName) {
    alert("Please enter your name!");
  } else {
    console.log(`Player's name: ${playerName}`);

    gameStartDiv.style.display = 'none';
    game.scene.start('scene-game');  // This will start the scene if not already running
  }
});
