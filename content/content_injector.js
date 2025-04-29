// Content Script Injector for Bestiary Arena Mod Loader
console.log('Content Script Injector initializing...');

// Guarda a URL base para os mods
const modsBaseUrl = chrome.runtime.getURL('mods/');
console.log('Mods base URL:', modsBaseUrl);

// Injeção do script principal na página
function injectScript(filePath) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(filePath);
    script.type = 'text/javascript';
    script.onload = function() {
      console.log(`Script ${filePath} injected and loaded`);
      resolve();
    };
    script.onerror = function(error) {
      console.error(`Error loading script ${filePath}:`, error);
      resolve(); // Resolve anyway to continue the chain
    };
    (document.head || document.documentElement).appendChild(script);
    console.log(`Script ${filePath} injection started`);
  });
}

// Scripts to load in order
async function loadScripts() {
  try {
    // First load client.js which sets up the API
    await injectScript('content/client.js');
    console.log('Client script loaded, waiting for API initialization...');
    
    // Short delay to ensure API is ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Then load local_mods.js
    await injectScript('content/local_mods.js');
    console.log('Local mods script loaded');
    
    // Send mod base URL after scripts are loaded
    window.postMessage({
      from: 'BESTIARY_EXTENSION',
      modBaseUrl: modsBaseUrl
    }, '*');
    
    console.log('All scripts loaded and mod base URL sent');
  } catch (error) {
    console.error('Error loading scripts:', error);
  }
}

// Ponte de comunicação entre a página e a extensão
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  // Mensagens do script na página para a extensão
  if (event.data && event.data.from === 'BESTIARY_CLIENT') {
    console.log('Received message from page script:', event.data);
    
    if (event.data.message && event.data.message.action === 'registerLocalMods') {
      // Encaminha para o background script
      chrome.runtime.sendMessage(event.data.message, response => {
        console.log('Register mods response:', response);
        
        // Encaminha a resposta de volta para a página
        window.postMessage({
          from: 'BESTIARY_EXTENSION',
          message: {
            action: 'registerLocalMods',
            mods: response?.mods || []
          }
        }, '*');
      });
    }
    
    if (event.data.message && event.data.message.action === 'getLocalModConfig') {
      // Obtém a configuração do mod
      chrome.runtime.sendMessage(event.data.message, response => {
        console.log('Get mod config response:', response);
        
        // Encaminha a configuração para a página
        window.postMessage({
          from: 'BESTIARY_EXTENSION',
          id: event.data.id,
          response: {
            success: !!response?.success,
            config: response?.config || {}
          }
        }, '*');
      });
    }
  }
});

// Inicialização
console.log('Starting script injection sequence...');
loadScripts();

// Escuta mensagens do background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'executeLocalMod') {
    // Encaminha para o script na página
    window.postMessage({
      from: 'BESTIARY_EXTENSION',
      message: message
    }, '*');
    
    sendResponse({success: true});
  }
  
  return true; // Indica que podemos responder assincronamente
});

console.log('Content Script Injector setup complete'); 