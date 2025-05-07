// Custom Display Mod for Bestiary Arena
console.log("Custom Sandbox improvement initializing...");

// Configuration
const defaultConfig = {
  enabled: false,
  unsubscribe: () => console.log("nothing to unsub"),
};

/// constants
const MOD_ID = "sandbox-improvements";
const SANDBOX_TOGGLE_ID = `${MOD_ID}-sandbox-toggle`;
const STATES = {
  initial: "initial",
};

// Translations
const TRANSLATIONS = {
  en: {
    modName: "sandbox-improvements",
    sandboxButtonText: "Sandbox",
  },
  pt: {
    modName: "Melhorias Sandbox",
    sandboxButtonText: "Sandbox",
  },
};

// Get translation based on current locale
function t(key) {
  const locale = config.currentLocale;
  const translations = TRANSLATIONS[locale] || TRANSLATIONS.en;
  return translations[key] || key;
}

// toggle sandbox no/off
function toggleSandbox() {
  defaultConfig.enabled = !defaultConfig.enabled;

  if (defaultConfig.enabled) {
    globalThis.state.board.send({ type: "setPlayMode", mode: "sandbox" });

    // sub to sandbox event
    const { unsubscribe } = globalThis.state.gameTimer.subscribe(gamerTimerSub);

    defaultConfig.unsubscribe = unsubscribe;
  } else {
    defaultConfig.unsubscribe();
    globalThis.state.board.send({ type: "setPlayMode", mode: "manual" });
  }

  updateSandboxButton();
}

function gamerTimerSub(data) {
  const { currentTick, state, rankPoints } = data.context;
  const container = document.querySelector(
    "div.flex.flex-col.items-end.overflow-hidden"
  );

  setTickers(container, currentTick);
  if (state !== STATES.initial) {
    setPoints(container, rankPoints);
  }
}

function setTickers(container, ticks) {
  const id = "spanTicks";
  const spanTicks = `<span id="${id}" class="relative pixel-font-16 text-valid" translate="no" style="line-height: 1; font-size: 32px;">
                      ${ticks} ticks
                    </span>`;

  addOrReplaceElement(container, id, spanTicks);
}

function addOrReplaceElement(container, id, elementString) {
  const currentElement = document.getElementById(id);
  if (currentElement) {
    currentElement.innerHTML = elementString;
  } else {
    container.appendChild(createElement(elementString));
  }
}

function setPoints(container, points) {
  const id = "spanPts";
  const spanPoints = `<span id="${id}" class="relative -mb-1.5 mr-1 duration-300 animate-in fade-in slide-in-from-right pixel-font-16 text-holy" translate="no" style="line-height: 1; font-size: 32px;">
                        ${points} pts
                      </span>`;

  addOrReplaceElement(container, id, spanPoints);
}

const createElement = (str) => {
  const el = document.createElement("div");
  el.innerHTML = str;
  return el.firstElementChild;
};

function updateSandboxButton() {
  api.ui.updateButton(SANDBOX_TOGGLE_ID, {
    text: t("sandboxButtonText"),
    primary: defaultConfig.enabled,
  });
}

// Add the performance mode toggle button
api.ui.addButton({
  id: SANDBOX_TOGGLE_ID,
  text: t("sandboxButtonText"),
  modId: MOD_ID,
  primary: config.enabled,
  onClick: toggleSandbox,
});

console.log("Custom Display UI initialized");
