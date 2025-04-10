import Phaser from 'phaser';

/**
 * Activity class to handle activities/chores across different scenes
 */
class Activity {
  /**
   * Create a new activity
   * @param {Phaser.Scene} scene - The scene this activity belongs to
   * @param {Object} config - Configuration for the activity
   * @param {string} config.id - Unique identifier for the activity
   * @param {string} config.name - Display name of the activity
   * @param {number} config.x - X position of the activity zone
   * @param {number} config.y - Y position of the activity zone
   * @param {number} config.width - Width of the activity zone
   * @param {number} config.height - Height of the activity zone
   * @param {string} config.description - Description of the activity
   * @param {number} [config.energyCost=0] - Energy cost of the activity
   * @param {number} [config.energyReward=0] - Energy reward of the activity
   * @param {number} [config.moneyCost=0] - Money cost of the activity
   * @param {number} [config.moneyReward=0] - Money reward of the activity
   * @param {number} [config.hungerCost=0] - Hunger cost of the activity
   * @param {number} [config.hungerReward=0] - Hunger reward of the activity
   * @param {number} [config.hygieneCost=0] - Hygiene cost of the activity
   * @param {number} [config.hygieneReward=0] - Hygiene reward of the activity
   * @param {number} [config.happinessCost=0] - Happiness cost of the activity
   * @param {number} [config.happinessReward=0] - Happiness reward of the activity
   * @param {number} [config.color=0x00aa00] - Color for the activity zone (debug mode)
   * @param {string} [config.type='normal'] - Type of activity (normal, sleep, etc.)
   */
  constructor(scene, config) {
    this.scene = scene;
    this.config = {
      // Default values
      energyCost: 0,
      energyReward: 0,
      moneyCost: 0,
      moneyReward: 0,
      hungerCost: 0, 
      hungerReward: 0,
      hygieneCost: 0,
      hygieneReward: 0,
      happinessCost: 0,
      happinessReward: 0,
      color: 0x00aa00,
      type: 'normal',
      // Override with provided config
      ...config
    };
    
    this.zone = null;
    this.indicator = null;
    this.button = null;
    this.buttonText = null;
    this.completed = false;
    
    // Create the activity zone
    this.createZone();
  }
  
  /**
   * Create the activity zone
   */
  createZone() {
    const { x, y, width, height, color } = this.config;
    const mapScale = this.scene.mapScale || 1;
    
    // Create a zone for the activity
    this.zone = this.scene.add.zone(
      x * mapScale, 
      y * mapScale, 
      width * mapScale, 
      height * mapScale
    );
    
    // Add physics to the zone
    this.scene.physics.world.enable(this.zone);
    this.zone.body.setAllowGravity(false);
    this.zone.body.setImmovable(true);
    
    // Store activity data with the zone
    this.zone.setData('activity', this);
    
    // Optional: Add a visual indicator for debug purposes
    if (this.scene.game.config.physics.arcade.debug) {
      const graphics = this.scene.add.graphics();
      graphics.lineStyle(2, color, 1);
      graphics.strokeRect(
        (x - width / 2) * mapScale, 
        (y - height / 2) * mapScale, 
        width * mapScale, 
        height * mapScale
      );
      
      // Add text above the zone
      const text = this.scene.add.text(
        x * mapScale, 
        (y - height / 2 - 10) * mapScale, 
        this.config.name, 
        { 
          fontSize: '16px',
          fill: '#fff',
          stroke: '#000',
          strokeThickness: 4
        }
      );
      text.setOrigin(0.5, 0.5);
    }
  }
  
  /**
   * Create a button for this activity
   * @param {number} x - X position of the button
   * @param {number} y - Y position of the button
   * @param {number} index - Index of the button (for positioning multiple buttons)
   * @returns {object} The button and text objects
   */
  createButton(x, y, index = 0) {
    const isCompleted = this.isCompletedToday();
    const yOffset = index * 60; // 60 pixels between buttons
    
    // Create the button rectangle
    this.button = this.scene.add.rectangle(
      x,
      y - yOffset,
      200,
      50,
      isCompleted ? 0x888888 : (this.config.type === 'sleep' ? 0x0066ff : 0x00aa00)
    );
    this.button.setScrollFactor(0);
    this.button.setDepth(100);
    this.button.setInteractive({ useHandCursor: true });
    
    // Create button text
    this.buttonText = this.scene.add.text(
      x,
      y - yOffset,
      this.getButtonText(),
      { 
        font: '18px Arial', 
        fill: '#ffffff', 
        stroke: '#000000', 
        strokeThickness: 2,
        align: 'center'
      }
    );
    this.buttonText.setOrigin(0.5, 0.5);
    this.buttonText.setScrollFactor(0);
    this.buttonText.setDepth(101);
    
    // Add click handler
    this.button.on('pointerdown', () => {
      this.doActivity();
    });
    
    return { button: this.button, text: this.buttonText };
  }
  
  /**
   * Update the button display (color, text)
   */
  updateButton() {
    if (!this.button || !this.buttonText) return;
    
    const isCompleted = this.isCompletedToday();
    
    // Update button color
    this.button.setFillStyle(
      isCompleted ? 0x888888 : (this.config.type === 'sleep' ? 0x0066ff : 0x00aa00)
    );
    
    // Update button text
    this.buttonText.setText(this.getButtonText());
  }
  
