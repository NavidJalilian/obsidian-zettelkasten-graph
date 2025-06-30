# Interactive Node Manipulation System

This document describes the new interactive node manipulation features added to the Zettelkasten Graph Visualizer.

## Overview

The interactive node manipulation system allows users to intuitively restructure their Zettelkasten hierarchy through drag-and-drop operations, with automatic renumbering, visual feedback, and undo/redo support.

## Features

### 1. Enhanced Drag and Drop

**Basic Usage:**
- Click and drag any node to reposition it
- Drag a node near another node to create hierarchical relationships
- Visual indicators show valid drop zones and relationship previews

**Visual Feedback:**
- **Drop Zone Indicator**: A pulsing circle appears around valid drop targets
- **Relationship Preview**: Dashed lines show the new hierarchical connection
- **Invalid Drop Warning**: Red indicators for invalid operations
- **Node Highlighting**: Target nodes are highlighted during drag operations

### 2. Hierarchical Restructuring

**Supported Operations:**
- **Make Child**: Drag node A onto node B to make A a child of B
- **Change Parent**: Move nodes between different hierarchical levels
- **Automatic Renumbering**: Child nodes are automatically renumbered when parents change

**Examples:**
- Drag "3.1" onto "2" → becomes "2.1"
- Drag "21a" onto "22" → becomes "22a"
- Moving "3.1.2" to be child of "4" → becomes "4.1"

**Validation Rules:**
- Cannot move a parent to become child of its descendant
- Cannot move a node to itself
- Maintains proper hierarchical numbering conventions

### 3. Visual Feedback System

**During Drag Operations:**
- **Dragging State**: Semi-transparent node with drop shadow
- **Valid Drop Zone**: Pulsing blue circle around target
- **Invalid Drop Zone**: Pulsing red circle with error indication
- **Relationship Preview**: Animated dashed line showing new connection

**After Operations:**
- **Success Feedback**: Green notification with operation details
- **Error Feedback**: Red notification explaining why operation failed
- **Smooth Animations**: Nodes transition smoothly to new positions

### 4. Automatic Renumbering

**Smart Number Generation:**
- Maintains Zettelkasten numbering conventions
- Handles both sequence (21, 21.1, 21.2) and branch (21a, 21b) patterns
- Recursively updates all child nodes when parent changes

**Examples:**
```
Before: 3 → 3.1 → 3.1.1
Move 3.1 to be child of 4
After: 4 → 4.1 → 4.1.1
```

### 5. Undo/Redo Support

**Controls:**
- **Undo Button**: ↶ (top-left corner)
- **Redo Button**: ↷ (top-left corner)
- **Keyboard Shortcuts**: 
  - Ctrl+Z (Cmd+Z on Mac) for Undo
  - Ctrl+Y or Ctrl+Shift+Z (Cmd+Y or Cmd+Shift+Z on Mac) for Redo

**Features:**
- Tracks up to 50 operations in history
- Buttons are disabled when no operations available
- Reverses all changes including file renaming and content updates

### 6. Smooth Animations

**Animation Types:**
- **Node Movement**: Smooth transitions when repositioning
- **Scale Effects**: Emphasis animations during interactions
- **Color Changes**: Smooth color transitions for state changes
- **Text Updates**: Animated number changes during renumbering
- **Layout Changes**: Coordinated animations for graph restructuring

**Performance:**
- Hardware-accelerated CSS transitions
- Optimized for 60fps performance
- Cancellable animations to prevent conflicts

## Technical Implementation

### Core Components

1. **NodeManipulator** (`node-manipulator.ts`)
   - Handles drag and drop logic
   - Manages hierarchical validation
   - Executes node movement operations
   - Maintains command history for undo/redo

2. **AnimationSystem** (`animation-system.ts`)
   - Provides smooth transition animations
   - Handles visual feedback effects
   - Manages animation timing and easing
   - Supports batch and sequential animations

3. **Enhanced GraphRenderer** (`graph-renderer.ts`)
   - Integrates manipulation system with existing renderer
   - Adds action buttons for undo/redo
   - Provides keyboard shortcut support
   - Manages visual state updates

### CSS Classes and Styling

**Drag States:**
- `.node.dragging` - Applied to node being dragged
- `.node.drag-target` - Applied to valid drop targets
- `.node.invalid-drop-target` - Applied to invalid drop targets

**Visual Indicators:**
- `.drop-zone-indicator` - Pulsing circle around drop targets
- `.relationship-preview` - Dashed line showing new connections
- `.manipulation-feedback` - Success/error message overlay

**Animations:**
- `.node.transitioning` - Smooth position transitions
- `.node.renumbering` - Number change animations
- Various keyframe animations for visual effects

## Usage Guidelines

### Best Practices

1. **Plan Your Moves**: Consider the impact on child nodes before moving parents
2. **Use Visual Cues**: Pay attention to drop zone indicators and previews
3. **Test Changes**: Use undo if a move doesn't work as expected
4. **Gradual Restructuring**: Make small changes rather than large reorganizations

### Limitations

1. **File System**: Changes are reflected in file names and content
2. **Performance**: Large graphs (>100 nodes) may experience slower animations
3. **Validation**: Some complex hierarchical moves may be restricted
4. **Persistence**: Undo history is lost when the view is closed

### Troubleshooting

**Common Issues:**
- **Drag Not Working**: Ensure you're clicking on the node circle, not the text
- **Invalid Drop**: Check that the move doesn't create circular dependencies
- **Animation Lag**: Reduce animation duration in large graphs
- **Undo Disabled**: History is cleared when graph is refreshed

**Performance Tips:**
- Close other resource-intensive applications
- Reduce graph complexity by filtering folders
- Disable animations if experiencing lag

## Future Enhancements

**Planned Features:**
- Multi-node selection and batch operations
- Custom numbering schemes
- Advanced validation rules
- Export/import of graph structures
- Collaborative editing support

**Experimental Features:**
- AI-assisted restructuring suggestions
- Automatic layout optimization
- Advanced animation presets
- Custom drag behaviors

## API Reference

### NodeManipulator Methods

```typescript
// Create enhanced drag behavior
createEnhancedDragBehavior(nodes, graph, onUpdate)

// Execute undo operation
async undo(graph, onUpdate): Promise<boolean>

// Execute redo operation  
async redo(graph, onUpdate): Promise<boolean>

// Check if operations are available
canUndo(): boolean
canRedo(): boolean
```

### AnimationSystem Methods

```typescript
// Animate node movement
async animateNodeMovement(selection, position, config)

// Animate text changes
async animateTextChange(selection, newText, config)

// Create pulsing effects
createPulseAnimation(selection, config)

// Batch animations
async runAnimationBatch(animations)
```

## Contributing

When contributing to the interactive manipulation system:

1. **Test Thoroughly**: Verify all drag operations work correctly
2. **Maintain Performance**: Ensure animations remain smooth
3. **Follow Patterns**: Use existing CSS classes and animation patterns
4. **Document Changes**: Update this file with new features
5. **Consider Accessibility**: Ensure features work with keyboard navigation

## License

This interactive manipulation system is part of the Zettelkasten Graph Visualizer and follows the same license terms.
