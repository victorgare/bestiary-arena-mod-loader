// By mathiasbynens
// Modified to work as a module and expose functions to window object

// Wrap everything in an IIFE to protect variables
(() => {
	console.log('Loading BA Sandbox Utils...');

	try {
		// Define region mappings
		const regionNamesToIds = new Map([
			['Rookgaard', 'rook'],
			['Carlin', 'carlin'],
			['Folda', 'folda'],
			["Ab'Dendriel", 'abdendriel'],
			['Kazordoon', 'kazordoon'],
		]);

		// Create reverse mapping
		const regionIdsToNames = (() => {
			const map = new Map();
			for (const [name, id] of regionNamesToIds) {
				map.set(id, name);
			}
			return map;
		})();

		// Maps that will be populated later when game state is available
		let mapNamesToIds = new Map();
		let mapIdsToNames = new Map();
		let monsterNamesToGameIds = new Map();
		let monsterGameIdsToNames = new Map();
		let equipmentNamesToGameIds = new Map();
		let equipmentGameIdsToNames = new Map();

		// Helper function to safely access nested properties
		const safeAccess = (obj, path) => {
			return path.split('.').reduce((acc, part) => acc && acc[part], obj);
		};

		// Helper function to check if game state is ready
		const isStateReady = () => {
			return safeAccess(globalThis, 'state.utils') && 
				safeAccess(globalThis, 'state.board') && 
				safeAccess(globalThis, 'state.player');
		};

		// Initialize all maps that depend on game state
		const initializeMaps = () => {
			console.log('BA Sandbox Utils: Initializing maps...');
			
			// Initialize mapNamesToIds
			try {
				if (safeAccess(globalThis, 'state.utils.ROOM_NAME')) {
					mapNamesToIds = new Map();
					const idToName = globalThis.state.utils.ROOM_NAME;
					for (const [id, name] of Object.entries(idToName)) {
						mapNamesToIds.set(name, id);
					}
					
					// Initialize mapIdsToNames
					mapIdsToNames = new Map();
					for (const [name, id] of mapNamesToIds) {
						mapIdsToNames.set(id, name);
					}
					console.log('Maps initialized successfully:', { 
						mapNamesToIdsSize: mapNamesToIds.size,
						mapIdsToNamesSize: mapIdsToNames.size
					});
				} else {
					console.warn('state.utils.ROOM_NAME not available yet');
				}
			} catch (error) {
				console.error('Error initializing map name maps:', error);
			}

			// Initialize monsterNamesToGameIds
			try {
				if (safeAccess(globalThis, 'state.utils.getMonster')) {
					monsterNamesToGameIds = new Map();
					const getMonster = globalThis.state.utils.getMonster;
					let i = 1;
					do {
						try {
							const monster = getMonster(i);
							if (!monster || !monster.metadata || !monster.metadata.name) break;
							
							const name = monster.metadata.name.toLowerCase();
							monsterNamesToGameIds.set(name, i);
						} catch {
							break;
						}
					} while (i++);
					
					// Initialize monsterGameIdsToNames
					monsterGameIdsToNames = new Map();
					for (const [name, id] of monsterNamesToGameIds) {
						monsterGameIdsToNames.set(id, name);
					}
					console.log('Monster maps initialized successfully:', { 
						monsterNamesToGameIdsSize: monsterNamesToGameIds.size,
						monsterGameIdsToNamesSize: monsterGameIdsToNames.size
					});
				} else {
					console.warn('state.utils.getMonster not available yet');
				}
			} catch (error) {
				console.error('Error initializing monster maps:', error);
			}

			// Initialize equipmentNamesToGameIds
			try {
				if (safeAccess(globalThis, 'state.utils.getEquipment')) {
					equipmentNamesToGameIds = new Map();
					const getEquipment = globalThis.state.utils.getEquipment;
					let i = 1;
					do {
						try {
							const equipment = getEquipment(i);
							if (!equipment || !equipment.metadata || !equipment.metadata.name) break;
							
							const name = equipment.metadata.name.toLowerCase();
							equipmentNamesToGameIds.set(name, i);
						} catch {
							break;
						}
					} while (i++);
					
					// Initialize equipmentGameIdsToNames
					equipmentGameIdsToNames = new Map();
					for (const [name, id] of equipmentNamesToGameIds) {
						equipmentGameIdsToNames.set(id, name);
					}
					console.log('Equipment maps initialized successfully:', { 
						equipmentNamesToGameIdsSize: equipmentNamesToGameIds.size,
						equipmentGameIdsToNamesSize: equipmentGameIdsToNames.size
					});
				} else {
					console.warn('state.utils.getEquipment not available yet');
				}
			} catch (error) {
				console.error('Error initializing equipment maps:', error);
			}
			
			return {
				mapsInitialized: mapNamesToIds.size > 0 && monsterNamesToGameIds.size > 0 && equipmentNamesToGameIds.size > 0
			};
		};

		// Define the forceSeed function and expose to window
		const forceSeed = (seed) => {
			try {
				if (!safeAccess(globalThis, 'state.board.send')) {
					console.warn('state.board.send not available yet');
					return false;
				}
				
				globalThis.state.board.send({
					type: 'setState',
					fn: (prev) => {
						return {
							...prev,
							customSandboxSeed: seed,
						};
					},
				});
				return true;
			} catch (error) {
				console.error('Error in forceSeed:', error);
				return false;
			}
		};

		// Define the removeSeed function and expose to window
		const removeSeed = () => {
			try {
				if (!safeAccess(globalThis, 'state.board.send')) {
					console.warn('state.board.send not available yet');
					return false;
				}
				
				globalThis.state.board.send({
					type: 'setState',
					fn: (prev) => {
						delete prev.customSandboxSeed;
						// Note: `structuredClone` doesn't work in this case.
						const copy = { ...prev };
						return copy;
					},
				});
				return true;
			} catch (error) {
				console.error('Error in removeSeed:', error);
				return false;
			}
		};

		// Set up the board based on a given config
		const configureBoard = (config) => {
			try {
				if (!config) {
					throw new Error('No config provided.');
				}
				
				// Check if maps are initialized
				if (mapNamesToIds.size === 0 || monsterNamesToGameIds.size === 0 || equipmentNamesToGameIds.size === 0) {
					const result = initializeMaps();
					if (!result.mapsInitialized) {
						console.warn('Maps could not be initialized, configureBoard may not work correctly');
					}
				}
				
				// Enable sandbox mode.
				if (!safeAccess(globalThis, 'state.board.send')) {
					console.warn('state.board.send not available yet');
					return false;
				}
				
				globalThis.state.board.send({
					type: 'setPlayMode',
					mode: 'sandbox',
				});
				// Load the relevant map.
				if (!Object.hasOwn(config, 'map')) {
					throw new Error('The config is missing the `map` property.');
				}
				const mapId = mapNamesToIds.get(config.map);
				if (!mapId) {
					throw new Error(`Unknown map name: ${config.map}`);
				}
				
				globalThis.state.board.send({
					type: 'selectRoomById',
					roomId: mapId,
				});
				
				// Set up the pieces.
				const playerTeamConfig = config.board.map((piece, index) => {
					const monster = piece.monster;
					const monsterGameId = monsterNamesToGameIds.get(monster.name);
					if (!monsterGameId) {
						console.warn(`Unknown monster name: ${monster.name}`);
					}
					
					const pieceConfig = {
						type: 'custom',
						nickname: null,
						tileIndex: piece.tile,
						gameId: monsterGameId,
						tier: 4,
						level: 50,
						genes: {
							hp: monster.hp,
							ad: monster.ad,
							ap: monster.ap,
							armor: monster.armor,
							magicResist: monster.magicResist,
						},
						villain: false,
						key: `fake-monster-${index}`,
						direction: 'south',
					};
					
					const equip = piece.equipment;
					if (equip) {
						const equipGameId = equipmentNamesToGameIds.get(equip.name);
						if (!equipGameId) {
							console.warn(`Unknown equipment name: ${equip.name}`);
						}
						
						pieceConfig.equip = {
							gameId: equipGameId,
							stat: equip.stat,
							tier: equip.tier,
						};
					}
					return pieceConfig;
				});
				
				if (!safeAccess(globalThis, 'state.utils.getBoardMonstersFromRoomId')) {
					console.warn('state.utils.getBoardMonstersFromRoomId not available yet');
					return false;
				}
				
				const enemyTeamConfig = globalThis.state.utils.getBoardMonstersFromRoomId(mapId);
				const boardConfig = [...enemyTeamConfig, ...playerTeamConfig];
				
				globalThis.state.board.send({
					type: 'setState',
					fn: (prev) => {
						return {
							...prev,
							boardConfig: boardConfig,
						};
					},
				});
				return true;
			} catch (error) {
				console.error('Error in configureBoard:', error);
				return false;
			}
		};

		// Define the replay function and expose to window
		const replay = (config) => {
			try {
				// Set up the board.
				const success = configureBoard(config);
				if (!success) return false;
				
				// Force a custom seed if the config specifies one.
				if (Object.hasOwn(config, 'seed')) {
					forceSeed(config.seed);
				}
				return true;
			} catch (error) {
				console.error('Error in replay:', error);
				return false;
			}
		};

		// Helper function to serialize player piece
		const serializePlayerPiece = (piece) => {
			try {
				if (!safeAccess(globalThis, 'state.player.getSnapshot')) {
					console.warn('state.player.getSnapshot not available yet');
					return null;
				}
				
				const playerSnapshot = globalThis.state.player.getSnapshot();
				if (!playerSnapshot || !playerSnapshot.context) {
					console.warn('Player snapshot context not available');
					return null;
				}
				
				const monsters = playerSnapshot.context.monsters;
				const equips = playerSnapshot.context.equips;
				if (!monsters || !equips) {
					console.warn('Player monsters or equips not available');
					return null;
				}
				
				const tile = piece.tileIndex;
				const monster = monsters.find((monster) => monster.id === piece.databaseId);
				if (!monster) {
					console.warn(`Monster with ID ${piece.databaseId} not found`);
					return null;
				}
				
				// Check if we need to initialize monster maps
				if (!monsterGameIdsToNames.has(monster.gameId)) {
					console.warn(`Monster name for game ID ${monster.gameId} not found, attempting to reinitialize maps`);
					initializeMaps();
					
					// Check again after initialization
					if (!monsterGameIdsToNames.has(monster.gameId)) {
						console.warn(`Monster name for game ID ${monster.gameId} still not found after reinitialization`);
						return null;
					}
				}
				
				const monsterName = monsterGameIdsToNames.get(monster.gameId);
				
				const equipId = piece.equipId ?? monster.equipId;
				const equip = equips.find((equip) => equip.id === equipId);
				if (!equip) {
					console.warn(`Equipment with ID ${equipId} not found`);
					return null;
				}
				
				// Check if we need to initialize equipment maps
				if (!equipmentGameIdsToNames.has(equip.gameId)) {
					console.warn(`Equipment name for game ID ${equip.gameId} not found, attempting to reinitialize maps`);
					initializeMaps();
					
					// Check again after initialization
					if (!equipmentGameIdsToNames.has(equip.gameId)) {
						console.warn(`Equipment name for game ID ${equip.gameId} still not found after reinitialization`);
						return null;
					}
				}
				
				const equipName = equipmentGameIdsToNames.get(equip.gameId);
				
				const serialized = {
					tile: tile,
					monster: {
						name: monsterName,
						// Match the in-game UI order.
						hp: monster.hp,
						ad: monster.ad,
						ap: monster.ap,
						armor: monster.armor,
						magicResist: monster.magicResist,
					},
					equipment: {
						name: equipName,
						stat: equip.stat,
						tier: equip.tier,
					},
				};
				return serialized;
			} catch (error) {
				console.error('Error in serializePlayerPiece:', error);
				return null;
			}
		};

		// Helper function to serialize custom piece
		const serializeCustomPiece = (piece) => {
			try {
				// Check if we need to initialize monster maps
				if (!monsterGameIdsToNames.has(piece.gameId)) {
					console.warn(`Monster name for game ID ${piece.gameId} not found, attempting to reinitialize maps`);
					initializeMaps();
					
					// Check again after initialization
					if (!monsterGameIdsToNames.has(piece.gameId)) {
						console.warn(`Monster name for game ID ${piece.gameId} still not found after reinitialization`);
						return null;
					}
				}
				
				const monsterName = monsterGameIdsToNames.get(piece.gameId);
				
				if (!piece.equip || !piece.equip.gameId) {
					console.warn('Piece has no equipment information');
					return null;
				}
				
				// Check if we need to initialize equipment maps
				if (!equipmentGameIdsToNames.has(piece.equip.gameId)) {
					console.warn(`Equipment name for game ID ${piece.equip.gameId} not found, attempting to reinitialize maps`);
					initializeMaps();
					
					// Check again after initialization
					if (!equipmentGameIdsToNames.has(piece.equip.gameId)) {
						console.warn(`Equipment name for game ID ${piece.equip.gameId} still not found after reinitialization`);
						return null;
					}
				}
				
				const equipName = equipmentGameIdsToNames.get(piece.equip.gameId);
				
				const serialized = {
					tile: piece.tileIndex,
					monster: {
						name: monsterName,
						// Match the in-game UI order.
						hp: piece.genes.hp,
						ad: piece.genes.ad,
						ap: piece.genes.ap,
						armor: piece.genes.armor,
						magicResist: piece.genes.magicResist,
					},
					equipment: {
						name: equipName,
						stat: piece.equip.stat,
						tier: piece.equip.tier,
					},
				};
				return serialized;
			} catch (error) {
				console.error('Error in serializeCustomPiece:', error);
				return null;
			}
		};

		// Serialize the player-added pieces on the board as JSON
		const serializeBoard = () => {
			try {
				// Check if maps are initialized
				if (mapIdsToNames.size === 0 || monsterGameIdsToNames.size === 0 || equipmentGameIdsToNames.size === 0) {
					console.log('Maps not initialized, attempting to initialize before serializing board');
					const result = initializeMaps();
					if (!result.mapsInitialized) {
						console.warn('Maps could not be initialized, serializeBoard may not work correctly');
					}
				}
				
				if (!safeAccess(globalThis, 'state.board.getSnapshot')) {
					console.warn('state.board.getSnapshot not available yet');
					return '{}';
				}
				
				const boardSnapshot = globalThis.state.board.getSnapshot();
				if (!boardSnapshot || !boardSnapshot.context) {
					console.warn('Board snapshot context not available');
					return '{}';
				}
				
				const boardContext = boardSnapshot.context;
				const boardConfig = boardContext.boardConfig;
				if (!boardConfig) {
					console.warn('Board config not available');
					return '{}';
				}
				
				const board = [];
				for (const piece of boardConfig) {
					if (piece.type === 'player') {
						const serialized = serializePlayerPiece(piece);
						if (serialized) board.push(serialized);
					} else if (piece.type === 'custom') {
						const serialized = serializeCustomPiece(piece);
						if (serialized) board.push(serialized);
					}
				}
				
				board.sort((a, b) => a.tile - b.tile);
				
				const selectedMap = boardContext.selectedMap;
				if (!selectedMap || !selectedMap.selectedRegion || !selectedMap.selectedRoom) {
					console.warn('Selected map information not available');
					return '{}';
				}
				
				const regionId = selectedMap.selectedRegion.id;
				const regionName = regionIdsToNames.get(regionId);
				if (!regionName) {
					console.warn(`Region name for ID ${regionId} not found`);
					return '{}';
				}
				
				const mapId = selectedMap.selectedRoom.id;
				
				// Check if we need to initialize map ID to name mapping
				if (!mapIdsToNames.has(mapId)) {
					console.warn(`Map name for ID ${mapId} not found, attempting to reinitialize maps`);
					initializeMaps();
					
					// Check again after initialization
					if (!mapIdsToNames.has(mapId)) {
						console.warn(`Map name for ID ${mapId} still not found after reinitialization`);
						return '{}';
					}
				}
				
				const mapName = mapIdsToNames.get(mapId);
				
				const result = {
					region: regionName,
					map: mapName,
					board: board,
				};
				return JSON.stringify(result);
			} catch (error) {
				console.error('Error in serializeBoard:', error);
				return '{}';
			}
		};

		// Set up periodic map initialization attempts
		const setupMapInitialization = () => {
			// Try to initialize maps immediately
			const initialResult = initializeMaps();
			
			if (!initialResult.mapsInitialized) {
				console.log('Maps not fully initialized on load, setting up retry mechanism');
				
				// Set up a MutationObserver to detect DOM changes that might indicate game state is loaded
				const observer = new MutationObserver((mutations) => {
					if (isStateReady()) {
						console.log('Game state detected as ready, initializing maps');
						const result = initializeMaps();
						if (result.mapsInitialized) {
							console.log('Maps successfully initialized after state became ready');
							observer.disconnect();
						}
					}
				});
				
				// Start observing the document with the configured parameters
				observer.observe(document.body, { childList: true, subtree: true });
				
				// Also set up a periodic check as a fallback
				let attempts = 0;
				const maxAttempts = 10;
				const checkInterval = setInterval(() => {
					attempts++;
					if (attempts >= maxAttempts) {
						console.log(`Reached max ${maxAttempts} attempts for map initialization, stopping automatic retries`);
						clearInterval(checkInterval);
						return;
					}
					
					if (isStateReady()) {
						console.log(`Attempt ${attempts}: Game state ready, initializing maps`);
						const result = initializeMaps();
						if (result.mapsInitialized) {
							console.log('Maps successfully initialized, stopping automatic retries');
							clearInterval(checkInterval);
							observer.disconnect();
						}
					} else {
						console.log(`Attempt ${attempts}: Game state not ready yet`);
					}
				}, 3000); // Check every 3 seconds
			}
		};

		// Create utility functions object with maps
		const maps = {
			regionNamesToIds,
			regionIdsToNames,
			mapNamesToIds,
			mapIdsToNames,
			monsterNamesToGameIds,
			monsterGameIdsToNames,
			equipmentNamesToGameIds,
			equipmentGameIdsToNames
		};

		const utilityFunctions = {
			serializeBoard,
			replay,
			forceSeed,
			removeSeed,
			configureBoard,
			initializeMaps,
			maps
		};

		// Expose all functions and maps to the window object for backward compatibility
		window.$serializeBoard = serializeBoard;
		window.$replay = replay;
		window.$forceSeed = forceSeed;
		window.$removeSeed = removeSeed;
		window.$configureBoard = configureBoard;
		window.$initializeMaps = initializeMaps; // Add this for manual reinitialization

		// Expose the maps to window for backward compatibility
		window.regionNamesToIds = regionNamesToIds;
		window.regionIdsToNames = regionIdsToNames;
		window.mapNamesToIds = mapNamesToIds;
		window.mapIdsToNames = mapIdsToNames;
		window.monsterNamesToGameIds = monsterNamesToGameIds;
		window.monsterGameIdsToNames = monsterGameIdsToNames;
		window.equipmentNamesToGameIds = equipmentNamesToGameIds;
		window.equipmentGameIdsToNames = equipmentGameIdsToNames;

		// Start map initialization process
		setupMapInitialization();

		// Dispatch a message for the client.js to pick up
		// This is the preferred way since client.js already has code to handle this
		document.dispatchEvent(new CustomEvent('utility-functions-loaded'));
		
		// Also post a message for components that might be listening
		window.postMessage({
			from: 'BA_SANDBOX_UTILS',
			type: 'UTILITY_FUNCTIONS_LOADED',
			functions: ['$serializeBoard', '$replay', '$forceSeed', '$removeSeed', '$configureBoard', '$initializeMaps']
		}, '*');

		// Notify that the utility functions are loaded
		console.log('BA Sandbox Utils loaded successfully:', {
			hasSerializeBoard: typeof window.$serializeBoard === 'function',
			hasReplay: typeof window.$replay === 'function',
			hasForceSeed: typeof window.$forceSeed === 'function',
			hasRemoveSeed: typeof window.$removeSeed === 'function',
			hasConfigureBoard: typeof window.$configureBoard === 'function',
			hasInitializeMaps: typeof window.$initializeMaps === 'function'
		});
	} catch (error) {
		console.error('Fatal error loading BA Sandbox Utils:', error);
	}
})();
