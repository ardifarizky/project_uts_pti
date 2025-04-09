import Phaser from 'phaser';

class TutorialScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'scene-tutorial',
      active: false
    });
    
    // Tutorial state
    this.isActive = false;
    
    // Text elements
    this.tutorialTexts = [];
  }
  
  create() {
    // Create semi-transparent background
    this.background = this.add.rectangle(
      0, 0,
      this.sys.game.config.width, this.sys.game.config.height,
      0x000000, 0.7
    );
    this.background.setOrigin(0, 0);
    this.background.setScrollFactor(0);
    
    // Create title text
    this.titleText = this.add.text(
      this.sys.game.config.width / 2, 50,
      'GAME CONTROLS',
      { font: 'bold 32px Arial', fill: '#ffffff' }
    );
    this.titleText.setOrigin(0.5, 0);
    this.titleText.setScrollFactor(0);
    
    // Create control instructions
    const instructions = [
      { key: 'Arrow Keys', description: 'Move your character' },
      { key: 'M', description: 'Toggle minimap on/off' },
      { key: 'ESC', description: 'Open settings menu' },
      { key: 'H', description: 'Show/hide this tutorial' }
    ];
    
    // Position settings
    const startY = 150;
    const spacing = 60;
    
    // Create text for each instruction
    instructions.forEach((instruction, index) => {
      // Create key text
      const keyText = this.add.text(
        this.sys.game.config.width / 2 - 150, startY + (index * spacing),
        instruction.key,
        { font: 'bold 24px Arial', fill: '#ffff00' }
      );
      keyText.setOrigin(0, 0.5);
      keyText.setScrollFactor(0);
      
      // Create description text
      const descText = this.add.text(
        this.sys.game.config.width / 2 + 50, startY + (index * spacing),
        instruction.description,
        { font: '24px Arial', fill: '#ffffff' }
      );
      descText.setOrigin(0, 0.5);
      descText.setScrollFactor(0);
      
      // Add texts to array for easy access
      this.tutorialTexts.push(keyText, descText);
    });
    
    // Add "Press H to close" text at the bottom
    const closeText = this.add.text(
      this.sys.game.config.width / 2, this.sys.game.config.height - 100,
      'Press H to close tutorial',
      { font: '20px Arial', fill: '#ffffff' }
    );
    closeText.setOrigin(0.5, 0);
    closeText.setScrollFactor(0);
    this.tutorialTexts.push(closeText);
    
    // Set scene to be initially inactive
    this.setVisible(false);
    
    // Add H key input handler directly in the tutorial scene
    this.input.keyboard.on('keydown-H', () => {
      this.toggleTutorial();
    });
  }
  
  // Helper method to show/hide the tutorial
  setVisible(visible) {
    this.isActive = visible;
    this.background.setVisible(visible);
    this.titleText.setVisible(visible);
    this.tutorialTexts.forEach(text => text.setVisible(visible));
  }
  
  // Toggle tutorial visibility
  toggleTutorial() {
    this.isActive = !this.isActive;
    this.setVisible(this.isActive);
    
    // Don't pause the underlying game, just show the tutorial overlay
    // This avoids the freeze issue
    
    return this.isActive;
  }
}

export default TutorialScene; 