  /**
   * Get the text to display on the button
   * @returns {string} The button text
   */
  getButtonText() {
    const { name, type, energyReward, moneyReward } = this.config;
    
    if (this.isCompletedToday()) {
      return `${name} (Completed)`;
    }
    
    if (type === 'sleep') {
      return `${name} (+${energyReward} Energy)`;
    }
    
    if (moneyReward > 0) {
      return `${name} (+$${moneyReward})`;
    }
    
    return name;
  }
  
  /**
   * Check if this activity has been completed today
   * @returns {boolean} True if activity has been completed today
   */
  isCompletedToday() {
    const completedChores = this.getCompletedChores();
    if (!completedChores) return false;
    
    // Get today's date as a string (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Check if this activity is completed for today
    return completedChores[today] && 
           completedChores[today].includes(this.config.id);
  }
  
  /**
   * Mark this activity as completed today
   */
  markAsCompleted() {
    const completedChores = this.getCompletedChores() || {};
    
    // Get today's date as a string (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize today's entry if needed
    if (!completedChores[today]) {
      completedChores[today] = [];
    }
    
    // Add this activity ID to today's completed activities
    if (!completedChores[today].includes(this.config.id)) {
      completedChores[today].push(this.config.id);
    }
    
    // Sync with global completedChores
    if (typeof window !== 'undefined') {
      window.completedChores = completedChores;
    }
    
    // Update button appearance
    this.updateButton();
  }
  
  /**
   * Get the global completed chores object
   * @returns {object} The completed chores object
   */
  getCompletedChores() {
    return typeof window !== 'undefined' ? window.completedChores : null;
  }
  
  /**
   * Perform the activity
   */
  doActivity() {
    // Skip if already completed today
    if (this.isCompletedToday()) {
      this.scene.showTemporaryMessage("You've already completed this activity today", '#ff9999');
      return;
    }
    
    // Get player stats
    const playerStats = this.getPlayerStats();
    
    // Check if player has enough energy
    if (playerStats.energy < this.config.energyCost) {
      this.scene.showTemporaryMessage("Not enough energy!", '#ff9999');
      return;
    }
    
    // Check if player has enough money
    if (this.config.moneyCost && playerStats.money < this.config.moneyCost) {
      this.scene.showTemporaryMessage("Not enough money!", '#ff9999');
      return;
    }
    
    // Apply costs and rewards to player stats
    this.applyStatChanges(playerStats);
    
    // Mark as completed
    this.markAsCompleted();
    
    // Show success message
    this.showSuccessMessage();
  }
  
  /**
   * Apply stat changes based on activity costs and rewards
   * @param {object} playerStats - The player stats object
   */
  applyStatChanges(playerStats) {
    const {
      energyCost, energyReward,
      moneyCost, moneyReward,
      hungerCost, hungerReward,
      hygieneCost, hygieneReward,
      happinessCost, happinessReward
    } = this.config;
    
    // Apply energy changes
    if (energyCost) {
      this.updatePlayerStat('energy', playerStats.energy - energyCost);
    }
    if (energyReward) {
      this.updatePlayerStat('energy', Math.min(100, playerStats.energy + energyReward));
    }
    
    // Apply money changes
    if (moneyCost) {
      this.updatePlayerStat('money', playerStats.money - moneyCost);
    }
    if (moneyReward) {
      this.updatePlayerStat('money', playerStats.money + moneyReward);
    }
    
    // Apply hunger changes
    if (hungerCost) {
      this.updatePlayerStat('hunger', Math.max(0, playerStats.hunger - hungerCost));
    }
    if (hungerReward) {
      this.updatePlayerStat('hunger', Math.min(100, playerStats.hunger + hungerReward));
    }
    
    // Apply hygiene changes
    if (hygieneCost) {
      this.updatePlayerStat('hygiene', Math.max(0, playerStats.hygiene - hygieneCost));
    }
    if (hygieneReward) {
      this.updatePlayerStat('hygiene', Math.min(100, playerStats.hygiene + hygieneReward));
    }
    
    // Apply happiness changes
    if (happinessCost) {
      this.updatePlayerStat('happiness', Math.max(0, playerStats.happiness - happinessCost));
    }
    if (happinessReward) {
      this.updatePlayerStat('happiness', Math.min(100, playerStats.happiness + happinessReward));
    }
  }
  
  /**
   * Get the player stats
   * @returns {object} The player stats
   */
  getPlayerStats() {
    return typeof window !== 'undefined' && window.playerStats 
      ? window.playerStats 
      : { energy: 50, money: 100, hunger: 50, hygiene: 50, happiness: 50 };
  }
  
  /**
   * Update a player stat
   * @param {string} stat - The stat to update
   * @param {number} value - The new value
   */
  updatePlayerStat(stat, value) {
    if (typeof window !== 'undefined' && window.playerStats) {
      window.playerStats[stat] = value;
    }
  }
  
  /**
   * Show a success message for completing the activity
   */
  showSuccessMessage() {
    let message = `${this.config.name} completed!`;
    
    // Add reward details if applicable
    if (this.config.moneyReward > 0) {
      message += `\n+$${this.config.moneyReward}`;
    }
    if (this.config.energyReward > 0) {
      message += `\n+${this.config.energyReward} Energy`;
    }
    if (this.config.hungerReward > 0) {
      message += `\n+${this.config.hungerReward} Hunger`;
    }
    if (this.config.hygieneReward > 0) {
      message += `\n+${this.config.hygieneReward} Hygiene`;
    }
    if (this.config.happinessReward > 0) {
      message += `\n+${this.config.happinessReward} Happiness`;
    }
    
    // Show the message
    this.scene.showTemporaryMessage(message, '#99ff99');
  }
}

export default Activity; 