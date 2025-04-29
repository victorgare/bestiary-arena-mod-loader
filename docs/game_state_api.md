# Bestiary Arena Mod Loader - Game State API Documentation

This document provides a comprehensive reference for accessing and modifying the game state in Bestiary Arena through the Mod Loader. The Game State API is exposed through `globalThis.state` and follows the XState state machine pattern.

## Overview

Bestiary Arena exposes its client state to the DOM via `globalThis.state`, allowing advanced customization, automation, and tooling. Each component of the state is managed by a state machine for predictable and event-driven architecture.

## State Structure

The main access point is `globalThis.state`, which contains these major components:

```javascript
globalThis.state = {
  board: {
    /* Board state and controls */
  },
  daily: {
    /* Daily challenge state */
  },
  gameTimer: {
    /* Game timing controls */
  },
  menu: {
    /* Menu state */
  },
  player: {
    /* Player data and inventory */
  },
  utils: {
    /* Utility functions and constants */
  },
};
```

Each component (except `utils`) follows a similar structure with these methods:

- `getSnapshot()` - Returns the current state
- `getInitialSnapshot()` - Returns the initial state
- `on(eventName, callback)` - Subscribe to state events
- `send(action)` - Send actions to modify state
- `subscribe(callback)` - Subscribe to state changes
- `inspect(callback)` - Monitor all state transitions and events

## Context Objects

Each state component has a context object that contains the actual state data. These can be accessed using `getSnapshot().context`.

### Board Context

The board context contains information about the current game board, selected maps, and game mode.

```javascript
const boardContext = globalThis.state.board.getSnapshot().context;
```

Key properties include:
- `boardConfig` - Array of pieces on the board
- `openMapPicker` - Boolean indicating if the map picker is open
- `gameStarted` - Boolean indicating if the game has started
- `sandboxSeed` - Seed for randomization in sandbox mode
- `mode` - Game mode (sandbox, manual, autoplay)
- `selectedMap` - Information about the currently selected map

### Daily Context

The daily context contains information about daily challenges and features.

```javascript
const dailyContext = globalThis.state.daily.getSnapshot().context;
```

Key properties include:
```javascript
{
  "loaded": true,
  "boostedMap": {
    "roomId": "molse",    // ID of the boosted map
    "equipId": 7,         // Boosted equipment ID
    "equipStat": "ap"     // Boosted stat type
  },
  "yasir": {              // Special merchant
    "location": "carlin", // Current location
    "diceCost": 5183      // Cost in dice
  },
  "msUntilNextEpochDay": 12750651,  // Milliseconds until daily reset
  "willUpdateAt": 1745884800000     // Timestamp of next update
}
```

### GameTimer Context

The gameTimer context tracks the game progress and results.

```javascript
const timerContext = globalThis.state.gameTimer.getSnapshot().context;
```

Key properties include:
```javascript
{
  "currentTick": 1440,     // Current game tick
  "state": "defeat",       // Game state (initial, victory, defeat)
  "readableGrade": "F",    // Performance grade (S+, A, B, C, D, F)
  "rankPoints": 0          // Points earned for rankings
}
```

### Menu Context

The menu context manages UI state for menus and navigation.

```javascript
const menuContext = globalThis.state.menu.getSnapshot().context;
```

Key properties include:
```javascript
{
  "mode": false,          // Active mode
  "inventory": {
    "selectedItem": false // Currently selected inventory item
  },
  "store": {
    "selectedCategory": "upgrades",  // Selected store category
    "selectedItem": "containerSlot", // Selected item
    "mobileNav": "category"          // Mobile navigation state
  },
  "trophyRoom": {
    "selectedRegion": null, // Selected region in trophy room
    "category": null        // Selected category
  },
  "questIconSrc": "quest.png", // Quest icon source
  "questBlip": false           // Quest notification indicator
}
```

### Player Context

The player context contains comprehensive player data including inventory, monsters, equipment, and progress.

```javascript
const playerContext = globalThis.state.player.getSnapshot().context;
```

