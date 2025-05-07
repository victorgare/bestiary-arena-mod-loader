// Polyfill para Firefox/Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Polyfill for Chrome and Firefox WebExtensions
if (typeof window.browser === 'undefined') {
  window.browser = window.chrome;
}

const i18n = window.i18n;

const hashForm = document.getElementById('hash-form');
const hashInput = document.getElementById('hash-input');
const nameInput = document.getElementById('name-input');
const scriptsContainer = document.getElementById('scripts-container');
const localModsContainer = document.getElementById('local-mods-container');
const languageSelect = document.getElementById('language-select');

document.addEventListener('DOMContentLoaded', async () => {
  await i18n.init();
  
  languageSelect.value = i18n.getLocale();
  
  await loadActiveScripts();
  await loadLocalMods();
  
  hashForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const hash = hashInput.value.trim();
    const name = nameInput.value.trim();
    
    if (hash) {
      await addScript(hash, name);
      hashInput.value = '';
      nameInput.value = '';
    }
  });
  
  languageSelect.addEventListener('change', async () => {
    await i18n.setLocale(languageSelect.value);
  });
});

async function loadActiveScripts() {
  try {
    const response = await browserAPI.runtime.sendMessage({ action: 'getActiveScripts' });
    
    if (response.success) {
      renderScripts(response.scripts);
    } else {
      showError(`${i18n.t('messages.errorLoadingScripts')}: ${response.error || i18n.t('messages.unknownError')}`);
    }
  } catch (error) {
    showError(`${i18n.t('messages.errorCommunication')}: ${error.message}`);
  }
}

// Track whether we're currently loading mods to prevent loops
let isLoadingMods = false;

async function loadLocalMods() {
  if (isLoadingMods) return; // Prevent recursive calls
  
  isLoadingMods = true;
  try {
    const response = await browserAPI.runtime.sendMessage({ action: 'getLocalMods' });
    
    if (response && response.success) {
      renderLocalMods(response.mods);
    } else {
      const errorMsg = response ? response.error || 'Unknown error' : 'No response from background script';
      showError('Erro ao carregar mods locais: ' + errorMsg);
    }
  } catch (error) {
    showError('Erro ao comunicar com a extensão: ' + error.message);
  } finally {
    isLoadingMods = false;
  }
}

function renderLocalMods(mods) {
  localModsContainer.innerHTML = '';
  
  if (!mods || mods.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = i18n.t('messages.noLocalMods');
    localModsContainer.appendChild(emptyMessage);
    return;
  }
  
  mods.forEach(mod => {
    const modCard = document.createElement('div');
    modCard.className = 'script-card local-mod-card';
    modCard.dataset.name = mod.name;
    
    const modHeader = document.createElement('div');
    modHeader.className = 'script-header';
    
    const modTitle = document.createElement('div');
    modTitle.className = 'script-title';
    modTitle.textContent = mod.displayName || mod.name;
    
    modHeader.appendChild(modTitle);
    modCard.appendChild(modHeader);
    
    const modControls = document.createElement('div');
    modControls.className = 'script-controls';
    
    const modToggle = document.createElement('div');
    modToggle.className = 'script-toggle';
    
    const toggleLabel = document.createElement('span');
    toggleLabel.textContent = i18n.t('controls.active');
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = mod.enabled;
    toggleInput.addEventListener('change', () => {
      toggleLocalMod(mod.name, toggleInput.checked);
    });
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(slider);
    
    modToggle.appendChild(toggleLabel);
    modToggle.appendChild(toggleSwitch);
    
    modControls.appendChild(modToggle);
    modCard.appendChild(modControls);
    
    const executeButton = document.createElement('button');
    executeButton.className = 'primary-button button-small';
    executeButton.textContent = i18n.t('controls.execute');
    executeButton.addEventListener('click', () => {
      executeLocalMod(mod.name);
    });
    
    modControls.appendChild(executeButton);
    
    localModsContainer.appendChild(modCard);
  });
}

