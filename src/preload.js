// preload.js
export function preloadAssets(scene) {
    scene.load.image("bg2", "/assets/bg2.png");
    scene.load.audio("coin", "/assets/coin.mp3");
    scene.load.audio("bgMusic", "/assets/bgMusic.mp3");
    scene.load.spritesheet('player', '/assets/Player/Player.png', { frameWidth: 32, frameHeight: 32 });
  }
  