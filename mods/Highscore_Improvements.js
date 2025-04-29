// DOM Improved Highscore mod for Bestiary Arena
console.log('Improved Highscore Mod initializing...');

// Create the Highscore button using the API
if (api) {
  console.log('BestiaryModAPI available in Improved Highscore Mod');
  
  // Create button to show highscore modal
  window.highscoreButton = api.ui.addButton({
    id: 'highscore-button',
    text: 'Highscore Improvements',
    tooltip: 'Show potential tick improvements',
    primary: false,
    onClick: showImprovementsModal
  });
  
  console.log('Highscore improvement button added');
} else {
  console.error('BestiaryModAPI not available in Improved Highscore Mod');
}

// Map of room codes to names
let ROOM_NAMES;

// Helper function to fetch data from TRPC API
async function fetchTRPC(method) {
  try {
    const inp = encodeURIComponent(JSON.stringify({ 0: { json: null, meta: { values: ["undefined"] } } }));
    const res = await fetch(`/pt/api/trpc/${method}?batch=1&input=${inp}`, {
      headers: { 
        'Accept': '*/*', 
        'Content-Type': 'application/json', 
        'X-Game-Version': '1' 
      }
    });
    
    if (!res.ok) {
      throw new Error(`${method} → ${res.status}`);
    }
    
    const json = await res.json();
    return json[0].result.data.json;
  } catch (error) {
    console.error('Error fetching from TRPC:', error);
    throw error;
  }
}

// Helper function to create an item sprite element
function createItemSprite(itemId) {
  // Create the sprite container
  const spriteContainer = document.createElement('div');
  spriteContainer.className = `sprite item relative id-${itemId}`;
  
  // Create the viewport
  const viewport = document.createElement('div');
  viewport.className = 'viewport';
  
  // Create the image
  const img = document.createElement('img');
  img.alt = itemId;
  img.setAttribute('data-cropped', 'false');
  img.className = 'spritesheet';
  img.style.cssText = '--cropX: 0; --cropY: 0';
  
  // Assemble the structure
  viewport.appendChild(img);
  spriteContainer.appendChild(viewport);
  
  return spriteContainer;
}

// Helper function to create HTML content
function createContent(opportunities, total, minTheo, gain) {
  // Create the main content container
  const container = document.createElement('div');
  
  // Create scrollable container using the API
  const scrollContainer = api.ui.components.createScrollContainer({
    height: 264,
    padding: true,
    content: ''
  });
  
  // Add opportunities list
  if (opportunities.length > 0) {
    opportunities.forEach(o => {
      const itemEl = document.createElement('div');
      itemEl.className = 'frame-1 surface-regular flex items-center gap-2 p-1';
      itemEl.innerHTML = `
        <div class="frame-pressed-1 shrink-0" style="width: 48px; height: 48px;">
          <img alt="${o.name}" class="pixelated size-full object-cover" src="/assets/room-thumbnails/${o.code}.png" />
        </div>
        <div class="grid w-full gap-1">
          <div class="text-whiteExp">${o.name}</div>
          <div class="pixel-font-14">Your ${o.yours} → Top ${o.best}</div>
          <div class="pixel-font-14" style="color: #8f8;">+${o.diff} ticks (${o.pct}%)</div>
          <div class="pixel-font-14" style="font-size: 11px; color: #ccc;">by ${o.player}</div>
        </div>
      `;
      scrollContainer.addContent(itemEl);
    });
  } else {
    const emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'text-align: center; color: #eee; padding: 20px;';
    emptyEl.textContent = 'You are already at the top in all rooms!';
    scrollContainer.addContent(emptyEl);
  }
  
  // Add the scroll container to the main container
  container.appendChild(scrollContainer.element);
  
  // Add separator
  const separator = document.createElement('div');
  separator.setAttribute('role', 'none');
  separator.className = 'separator my-2.5';
  container.appendChild(separator);
  
  // Add stats footer
  const statsContainer = document.createElement('div');
  statsContainer.className = 'frame-pressed-1 surface-dark p-2 pixel-font-14';
  statsContainer.innerHTML = `
    <div>Total: ${total}</div>
    <div>Theoretical minimum: ${minTheo}</div>
    <div>Possible gain: ${gain} ticks</div>
  `;
  container.appendChild(statsContainer);
  
  return container;
}

// Function to show improvement opportunities modal
async function showImprovementsModal() {
  console.log('Showing improvement opportunities modal...');
  
  try {
    ROOM_NAMES = globalThis.state.utils.ROOM_NAME;
    
    // Show loading modal
    const loadingModal = api.showModal({
      title: '🏆 Improvement Opportunities',
      content: '<div style="text-align: center; padding: 20px;">Loading data...</div>',
      buttons: []
    });
    
    // Get player context and fetch highscores data
    const ctx = globalThis.state.player.getSnapshot().context;
    const rooms = ctx.rooms;
    const you = ctx.userId;
    
    // Fetch data from API
    const [best, lbs] = await Promise.all([
      fetchTRPC('game.getTickHighscores'),
      fetchTRPC('game.getTickLeaderboards')
    ]);
    
    // Process opportunities
    const opportunities = Object.entries(rooms).flatMap(([code, r]) => {
      const b = best[code];
      if (!b) return [];
      const d = r.ticks - b.ticks;
      if (d <= 0 || b.userId === you) return [];
      return [{
        code, 
        name: ROOM_NAMES[code] || code, 
        yours: r.ticks, 
        best: b.ticks, 
        diff: d, 
        pct: ((d / r.ticks) * 100).toFixed(1), 
        player: b.userName
      }];
    }).sort((a, b) => b.diff - a.diff);
    
    // Calculate totals
    const total = Object.values(rooms).reduce((s, r) => s + r.ticks, 0);
    const minTheo = Object.entries(rooms).reduce((s, [c, r]) => 
      s + (best[c] ? Math.min(r.ticks, best[c].ticks) : r.ticks), 0);
    const gain = total - minTheo;
    
    // Close loading modal
    loadingModal();
    
    // Create content using the new function
    const contentElement = createContent(opportunities, total, minTheo, gain);
    
    // Show the new modal
    api.showModal({
      title: '🏆 Improvement Opportunities',
      content: contentElement,
      buttons: [
        {
          text: 'Close',
          primary: true
        }
      ]
    });
    
    console.log('Improvement opportunities modal displayed successfully');
  } catch (error) {
    console.error('Error showing improvement opportunities:', error);
    
    // Show error modal
    api.showModal({
      title: 'Error',
      content: '<p>Failed to load improvement opportunities. Please try again later.</p><p style="color: #999; font-size: 12px;">Error: ' + error.message + '</p>',
      buttons: [
        {
          text: 'OK',
          primary: true
        }
      ]
    });
  }
}

console.log('Improved Highscore Mod initialization complete');

// Export control functions
exports = {
  showImprovements: showImprovementsModal
}; 