Key properties include:
```javascript
{
  "id": 1,                       // Player ID
  "version": 159,                // Data version
  "name": "playerName",          // Player name
  "outfitId": 1457,              // Current outfit ID
  "head": 94,                    // Head appearance
  "body": 0,                     // Body appearance
  "legs": 0,                     // Legs appearance
  "feet": 114,                   // Feet appearance
  "outfits": [12, 129],          // Available outfits
  "flags": 1056702426,           // Player flags
  "loyaltyPoints": 9250,         // Loyalty points
  "exp": 150,                    // Experience
  "gold": 450,                   // Gold currency
  "coin": 100,                   // Premium currency
  "dust": 59,                    // Dust currency
  "staminaWillBeFullAt": 1745887162173, // Timestamp when stamina will be full
  "battleWillBeReadyAt": 1745873835589, // Timestamp when battle will be ready
  
  // Room completion data
  "rooms": {
    "kof": {                     // Room ID
      "rank": 4,                 // Player's rank
      "count": 184,              // Completion count
      "ticks": 131               // Best completion time
    }
    // Other rooms...
  },
  
  // Quest information
  "questLog": {
    "task": {
      "rank": 238,               // Quest rank
      "ready": false,            // Is quest ready
      "gameId": 4,               // Quest game ID
      "points": 1,               // Quest points
      "resetAt": 1745865031058,  // Quest reset timestamp
      "killCount": 17            // Required kills
    },
    "seashell": {
      "streak": 58,              // Streak count
      "readyAt": 1745923169408   // Ready timestamp
    },
    "tutorial": {
      "step": 18,                // Tutorial step
      "ready": false,            // Is tutorial ready
      "monstersKilled": 0        // Monsters killed in tutorial
    }
  },
  
  // Player's monsters
  "monsters": [
    {
      "ad": 20,                  // Attack damage
      "ap": 20,                  // Ability power
      "hp": 20,                  // Health points
      "id": "6kAyyQEY",          // Unique ID
      "exp": 11214750,           // Experience
      "tier": 4,                 // Monster tier
      "armor": 20,               // Armor value
      "gameId": 4,               // Game ID (monster type)
      "locked": true,            // Is locked (protected)
      "equipId": "VOb5wixj",     // Equipped item ID
      "createdAt": 1731944856501, // Creation timestamp
      "magicResist": 20          // Magic resistance
    }
    // More monsters...
  ],
  
  // Player's equipment
  "equips": [
    {
      "id": "X7PmpV0i",          // Unique ID
      "stat": "ad",              // Stat bonus type (ad, ap, hp)
      "tier": 4,                 // Equipment tier
      "gameId": 3                // Game ID (equipment type)
    }
    // More equipment...
  ],
  
  // Inventory items
  "inventory": {
    "stamina1": 14,              // Stamina potions tier 1
    "stamina2": 13,              // Stamina potions tier 2
    "equipChest": 0,             // Equipment chests
    "outfitBag1": 67,            // Outfit bags
    "insightStone1": 0,          // Insight stones tier 1
    // More inventory items...
  },
  
  // Saved board configurations
  "boardConfigs": {
    "kof": [                     // Room ID
      {
        "equipId": "ZgZ_kioY",   // Equipment ID
        "monsterId": "Si99h-vf", // Monster ID
        "tileIndex": 38          // Board position
      }
      // More configurations...
    ]
    // More rooms...
  }
}
```

## Board Management

The board component controls the game board, map selection, and gameplay mode.

### Accessing Board State

```javascript
// Get current board state
const boardState = globalThis.state.board.getSnapshot();
console.log(boardState.context);
```

### Setting Game Mode

```javascript
// Set game to sandbox mode
globalThis.state.board.send({ type: "setPlayMode", mode: "sandbox" });

// Set game to autoplay mode
globalThis.state.board.send({ type: "setPlayMode", mode: "autoplay" });

// Set game to manual mode
globalThis.state.board.send({ type: "setPlayMode", mode: "manual" });
```

### Selecting Maps

```javascript
// Select a specific map using its ID
globalThis.state.board.send({
  type: "selectRoomById",
  roomId: globalThis.state.utils.ROOM_ID.abbane,
});
```

### Custom Board Setup

```javascript
// Set up monsters on specific tiles
globalThis.state.board.send({
  type: "autoSetupBoard",
  setup: [
    {
      monsterId: monsterId, // From player.monsters
      equipId: equipId, // From player.equips
      tileIndex: tileIndex, // Tile position (0-based)
    },
  ],
});
```

### Setting Custom Seeds

```javascript
// Set a custom seed for sandbox mode
globalThis.state.board.send({
  type: "setState",
  fn: (prev) => ({ ...prev, customSandboxSeed: -1 }),
});
```

## Player State

The player component contains inventory, monsters, equipment, and other player data.

### Accessing Player Data

