// Hero Editor Mod for Bestiary Arena
console.log('Hero Editor Mod initializing...');

// Configuration
const defaultConfig = {
  enabled: true
};

// Initialize with saved config or defaults
const config = Object.assign({}, defaultConfig, context.config);

// Map from equipment names to game IDs (will be populated from API if available)
let equipmentMap = null;

// Wait for the utility functions to be available from the API
document.addEventListener('utility-api-ready', () => {
  console.log('Hero Editor: Utility API is ready');
  
  // Get the equipment map from the API
  if (window.BestiaryModAPI && window.BestiaryModAPI.utility && window.BestiaryModAPI.utility.maps) {
    // Convert the Map to a regular object for easier use in this mod
    equipmentMap = window.BestiaryModAPI.utility.maps.equipmentNamesToGameIds;
    console.log('Hero Editor: Equipment map loaded from API');
  }
});

// Create UI button using the API
api.ui.addButton({
  id: 'hero-editor-button',
  text: 'Edit Heroes',
  tooltip: 'Edit hero stats and equipment',
  icon: '✏️',
  primary: false,
  onClick: showHeroEditorModal
});

// Get player and board snapshots
const getPlayerSnapshot = () => globalThis.state.player.getSnapshot().context;
const getBoardSnapshot = () => globalThis.state.board.getSnapshot().context;

// Level calculation constants
const ENEMY_XP_DROP_PER_LVL = 56.25; // arbitrary
const XP_RATE = 10; // higher = faster xp rate
const ROOM_XP_DROP_PER_LEVEL = ENEMY_XP_DROP_PER_LVL * XP_RATE;

// Experience and level calculation utilities
const getLevelSteepness = (level) => 0.00970941 * Math.pow(1.14111, level) + 1;

const expAtLevel = (level) => {
  const steepness = level * getLevelSteepness(level);
  const xpRequired = (level - 1) * ROOM_XP_DROP_PER_LEVEL;
  const result = Math.round(steepness * xpRequired);
  return result - (result % 250);
};

// Calculate level from experience points using binary search
const levelFromExp = (exp) => {
  if (exp <= 0) return 1;
  
  // Binary search to find the level
  let minLevel = 1;
  let maxLevel = 100; // Reasonable upper bound
  
  while (minLevel <= maxLevel) {
    const midLevel = Math.floor((minLevel + maxLevel) / 2);
    const expForMidLevel = expAtLevel(midLevel);
    const expForNextLevel = expAtLevel(midLevel + 1);
    
    if (exp >= expForMidLevel && exp < expForNextLevel) {
      return midLevel;
    }
    
    if (exp < expForMidLevel) {
      maxLevel = midLevel - 1;
    } else {
      minLevel = midLevel + 1;
    }
  }
  
  return minLevel;
};

