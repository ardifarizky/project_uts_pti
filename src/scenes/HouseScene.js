import Phaser from 'phaser';
import Player from '../object/Player.js';
import StatsUI from '../ui/StatsUI.js';

class HouseScene extends Phaser.Scene {
  constructor() {
    super("scene-house");
    
    // Configuration
    this.mapScale = 2;
    
    // External data (will be set via init)
    this.playerName = "";
    this.selectedCharacter = "ucup";
    this.playerSpeed = 350;
    this.gameSize = { width: 240, height: 160 };
    this.lastHousePos = { x: 250, y: 250 };
    this.isTransitioning = false;
    
    // Map layers
    this.map = null;
    this.groundsLayer = null;
    this.wallsLayer = null;
    this.furnitureLayer = null;
    this.doorLayer = null;
    this.bedLayer = null;
    
    // Game objects
    this.player = null;
    this.exitDoor = null;
    this.doorTiles = [];
    this.isGameOver = false;
    this.exitActive = false;
    
    // Chores system
    this.choreAreas = [];
    this.activeChoreArea = null;
    this.completedChores = {};
    
    // UI elements
    this.statsUI = null; // Using global StatsUI
    this.choreButton = null;
    this.choreText = null;
    this.choreButtons = []; // Array to store multiple chore buttons
  }

  // ----------------------------------------
  // SCENE LIFECYCLE METHODS
  // ----------------------------------------
  
  init(data) {
    // Set external data from main.js
    if (data.playerName) this.playerName = data.playerName;
    if (data.selectedCharacter) this.selectedCharacter = data.selectedCharacter;
    if (data.PLAYER_SPEED) this.playerSpeed = data.PLAYER_SPEED;
    if (data.GAME_SIZE) this.gameSize = data.GAME_SIZE;
    if (data.lastHousePos) this.lastHousePos = data.lastHousePos;
    if (data.isTransitioning !== undefined) this.isTransitioning = data.isTransitioning;
    
    // Connect to global stats and completedChores
    if (typeof window !== 'undefined') {
      if (window.completedChores) {
        this.completedChores = window.completedChores;
      }
    }
    
    console.log("HouseScene init: Using global playerStats:", window.playerStats);
  }
  
  preload() {
    // Load tilemap data
    this.load.tilemapTiledJSON('house-map', '/assets/tilemap/house.json');
    
    // Load tileset images
    this.load.image('bedroom1', '/assets/tiles/bedroom1.png');
    this.load.image('floor1', '/assets/tiles/floor1.png');
    this.load.image('wall1', '/assets/tiles/wall1.png');
    this.load.image('livingroom2', '/assets/tiles/livingroom2.png');
  }
  
  create() {
    // Reset transition flag when house scene is created
    this.isTransitioning = false;
    
    // Create the scene components in order
    this.createMap();
    this.createPlayer();
    this.createExitDoor();
    this.createChoreAreas();
    this.createChoreButton();
    this.createStatsUI(); // Create global stats UI
    
    // Setup camera
    this.setupCamera();
    
    // Add greeting text
    this.displayWelcomeMessage();
    
    // Add a brief delay before exit is active to prevent immediate exit
    this.exitActive = false;
    this.time.delayedCall(1000, () => {
      this.exitActive = true;
    });
  }
  
  update() {
    // Skip movement during transitions
    if (this.isTransitioning) {
      return;
    }
    
    // Update player if it exists
    if (this.player) {
      this.player.update();
    }
    
    // Update chore areas visibility
    this.updateChoreAreas();
    
    // Update global stats UI
    if (this.statsUI) {
      this.statsUI.update();
    }
  }

  // ----------------------------------------
  // MAP CREATION METHODS
  // ----------------------------------------
  