function renderScripts(scripts) {
  scriptsContainer.innerHTML = '';
  
  if (!scripts || scripts.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = i18n.t('messages.noScripts');
    scriptsContainer.appendChild(emptyMessage);
    return;
  }
  
  scripts.forEach(script => {
    const scriptCard = document.createElement('div');
    scriptCard.className = 'script-card';
    scriptCard.dataset.hash = script.hash;
    
    const scriptHeader = document.createElement('div');
    scriptHeader.className = 'script-header';
    
    const scriptTitle = document.createElement('div');
    scriptTitle.className = 'script-title';
    scriptTitle.textContent = script.name || `Script ${script.hash.substring(0, 8)}`;
    
    scriptHeader.appendChild(scriptTitle);
    scriptCard.appendChild(scriptHeader);
    
    const scriptHash = document.createElement('div');
    scriptHash.className = 'script-hash';
    scriptHash.textContent = script.hash;
    scriptCard.appendChild(scriptHash);
    
    const scriptControls = document.createElement('div');
    scriptControls.className = 'script-controls';
    
    const scriptToggle = document.createElement('div');
    scriptToggle.className = 'script-toggle';
    
    const toggleLabel = document.createElement('span');
    toggleLabel.textContent = i18n.t('controls.active');
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = script.enabled;
    toggleInput.addEventListener('change', () => {
      toggleScript(script.hash, toggleInput.checked);
    });
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(slider);
    
    scriptToggle.appendChild(toggleLabel);
    scriptToggle.appendChild(toggleSwitch);
    
    const scriptActions = document.createElement('div');
    scriptActions.className = 'script-actions';
    
    const executeButton = document.createElement('button');
    executeButton.className = 'primary-button button-small';
    executeButton.textContent = i18n.t('controls.execute');
    executeButton.addEventListener('click', () => {
      executeScript(script.hash);
    });
    
    const editButton = document.createElement('button');
    editButton.className = 'secondary-button button-small';
    editButton.textContent = i18n.t('controls.edit');
    editButton.addEventListener('click', () => {
      toggleConfigPanel(scriptCard, script);
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'danger-button button-small';
    deleteButton.textContent = i18n.t('controls.remove');
    deleteButton.addEventListener('click', () => {
      removeScript(script.hash);
    });
    
    scriptActions.appendChild(executeButton);
    scriptActions.appendChild(editButton);
    scriptActions.appendChild(deleteButton);
    
    scriptControls.appendChild(scriptToggle);
    scriptControls.appendChild(scriptActions);
    
    scriptCard.appendChild(scriptControls);
    
    scriptsContainer.appendChild(scriptCard);
  });
}

function toggleConfigPanel(scriptCard, script) {
  document.querySelectorAll('.script-config').forEach(panel => {
    panel.remove();
  });
  
  const existingConfig = scriptCard.querySelector('.script-config');
  
  if (existingConfig) {
    existingConfig.remove();
    return;
  }
  
  const configPanel = document.createElement('div');
  configPanel.className = 'script-config';
  
  const nameField = document.createElement('div');
  nameField.className = 'config-field';
  
  const nameLabel = document.createElement('label');
  nameLabel.textContent = i18n.t('form.nameLabel');
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = script.name || '';
  nameInput.placeholder = i18n.t('form.namePlaceholder');
  
  nameField.appendChild(nameLabel);
  nameField.appendChild(nameInput);
  configPanel.appendChild(nameField);
  
  const actionButtons = document.createElement('div');
  actionButtons.className = 'script-actions';
  
  const saveButton = document.createElement('button');
  saveButton.className = 'primary-button button-small';
  saveButton.textContent = i18n.t('controls.save');
  saveButton.addEventListener('click', () => {
    updateScriptConfig(script.hash, {
      name: nameInput.value.trim()
    });
    configPanel.remove();
  });
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'secondary-button button-small';
  cancelButton.textContent = i18n.t('controls.cancel');
  cancelButton.addEventListener('click', () => {
    configPanel.remove();
  });
  
  actionButtons.appendChild(saveButton);
  actionButtons.appendChild(cancelButton);
  configPanel.appendChild(actionButtons);
  
  scriptCard.appendChild(configPanel);
}

async function addScript(hash, name) {
  try {
    const response = await browserAPI.runtime.sendMessage({
      action: 'registerScript',
      hash,
      name
    });
    
    if (response && response.success) {
      loadActiveScripts();
      return true;
    } else {
      const errorMsg = response ? response.error || 'Unknown error' : 'No response from background script';
      showError('Erro ao adicionar script: ' + errorMsg);
      return false;
    }
  } catch (error) {
    showError('Erro ao comunicar com a extensão: ' + error.message);
    return false;
  }
}

async function toggleScript(hash, enabled) {
  try {
    const response = await browserAPI.runtime.sendMessage({
      action: 'toggleScript',
      hash,
      enabled
    });
    
    if (!response.success) {
      showError(response.error || i18n.t('messages.unknownError'));
      loadActiveScripts();
    }
  } catch (error) {
    showError(`${i18n.t('messages.errorCommunication')}: ${error.message}`);
    loadActiveScripts();
  }
}

async function toggleLocalMod(name, enabled) {
  try {
    const response = await browserAPI.runtime.sendMessage({
      action: 'toggleLocalMod',
      name,
      enabled
    });
    
    if (!response.success) {
      showError(response.error || i18n.t('messages.unknownError'));
      loadLocalMods();
    }
  } catch (error) {
    showError(`${i18n.t('messages.errorCommunication')}: ${error.message}`);
    loadLocalMods();
  }
}

async function executeLocalMod(name) {
  try {
    const response = await browserAPI.runtime.sendMessage({
      action: 'executeLocalMod',
      name
    });
    
    if (!response.success) {
      showError(response.error || i18n.t('messages.unknownError'));
    }
  } catch (error) {
    showError(`${i18n.t('messages.errorCommunication')}: ${error.message}`);
  }
}

async function executeScript(hash) {
  try {
    const response = await browserAPI.runtime.sendMessage({
      action: 'executeScript',
      hash
    });
    
    if (!response.success) {
      showError(response.error || i18n.t('messages.unknownError'));
    }
  } catch (error) {
    showError(`${i18n.t('messages.errorCommunication')}: ${error.message}`);
  }
}

async function updateScriptConfig(hash, config) {
  try {
    const response = await browserAPI.runtime.sendMessage({
      action: 'updateScriptConfig',
      hash,
      config
    });
    
    if (response.success) {
      loadActiveScripts();
    } else {
      showError(response.error || i18n.t('messages.unknownError'));
    }
  } catch (error) {
    showError(`${i18n.t('messages.errorCommunication')}: ${error.message}`);
  }
}

async function removeScript(hash) {
  try {
    const response = await browserAPI.runtime.sendMessage({
      action: 'removeScript',
      hash
    });
    
    if (response.success) {
      loadActiveScripts();
    } else {
      showError(response.error || i18n.t('messages.unknownError'));
    }
  } catch (error) {
    showError(`${i18n.t('messages.errorCommunication')}: ${error.message}`);
  }
}

function showError(message) {
  alert(message);
}

browserAPI.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.activeScripts) {
      loadActiveScripts();
    }
    if (changes.localMods && !isLoadingMods) {
      // Only reload local mods if we're not already in the process of loading them
      loadLocalMods();
    }
    if (changes.locale) {
      languageSelect.value = changes.locale.newValue;
      i18n.setLocale(changes.locale.newValue);
    }
  }
});

document.getElementById('reload-mods-btn')?.addEventListener('click', async () => {
  await loadLocalMods();
  
  browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      browserAPI.tabs.sendMessage(tabs[0].id, { action: 'reloadLocalMods' });
    }
  });
});

document.getElementById('check-api-btn')?.addEventListener('click', () => {
  browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      browserAPI.tabs.sendMessage(tabs[0].id, { action: 'checkAPI' }, (response) => {
        if (browserAPI.runtime.lastError) {
          showError('Error checking API: ' + browserAPI.runtime.lastError.message);
          return;
        }
        
        if (response && response.success) {
          alert(`API is available! Methods: ${response.methods.join(', ')}`);
        } else {
          alert('API is not available in the active tab');
        }
      });
    } else {
      showError('No active tab found');
    }
  });
});

document.getElementById('log-storage-btn')?.addEventListener('click', async () => {
  try {
    const localData = await browserAPI.storage.local.get(null);
    const syncData = await browserAPI.storage.sync.get(null);
    
    alert('Storage contents logged to console');
  } catch (error) {
    showError('Error accessing storage: ' + error.message);
  }
});