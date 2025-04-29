// Tile Grid Overlay Mod for Bestiary Arena
console.log('Tile Grid Overlay Mod initializing...');

// Configuration with defaults
const defaultConfig = {
    enabled: false,
    color: 'rgba(0, 255, 170, 0.7)',
    labelColor: '#00ff99',
    borderThickness: 1,
    fontSize: 12
};

// Initialize with saved config
const config = Object.assign({}, defaultConfig, context.config);

// Track overlay state
let gridOverlay = null;
let toggleButton = null;

// Main functionality to create and display grid
function createGridOverlay() {
    // Remove existing overlay if present
    const existingOverlay = document.getElementById('tile-grid-overlay');
    if (existingOverlay) existingOverlay.remove();

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'tile-grid-overlay';
    overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  `;

    // Create styles for tile labels
    const style = document.createElement('style');
    style.textContent = `
    .tile-label {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(32px * var(--zoomFactor));
      height: calc(32px * var(--zoomFactor));
      border: ${config.borderThickness}px solid rgba(255, 255, 255, 0.5);
      background-color: rgba(0, 0, 0, 0.5);
      color: ${config.labelColor};
      text-shadow: 0 0 5px ${config.labelColor}, 0 0 10px ${config.labelColor}99;
      font-family: "Press Start 2P", "VT323", monospace;
      font-size: calc(${config.fontSize}px * var(--zoomFactor));
      z-index: 10000;
      pointer-events: none;
      text-align: center;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 10px ${config.color};
      border-radius: 3px;
      overflow: hidden;
    }
  `;
    document.head.appendChild(style);

    // Find all tiles
    const tiles = document.querySelectorAll('[id^="tile-index-"]');

    // For each tile, create a label
    tiles.forEach(tile => {
        const tileId = tile.id.replace('tile-index-', '');

        // Create label
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.textContent = tileId;

        // Position at center of tile using computed position
        const computedStyle = window.getComputedStyle(tile);
        const right = computedStyle.right;
        const bottom = computedStyle.bottom;

        // Extract values and convert to center position
        const rightValue = parseFloat(right);
        const bottomValue = parseFloat(bottom);

        // Set position based on the right/bottom values
        label.style.right = `calc(${rightValue}px - (16px * var(--zoomFactor)))`;
        label.style.bottom = `calc(${bottomValue}px - (16px * var(--zoomFactor)))`;

        overlay.appendChild(label);
    });

    // Add overlay to the game container
    const container = document.getElementById('background-scene') || document.getElementById('game-container') || document.body;
    container.appendChild(overlay);

    return overlay;
}

// Toggle grid visibility
function toggleGrid() {
    config.enabled = !config.enabled;

    if (config.enabled) {
        gridOverlay = createGridOverlay();
        api.ui.updateButton('tile-grid-toggle', {
            text: '🔲 Hide Grid',
            primary: true
        });
    } else {
        if (gridOverlay) {
            gridOverlay.remove();
            gridOverlay = null;
        }
        api.ui.updateButton('tile-grid-toggle', {
            text: '🔳 Show Grid',
            primary: false
        });
    }

    // Save config
    api.service.updateScriptConfig(context.hash, { enabled: config.enabled });
}

// Setup configuration panel
function createConfigPanel() {
    // Create the content element
    const content = document.createElement('div');

    // Label color picker
    const labelColorRow = document.createElement('div');
    labelColorRow.style.margin = '10px 0';

    const labelColorLabel = document.createElement('label');
    labelColorLabel.textContent = 'Label Color: ';
    labelColorLabel.style.marginRight = '10px';

    const labelColorInput = document.createElement('input');
    labelColorInput.type = 'color';
    labelColorInput.value = config.labelColor;
    labelColorInput.id = 'grid-label-color';

    labelColorRow.appendChild(labelColorLabel);
    labelColorRow.appendChild(labelColorInput);
    content.appendChild(labelColorRow);

    // Grid color picker
    const gridColorRow = document.createElement('div');
    gridColorRow.style.margin = '10px 0';

    const gridColorLabel = document.createElement('label');
    gridColorLabel.textContent = 'Grid Color: ';
    gridColorLabel.style.marginRight = '10px';

    const gridColorInput = document.createElement('input');
    gridColorInput.type = 'color';
    gridColorInput.value = config.color.replace(/[^\w,]/g, '').slice(0, 7);
    gridColorInput.id = 'grid-color';

    gridColorRow.appendChild(gridColorLabel);
    gridColorRow.appendChild(gridColorInput);
    content.appendChild(gridColorRow);

    // Font size slider
    const fontSizeRow = document.createElement('div');
    fontSizeRow.style.margin = '10px 0';

    const fontSizeLabel = document.createElement('label');
    fontSizeLabel.textContent = 'Font Size: ';
    fontSizeLabel.style.marginRight = '10px';

    const fontSizeValue = document.createElement('span');
    fontSizeValue.textContent = config.fontSize;
    fontSizeValue.id = 'font-size-value';
    fontSizeValue.style.marginRight = '10px';

    const fontSizeInput = document.createElement('input');
    fontSizeInput.type = 'range';
    fontSizeInput.min = '8';
    fontSizeInput.max = '16';
    fontSizeInput.value = config.fontSize;
    fontSizeInput.id = 'grid-font-size';
    fontSizeInput.style.width = '100%';

    fontSizeInput.addEventListener('input', () => {
        fontSizeValue.textContent = fontSizeInput.value;
    });

    fontSizeRow.appendChild(fontSizeLabel);
    fontSizeRow.appendChild(fontSizeValue);
    fontSizeRow.appendChild(fontSizeInput);
    content.appendChild(fontSizeRow);

    // Create and return the panel
    return api.ui.createConfigPanel({
        id: 'tile-grid-config',
        title: 'Tile Grid Settings',
        modId: 'tile-grid-overlay',
        content: content,
        buttons: [
            {
                text: 'Apply',
                primary: true,
                onClick: () => {
                    // Update config from inputs
                    config.labelColor = document.getElementById('grid-label-color').value;
                    config.color = document.getElementById('grid-color').value;
                    config.fontSize = parseInt(document.getElementById('grid-font-size').value);

                    // Save config
                    api.service.updateScriptConfig(context.hash, config);

                    // Reapply grid if enabled
                    if (config.enabled && gridOverlay) {
                        gridOverlay.remove();
                        gridOverlay = createGridOverlay();
                    }
                }
            },
            {
                text: 'Cancel',
                primary: false
            }
        ]
    });
}

// Initialize the mod
function init() {
    // Create toggle button
    api.ui.addButton({
        id: 'tile-grid-toggle',
        text: config.enabled ? '🔲 Hide Grid' : '🔳 Show Grid',
        tooltip: 'Toggle tile grid overlay',
        primary: config.enabled,
        onClick: toggleGrid
    });

    // Create settings button
    api.ui.addButton({
        id: 'tile-grid-settings',
        text: '⚙️',
        tooltip: 'Grid Settings',
        onClick: () => api.ui.toggleConfigPanel('tile-grid-config')
    });

    // Create config panel
    createConfigPanel();

    // If enabled by default, show grid
    if (config.enabled) {
        gridOverlay = createGridOverlay();
    }
}

// Initialize if API is available
if (api) {
    init();
} else {
    console.error('BestiaryModAPI not available for Tile Grid Overlay Mod');
}

// Export functionality
exports = {
    toggle: toggleGrid,
    updateConfig: (newConfig) => {
        Object.assign(config, newConfig);

        // Update UI if needed
        api.ui.updateButton('tile-grid-toggle', {
            text: config.enabled ? '🔲 Hide Grid' : '🔳 Show Grid',
            primary: config.enabled
        });

        // Reapply grid if enabled
        if (config.enabled && gridOverlay) {
            gridOverlay.remove();
            gridOverlay = createGridOverlay();
        }
    }
};