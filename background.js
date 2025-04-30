const scriptCache = {};

let localMods = [];

function hashToGistUrl(hash) {
  return `https://gist.githubusercontent.com/raw/${hash}`;
}

async function fetchScript(hash) {
  try {
    const url = hashToGistUrl(hash);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const scriptContent = await response.text();
    
    if (scriptContent.length > 1024 * 1024) {
      throw new Error('Script too large (max 1MB)');
    }
    
    scriptCache[hash] = scriptContent;
    await chrome.storage.local.set({ [`script_${hash}`]: scriptContent });
    
    return scriptContent;
  } catch (error) {
    return null;
  }
}

async function getScript(hash) {
  if (scriptCache[hash]) {
    return scriptCache[hash];
  }
  
  const storedScripts = await chrome.storage.local.get(`script_${hash}`);
  if (storedScripts[`script_${hash}`]) {
    scriptCache[hash] = storedScripts[`script_${hash}`];
    return scriptCache[hash];
  }
  
  return await fetchScript(hash);
}

async function getActiveScripts() {
  const data = await chrome.storage.sync.get('activeScripts');
  return data.activeScripts || [];
}

async function setActiveScripts(activeScripts) {
  await chrome.storage.sync.set({ activeScripts });
}

async function getLocalMods() {
  try {
    // First try to get from sync storage
    const syncData = await chrome.storage.sync.get('localMods');
    
    if (syncData.localMods && syncData.localMods.length > 0) {
      // If found in sync, also update local storage
      await chrome.storage.local.set({ localMods: syncData.localMods });
      return syncData.localMods;
    }
    
    // Fall back to local storage
    const localData = await chrome.storage.local.get('localMods');
    return localData.localMods || [];
  } catch (error) {
    console.error('Error getting local mods:', error);
    return [];
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getScript') {
    getScript(message.hash)
      .then(scriptContent => {
        sendResponse({ success: true, scriptContent });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.action === 'getActiveScripts') {
    getActiveScripts()
      .then(scripts => {
        sendResponse({ success: true, scripts });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.action === 'registerScript') {
    getScript(message.hash)
      .then(scriptContent => {
        if (!scriptContent) {
          sendResponse({ 
            success: false, 
            error: 'Failed to fetch script content. Check the Gist hash and your internet connection.' 
          });
          return;
        }
        
        return getActiveScripts()
          .then(scripts => {
            const existingIndex = scripts.findIndex(s => s.hash === message.hash);
            if (existingIndex !== -1) {
              scripts[existingIndex] = { ...scripts[existingIndex], ...message.config };
            } else {
              scripts.push({
                hash: message.hash,
                name: message.name || `Script ${message.hash.substring(0, 8)}`,
                enabled: true,
                config: message.config || {}
              });
            }
            return setActiveScripts(scripts);
          })
          .then(() => {
            sendResponse({ success: true });
          });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.action === 'toggleScript') {
    getActiveScripts()
      .then(scripts => {
        const script = scripts.find(s => s.hash === message.hash);
        if (script) {
          script.enabled = message.enabled;
          return setActiveScripts(scripts);
        }
        throw new Error('Script not found');
      })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.action === 'updateScriptConfig') {
    getActiveScripts()
      .then(scripts => {
        if (message.hash && message.hash.startsWith('local_')) {
          const localModName = message.hash.replace('local_', '');
          chrome.storage.local.get('localModsConfig', (data) => {
            const configs = data.localModsConfig || {};
            configs[localModName] = message.config;
            chrome.storage.local.set({ localModsConfig: configs });
            
            sendResponse({ success: true });
          });
          return true;
        }
        
        const script = scripts.find(s => s.hash === message.hash);
        if (script) {
          script.config = { ...script.config, ...message.config };
          return setActiveScripts(scripts);
        }
        throw new Error('Script not found');
      })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.action === 'removeScript') {
    getActiveScripts()
      .then(scripts => {
        const newScripts = scripts.filter(s => s.hash !== message.hash);
        return setActiveScripts(newScripts);
      })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.action === 'registerLocalMods') {
    console.log('Background: Registering local mods:', message.mods);
    
    // Get existing mods to preserve enabled states
    getLocalMods().then(existingMods => {
      const newMods = message.mods || [];
      
      // Create a map of existing mod states
      const existingModStates = {};
      existingMods.forEach(mod => {
        existingModStates[mod.name] = mod.enabled;
      });
      
      // Process incoming mods, preserving enabled states from existing mods
      localMods = newMods.map(mod => ({
        name: mod.name,
        displayName: mod.displayName || mod.name,
        isLocal: true,
        // If mod existed before, use its previous enabled state, otherwise default to enabled
        enabled: existingModStates.hasOwnProperty(mod.name) ? existingModStates[mod.name] : true
      }));
      
      console.log('Background: Processed local mods with preserved states:', localMods);
      
      // Save to sync storage first, then to local
      chrome.storage.sync.set({ localMods }, () => {
        chrome.storage.local.set({ localMods }, () => {
          sendResponse({ success: true, mods: localMods });
        });
      });
    });
    
    return true;
  }

  if (message.action === 'executeLocalMod') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'executeLocalMod',
          name: message.name
        });
      }
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'getLocale') {
    getTranslations()
      .then(({ currentLocale, translations }) => {
        sendResponse({ 
          success: true, 
          locale: currentLocale,
          translations: translations
        });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.action === 'setLocale') {
    setLocale(message.locale)
      .then(success => {
        if (success) {
          return getTranslations();
        }
        throw new Error('Failed to set locale');
      })
      .then(({ currentLocale, translations }) => {
        sendResponse({ 
          success: true, 
          locale: currentLocale,
          translations: translations
        });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.action === 'getLocalModConfig') {
    chrome.storage.local.get('localModsConfig', (data) => {
      const configs = data.localModsConfig || {};
      const config = configs[message.modName] || {};
      sendResponse({ success: true, config });
    });
    return true;
  }

  if (message.action === 'toggleLocalMod') {
    chrome.storage.local.get('localMods', (data) => {
      const localMods = data.localMods || [];
      const modIndex = localMods.findIndex(mod => mod.name === message.name);
      
      if (modIndex !== -1) {
        localMods[modIndex].enabled = message.enabled;
        chrome.storage.sync.set({ localMods }, () => {
          chrome.storage.local.set({ localMods }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'registerLocalMods',
                  mods: localMods
                });
              }
            });
            sendResponse({ success: true });
          });
        });
      } else {
        sendResponse({ success: false, error: 'Local mod not found' });
      }
    });
    return true;
  }

  if (message.action === 'getLocalMods') {
    getLocalMods()
      .then(mods => {
        localMods = mods;
        console.log('Background: Returning local mods:', localMods);
        sendResponse({ success: true, mods: localMods });
      })
      .catch(error => {
        console.error('Error fetching local mods:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.action === 'contentScriptReady') {
    console.log('Content script reported ready in tab:', sender.tab.id);
    
    // Send active scripts
    getActiveScripts().then(scripts => {
      const enabledScripts = scripts.filter(s => s.enabled);
      
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'loadScripts',
        scripts: enabledScripts
      });
      
      // Then send and execute local mods with a delay
      setTimeout(() => {
        getLocalMods().then(localMods => {
          console.log(`Sending ${localMods.length} local mods to ready tab:`, 
            localMods.map(m => `${m.name}: ${m.enabled}`));
          
          // Send registration message first
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'registerLocalMods',
            mods: localMods
          });
          
          // Execute enabled mods after a short delay
          setTimeout(() => {
            localMods.filter(mod => mod.enabled).forEach(mod => {
              console.log(`Auto-executing local mod in ready tab: ${mod.name}`);
              chrome.tabs.sendMessage(sender.tab.id, {
                action: 'executeLocalMod',
                name: mod.name
              });
            });
          }, 700);
        });
      }, 500);
    });
    
    sendResponse({ success: true });
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.match(/bestiaryarena\.com/)) {
    console.log(`Tab ${tabId} updated with URL ${tab.url}`);
    
    // Delay slightly to ensure the page has fully loaded
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { action: 'checkAPI' }, response => {
        if (chrome.runtime.lastError) {
          console.log('Content script not functioning, injecting manually:', chrome.runtime.lastError);
          
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/injector.js']
          }).then(() => {
            console.log('Injector script injected');
            
            setTimeout(() => {
              getActiveScripts().then(scripts => {
                const enabledScripts = scripts.filter(s => s.enabled);
                console.log(`Sending ${enabledScripts.length} active scripts to tab ${tabId}`);
                
                chrome.tabs.sendMessage(tabId, {
                  action: 'loadScripts',
                  scripts: enabledScripts
                });

                getLocalMods().then(localMods => {
                  console.log(`Found ${localMods.length} local mods`, localMods);
                  
                  chrome.tabs.sendMessage(tabId, {
                    action: 'registerLocalMods',
                    mods: localMods
                  });
                  
                  // Only execute enabled mods
                  localMods.filter(mod => mod.enabled).forEach(mod => {
                    console.log(`Auto-executing local mod: ${mod.name}`);
                    chrome.tabs.sendMessage(tabId, {
                      action: 'executeLocalMod',
                      name: mod.name
                    });
                  });
                });
              });
            }, 1000);
          }).catch(error => {
            console.error("Error injecting injector script:", error);
          });
        } else {
          console.log('Content script already functioning, loading scripts');
          
          getActiveScripts().then(scripts => {
            const enabledScripts = scripts.filter(s => s.enabled);
            
            chrome.tabs.sendMessage(tabId, {
              action: 'loadScripts',
              scripts: enabledScripts
            });

            getLocalMods().then(localMods => {
              console.log(`Found ${localMods.length} local mods with states:`, 
                localMods.map(m => `${m.name}: ${m.enabled}`));
              
              // Send registration message first
              chrome.tabs.sendMessage(tabId, {
                action: 'registerLocalMods',
                mods: localMods
              });
              
              // Ensure a delay before executing mods
              setTimeout(() => {
                // Only execute enabled mods
                localMods.filter(mod => mod.enabled).forEach(mod => {
                  console.log(`Auto-executing local mod: ${mod.name}`);
                  chrome.tabs.sendMessage(tabId, {
                    action: 'executeLocalMod',
                    name: mod.name
                  });
                });
              }, 500);
            });
          });
        }
      });
    }, 500);
  }
});

async function getTranslations() {
  const localeData = await chrome.storage.local.get('locale');
  const currentLocale = localeData.locale || 'en-US';
  
  const translations = {};
  
  try {
    const enResponse = await fetch(chrome.runtime.getURL('assets/locales/en-US.json'));
    if (enResponse.ok) {
      translations['en-US'] = await enResponse.json();
    }
    
    const ptResponse = await fetch(chrome.runtime.getURL('assets/locales/pt-BR.json'));
    if (ptResponse.ok) {
      translations['pt-BR'] = await ptResponse.json();
    }
  } catch (error) {
    console.error('Error loading translations:', error);
  }
  
  return { currentLocale, translations };
}

async function setLocale(locale) {
  try {
    await chrome.storage.local.set({ locale });
    return true;
  } catch (error) {
    console.error('Error setting locale:', error);
    return false;
  }
} 