  createMap() {
    // Create the tilemap
    this.map = this.make.tilemap({ key: 'house-map' });
    
    // Add the tilesets to the map
    const bedroom1Tileset = this.map.addTilesetImage('bedroom1', 'bedroom1');
    const floor1Tileset = this.map.addTilesetImage('floor1', 'floor1');
    const wall1Tileset = this.map.addTilesetImage('wall1', 'wall1');
    const livingroom2Tileset = this.map.addTilesetImage('livingroom2', 'livingroom2');
    
    // Create layers
    this.groundsLayer = this.map.createLayer('grounds', [floor1Tileset, bedroom1Tileset, livingroom2Tileset]).setDepth(0);
    this.wallsLayer = this.map.createLayer('walls', [wall1Tileset, bedroom1Tileset, livingroom2Tileset]).setDepth(1);
    this.furnitureLayer = this.map.createLayer('furniture', [bedroom1Tileset, livingroom2Tileset]).setDepth(2);
    this.doorLayer = this.map.createLayer('door', [wall1Tileset, bedroom1Tileset, livingroom2Tileset, floor1Tileset]);
    this.bedLayer = this.map.createLayer('bed', [bedroom1Tileset]).setDepth(3);
    
    // Scale the layers by map scale factor
    this.groundsLayer.setScale(this.mapScale);
    this.wallsLayer.setScale(this.mapScale);
    this.furnitureLayer.setScale(this.mapScale);
    this.doorLayer.setScale(this.mapScale);
    this.bedLayer.setScale(this.mapScale);
    
    // Set collision on layers
    this.wallsLayer.setCollisionByProperty({ collide: true });
    this.furnitureLayer.setCollisionByProperty({ collide: true });
    this.bedLayer.setCollisionByProperty({ collide: true });
    
    // Set layers to their default positions (0,0)
    this.doorLayer.setPosition(0, 0);
    this.groundsLayer.setPosition(0, 0);
    this.wallsLayer.setPosition(0, 0);
    this.furnitureLayer.setPosition(0, 0);
  }
  
  setupCamera() {
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(
      0, 
      0, 
      this.map.widthInPixels * this.mapScale, 
      this.map.heightInPixels * this.mapScale
    );
  }

  // ----------------------------------------
  // PLAYER METHODS
  // ----------------------------------------
  
  createPlayer() {
    // Create player using the Player class
    this.player = new Player(
      this, 
      this.lastHousePos.x * this.mapScale, 
      Math.min(this.lastHousePos.y, 350) * this.mapScale, // Ensure player doesn't spawn below y=350
      this.selectedCharacter
    );
    
    // Configure scene-specific settings
    this.player.playerSpeed = this.playerSpeed;
    
    // Add collision with tilemap layers
    this.physics.add.collider(this.player, this.wallsLayer);
    this.physics.add.collider(this.player, this.furnitureLayer);
    this.physics.add.collider(this.player, this.bedLayer);
  }
  
  // ----------------------------------------
  // DOOR METHODS
  // ----------------------------------------
  
  createExitDoor() {
    // Track door tiles
    this.doorTiles = [];
    
    // Find door tiles and create invisible trigger zones
    this.doorLayer.forEachTile(tile => {
      if (tile.index !== -1) {
        // Track this tile
        this.doorTiles.push(tile);
        
        // Create door trigger and indicators
        this.createDoorTrigger(tile);
      }
    });
    
    // Add debug message if no doors found
    this.displayDoorDebugInfo();
  }
  
  createDoorTrigger(tile) {
    // Create an invisible physics body for this door
    const worldX = (tile.x * tile.width + tile.width / 2) * this.mapScale;
    const worldY = (tile.y * tile.height + tile.height / 2) * this.mapScale;
    
    const doorTrigger = this.physics.add.sprite(worldX, worldY, null);
    doorTrigger.setVisible(false);
    doorTrigger.setImmovable(true);
    doorTrigger.body.allowGravity = false;
    
    // Adjust the size of the trigger area - make it larger than the tile for easier interaction
    doorTrigger.body.setSize(tile.width * this.mapScale * 1.5, tile.height * this.mapScale * 1.5);
    
    // Add overlap detection with debug log
    this.physics.add.overlap(
      this.player,
      doorTrigger,
      () => {
        console.log("Door overlap detected");
        if (this.exitActive && !this.isTransitioning) {
          console.log("Exiting house");
          this.exitHouse();
        }
      }
    );
    
    // Debug visual removed to make exits completely invisible
  }
  
