# Bestiary Arena Mod Loader

A browser extension that allows loading and managing custom mods for the Bestiary Arena game. This extension provides a framework for creating, loading, and managing mods that can extend the game's functionality.

![Mod Loader in Action](docs/images/loaded_mods_injected.png)

## Features

- **Mod Management**: Load mods from local files or GitHub Gists
- **Configuration System**: Save and manage mod configurations between sessions
- **Standardized UI Components**: Game-styled UI elements for consistency across mods
- **Internationalization**: Built-in translation support for mods
- **Game API Access**: Safe access to game state and functions
- **Developer-Friendly**: Comprehensive documentation and examples

## Installation

1. Clone this repository or download it as a ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the upper right)
4. Click "Load unpacked" and select the directory containing this extension

## Using the Mod Loader

After installing the extension, navigate to [Bestiary Arena](https://bestiaryarena.com/). The extension will automatically inject its code into the game page.

To access the Mod Loader interface, click the extension icon in your browser toolbar.

### Extension Popup Interface

The extension provides a user-friendly popup interface for managing your mods:

| Extension Popup Interface |  |
|-------------|----------------------|
| ![Popup Main Screen](docs/images/popup_screen_1.png) | ![Popup Config Screen](docs/images/popup_screen_2.png) |

The popup interface allows you to enable/disable mods and access configuration options quickly.

### Loading Mods

There are two ways to load mods:

1. **Local Mods**: Place mod JavaScript files in the `mods/` directory and they will be available for loading.
2. **Gist Mods**: Enter a GitHub Gist hash ID in the mod loader interface to load a mod from GitHub.

### Managing Mods

You can enable, disable, and configure mods from the mod loader interface. Each mod can have its own configuration settings, which are saved between sessions.

## Mod Development

Mods can be written in JavaScript and have access to the game's state and a powerful API for interacting with the game. See the [Mod Development Guide](docs/mod_development_guide.md) for detailed information on creating mods.

### Basic Mod Template

Here's a simple example of a mod:

```javascript
// My First Mod
console.log('My First Mod initializing...');

// Create a button in the UI
api.ui.addButton({
  id: 'my-first-mod-button',
  text: 'My Mod',
  tooltip: 'Click to show a message',
  primary: false,
  onClick: function() {
    api.ui.components.createModal({
      title: 'My First Mod',
      content: '<p>Hello from my first mod!</p>',
      buttons: [
        {
          text: 'OK',
          primary: true
        }
      ]
    });
  }
});

console.log('My First Mod initialization complete');
```

### Standardized UI Components

The extension provides a set of UI components that match the game's style. These components ensure a consistent look and feel across all mods:

- **Modals**: Game-styled dialog windows
- **Scrollable Containers**: For content that exceeds the viewable area
- **Monster Portraits**: Display monsters with proper styling
- **Item Portraits**: Display items with proper styling
- **Room List Items**: Display rooms with proper styling
- **Navigation Breadcrumbs**: For hierarchical navigation

Example of using UI components:

```javascript
// Create a monster portrait
const monsterPortrait = api.ui.components.createMonsterPortrait({
  monsterId: 21,  // Monster ID
  level: 50,      // Monster level
  tier: 4,        // Monster tier (1-5)
  onClick: () => showMonsterDetails(21)
});
```

### Access to Game State

Mods have access to the game's state through `globalThis.state`, which provides information about:

- Player stats and inventory
- Monster database and current monsters
- Equipment and items
- Game board state
- Room information
- Game settings

## Project Structure

- `assets/` - Static assets such as fonts, icons, and scripts
  - `fonts/` - Custom fonts used by the UI components
  - `icons/` - Icons used by the extension and mods
  - `js/` - JavaScript libraries, including UI components
  - `locales/` - Internationalization files
- `content/` - Content scripts that are injected into the game page
  - `client.js` - Main client-side API and functionality
  - `injector.js` - Injects the client code into the game page
  - `local_mods.js` - Manages local mods
- `docs/` - Documentation for mod developers
- `mods/` - Local mod files
- `popup/` - Extension popup UI
- `background.js` - Background script for the extension
- `manifest.json` - Extension manifest

## Documentation

- [Mod Development Guide](docs/mod_development_guide.md) - Comprehensive guide for mod developers
- [UI Management API](docs/ui_management.md) - Documentation for the UI Management API
- [UI Components Documentation](docs/ui_components.md) - Documentation for the UI Components
- [Client API Documentation](docs/client_api.md) - Complete reference for the game's Client API
- [Game State API Documentation](docs/game_state_api.md) - Complete reference for accessing and modifying game state

## Example Mods

The extension comes with several example mods to demonstrate different features:

### UI Components Showcase
![UI Components Showcase](docs/images/ui_showcase_example_mod.png)

Demonstrates all available UI components provided by the mod loader, allowing developers to see how components look and function within the game's environment.

### Monster Tier List
![Monster Tier List](docs/images/monster_usage_tier_list_mod.png)

Analyzes monster usage patterns and displays statistics and rankings, helping players identify the most effective monsters for different scenarios.

### Item Tier List
![Item Tier List](docs/images/item_tier_lis_mod.png)

Displays equipment statistics and rankings, allowing players to compare items and make informed decisions about their loadouts.

### Highscore Improvements
![Highscore Improvements](docs/images/highscore_improvements_mod.png)

Enhances the game's highscore display with additional statistics, improved sorting options, and visual enhancements.

### Toggle Map Grid
Adds a grid overlay to the game map, making it easier to identify precise positions and plan movements.

## Contributing

Contributions are welcome! If you have a mod you'd like to share or improvements to the extension, please read our [Contribution Guidelines](CONTRIBUTING.md).

## License

This project is licensed under the MIT License. See the LICENSE file for details. 