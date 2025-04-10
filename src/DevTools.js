// DevTools.js - Developer utilities for game development

// Config variables with default values
let showDevTools = false;
let timeMultiplier = 1;
let coordinateUpdateInterval = null;

/**
 * Updates the developer tools display
 * @param {Phaser.Game} game - The Phaser game instance
 */
function updateDevToolsDisplay(game) {
  let devToolsElement = document.getElementById('devTools');
  
  // Create dev tools display if it doesn't exist
  if (!devToolsElement) {
    devToolsElement = document.createElement('div');
    devToolsElement.id = 'devTools';
    devToolsElement.style.position = 'absolute';
    devToolsElement.style.top = '10px';
    devToolsElement.style.right = '10px';
    devToolsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    devToolsElement.style.color = '#fff';
    devToolsElement.style.padding = '10px';
    devToolsElement.style.borderRadius = '5px';
    devToolsElement.style.fontFamily = 'monospace';
    devToolsElement.style.fontSize = '14px';
    devToolsElement.style.zIndex = '2000';
    document.body.appendChild(devToolsElement);
    
    // Add C key listener for copying player coordinates
    document.addEventListener('keydown', (event) => {
      if (showDevTools && event.key.toLowerCase() === 'c') {
        copyPlayerCoordinates(game);
      }
    });
    
    // Setup real-time coordinate updates
    if (showDevTools) {
      startCoordinateUpdates(game);
    }
  }
  
  // Update visibility
  devToolsElement.style.display = showDevTools ? 'block' : 'none';
  
  // Update content if visible
  if (showDevTools) {
    updateCoordinatesDisplay(game);
    startCoordinateUpdates(game);
  } else {
    stopCoordinateUpdates();
  }
}

/**
 * Starts real-time coordinate updates
 * @param {Phaser.Game} game - The Phaser game instance
 */
function startCoordinateUpdates(game) {
  // Clear any existing interval first
  stopCoordinateUpdates();
  
  // Start a new interval that updates every 100ms (10 times per second)
  coordinateUpdateInterval = setInterval(() => updateCoordinatesDisplay(game), 100);
}

/**
 * Stops coordinate updates
 */
function stopCoordinateUpdates() {
  if (coordinateUpdateInterval) {
    clearInterval(coordinateUpdateInterval);
    coordinateUpdateInterval = null;
  }
}

/**
 * Updates the coordinates display in the developer tools
 * @param {Phaser.Game} game - The Phaser game instance
 */
function updateCoordinatesDisplay(game) {
  const devToolsElement = document.getElementById('devTools');
  if (!devToolsElement || !showDevTools) return;
  
  // Get player coordinates if available
  let playerX = 'N/A';
  let playerY = 'N/A';
  let screenX = 'N/A';
  let screenY = 'N/A';
  let currentScene = 'N/A';
  
  if (game && game.scene.scenes) {
    const activeScene = game.scene.scenes.find(scene => 
      (scene.scene.key === 'scene-game' || scene.scene.key === 'scene-house' || scene.scene.key === 'scene-beach') && 
      scene.scene.isActive()
    );
    
    if (activeScene && activeScene.player) {
      // World coordinates
      playerX = Math.round(activeScene.player.x);
      playerY = Math.round(activeScene.player.y);
      currentScene = activeScene.scene.key;
      
      // Calculate screen coordinates
      const camera = activeScene.cameras.main;
      if (camera) {
        screenX = Math.round(activeScene.player.x - camera.scrollX);
        screenY = Math.round(activeScene.player.y - camera.scrollY);
      }
    }
  }
  
  devToolsElement.innerHTML = `
    <div>DEVELOPER TOOLS</div>
    <div>Time Speed: ${timeMultiplier}x</div>
    <div>Scene: ${currentScene}</div>
    <div>World X: ${playerX} | Y: ${playerY}</div>
    <div>Screen X: ${screenX} | Y: ${screenY}</div>
    <div>Controls:</div>
    <div>+ : Speed up time</div>
    <div>- : Slow down time</div>
    <div>0 : Reset time speed</div>
    <div>C : Copy coordinates</div>
  `;
}

/**
 * Copies the player's coordinates to clipboard
 * @param {Phaser.Game} game - The Phaser game instance
 */
function copyPlayerCoordinates(game) {
  if (game && game.scene.scenes) {
    const activeScene = game.scene.scenes.find(scene => 
      (scene.scene.key === 'scene-game' || scene.scene.key === 'scene-house' || scene.scene.key === 'scene-beach') && 
      scene.scene.isActive()
    );
    
    if (activeScene && activeScene.player) {
      // World coordinates
      const worldX = Math.round(activeScene.player.x);
      const worldY = Math.round(activeScene.player.y);
      const sceneName = activeScene.scene.key;
      
      // Screen coordinates
      let screenX = 'N/A';
      let screenY = 'N/A';
      const camera = activeScene.cameras.main;
      if (camera) {
        screenX = Math.round(activeScene.player.x - camera.scrollX);
        screenY = Math.round(activeScene.player.y - camera.scrollY);
      }
      
      const coordText = `Scene: ${sceneName}\nWorld X: ${worldX}, Y: ${worldY}\nScreen X: ${screenX}, Y: ${screenY}`;
      
      // Create temporary textarea to copy to clipboard
      const textarea = document.createElement('textarea');
      textarea.value = coordText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      // Show feedback that coordinates were copied
      const notification = document.createElement('div');
      notification.textContent = 'Coordinates copied to clipboard!';
      notification.style.position = 'absolute';
      notification.style.top = '50px';
      notification.style.right = '10px';
      notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      notification.style.color = '#fff';
      notification.style.padding = '10px';
      notification.style.borderRadius = '5px';
      notification.style.fontFamily = 'monospace';
      notification.style.zIndex = '2001';
      document.body.appendChild(notification);
      
      // Remove notification after 2 seconds
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    }
  }
}

/**
 * Toggles the developer tools visibility
 * @param {Phaser.Game} game - The Phaser game instance
 * @returns {boolean} The new state of showDevTools
 */
function toggleDevTools(game) {
  showDevTools = !showDevTools;
  updateDevToolsDisplay(game);
  return showDevTools;
}

/**
 * Increases the time multiplier
 * @returns {number} The new time multiplier value
 */
function increaseTimeMultiplier() {
  timeMultiplier = Math.min(timeMultiplier + 1, 10);
  return timeMultiplier;
}

/**
 * Decreases the time multiplier
 * @returns {number} The new time multiplier value
 */
function decreaseTimeMultiplier() {
  timeMultiplier = Math.max(timeMultiplier - 1, 1);
  return timeMultiplier;
}

/**
 * Resets the time multiplier to 1
 * @returns {number} The reset time multiplier value (1)
 */
function resetTimeMultiplier() {
  timeMultiplier = 1;
  return timeMultiplier;
}

/**
 * Gets the current time multiplier
 * @returns {number} The current time multiplier
 */
function getTimeMultiplier() {
  return timeMultiplier;
}

/**
 * Gets the current state of developer tools
 * @returns {boolean} Whether developer tools are shown
 */
function getDevToolsState() {
  return showDevTools;
}

// Export all functions and variables
export {
  updateDevToolsDisplay,
  startCoordinateUpdates,
  stopCoordinateUpdates,
  updateCoordinatesDisplay,
  copyPlayerCoordinates,
  toggleDevTools,
  increaseTimeMultiplier,
  decreaseTimeMultiplier,
  resetTimeMultiplier,
  getTimeMultiplier,
  getDevToolsState
}; 