// Properly capitalize names (title case with connecting words lowercase)
function toTitleCase(str) {
  if (!str) return '';
  
  // Words that should remain lowercase (unless they're the first word)
  const lowerCaseWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'as', 'at', 
                         'by', 'for', 'from', 'in', 'into', 'near', 'of', 'on', 'onto', 
                         'to', 'with'];
  
  return str.toLowerCase().split(' ').map((word, index) => {
    // Always capitalize the first word or if not in lowerCaseWords list
    if (index === 0 || !lowerCaseWords.includes(word)) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
}

// Build a map of equipment names to game IDs - use the API if available
const buildEquipmentMap = () => {
  // If the equipment map is already loaded from the API, use it
  if (equipmentMap) {
    return equipmentMap;
  }
  
  // Otherwise build the map manually
  const map = new Map();
  const utils = globalThis.state.utils;
  for (let i = 1; ; i++) {
    try { 
      map.set(utils.getEquipment(i).metadata.name.toLowerCase(), i); 
    }
    catch { break; }
  }
  return map;
};

// Build a map of monster names to game IDs
const buildMonsterMap = () => {
  if (window.monsterNamesToGameIds) {
    return window.monsterNamesToGameIds;
  }
  
  const map = new Map();
  const utils = globalThis.state.utils;
  for (let i = 1; ; i++) {
    try { 
      const monster = utils.getMonster(i);
      if (monster && monster.metadata && monster.metadata.name) {
        map.set(monster.metadata.name.toLowerCase(), i);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return map;
};

// Get original cased equipment name from game ID
function getEquipmentNameFromId(gameId) {
  try {
    const equipData = globalThis.state.utils.getEquipment(gameId);
    return equipData && equipData.metadata ? equipData.metadata.name : null;
  } catch (e) {
    console.error('Error getting equipment name:', e);
    return null;
  }
}

// Get original cased monster name from game ID
function getMonsterNameFromId(gameId) {
  try {
    const monsterData = globalThis.state.utils.getMonster(gameId);
    return monsterData && monsterData.metadata ? monsterData.metadata.name : null;
  } catch (e) {
    console.error('Error getting monster name:', e);
    return null;
  }
}

// Get monster gameId from databaseId (player piece)
function getMonsterGameIdFromDatabaseId(databaseId) {
  try {
    const playerContext = getPlayerSnapshot();
    const monster = playerContext.monsters.find(m => m.id === databaseId);
    return monster ? monster.gameId : null;
  } catch (e) {
    console.error('Error getting monster gameId from databaseId:', e);
    return null;
  }
}

// Icon mapping for stats
const iconMap = {
  ap: "/assets/icons/abilitypower.png",
  ad: "/assets/icons/attackdamage.png",
  hp: "/assets/icons/heal.png",
  magicResist: "/assets/icons/magicresist.png",
  armor: "/assets/icons/armor.png",
  speed: "/assets/icons/speed.png"
};

// Update equipment stats
function updateEquip(equipMap, name, stat, tier) {
  const gameId = equipMap.get(name.toLowerCase());
  if (!gameId) throw `Equipment "${name}" not found`;
  
  const playerContext = getPlayerSnapshot();
  const equips = playerContext.equips;
  const equip = equips.find(e => e.gameId === gameId);
  
  if (!equip) throw `Equipment "${name}" not found in player inventory`;
  
  equip.stat = stat; 
  equip.tier = tier;
  
  globalThis.state.player.send({
    type: "setState",
    fn: p => ({ ...p, equips: [...equips] })
  });
  
  return equip.id;
}

// Update item portrait with new equipment data
function updateItemPortrait(portrait, equipName, stat, tier, equipMap) {
  if (!portrait || !equipName || !stat || !tier || !equipMap) return null;
  
  const gameId = equipMap.get(equipName.toLowerCase());
  if (!gameId) return null;
  
  const equipData = globalThis.state.utils.getEquipment(gameId);
  if (!equipData || !equipData.metadata) return null;
  
  // Create a new portrait with updated data
  const newPortrait = api.ui.components.createItemPortrait({
    itemId: equipData.metadata.spriteId,
    stat: stat,
    tier: parseInt(tier)
  });
  
  // Replace the old portrait with the new one
  if (portrait && portrait.parentNode) {
    portrait.parentNode.replaceChild(newPortrait, portrait);
  }
  
  return newPortrait;
}

// Get serialized board data
function getSerializedBoard() {
  try {
    let boardData;
    
    // Method 1: Use the raw function directly from window if available
    if (typeof window.$serializeBoard === 'function') {
      boardData = JSON.parse(window.$serializeBoard());
      console.log('Used window.$serializeBoard directly for board data');
    } 
    // Method 2: Use the function from the API if available
    else if (window.BestiaryModAPI && window.BestiaryModAPI.utility && window.BestiaryModAPI.utility.serializeBoard) {
      boardData = JSON.parse(window.BestiaryModAPI.utility.serializeBoard());
      console.log('Used BestiaryModAPI.utility.serializeBoard for board data');
    }
    else {
      console.error('No serialization method available');
      return null;
    }
    
    return boardData;
  } catch (error) {
    console.error('Error serializing board:', error);
    return null;
  }
}

// Configure board with updated data
function configureBoard(boardData) {
  try {
    // Method 1: Use the raw function directly from window if available
    if (typeof window.$configureBoard === 'function') {
      window.$configureBoard(boardData);
      console.log('Used window.$configureBoard directly for board configuration');
      return true;
    } 
    // Method 2: Use the function from the API if available
    else if (window.BestiaryModAPI && window.BestiaryModAPI.utility && window.BestiaryModAPI.utility.configureBoard) {
      window.BestiaryModAPI.utility.configureBoard(boardData);
      console.log('Used BestiaryModAPI.utility.configureBoard for board configuration');
      return true;
    }
    else {
      console.error('No configuration method available');
      return false;
    }
  } catch (error) {
    console.error('Error configuring board:', error);
    return false;
  }
}

// Main function to show the hero editor modal
function showHeroEditorModal() {
  try {
    // Get player data for equipment information
    const playerContext = getPlayerSnapshot();
    const boardContext = getBoardSnapshot();
    
    // Get serialized board data
    const originalBoardData = getSerializedBoard();
    
    if (!originalBoardData || !originalBoardData.board || originalBoardData.board.length === 0) {
      throw new Error('No hero data found. Make sure you have heroes on the board.');
    }
    
    console.log('Original board data:', originalBoardData);
    
    // Create a deep copy for editing
    const editableBoardData = JSON.parse(JSON.stringify(originalBoardData));
    
    // Build equipment map
    const equipMap = buildEquipmentMap();
    
    // Build monster map
    const monsterMap = buildMonsterMap();
    
    // Keep track of controls for reset/apply functionality
    const controls = [];
    
    // Create container for the modal content
    const contentContainer = document.createElement('div');
    
    // Create scrollable container for heroes
    const scrollContainer = api.ui.components.createScrollContainer({
      height: 350,
      padding: true,
      content: ''
    });
    
    // Create cards for each hero
    editableBoardData.board.forEach((hero, index) => {
      // Only process player pieces (monsters with items)
      if (!hero.monster || !hero.equipment) return;
      
      // Get the properly cased monster name
      let monsterName = hero.monster.name || 'Unknown Monster';
      let monsterGameId = null;
      
      // Try to get game ID from board data if it's a player piece
      if (boardContext.boardConfig) {
        const boardPiece = boardContext.boardConfig.find(p => 
          p.tileIndex === hero.tile && (p.type === 'player' || p.type === 'custom'));
        
        if (boardPiece) {
          if (boardPiece.type === 'player') {
            // For player pieces, we need to get the gameId from the databaseId
            monsterGameId = getMonsterGameIdFromDatabaseId(boardPiece.databaseId);
          } else if (boardPiece.type === 'custom') {
            monsterGameId = boardPiece.gameId;
          }
        }
      }
      
      // If not found, try to get monster game ID from the name
      if (!monsterGameId) {
        monsterGameId = monsterMap.get(monsterName.toLowerCase());
      }
      
      // Get the original cased name if possible
      if (monsterGameId) {
        const originalName = getMonsterNameFromId(monsterGameId);
        if (originalName) monsterName = originalName;
      }
      
      // Calculate monster level (if we have exp data, currently placeholder)
      const monsterLevel = 1;
      
      // Create hero card container
      const heroCard = document.createElement('div');
      heroCard.className = 'frame-pressed-1 surface-dark p-2 mb-3';
      
      // Header with monster portrait and name
      const headerContainer = document.createElement('div');
      headerContainer.style.display = 'flex';
      headerContainer.style.alignItems = 'center';
      headerContainer.style.gap = '10px';
      headerContainer.style.marginBottom = '10px';
      
      // Create monster portrait if we have the ID
      if (monsterGameId) {
        try {
          const monsterPortrait = api.ui.components.createMonsterPortrait({
            monsterId: monsterGameId,
            level: monsterLevel,
            tier: 1
          });
          headerContainer.appendChild(monsterPortrait);
        } catch (e) {
          console.error('Error creating monster portrait:', e);
        }
      }
      
      const nameElement = document.createElement('h3');
      nameElement.textContent = toTitleCase(monsterName);
      nameElement.className = 'pixel-font-16 text-whiteRegular';
      
      headerContainer.appendChild(nameElement);
      heroCard.appendChild(headerContainer);
      
      // Stats grid
      const statsContainer = document.createElement('div');
      statsContainer.style.display = 'grid';
      statsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
      statsContainer.style.gap = '8px';
      statsContainer.style.marginBottom = '10px';
      
      // Stats to display
      const stats = [
        { key: 'hp', label: 'HP' },
        { key: 'ad', label: 'AD' },
        { key: 'ap', label: 'AP' },
        { key: 'armor', label: 'ARM' },
        { key: 'magicResist', label: 'MR' }
      ];
      
      // Create stat inputs
      stats.forEach(stat => {
        const statContainer = document.createElement('div');
        statContainer.style.display = 'flex';
        statContainer.style.flexDirection = 'column';
        statContainer.style.gap = '2px';
        
        // Label with icon
        const labelContainer = document.createElement('div');
        labelContainer.style.display = 'flex';
        labelContainer.style.alignItems = 'center';
        labelContainer.style.gap = '4px';
        
        const iconElement = document.createElement('img');
        iconElement.src = iconMap[stat.key];
        iconElement.alt = stat.label;
        iconElement.width = iconElement.height = 16;
        iconElement.className = 'pixelated';
        
        const labelElement = document.createElement('span');
        labelElement.textContent = stat.label;
        labelElement.className = 'pixel-font-12 text-whiteRegular';
        
        labelContainer.appendChild(iconElement);
        labelContainer.appendChild(labelElement);
        statContainer.appendChild(labelContainer);
        
        // Input for stat value
        const inputElement = document.createElement('input');
        inputElement.type = 'number';
        inputElement.min = 1;
        inputElement.max = 20;
        inputElement.value = hero.monster[stat.key] || 1;
        inputElement.className = 'frame-pressed-1 surface-darker pixel-font-14 text-whiteRegular px-2 py-1';
        inputElement.style.width = '100%';
        
        statContainer.appendChild(inputElement);
        
        // Track this input for later updates
        controls.push({ 
          index,
          hero, 
          type: 'stat', 
          stat: stat.key, 
          input: inputElement, 
          initial: inputElement.value 
        });
        
        statsContainer.appendChild(statContainer);
      });
      
      heroCard.appendChild(statsContainer);
      
      // Equipment section
      const equipContainer = document.createElement('div');
      equipContainer.className = 'frame-pressed-1 surface-darker p-2';
      
      // Get equipment data
      let equipName = hero.equipment.name || 'Unknown Item';
      let equipGameId = null;
      
      // Try to get game ID from window.equipmentNamesToGameIds first
      if (window.equipmentNamesToGameIds) {
        equipGameId = window.equipmentNamesToGameIds.get(equipName.toLowerCase());
      }
      
      // If not found, try with our equipMap
      if (!equipGameId && equipMap) {
        equipGameId = equipMap.get(equipName.toLowerCase());
      }
      
      // Get the original cased name if possible
      if (equipGameId) {
        const originalName = getEquipmentNameFromId(equipGameId);
        if (originalName) equipName = originalName;
      }
      
      // Compact equipment layout with row flex
      const equipContent = document.createElement('div');
      equipContent.style.display = 'flex';
      equipContent.style.flexDirection = 'row';
      equipContent.style.gap = '10px';
      
      // Item portrait container
      const portraitContainer = document.createElement('div');
      portraitContainer.style.flexShrink = '0';
      
      // Equipment controls
      const equipControls = document.createElement('div');
      equipControls.style.display = 'flex';
      equipControls.style.flexDirection = 'column';
      equipControls.style.flex = '1';
      equipControls.style.gap = '6px';
      
      // Create item portrait if we have the ID
      let itemPortrait = null;
      if (equipGameId) {
        try {
          const equipData = globalThis.state.utils.getEquipment(equipGameId);
          if (equipData && equipData.metadata) {
            itemPortrait = api.ui.components.createItemPortrait({
              itemId: equipData.metadata.spriteId,
              stat: hero.equipment.stat,
              tier: hero.equipment.tier
            });
            
            portraitContainer.appendChild(itemPortrait);
            equipContent.appendChild(portraitContainer);
          }
        } catch (e) {
          console.error('Error creating item portrait:', e);
        }
      }
      
      // Equipment name dropdown
      const nameSelect = document.createElement('select');
      nameSelect.className = 'frame-pressed-1 surface-dark pixel-font-14 text-whiteRegular px-2 py-1';
      nameSelect.style.backgroundColor = 'var(--surface-dark)';
      nameSelect.style.border = 'none';
      nameSelect.style.width = '100%';
      nameSelect.style.color = 'var(--text-whiteRegular)';
      
      // Get all equipment data with proper casing
      const equipmentOptions = [];
      
      equipMap.forEach((id, name) => {
        const originalName = getEquipmentNameFromId(id) || toTitleCase(name);
        equipmentOptions.push({ id, name: name, displayName: originalName });
      });
      
      // Sort options alphabetically
      equipmentOptions.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      // Add options to select
      equipmentOptions.forEach(option => {
        const selectOption = document.createElement('option');
        selectOption.value = option.name;
        selectOption.textContent = option.displayName;
        if (option.name.toLowerCase() === equipName.toLowerCase()) {
          selectOption.selected = true;
        }
        nameSelect.appendChild(selectOption);
      });
      
      controls.push({ 
        index,
        hero, 
        type: 'equipName', 
        select: nameSelect, 
        initial: nameSelect.value,
        portrait: itemPortrait,
        portraitContainer: portraitContainer
      });
      
      // Stat and Tier controls in a row
      const statTierContainer = document.createElement('div');
      statTierContainer.style.display = 'flex';
      statTierContainer.style.gap = '6px';
      
      // Stat selector
      const statSelect = document.createElement('select');
      statSelect.className = 'frame-pressed-1 surface-dark pixel-font-14 text-whiteRegular px-2 py-1';
      statSelect.style.backgroundColor = 'var(--surface-dark)';
      statSelect.style.border = 'none';
      statSelect.style.flex = '1';
      statSelect.style.color = 'var(--text-whiteRegular)';
      
      ['ad', 'ap', 'hp'].forEach(stat => {
        const option = document.createElement('option');
        option.value = stat;
        option.textContent = stat.toUpperCase();
        if (hero.equipment.stat === stat) option.selected = true;
        statSelect.appendChild(option);
      });
      
      controls.push({ 
        index,
        hero, 
        type: 'equipStat', 
        select: statSelect, 
        initial: statSelect.value,
        portrait: itemPortrait,
        portraitContainer: portraitContainer
      });
      
      // Tier input
      const tierInput = document.createElement('input');
      tierInput.type = 'number';
      tierInput.min = 1;
      tierInput.max = 5;
      tierInput.value = hero.equipment.tier;
      tierInput.className = 'frame-pressed-1 surface-dark pixel-font-14 text-whiteRegular px-2 py-1';
      tierInput.style.width = '40px';
      tierInput.style.textAlign = 'center';
      
      // Label for tier
      const tierLabel = document.createElement('span');
      tierLabel.textContent = 'Tier:';
      tierLabel.className = 'pixel-font-12 text-whiteRegular';
      tierLabel.style.display = 'flex';
      tierLabel.style.alignItems = 'center';
      
      const tierWrapper = document.createElement('div');
      tierWrapper.style.display = 'flex';
      tierWrapper.style.alignItems = 'center';
      tierWrapper.style.gap = '4px';
      
      tierWrapper.appendChild(tierLabel);
      tierWrapper.appendChild(tierInput);
      
      controls.push({ 
        index,
        hero, 
        type: 'equipTier', 
        input: tierInput, 
        initial: tierInput.value,
        portrait: itemPortrait,
        portraitContainer: portraitContainer
      });
      
      // Add event listeners to update item portrait when equipment changes
      nameSelect.addEventListener('change', () => {
        // Find the related controls
        const nameControl = controls.find(c => c.hero === hero && c.type === 'equipName');
        const statControl = controls.find(c => c.hero === hero && c.type === 'equipStat');
        const tierControl = controls.find(c => c.hero === hero && c.type === 'equipTier');
        
        if (nameControl && statControl && tierControl && nameControl.portraitContainer) {
          // Get new equipment game ID
          const newEquipName = nameSelect.value;
          const equipId = equipMap.get(newEquipName.toLowerCase());
          
          if (equipId) {
            const equipData = globalThis.state.utils.getEquipment(equipId);
            if (equipData && equipData.metadata) {
              // Create new portrait
              const newPortrait = api.ui.components.createItemPortrait({
                itemId: equipData.metadata.spriteId,
                stat: statControl.select.value,
                tier: parseInt(tierControl.input.value)
              });
              
              // Clear and append new portrait
              while (nameControl.portraitContainer.firstChild) {
                nameControl.portraitContainer.removeChild(nameControl.portraitContainer.firstChild);
              }
              
              nameControl.portraitContainer.appendChild(newPortrait);
              
              // Update portrait reference for all related controls
              nameControl.portrait = statControl.portrait = tierControl.portrait = newPortrait;
            }
          }
        }
      });
      
      statSelect.addEventListener('change', () => {
        // Find the related controls
        const nameControl = controls.find(c => c.hero === hero && c.type === 'equipName');
        const statControl = controls.find(c => c.hero === hero && c.type === 'equipStat');
        const tierControl = controls.find(c => c.hero === hero && c.type === 'equipTier');
        
        if (nameControl && statControl && tierControl && nameControl.portraitContainer) {
          // Get equipment game ID
          const equipName = nameControl.select.value;
          const equipId = equipMap.get(equipName.toLowerCase());
          
          if (equipId) {
            const equipData = globalThis.state.utils.getEquipment(equipId);
            if (equipData && equipData.metadata) {
              // Create new portrait
              const newPortrait = api.ui.components.createItemPortrait({
                itemId: equipData.metadata.spriteId,
                stat: statSelect.value,
                tier: parseInt(tierControl.input.value)
              });
              
              // Clear and append new portrait
              while (nameControl.portraitContainer.firstChild) {
                nameControl.portraitContainer.removeChild(nameControl.portraitContainer.firstChild);
              }
              
              nameControl.portraitContainer.appendChild(newPortrait);
              
              // Update portrait reference for all related controls
              nameControl.portrait = statControl.portrait = tierControl.portrait = newPortrait;
            }
          }
        }
      });
      
      tierInput.addEventListener('change', () => {
        // Find the related controls
        const nameControl = controls.find(c => c.hero === hero && c.type === 'equipName');
        const statControl = controls.find(c => c.hero === hero && c.type === 'equipStat');
        const tierControl = controls.find(c => c.hero === hero && c.type === 'equipTier');
        
        if (nameControl && statControl && tierControl && nameControl.portraitContainer) {
          // Get equipment game ID
          const equipName = nameControl.select.value;
          const equipId = equipMap.get(equipName.toLowerCase());
          
          if (equipId) {
            const equipData = globalThis.state.utils.getEquipment(equipId);
            if (equipData && equipData.metadata) {
              // Create new portrait
              const newPortrait = api.ui.components.createItemPortrait({
                itemId: equipData.metadata.spriteId,
                stat: statControl.select.value,
                tier: parseInt(tierInput.value)
              });
              
              // Clear and append new portrait
              while (nameControl.portraitContainer.firstChild) {
                nameControl.portraitContainer.removeChild(nameControl.portraitContainer.firstChild);
              }
              
              nameControl.portraitContainer.appendChild(newPortrait);
              
              // Update portrait reference for all related controls
              nameControl.portrait = statControl.portrait = tierControl.portrait = newPortrait;
            }
          }
        }
      });
      
      statTierContainer.appendChild(statSelect);
      statTierContainer.appendChild(tierWrapper);
      
      equipControls.appendChild(nameSelect);
      equipControls.appendChild(statTierContainer);
      
      equipContent.appendChild(equipControls);
      equipContainer.appendChild(equipContent);
      heroCard.appendChild(equipContainer);
      
      scrollContainer.addContent(heroCard);
    });
    
    contentContainer.appendChild(scrollContainer.element);
    
    // Create the modal
    api.ui.components.createModal({
      title: 'Edit Heroes',
      width: 320, // Reduced width to avoid horizontal scroll
      content: contentContainer,
      buttons: [
        {
          text: 'Reset',
          primary: false,
          onClick: () => {
            // Reset all inputs to initial values
            controls.forEach(control => {
              if (control.input) control.input.value = control.initial;
              if (control.select) control.select.value = control.initial;
              
              // Reset portraits to match initial values
              if (control.type === 'equipName' && control.portraitContainer) {
                const statControl = controls.find(c => c.hero === control.hero && c.type === 'equipStat');
                const tierControl = controls.find(c => c.hero === control.hero && c.type === 'equipTier');
                
                if (statControl && tierControl) {
                  // Get equipment game ID
                  const equipName = control.initial;
                  const equipId = equipMap.get(equipName.toLowerCase());
                  
                  if (equipId) {
                    const equipData = globalThis.state.utils.getEquipment(equipId);
                    if (equipData && equipData.metadata) {
                      // Create new portrait
                      const newPortrait = api.ui.components.createItemPortrait({
                        itemId: equipData.metadata.spriteId,
                        stat: statControl.initial,
                        tier: parseInt(tierControl.initial)
                      });
                      
                      // Clear and append new portrait
                      while (control.portraitContainer.firstChild) {
                        control.portraitContainer.removeChild(control.portraitContainer.firstChild);
                      }
                      
                      control.portraitContainer.appendChild(newPortrait);
                      
                      // Update portrait reference for all related controls
                      control.portrait = statControl.portrait = tierControl.portrait = newPortrait;
                    }
                  }
                }
              }
            });
          }
        },
        {
          text: 'Apply',
          primary: true,
          onClick: () => {
            try {
              // Make a fresh copy of the original board data
              const updatedBoardData = JSON.parse(JSON.stringify(originalBoardData));
              
              // Update the board pieces with new stats and equipment
              controls.forEach(control => {
                // Update monster stats
                if (control.type === 'stat' && control.input) {
                  const boardIndex = control.index;
                  if (updatedBoardData.board[boardIndex] && updatedBoardData.board[boardIndex].monster) {
                    updatedBoardData.board[boardIndex].monster[control.stat] = parseInt(control.input.value);
                  }
                }
                
                // Equipment updates need to be grouped by hero
                else if (control.type === 'equipName') {
                  const hero = control.hero;
                  const boardIndex = control.index;
                  const statControl = controls.find(c => c.hero === hero && c.type === 'equipStat');
                  const tierControl = controls.find(c => c.hero === hero && c.type === 'equipTier');
                  
                  if (statControl && tierControl && updatedBoardData.board[boardIndex]) {
                    // Get the proper equipment name and data
                    const equipName = control.select.value;
                    const equipId = equipMap.get(equipName.toLowerCase());
                    
                    if (equipId) {
                      const equipData = globalThis.state.utils.getEquipment(equipId);
                      if (equipData && equipData.metadata) {
                        // Update equipment in the board data format expected by configureBoard
                        // Make sure to use lowercase for equipment name to avoid errors
                        updatedBoardData.board[boardIndex].equipment = {
                          name: equipData.metadata.name.toLowerCase(),
                          stat: statControl.select.value,
                          tier: parseInt(tierControl.input.value)
                        };
                      }
                    }
                  }
                }
              });
              
              // Make sure all monster names are lowercase to avoid errors
              updatedBoardData.board.forEach(piece => {
                if (piece.monster && piece.monster.name) {
                  piece.monster.name = piece.monster.name.toLowerCase();
                }
              });
              
              // Apply the updated board data
              const success = configureBoard(updatedBoardData);
              
              if (success) {
                // Show success message
                api.ui.components.createModal({
                  title: 'Success',
                  content: 'Heroes updated successfully!',
                  buttons: [{ text: 'OK', primary: true }]
                });
              } else {
                throw new Error('Failed to apply changes');
              }
            } catch (error) {
              console.error('Error applying hero changes:', error);
              
              // Show error message
              api.ui.components.createModal({
                title: 'Error',
                content: `Failed to update heroes: ${error.message || error}`,
                buttons: [{ text: 'OK', primary: true }]
              });
            }
          },
          closeOnClick: true
        },
        {
          text: 'Cancel',
          primary: false,
          closeOnClick: true
        }
      ]
    });
    
  } catch (error) {
    console.error('Error showing hero editor:', error);
    
    // Show error message
    api.ui.components.createModal({
      title: 'Error',
      content: 'Failed to open hero editor. Make sure you are in a game with heroes on the board.',
      buttons: [{ text: 'OK', primary: true }]
    });
  }
}

// Export functionality
context.exports = {
  showEditor: showHeroEditorModal
}; 