```javascript
// Get player state
const playerState = globalThis.state.player.getSnapshot();
const { monsters, equips } = playerState.context;
```

### Modifying Equipment

```javascript
// Change equipment stats without mutation
const equips = globalThis.state.player.getSnapshot().context.equips;
const nextEquips = equips.map((equip) =>
  equip.id === targetEquipId ? { ...equip, stat: "ap", tier: 5 } : equip
);

globalThis.state.player.send({
  type: "setState",
  fn: (prev) => ({ ...prev, equips: nextEquips }),
});
```

### Modifying Monsters

```javascript
// Change monster stats without mutation
const monsters = globalThis.state.player.getSnapshot().context.monsters;
const nextMonsters = monsters.map((monster) =>
  monster.id === targetMonsterId
    ? {
        ...monster,
        hp: 20,
        ad: 20,
        ap: 20,
        armor: 20,
        magicResist: 20,
      }
    : monster
);

globalThis.state.player.send({
  type: "setState",
  fn: (prev) => ({ ...prev, monsters: nextMonsters }),
});
```

## Game Utilities

The utils component provides helper functions and game data.

### Room Data

```javascript
// Access room IDs and names
const roomIds = globalThis.state.utils.ROOM_ID;
const roomNames = globalThis.state.utils.ROOM_NAME;

console.log(roomIds.rkswrs); // "rkswrs"
console.log(roomNames.rkswrs); // "Sewers"
```

### Monster Data

```javascript
// Get monster data by ID
const rat = globalThis.state.utils.getMonster(1);
console.log(rat.metadata.name); // "Rat"
console.log(rat.metadata.baseStats); // HP, AD, AP, etc.
```

### Equipment Data

```javascript
// Get equipment data by ID
const boots = globalThis.state.utils.getEquipment(1);
console.log(boots.metadata.name); // "Boots of Haste"
```

## Events and Listeners

The game uses XState under the hood, providing a powerful event system for monitoring and interacting with game state.

### Basic Event Subscription

```javascript
// Listen for board state changes
globalThis.state.board.on("before-game-start", (event) => {
  console.log("Game about to start:", event);
  // Custom code here
});
```

### Inspecting State Transitions

```javascript
// Monitor all state transitions (useful for debugging)
globalThis.state.board.inspect(console.log);

// Sample output of events:
/*
{
  actorRef: {sessionId: 'wrcv0mf', ...},
  event: {type: 'autoSetupBoard', setup: Array(1)},
  rootId: "wrcv0mf",
  sourceRef: undefined,
  type: "@xstate.event"
}
*/
```

### Common Event Types

The game uses several standard action types:

- `@xstate.init` - Initialization event when a state machine starts
- `setState` - Updates state context properties
- `setPlayMode` - Changes game mode (sandbox, autoplay, manual)
- `autoSetupBoard` - Places game pieces on the board
- `selectRoomById` - Selects a specific map/room

### Subscription to Game State

```javascript
// Subscribe to all state changes
const subscription = globalThis.state.board.subscribe((state) => {
  console.log("Board state changed:", state);
});

// Unsubscribe when finished
subscription.unsubscribe();
```

### Checking State Machine Status

```javascript
// Get current state information including active state
const snapshot = globalThis.state.board.getSnapshot();
console.log(snapshot.status); // 'active' or other status

// Get context data (contains most game state)
console.log(snapshot.context);
```

## Advanced Use Cases

### Forcing a Specific Seed

```javascript
// Force a specific seed for testing or replay
globalThis.state.board.send({
  type: "setState",
  fn: (prev) => ({ ...prev, customSandboxSeed: -876305199 }),
});
```

### Recording and Replaying Games

```javascript
// Example replay function
function replayGame(config) {
  // Set sandbox mode
  globalThis.state.board.send({ type: "setPlayMode", mode: "sandbox" });

  // Select map if provided
  if (config.region && config.map) {
    // (Map selection logic would go here)
    // Use roomId from your mapping
  }

  // Set seed if provided
  if (config.seed) {
    globalThis.state.board.send({
      type: "setState",
      fn: (prev) => ({ ...prev, customSandboxSeed: config.seed }),
    });
  }

  // Set up board pieces
  const boardSetup = config.board.map((piece) => {
    // Convert from shared format to game format
    // This would require finding the right monster and equipment IDs
    return {
      monsterId: findMonsterId(piece.monster.name),
      equipId: findEquipId(piece.equipment.name),
      tileIndex: piece.tile,
    };
  });

  // Send the board setup
  globalThis.state.board.send({
    type: "autoSetupBoard",
    setup: boardSetup,
  });
}
```