  createDoorIndicators(x, y) {
    // Empty method - door indicators removed as requested
  }
  
  createDoorDebugVisual(x, y, tile) {
    // Empty method - debug visuals removed as requested
  }
  
  displayDoorDebugInfo() {
    if (this.doorTiles.length === 0) {
      console.warn("No door tiles found in door layer!");
      
      // Add debug text to help with troubleshooting
      const debugText = this.add.text(
        this.gameSize.width / 2, 20,
        "No door tiles found!",
        { font: "16px Arial", fill: "#ff0000" }
      );
      debugText.setScrollFactor(0);
      debugText.setOrigin(0.5, 0);
    } else {
      console.log(`Found ${this.doorTiles.length} door tiles`);
      // Debug text removed as requested
    }
  }
  
  exitHouse() {
    // Don't allow exit if not active yet or during transition
    if (!this.exitActive || this.isTransitioning) return;
    
    // Prepare data to pass to the next scene with fixed spawn position
    const data = {
      // Use fixed spawn position instead of the player's last position
      spawnAtStart: true, // Add a flag to indicate spawning at start position
      completedChores: this.completedChores
    };
    
    // Store the last house position for when player returns to house
    // This isn't needed for spawn but might be useful later
    data.lastHousePos = { 
      x: this.player.x / this.mapScale, 
      y: this.player.y / this.mapScale 
    };
    
    // Set transition flag to prevent movement
    this.isTransitioning = true;
    
    // Start the safety timer
    this.addSafetyResetTimer(data);
    
    // Stop player movement
    this.player.stopMovement();
    
    // Create transition screen
    this.createTransitionScreen("Exiting house...");
    
    // Wait a moment, then switch back to the game scene
    this.time.delayedCall(1000, () => {
      // Start the game scene with our data
      try {
        this.scene.start('scene-game', data);
        console.log("Starting game scene with data:", data);
      } catch (error) {
        console.error("Error transitioning to game scene:", error);
      }
    });
  }
  
  // ----------------------------------------
  // CHORES SYSTEM METHODS
  // ----------------------------------------
  
  createChoreAreas() {
    // Define chores with their locations, rewards, and energy costs
    const chores = [
      {
        name: 'Make Bed',
        x: 272,
        y: 192,
        width: 36*3,
        height: 36*2,
        reward: 20,
        energyCost: 15
      },
      {
        name: 'Sleep',
        x: 272,
        y: 192,
        width: 36*3,
        height: 36*2,
        reward: 0,
        energyCost: 0,
        energyGain: 50,
        type: 'sleep'
      },
      {
        name: 'Dust Bookshelf',
        x: 490,
        y: 192,
        width: 36*4,
        height: 36*2,
        reward: 10,
        energyCost: 5
      },
      {
        name: 'Get some meal',
        x: 401,
        y: 192,
        width: 36*2,
        height: 36*2,
        energyCost: 5,
        hungerReward: 40,
        description: 'Have a meal to restore hunger',
        type: 'meal'
      },
      {
        name: 'Take a bath',
        x: 272,
        y: 353,
        width: 36*3,
        height: 36*2,
        energyCost: 10,
        hygieneReward: 50,
        description: 'Take a bath to restore hygiene',
        type: 'bath'
      }
    ];
    
    // Create interaction area for each chore
    chores.forEach(chore => this.createChoreArea(chore));
  }
  
