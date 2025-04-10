import Phaser from 'phaser';

class StatsUI {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.energyText = null;
    this.moneyText = null;
    this.hungerText = null;
    this.hygieneText = null;
    this.happinessText = null;
    this.progressBars = null;
    this.valueTexts = [];
    this.moneyValueText = null;
    this.lastStats = null; // Cache previous stats to avoid unnecessary redraws
    this.resizeHandler = null;
    this.updateScheduled = false;
    
    this.createUI();
    
    // Add resize handler to reposition UI on window resize
    this.resizeHandler = this.handleResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
  }
  
  // Handle window resize events
  handleResize() {
    if (!this.container) return;
    
    // Debounce resize events to prevent excessive calculations
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      
      window.requestAnimationFrame(() => {
        // Get the new game width
        const gameWidth = this.scene.cameras.main.width;
        // Reposition container in top-right corner
        this.container.setPosition(gameWidth - 255, 15);
        this.updateScheduled = false;
      });
    }
  }
  
  createUI() {
    // Get current stats from global
    const playerStats = this.getPlayerStats();
    this.lastStats = {...playerStats}; // Create a copy for comparison
    
    // Get the game width to position UI in right corner
    const gameWidth = this.scene.cameras.main.width;
    
    // Create a container for the stats UI - position in top-right corner
    this.container = this.scene.add.container(gameWidth - 255, 15);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000); // High depth to ensure visibility
    
    // Create a nicer background with rounded corners (simulate with multiple shapes)
    // Main background - make wider to accommodate longer text and bars
    const statsBg = this.scene.add.rectangle(0, 0, 240, 155, 0x000000, 0.7);
    statsBg.setOrigin(0, 0);
    
    // Border
    const border = this.scene.add.rectangle(0, 0, 240, 155, 0xFFFFFF, 0.3);
    border.setOrigin(0, 0);
    border.setStrokeStyle(2, 0xFFFFFF, 0.5);
    
    // Title background
    const titleBg = this.scene.add.rectangle(0, 0, 240, 25, 0x3a86ff, 0.8);
    titleBg.setOrigin(0, 0);
    
    // Title text
    const titleText = this.scene.add.text(120, 12, "PLAYER STATS", {
      font: 'bold 14px Arial',
      fill: '#FFFFFF'
    });
    titleText.setOrigin(0.5, 0.5);
    
    this.container.add([statsBg, border, titleBg, titleText]);
    
    // Create text elements for each stat
    const textStyle = { 
      font: '14px Arial', 
      fill: '#ffffff'
    };
    
    const iconStyle = {
      font: '16px Arial',
      fill: '#ffffff'
    };
    
    // Energy stat with icon
    const energyIcon = this.scene.add.text(12, 35, "⚡", iconStyle);
    this.energyText = this.scene.add.text(35, 35, `Energy:`, textStyle);
    
    // Money stat with icon
    const moneyIcon = this.scene.add.text(12, 60, "💰", iconStyle);
    this.moneyText = this.scene.add.text(35, 60, `Money:`, textStyle);
    
    // Hunger stat with icon
    const hungerIcon = this.scene.add.text(12, 85, "🍔", iconStyle);
    this.hungerText = this.scene.add.text(35, 85, `Hunger:`, textStyle);
    
    // Hygiene stat with icon
    const hygieneIcon = this.scene.add.text(12, 110, "🚿", iconStyle);
    this.hygieneText = this.scene.add.text(35, 110, `Hygiene:`, textStyle);
    
    // Happiness stat with icon
    const happinessIcon = this.scene.add.text(12, 135, "😊", iconStyle);
    this.happinessText = this.scene.add.text(35, 135, `Happiness:`, textStyle);
    
    // Add all text elements to the container
    this.container.add([
      energyIcon, this.energyText,
      moneyIcon, this.moneyText,
      hungerIcon, this.hungerText,
      hygieneIcon, this.hygieneText,
      happinessIcon, this.happinessText
    ]);
    
    // Create graphics for progress bars
    this.createProgressBars();
    
    // Create value texts once
    this.createValueTexts(playerStats);
  }
  
  createProgressBars() {
    // Graphics for progress bars
    this.progressBars = {
      hunger: this.scene.add.graphics(),
      energy: this.scene.add.graphics(),
      hygiene: this.scene.add.graphics(),
      happiness: this.scene.add.graphics(),
      money: this.scene.add.graphics()
    };
    
    // Add all progress bars to the container
    Object.values(this.progressBars).forEach(bar => {
      this.container.add(bar);
    });
    
    // Draw initial progress bars
    this.drawProgressBars(this.getPlayerStats());
  }
  
  // Create value texts just once
  createValueTexts(playerStats) {
    const barWidth = 120;
    const startX = 100;
    const valueStyle = { font: 'bold 10px Arial', fill: '#ffffff' };
    
    // Create value texts for stats
    this.valueTexts = [
      this.scene.add.text(startX + barWidth + 10, 37, playerStats.energy.toString(), valueStyle),
      this.scene.add.text(startX + barWidth + 10, 87, playerStats.hunger.toString(), valueStyle),
      this.scene.add.text(startX + barWidth + 10, 112, playerStats.hygiene.toString(), valueStyle),
      this.scene.add.text(startX + barWidth + 10, 137, playerStats.happiness.toString(), valueStyle)
    ];
    
    // Create money value text
    this.moneyValueText = this.scene.add.text(startX + barWidth / 2, 62 + 5, `$${playerStats.money}`, { 
      font: 'bold 12px Arial', 
      fill: '#000000'
    });
    this.moneyValueText.setOrigin(0.5, 0.5);
    
    // Add all texts to container
    this.valueTexts.forEach(text => this.container.add(text));
    this.container.add(this.moneyValueText);
  }
  
  // Update existing text values instead of creating new ones
  updateValueTexts(playerStats) {
    const barWidth = 120;
    const startX = 100;
    
    // Update existing value texts
    if (this.valueTexts && this.valueTexts.length === 4) {
      this.valueTexts[0].setText(playerStats.energy.toString());
      this.valueTexts[1].setText(playerStats.hunger.toString());
      this.valueTexts[2].setText(playerStats.hygiene.toString());
      this.valueTexts[3].setText(playerStats.happiness.toString());
    }
    
    // Update money value text
    if (this.moneyValueText) {
      this.moneyValueText.setText(`$${playerStats.money}`);
    }
  }
  
  drawProgressBars(playerStats) {
    const barWidth = 120;
    const barHeight = 10;
    const startX = 100; // Increase the X position to create more space from text
    const cornerRadius = 3;
    
    // Clear previous graphics
    Object.values(this.progressBars).forEach(bar => bar.clear());
    
    // Energy bar (blue)
    this.drawBar(
      this.progressBars.energy,
      startX, 37,
      barWidth, barHeight,
      0x444444, 0x3a86ff,
      playerStats.energy
    );
    
    // Money bar (gold)
    this.drawBar(
      this.progressBars.money,
      startX, 62,
      barWidth, barHeight,
      0x444444, 0xFFC107,
      100 // Always full for money display
    );
    
    // Hunger bar (green)
    this.drawBar(
      this.progressBars.hunger,
      startX, 87,
      barWidth, barHeight,
      0x444444, 0x2ec4b6,
      playerStats.hunger
    );
    
    // Hygiene bar (purple)
    this.drawBar(
      this.progressBars.hygiene,
      startX, 112,
      barWidth, barHeight,
      0x444444, 0x9381ff,
      playerStats.hygiene
    );
    
    // Happiness bar (yellow)
    this.drawBar(
      this.progressBars.happiness,
      startX, 137,
      barWidth, barHeight,
      0x444444, 0xffbe0b,
      playerStats.happiness
    );
  }
  
  // Helper method to draw a prettier progress bar
  drawBar(graphics, x, y, width, height, bgColor, fillColor, value) {
    const radius = height / 2;
    const fillWidth = width * (value / 100);
    
    // Background with rounded corners
    graphics.fillStyle(bgColor, 1);
    graphics.fillRoundedRect(x, y, width, height, radius);
    
    // Fill with rounded corners on the left, and matching the shape on the right if partially filled
    if (fillWidth > 0) {
      graphics.fillStyle(fillColor, 1);
      if (fillWidth >= width) {
        // Full bar
        graphics.fillRoundedRect(x, y, width, height, radius);
      } else {
        // Partial bar - the right side is straight, not rounded
        graphics.fillRoundedRect(x, y, fillWidth, height, { tl: radius, bl: radius, tr: 0, br: 0 });
      }
    }
    
    // Add stroke around the full bar
    graphics.lineStyle(1, 0xFFFFFF, 0.3);
    graphics.strokeRoundedRect(x, y, width, height, radius);
  }
  
  update() {
    if (!this.container || !this.container.visible) return;
    
    const playerStats = this.getPlayerStats();
    
    // Check if stats have changed before updating UI
    if (this.haveStatsChanged(playerStats)) {
      // Update progress bars
      this.drawProgressBars(playerStats);
      
      // Update text values
      this.updateValueTexts(playerStats);
      
      // Store the current stats for future comparison
      this.lastStats = {...playerStats};
    }
  }
  
  // Check if stats have changed to avoid unnecessary updates
  haveStatsChanged(newStats) {
    if (!this.lastStats) return true;
    
    return (
      newStats.energy !== this.lastStats.energy ||
      newStats.money !== this.lastStats.money ||
      newStats.hunger !== this.lastStats.hunger ||
      newStats.hygiene !== this.lastStats.hygiene ||
      newStats.happiness !== this.lastStats.happiness
    );
  }
  
  getPlayerStats() {
    return typeof window !== 'undefined' && window.playerStats 
      ? window.playerStats 
      : { energy: 50, money: 100, hunger: 50, hygiene: 50, happiness: 50 };
  }
  
  show() {
    this.container.setVisible(true);
  }
  
  hide() {
    this.container.setVisible(false);
  }
  
  // Clean up method to properly destroy all resources
  destroy() {
    // Remove resize listener if it exists
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    
    // Clear any pending animation frames
    this.updateScheduled = false;
    
    // Destroy all graphics objects
    if (this.progressBars) {
      Object.values(this.progressBars).forEach(bar => {
        if (bar) bar.destroy();
      });
      this.progressBars = null;
    }
    
    // Destroy all text objects separately to ensure complete cleanup
    if (this.valueTexts) {
      this.valueTexts.forEach(text => {
        if (text) text.destroy();
      });
      this.valueTexts = null;
    }
    
    if (this.moneyValueText) {
      this.moneyValueText.destroy();
      this.moneyValueText = null;
    }
    
    // Destroy container and all its children
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    
    // Clear references to prevent memory leaks
    this.lastStats = null;
    this.scene = null;
  }
}

export default StatsUI; 