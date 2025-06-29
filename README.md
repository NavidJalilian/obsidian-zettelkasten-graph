# Zettelkasten Graph Visualizer

An Obsidian plugin that visualizes your Zettelkasten numbering system as an interactive graph, showing hierarchical sequences and branching thoughts.

## Features

- **Automatic Pattern Recognition**: Detects numbered sequences (21, 21.1, 21.2) and lettered branches (21a, 21b)
- **Interactive Graph**: D3.js-powered visualization with zoom, pan, and drag functionality
- **Visual Distinction**: Different colors and styles for sequential flow vs branching context
- **File Integration**: Click nodes to open corresponding notes, hover for titles
- **Folder Filtering**: Scan specific folders or your entire vault
- **Real-time Stats**: View counts of different note types

## Numbering System

The plugin recognizes two types of relationships in your Zettelkasten:

### Sequential Flow (Blue circles, solid lines)
- `21` → `21.1` → `21.2` → `21.3`
- `21.1` → `21.1.1` → `21.1.2`
- Represents logical progression and continuation of ideas

### Branching Context (Red circles, dashed lines)
- `21` ← `21a`, `21b`, `21c`
- `21.1` ← `21.1a`, `21.1b`
- Represents clarifications, asides, and contextual additions

## Installation

### Manual Installation
1. Copy the plugin files to your vault's `.obsidian/plugins/zettelkasten-graph/` directory
2. Enable the plugin in Obsidian's Community Plugins settings

### Development Installation
1. Clone this repository to your vault's plugins folder
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile the plugin
4. Enable the plugin in Obsidian

## Usage

### Opening the Graph View
- Click the fork icon in the ribbon, or
- Use Command Palette: "Open Zettelkasten Graph", or
- Use the hotkey (if configured)

### Configuring the View
1. **Folder Selection**: Enter a folder path to scan specific directories, or leave empty to scan all files
2. **Refresh**: Click "Refresh Graph" to rescan files and update the visualization

### Interacting with the Graph
- **Zoom**: Mouse wheel or pinch gestures
- **Pan**: Click and drag on empty space
- **Move Nodes**: Drag individual nodes to reposition
- **Open Notes**: Click on any node to open the corresponding file
- **View Details**: Hover over nodes to see note titles

## File Naming Examples

The plugin will detect these patterns in your file names:

```
21 Main Topic.md
21.1 Sequential Continuation.md
21.2 Next in Sequence.md
21a Branching Context.md
21b Additional Context.md
21.1a Sub-branch.md
```

## Graph Legend

- **Blue Circles**: Sequential notes (numbered progression)
- **Red Circles**: Branch notes (lettered additions)
- **Solid Blue Lines**: Sequential connections (→)
- **Dashed Red Lines**: Branch connections (←)

## Statistics Panel

The plugin displays real-time statistics:
- Total Notes: All detected Zettelkasten notes
- Sequential Notes: Numbered progression notes
- Branch Notes: Lettered context notes
- Root Notes: Top-level notes without parents

## Troubleshooting

### No Notes Found
- Ensure your files contain the numbering patterns (21, 21.1, 21a, etc.)
- Check that the folder path is correct
- Verify files are in Markdown format

### Graph Not Displaying
- Try refreshing the graph
- Check the browser console for errors
- Ensure D3.js dependencies loaded correctly

### Performance Issues
- Consider filtering to specific folders for large vaults
- The plugin works best with focused Zettelkasten collections

## Technical Details

- **Built with**: TypeScript, D3.js, Obsidian Plugin API
- **Graph Engine**: Force-directed layout with collision detection
- **File Parsing**: Regex-based pattern recognition
- **Rendering**: SVG with interactive controls

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details
