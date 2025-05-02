function injectScript(file) {
  console.log(`Injecting script: ${file}`);
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', chrome.runtime.getURL(file));
  script.onload = function() {
    console.log(`Script loaded successfully: ${file}`);
    this.remove();
  };
  script.onerror = function(error) {
    console.error(`Error loading script ${file}:`, error);
  };
  (document.head || document.documentElement).appendChild(script);
  return script; // Return the script element
}

// Directly inject important extension URLs into the page
function injectExtensionURLs() {
  console.log('Injecting extension URLs into page');
  
  // Instead of using inline scripts (which violate CSP), use postMessage
  const extensionBaseUrl = chrome.runtime.getURL('');
  const modsBaseUrl = chrome.runtime.getURL('mods/');
  
  // Send URLs via postMessage which doesn't violate CSP
  window.postMessage({
    from: 'BESTIARY_EXTENSION',
    modBaseUrl: modsBaseUrl,
    extensionBaseUrl: extensionBaseUrl,
    action: 'setExtensionURLs'
  }, '*');
  
  console.log('Extension URLs sent via postMessage');
}

let clientInjected = false;
let localModsInjected = false;

console.log('Starting script injection sequence...');

// First inject extension URLs directly
injectExtensionURLs();

// Then inject client.js which contains the API
const clientScript = injectScript('content/client.js');
clientScript.onload = function() {
  clientInjected = true;
  console.log('Client script loaded, waiting briefly for API initialization...');
  
  // Inject again to ensure URLs are available
  injectExtensionURLs();
  
  // Wait a short time to ensure API is ready
  setTimeout(() => {
    // Then inject local_mods.js to set up local mods
    const localModsScript = injectScript('content/local_mods.js');
    localModsScript.onload = function() {
      localModsInjected = true;
      console.log('Local mods script loaded');
      
      // Inject URLs once more after both scripts are loaded
      injectExtensionURLs();
      
      // Let the background script know we're ready for mods
      chrome.runtime.sendMessage({ action: 'contentScriptReady' }, function(response) {
        console.log('Background script notified that content script is ready');
      });
    };
  }, 500);
};

console.log('Bestiary Arena Mod Loader - Injection sequence initiated');

window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  if (!event.data || !event.data.from || event.data.from !== 'BESTIARY_CLIENT') return;
  
  console.log('Injector received message from client:', event.data);
  const message = event.data.message;
  
  if (message.action) {
    chrome.runtime.sendMessage(message, function(response) {
      console.log('Received response from background script:', response);
      window.postMessage({
        from: 'BESTIARY_EXTENSION',
        id: event.data.id,
        response
      }, '*');
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Injector received message from extension:', message);
  
  if (message.action === 'checkAPI') {
    console.log('Checking if BestiaryModAPI is available...');
    
    // Use postMessage instead of inline script to work around CSP
    window.postMessage({
      from: 'BESTIARY_EXTENSION_API_CHECK',
      action: 'checkAPI'
    }, '*');
    
    const listener = function(event) {
      if (event.source !== window) return;
      if (!event.data || event.data.from !== 'BESTIARY_API_CHECK') return;
      
      console.log('API check result:', event.data.result);
      window.removeEventListener('message', listener);
      sendResponse(event.data.result);
    };
    
    window.addEventListener('message', listener);
    
    return true;
  }

  if (message.action === 'loadScripts') {
    console.log('Loading scripts:', message.scripts);
    window.postMessage({
      from: 'BESTIARY_EXTENSION',
      message: {
        action: 'loadScripts',
        scripts: message.scripts
      }
    }, '*');
    
    message.scripts.forEach(script => {
      chrome.runtime.sendMessage({
        action: 'getScript',
        hash: script.hash
      }, function(response) {
        if (response && response.success && response.scriptContent) {
          console.log(`Executing script: ${script.hash}`);
          window.postMessage({
            from: 'BESTIARY_EXTENSION',
            message: {
              action: 'executeScript',
              hash: script.hash,
              scriptContent: response.scriptContent,
              config: script.config
            }
          }, '*');
        } else {
          console.error(`Failed to get script content for ${script.hash}:`, response);
        }
      });
    });
    
    return true;
  }

  if (message.action === 'executeLocalMod') {
    console.log(`Executing local mod: ${message.name}`);
    window.postMessage({
      from: 'BESTIARY_EXTENSION',
      message: {
        action: 'executeLocalMod',
        name: message.name
      }
    }, '*');
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'reloadLocalMods') {
    console.log('Reloading local mods');
    
    // Resend mod base URL first
    const modsBaseUrl = chrome.runtime.getURL('mods/');
    window.postMessage({
      from: 'BESTIARY_EXTENSION',
      modBaseUrl: modsBaseUrl
    }, '*');
    
    // Then send reload message
    window.postMessage({
      from: 'BESTIARY_EXTENSION',
      message: {
        action: 'reloadLocalMods'
      }
    }, '*');
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'registerLocalMods') {
    console.log('Registering local mods:', message.mods);
    window.postMessage({
      from: 'BESTIARY_EXTENSION',
      message: {
        action: 'registerLocalMods',
        mods: message.mods
      }
    }, '*');
    
    sendResponse({ success: true });
    return true;
  }
});

window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  if (!event.data || event.data.from !== 'BESTIARY_EXTENSION') return;
  
  const message = event.data.message;
  
  if (message && message.action === 'executeLocalMod') {
    if (window.localModsAPI && typeof window.localModsAPI.executeLocalMod === 'function') {
      console.log(`Forwarding executeLocalMod to localModsAPI: ${message.name}`);
      window.localModsAPI.executeLocalMod(message.name);
    }
  }
  
  if (message && message.action === 'reloadLocalMods') {
    console.log('Forwarding reloadLocalMods event');
    if (window.localModsAPI) {
      document.dispatchEvent(new CustomEvent('reloadLocalMods'));
    } else {
      console.error('localModsAPI not available for reloading mods');
    }
  }
  
  if (message && message.action === 'registerLocalMods') {
    console.log('Received registerLocalMods in injector');
  }
}); 