  createChoreArea(chore) {
    // Create invisible physics area for overlap detection
    const area = this.add.rectangle(
      chore.x,
      chore.y,
      chore.width,
      chore.height,
      0xffffff, // White color
      0.0 // Completely transparent
    );
    
    // Set origin to top-left (0,0) instead of default center (0.5,0.5)
    area.setOrigin(0, 0);
    
    // Add physics to the area
    this.physics.add.existing(area, true); // true = static body
    
    // Store chore data with the area
    area.chore = chore;
    
    // Add to the list of chore areas
    this.choreAreas.push(area);
    
    // Add overlap detection with player
    this.physics.add.overlap(
      this.player,
      area,
      this.enterChoreArea,
      null,
      this
    );
    
    // Add a small indicator to show where chores can be done (optional)
    const indicator = this.add.text(
      chore.x,
      chore.y - 30,
      '✨',
      { font: '20px Arial' }
    );
    indicator.setOrigin(0.5, 0.5);
  }
  
  updateChoreAreas() {
    // Reset active chore areas
    let activeChoreAreas = [];
    
    // Check if player is in any chore area
    this.choreAreas.forEach(area => {
      if (Phaser.Geom.Rectangle.Overlaps(
        this.player.getBounds(),
        area.getBounds()
      )) {
        activeChoreAreas.push(area);
      }
    });
    
    // Hide all chore buttons initially
    this.hideAllChoreButtons();
    
    // If no active areas, clear active chore area
    if (activeChoreAreas.length === 0) {
      this.activeChoreArea = null;
      return;
    }
    
    // Group the chore areas by location
    const locationGroups = {};
    activeChoreAreas.forEach(area => {
      const locationKey = `${area.x},${area.y}`;
      if (!locationGroups[locationKey]) {
        locationGroups[locationKey] = [];
      }
      locationGroups[locationKey].push(area);
    });
    
    // Display buttons for each location group
    Object.values(locationGroups).forEach(areas => {
      this.displayChoreButtonsForLocation(areas);
    });
  }
  
  hideAllChoreButtons() {
    // Hide the original chore button if it exists
    if (this.choreButton) {
      this.choreButton.setVisible(false);
      this.choreText.setVisible(false);
    }
    
    // Hide all buttons in the choreButtons array
    this.choreButtons.forEach(buttonObj => {
      buttonObj.button.setVisible(false);
      buttonObj.text.setVisible(false);
    });
  }
  
  displayChoreButtonsForLocation(areas) {
    // Sort areas by chore type - put regular chores first, then special types
    areas.sort((a, b) => {
      if (a.chore.type && !b.chore.type) return 1;
      if (!a.chore.type && b.chore.type) return -1;
      return 0;
    });
    
    // Display buttons for each chore in this location
    areas.forEach((area, index) => {
      this.displayChoreButton(area, index, areas.length);
    });
  }
  