### Monitoring Game Timer

```javascript
// Track game ticks and results
globalThis.state.gameTimer.subscribe((data) => {
  const { currentTick, state, readableGrade, rankPoints } = data.context;
  console.log(`Current tick: ${currentTick}`);
  
  if (state !== 'initial') {
    console.log(`Game ended with grade: ${readableGrade}`);
    console.log(`Rank points: ${rankPoints}`);
  }
});
```

### Turbo Mode (Speed Up Gameplay)

```javascript
// Speed up the game by accelerating performance.now()
function enableTurbo(speedupFactor = 5) {
  if (window.__turboActive) return;
  
  const start = performance.now();
  window.__originalPerformanceNow = performance.now.bind(performance);
  window.__turboActive = true;
  
  // Override performance.now to return accelerated time
  performance.now = () => {
    const elapsed = window.__originalPerformanceNow() - start;
    return start + elapsed * speedupFactor;
  };
  
  console.log(`Turbo mode enabled (${speedupFactor}x)`);
}

// Disable turbo mode
function disableTurbo() {
  if (!window.__turboActive) return;
  
  performance.now = window.__originalPerformanceNow;
  delete window.__originalPerformanceNow;
  window.__turboActive = false;
  
  console.log('Turbo mode disabled');
}
```

## Helper Functions

These utility functions can help with common tasks:

```javascript
// Find a monster ID by name and optional stats
function findMonsterByName(name, stats = {}) {
  const playerMonsters = globalThis.state.player.getSnapshot().context.monsters;
  const allMonsters = [];

  // First try to find by exact name match
  for (let i = 1; i <= 100; i++) {
    try {
      const monster = globalThis.state.utils.getMonster(i);
      if (monster && monster.metadata) {
        allMonsters.push({ id: i, name: monster.metadata.name });
        if (monster.metadata.name.toLowerCase() === name.toLowerCase()) {
          return playerMonsters.find((m) => m.gameId === i)?.id;
        }
      }
    } catch (e) {
      // Skip if monster ID doesn't exist
    }
  }

  return null;
}

// Find equipment ID by name, stat, and tier
function findEquipmentByName(name, stat, tier) {
  const playerEquips = globalThis.state.player.getSnapshot().context.equips;

  for (let i = 1; i <= 100; i++) {
    try {
      const equip = globalThis.state.utils.getEquipment(i);
      if (
        equip &&
        equip.metadata &&
        equip.metadata.name.toLowerCase() === name.toLowerCase()
      ) {
        return playerEquips.find(
          (e) => e.gameId === i && e.stat === stat && e.tier === tier
        )?.id;
      }
    } catch (e) {
      // Skip if equipment ID doesn't exist
    }
  }

  return null;
}

// Serialize the current board setup
function serializeBoard() {
  const boardState = globalThis.state.board.getSnapshot().context;
  const playerState = globalThis.state.player.getSnapshot().context;

  // Get room data
  const currentRoomId = boardState.currentRoom;
  let region, map;

  // Find region and map name (this would need more implementation)

  const boardPieces = boardState.boardConfigs.map((piece) => {
    const monster = playerState.monsters.find((m) => m.id === piece.monsterId);
    const equip = playerState.equips.find((e) => e.id === piece.equipId);

    return {
      tile: piece.tileIndex,
      monster: {
        name: globalThis.state.utils.getMonster(monster.gameId).metadata.name,
        hp: monster.hp,
        ad: monster.ad,
        ap: monster.ap,
        armor: monster.armor,
        magicResist: monster.magicResist,
      },
      equipment: {
        name: globalThis.state.utils.getEquipment(equip.gameId).metadata.name,
        stat: equip.stat,
        tier: equip.tier,
      },
    };
  });

  return {
    region,
    map,
    seed: boardState.sandboxSeed,
    board: boardPieces,
  };
}
```

## Game Analysis Tools

These functions can help analyze game performance and strategy:

```javascript
// Run multiple simulations and analyze results
async function analyzePerformance(runs = 20) {
  // Ensure we're in sandbox mode
  globalThis.state.board.send({ type: "setPlayMode", mode: "sandbox" });
  
  // Optional: Enable turbo mode for faster simulation
  enableTurbo(1000);
  
  const results = [];
  let minTicks = Infinity;
  let maxRankPoints = 0;
  let sPlusCount = 0;
  
  try {
    for (let i = 1; i <= runs; i++) {
      // Start the game
      document.querySelector('button').textContent === 'Start' && 
        document.querySelector('button').click();
      
      // Wait for game to complete and get results
      const result = await new Promise(resolve => {
        const subscription = globalThis.state.gameTimer.subscribe(data => {
          const { currentTick, state, readableGrade, rankPoints } = data.context;
          if (state !== 'initial') {
            resolve({ ticks: currentTick, grade: readableGrade, rankPoints });
            subscription.unsubscribe();
          }
        });
      });
      
      results.push(result);

      // Track stats
      if (result.grade === 'S+') sPlusCount++;
      if (result.ticks < minTicks) minTicks = result.ticks;
      if (result.rankPoints > maxRankPoints) maxRankPoints = result.rankPoints;
      
      // Stop and prepare for next run
      document.querySelector('button').textContent === 'Stop' && 
        document.querySelector('button').click();
      
      await new Promise(r => setTimeout(r, 100));
    }
  } finally {
    // Always disable turbo mode when finished
    disableTurbo();
  }
  
  // Summary statistics
  console.log(`S+ Rate: ${(sPlusCount/runs*100).toFixed(2)}%`);
  console.log(`Best time: ${minTicks} ticks`);
  console.log(`Highest rank points: ${maxRankPoints}`);
  
  return {
    results,
    summary: {
      runs,
      sPlusCount,
      sPlusRate: (sPlusCount/runs*100).toFixed(2) + '%',
      minTicks,
      maxRankPoints
    }
  };
}

// Find the best monster/equipment combinations
async function tierList() {
  const { monsters, equips, boardConfigs } = globalThis.state.player.getSnapshot().context;
  
  // Create lookup maps
  const monsterLookup = new Map(monsters.map(m => [m.id, m.gameId]));
  const equipLookup = new Map(equips.map(e => [e.id, e.gameId]));
  
  // Count usage in successful board configurations
  const monsterCount = new Map();
  const equipCount = new Map();
  
  Object.values(boardConfigs).forEach(configs => {
    configs.forEach(({ monsterId, equipId }) => {
      if (monsterId) {
        const gameId = monsterLookup.get(monsterId);
        if (gameId) monsterCount.set(gameId, (monsterCount.get(gameId) || 0) + 1);
      }
      if (equipId) {
        const gameId = equipLookup.get(equipId);
        if (gameId) equipCount.set(gameId, (equipCount.get(gameId) || 0) + 1);
      }
    });
  });
  
  // Sort by usage count
  const monsterTier = Array.from(monsterCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([gameId, count]) => ({
      name: globalThis.state.utils.getMonster(gameId).metadata.name,
      count
    }));
  
  const equipTier = Array.from(equipCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([gameId, count]) => ({
      name: globalThis.state.utils.getEquipment(gameId).metadata.name,
      count
    }));
  
  return { monsterTier, equipTier };
}
```

## Limitations and Considerations

- **State Mutations**: Always use the proper state update patterns (creating new objects rather than mutating existing ones) to ensure state updates work correctly.
- **Timing**: State updates may not be immediate due to the asynchronous nature of state machines.
- **Browser Compatibility**: Some advanced techniques (like the Turbo mode) may not work in all browsers.
- **Game Updates**: The state structure and API may change with game updates.
- **Performance**: Be cautious with extensive state monitoring which can impact performance.
- **Sandbox Mode**: Most state modifications only work properly in sandbox mode to prevent cheating in normal gameplay.

## Integration with Client API

The Game State API works seamlessly with the [Client API](client_api.md). While the Client API provides high-level functions for common tasks, the Game State API gives you direct access to the underlying state for more advanced operations.

```javascript
// Example of using both APIs together
function setupCustomBoard() {
  // Use Client API to show a loading modal
  api.showModal({
    title: 'Loading',
    content: 'Setting up custom board...'
  });
  
  try {
    // Use Game State API for direct state manipulation
    globalThis.state.board.send({ type: "setPlayMode", mode: "sandbox" });
    
    // More state manipulation...
    
    // Use Client API again to notify completion
    api.showModal({
      title: 'Success',
      content: 'Custom board setup complete!',
      buttons: [{ text: 'OK', primary: true }]
    });
  } catch (error) {
    console.error('Error setting up board:', error);
  }
}
``` 