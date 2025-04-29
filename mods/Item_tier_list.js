// DOM Item Tier List mod for Bestiary Arena
console.log('Item Tier List Pretty Mod initializing...');

// Create the Tier List button using the API
if (api) {
  console.log('BestiaryModAPI available in Item Tier List Pretty Mod');
  
  // Create button to show tier list modal
  window.tierListButton = api.ui.addButton({
    id: 'item-tier-list-button',
    text: 'Item Tier List',
    tooltip: 'Show item usage tier list',
    primary: false,
    onClick: showItemTierListModal
  });
  
  console.log('Item Tier List button added');
} else {
  console.error('BestiaryModAPI not available in Item Tier List Pretty Mod');
}

// Function to show tier list modal
function showItemTierListModal() {
  console.log('Showing item tier list modal...');
  
  try {
    const { equips, boardConfigs } = globalThis.state.player.getSnapshot().context;
    const equipLookup = new Map(equips.map(m => [m.id, m.gameId]));
    const countMap = new Map();

    Object.values(boardConfigs).forEach(cfgs =>
      cfgs.forEach(({ equipId }) => {
        if (equipId != null) {
          const gid = equipLookup.get(equipId);
          if (gid != null) countMap.set(gid, (countMap.get(gid) || 0) + 1);
        }
      })
    );

    const total = Array.from(countMap.values()).reduce((a, b) => a + b, 0);
    const list = Array.from(countMap.entries())
      .map(([gameId, cnt]) => ({
        gameId,
        count: cnt,
        pct: Math.floor((cnt / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const tiers = [
      list.filter(item => item.count >= 10),  // Tier S: 10+
      list.filter(item => item.count >= 6 && item.count <= 9),  // Tier A: 6-9
      list.filter(item => item.count >= 2 && item.count <= 5),  // Tier B: 2-5
      list.filter(item => item.count >= 1 && item.count <= 1),  // Tier C: 1-1
    ];

    const labels = ['S', 'A', 'B', 'C'];
    
    // Create content container for the modal
    const contentContainer = document.createElement('div');
    
    // Create scrollable container for tier list
    const tierListScroll = api.ui.components.createScrollContainer({
      height: 350,
      padding: true,
      content: ''
    });
    
    // Add tiers to the scroll container
    tiers.forEach((chunk, idx) => {
      if (chunk.length === 0) return;
      
      // Create tier header
      const tierHeader = document.createElement('h3');
      tierHeader.textContent = `Tier ${labels[idx] || idx + 1}`;
      tierHeader.style.cssText = 'margin: 8px 0 4px; font-size: 1.2rem; border-bottom: 1px solid #444; padding-bottom: 2px; color: white;';
      
      // Create item container
      const itemContainer = document.createElement('div');
      itemContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;';
      
      // Add item portraits for this tier
      chunk.forEach(({ gameId, count }) => {
        // Get sprite ID from equipment metadata
        let spriteId;
        let equipName = 'Unknown Item';
        try {
          const equipData = globalThis.state.utils.getEquipment(gameId);
          spriteId = equipData.metadata.spriteId;
          equipName = equipData.metadata.name;
        } catch (e) {
          spriteId = '';
        }
        
        const itemWrapper = document.createElement('div');
        itemWrapper.style.cssText = 'position: relative; width: 32px; height: 32px;';
        
        // Get stat information from equips
        const statCounts = { ad: 0, ap: 0, hp: 0 };
        equips.forEach(equip => {
          if (equip.gameId === gameId) {
            statCounts[equip.stat] = (statCounts[equip.stat] || 0) + 1;
          }
        });
        
        // Find most common stat for this item
        const mostUsedStat = Object.entries(statCounts)
          .sort((a, b) => b[1] - a[1])
          .filter(([_, count]) => count > 0)[0]?.[0] || 'ad';
        
        // Use the item portrait component
        const itemPortrait = api.ui.components.createItemPortrait({
          itemId: spriteId,
          stat: mostUsedStat,
          tier: Math.min(5, Math.max(1, Math.ceil(count / 3))), // Scale tier from 1-5 based on count
          onClick: () => {
            // Show item details when clicked
            const contentContainer = document.createElement('div');
            
            // Create wrapper for centering and proper sizing
            const centerContainer = document.createElement('div');
            centerContainer.style.cssText = 'display: flex; justify-content: center; align-items: center; margin-bottom: 20px;';
            
            // Use createFullItem for the item display in modal with small size
            const fullItem = api.ui.components.createFullItem({
              itemId: spriteId,
              stat: mostUsedStat,
              tier: Math.min(5, Math.max(1, Math.ceil(count / 3))),
              animated: false, // Set to true for animated items
              size: 'small' // Use small size for the modal
            });
            
            centerContainer.appendChild(fullItem);
            contentContainer.appendChild(centerContainer);
            
            // Add usage stats
            const statsContainer = document.createElement('div');
            statsContainer.innerHTML = `
              <p>Used ${count} times in your saved configurations.</p>
              <p>Usage percentage: ${Math.floor((count / total) * 100)}%</p>
              <p>Stats distribution:</p>
              <ul>
                <li>Attack Damage (AD): ${statCounts.ad || 0} times</li>
                <li>Ability Power (AP): ${statCounts.ap || 0} times</li>
                <li>Health Points (HP): ${statCounts.hp || 0} times</li>
              </ul>
            `;
            contentContainer.appendChild(statsContainer);
            
            api.ui.components.createModal({
              title: equipName || `Item #${gameId}`,
              width: 300,
              content: contentContainer,
              buttons: [
                {
                  text: 'Close',
                  primary: true
                }
              ]
            });
          }
        });
        
        // Add count badge
        const countBadge = document.createElement('div');
        countBadge.textContent = count;
        countBadge.style.cssText = 'position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 10px; padding: 1px 2px; z-index: 3; border-radius: 2px; line-height: 1;';
        
        itemWrapper.appendChild(itemPortrait);
        itemWrapper.appendChild(countBadge);
        itemContainer.appendChild(itemWrapper);
      });
      
      // Add tier content to the scroll container
      tierListScroll.addContent(tierHeader);
      tierListScroll.addContent(itemContainer);
    });
    
    // Add scroll container to content container
    contentContainer.appendChild(tierListScroll.element);
    
    // Show the modal with the tier list
    api.ui.components.createModal({
      title: 'Item Usage Tier List',
      width: 450,
      content: contentContainer,
      buttons: [
        {
          text: 'Close',
          primary: true
        }
      ]
    });
    
    console.log('Item tier list modal displayed successfully');
  } catch (error) {
    console.error('Error showing item tier list:', error);
    
    api.ui.components.createModal({
      title: 'Error',
      content: '<p>Failed to generate item tier list. Make sure you are in the game and have access to item data.</p>',
      buttons: [
        {
          text: 'OK',
          primary: true
        }
      ]
    });
  }
}

console.log('Item Tier List Mod initialization complete');

// Export control functions
exports = {
  showItemTierList: showItemTierListModal
}; 