  displayChoreButton(area, index, totalButtons) {
    const chore = area.chore;
    const isCompleted = this.isChoreCompletedToday(chore.name);
    
    // Calculate vertical spacing
    const yOffset = index * 60; // 60 pixels between buttons
    
    // Create button if it doesn't exist
    if (this.choreButtons.length <= index) {
      // Create new button
      const button = this.add.rectangle(
        this.gameSize.width / 2,
        this.gameSize.height - 100 - yOffset,
        200,
        50,
        isCompleted ? 0x888888 : (chore.type === 'sleep' ? 0x0066ff : 0x00aa00)
      );
      button.setScrollFactor(0);
      button.setDepth(100);
      button.setInteractive({ useHandCursor: true });
      
      // Store which chore this button belongs to
      button.choreArea = area;
      
      // Add click event
      button.on('pointerdown', () => {
        this.activeChoreArea = button.choreArea;
        this.doChore();
      });
      
      // Create button text
      const text = this.add.text(
        this.gameSize.width / 2,
        this.gameSize.height - 100 - yOffset,
        this.getChoreButtonText(chore, isCompleted),
        { font: '18px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 2 }
      );
      text.setOrigin(0.5, 0.5);
      text.setScrollFactor(0);
      text.setDepth(101);
      
      // Store buttons
      this.choreButtons.push({ button, text, choreArea: area });
    } else {
      // Update existing button
      const buttonObj = this.choreButtons[index];
      buttonObj.button.setPosition(this.gameSize.width / 2, this.gameSize.height - 100 - yOffset);
      buttonObj.button.setFillStyle(isCompleted ? 0x888888 : (chore.type === 'sleep' ? 0x0066ff : 0x00aa00));
      buttonObj.button.choreArea = area;
      
      buttonObj.text.setPosition(this.gameSize.width / 2, this.gameSize.height - 100 - yOffset);
      buttonObj.text.setText(this.getChoreButtonText(chore, isCompleted));
      buttonObj.choreArea = area;
    }
    
    // Make button visible
    this.choreButtons[index].button.setVisible(true);
    this.choreButtons[index].text.setVisible(true);
  }
  
  getChoreButtonText(chore, isCompleted) {
    if (isCompleted) {
      return `${chore.name} (Done for today)`;
    }
    
    if (chore.type === 'sleep') {
      return `${chore.name} (+${chore.energyGain} Energy)`;
    }
    
    if (chore.hungerReward) {
      return `${chore.name} (+${chore.hungerReward} Hunger)`;
    }
    
    if (chore.hygieneReward) {
      return `${chore.name} (+${chore.hygieneReward} Hygiene)`;
    }
    
    return `${chore.name} ($${chore.reward})`;
  }
  
  // Called when player enters a chore area
  enterChoreArea(player, area) {
    // This function is no longer needed as we're handling multiple buttons
    // in the updateChoreAreas method, but we'll keep it for compatibility
    this.activeChoreArea = area;
  }
  
  // Check if a chore has been completed today
  isChoreCompletedToday(choreId) {
    if (!this.completedChores[choreId]) {
      return false;
    }
    
    const lastCompletionTime = this.completedChores[choreId];
    const now = new Date();
    const lastCompletion = new Date(lastCompletionTime);
    
    // Reset at midnight - check if it's a different day
    return now.toDateString() === lastCompletion.toDateString();
  }
  
  // Called when player performs a chore
  doChore() {
    if (!this.activeChoreArea) return;
    
    const chore = this.activeChoreArea.chore;
    const choreId = chore.name;
    const playerStats = this.getPlayerStats();
    
    // Check if the chore has already been completed today
    if (this.isChoreCompletedToday(choreId)) {
      this.showTemporaryMessage('Already done for today!', '#ffaa00');
      return;
    }
    
    // Check if player has enough energy (except for sleep)
    if (playerStats.energy < chore.energyCost && chore.type !== 'sleep') {
      this.showTemporaryMessage('Not enough energy!', '#ff0000');
      return;
    }
    
    // Handle special chore types
    if (chore.type === 'sleep') {
      // Mark the chore as completed today
      this.completedChores[chore.name] = new Date().toISOString();
      
      // Play sleep animation
      this.player.playSleepAnimation();
      
      // Show sleeping message
      this.showTemporaryMessage('Sleeping...', '#00aaff');
      
      // Disable player input temporarily
      this.player.stopMovement();
      this.player.setActive(false);
      
      // After a delay, complete the sleep action
      this.time.delayedCall(3000, () => {
        // Increase energy and update global
        const newEnergy = Math.min(100, playerStats.energy + chore.energyGain);
        this.updatePlayerStat('energy', newEnergy);
        
        // Re-enable player
        this.player.setActive(true);
        this.player.stopActionAnimation();
        
        // Show success message
        this.showTemporaryMessage(
          `You feel refreshed!\nEnergy +${chore.energyGain}`, 
          '#00ff00'
        );
      });
      
      return;
    } else if (chore.type === 'meal') {
      // Mark the chore as completed today
      this.completedChores[chore.name] = new Date().toISOString();
      
      // Play eat animation
      this.player.playEatAnimation();
      
      // Show eating message
      this.showTemporaryMessage('Eating...', '#ffa500');
      
      // Disable player input temporarily
      this.player.stopMovement();
      this.player.setActive(false);
      
      // After a delay, complete the meal action
      this.time.delayedCall(2000, () => {
        // Decrease energy and update global
        this.updatePlayerStat('energy', playerStats.energy - chore.energyCost);
        
        // Increase hunger and update global
        const newHunger = Math.min(100, playerStats.hunger + chore.hungerReward);
        this.updatePlayerStat('hunger', newHunger);
        
        // Re-enable player
        this.player.setActive(true);
        this.player.stopActionAnimation();
        
        // Show success message
        this.showTemporaryMessage(
          `Delicious meal!\nHunger +${chore.hungerReward}`,
          '#00ff00'
        );
        
        // Update the button appearance
        this.updateChoreButtonAppearance(choreId);
      });
      
      return;
    } else if (chore.type === 'bath') {
      // Mark the chore as completed today
      this.completedChores[chore.name] = new Date().toISOString();
      
      // Play bath animation
      this.player.playBathAnimation();
      
      // Show bathing message
      this.showTemporaryMessage('Taking a bath...', '#00aaff');
      
      // Disable player input temporarily
      this.player.stopMovement();
      this.player.setActive(false);
      
      // After a delay, complete the bath action
      this.time.delayedCall(2500, () => {
        // Decrease energy and update global
        this.updatePlayerStat('energy', playerStats.energy - chore.energyCost);
        
        // Increase hygiene and update global
        const newHygiene = Math.min(100, playerStats.hygiene + chore.hygieneReward);
        this.updatePlayerStat('hygiene', newHygiene);
        
        // Re-enable player
        this.player.setActive(true);
        this.player.stopActionAnimation();
        
        // Show success message
        this.showTemporaryMessage(
          `You feel clean!\nHygiene +${chore.hygieneReward}`,
          '#00ff00'
        );
        
        // Update the button appearance
        this.updateChoreButtonAppearance(choreId);
      });
      
      return;
    }
    
    // For regular chores:
    
    // Decrease energy and update global
    this.updatePlayerStat('energy', playerStats.energy - chore.energyCost);
    
    // Handle hunger reward
    if (chore.hungerReward) {
      const newHunger = Math.min(100, playerStats.hunger + chore.hungerReward);
      this.updatePlayerStat('hunger', newHunger);
    }
    
    // Handle hygiene reward
    if (chore.hygieneReward) {
      const newHygiene = Math.min(100, playerStats.hygiene + chore.hygieneReward);
      this.updatePlayerStat('hygiene', newHygiene);
    }
    
    // Handle money reward (if any)
    if (chore.reward) {
      this.updatePlayerStat('money', playerStats.money + chore.reward);
    }
    
    // Show success message
    let successMessage = `Completed ${chore.name}!`;
    if (chore.reward) successMessage += `\n+$${chore.reward}`;
    if (chore.hungerReward) successMessage += `\n+${chore.hungerReward} Hunger`;
    if (chore.hygieneReward) successMessage += `\n+${chore.hygieneReward} Hygiene`;
    
    this.showTemporaryMessage(successMessage, '#00ff00');
    
    // Mark the chore as completed today
    this.completedChores[chore.name] = new Date().toISOString();
    
    // Update the button appearance
    this.updateChoreButtonAppearance(choreId);
  }
  
  updateChoreButtonAppearance(choreId) {
    // Update all buttons in the choreButtons array that match this choreId
    this.choreButtons.forEach(buttonObj => {
      if (buttonObj.choreArea && buttonObj.choreArea.chore && buttonObj.choreArea.chore.name === choreId) {
        buttonObj.text.setText(`${choreId} (Done for today)`);
        buttonObj.button.setFillStyle(0x888888);
      }
    });
  }
  
  // ----------------------------------------
  // UI METHODS
  // ----------------------------------------
  
  createUI() {
    this.createChoreButton();
  }
  
  createChoreButton() {
    // Create chore button (initially hidden) - this is now a legacy method
    // as we're using choreButtons array for multiple buttons
    this.choreButton = this.add.rectangle(
      this.gameSize.width / 2, 
      this.gameSize.height - 100,
      200, 
      50,
      0x00aa00
    );
    this.choreButton.setScrollFactor(0);
    this.choreButton.setDepth(100);
    this.choreButton.setInteractive({ useHandCursor: true });
    this.choreButton.on('pointerdown', () => this.doChore());
    
    this.choreText = this.add.text(
      this.gameSize.width / 2, 
      this.gameSize.height - 100,
      'Do Chore',
      { font: '18px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 2 }
    );
    this.choreText.setOrigin(0.5, 0.5);
    this.choreText.setScrollFactor(0);
    this.choreText.setDepth(101);
    
    // Hide chore button initially
    this.choreButton.setVisible(false);
    this.choreText.setVisible(false);
    
    // Initialize empty array for multiple chore buttons
    this.choreButtons = [];
  }
  
  displayWelcomeMessage() {
    const houseGreeting = this.add.text(
      this.gameSize.width/2, 
      30, 
      `Welcome home, ${this.playerName}!`, 
      { font: "20px Arial", fill: "#000000" }
    );
    houseGreeting.setOrigin(0.5, 0);
    houseGreeting.setScrollFactor(0);
  }
  
  createTransitionScreen(message) {
    // Create a loading screen
    const loadingScreen = this.add.rectangle(
      0, 0, 
      this.gameSize.width, this.gameSize.height, 
      0x000000, 0.8
    );
    loadingScreen.setOrigin(0, 0);
    loadingScreen.setScrollFactor(0);
    loadingScreen.setDepth(1000);
    
    const loadingText = this.add.text(
      this.gameSize.width/2, this.gameSize.height/2, 
      message, 
      { font: "24px Arial", fill: "#ffffff" }
    );
    loadingText.setOrigin(0.5);
    loadingText.setScrollFactor(0);
    loadingText.setDepth(1001);
  }
  
  showTemporaryMessage(text, color = '#ffffff') {
    const message = this.add.text(
      this.gameSize.width / 2,
      this.gameSize.height / 2,
      text,
      { 
        font: '24px Arial', 
        fill: color, 
        stroke: '#000000', 
        strokeThickness: 3, 
        align: 'center' 
      }
    );
    message.setOrigin(0.5, 0.5);
    message.setScrollFactor(0);
    message.setDepth(200);
    
    // Remove the message after a delay
    this.time.delayedCall(1500, () => {
      message.destroy();
    });
  }
  
  // Create global stats UI
  createStatsUI() {
    // Access global UI or create new one
    if (window.globalStatsUI) {
      // If UI exists from another scene, destroy it and recreate for this scene
      window.globalStatsUI.container.destroy();
      window.globalStatsUI = new StatsUI(this);
    } else {
      // Create new UI
      window.globalStatsUI = new StatsUI(this);
    }
    
    this.statsUI = window.globalStatsUI;
  }
  
  // ----------------------------------------
  // UTILITY METHODS
  // ----------------------------------------
  
  // Helper method to get playerStats from global
  getPlayerStats() {
    return typeof window !== 'undefined' && window.playerStats 
      ? window.playerStats 
      : { energy: 50, money: 100, hunger: 50, hygiene: 50, happiness: 50 };
  }
  
  // Helper method to update a specific stat
  updatePlayerStat(stat, value) {
    if (typeof window !== 'undefined' && window.playerStats) {
      window.playerStats[stat] = value;
      
      // Update the stats UI after changing a stat
      if (this.statsUI) {
        this.statsUI.update();
      }
    }
  }
  
  // Safety timer function to handle transition issues
  addSafetyResetTimer(data) {
    // If transition takes too long, force a reset
    console.log("Safety timer started");
    setTimeout(() => {
      if (this.isTransitioning) {
        console.log("Safety timeout triggered - resetting game state");
        this.isTransitioning = false;
        if (this.scene) {
          try {
            // Don't call stop first, just start the new scene
            this.scene.start('scene-game', data);
          } catch (error) {
            console.error("Error resetting game:", error);
          }
        }
      }
    }, 5000); // 5 seconds timeout
  }
}

export default HouseScene;
