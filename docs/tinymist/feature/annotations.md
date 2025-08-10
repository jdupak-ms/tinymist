# Tinymist Animated Annotations Feature

This document describes the animated arrows and highlight boxes feature for the Tinymist preview system.

## Overview

The annotation system allows users to draw and position absolutely positioned arrows and highlight boxes on Typst preview documents. These annotations can be animated with keyframe-based animations and exported in a transparent format that's easy to maintain.

## Architecture

### Frontend System (`tools/typst-preview-frontend/`)

#### Core Components

1. **`src/annotations.ts`** - Core annotation manager
   - SVG overlay system for non-intrusive rendering
   - Annotation data models and management
   - Event system for real-time updates
   - Export/import functionality

2. **`src/annotation-ui.ts`** - User interface components
   - Toolbar with drawing tools
   - Properties panel for annotation customization
   - Context menus for annotation actions
   - Animation control integration

3. **`src/animation-player.ts`** - Animation system
   - Keyframe-based animation engine
   - Property interpolation (position, color, opacity, etc.)
   - Timeline controls (play, pause, step, seek)
   - Easing functions support

4. **`src/styles/annotations.css`** - Complete styling
   - Responsive design for different screen sizes
   - High contrast mode support
   - Reduced motion support
   - Dark/light theme compatibility

### Backend System (`crates/typst-preview/`)

1. **`src/annotations.rs`** - Annotation data model
   - Complete type definitions for annotations
   - Async storage and retrieval system
   - JSON serialization/deserialization
   - Version control compatibility

2. **`src/actor/webview.rs`** - WebSocket communication
   - Extended message protocol for annotation sync
   - Real-time collaboration support
   - Message batching and error handling

3. **`src/actor/editor.rs`** - Editor coordination
   - Annotation lifecycle management
   - Integration with document updates
   - Cross-component message routing

### VS Code Extension (`editors/vscode/`)

1. **`src/features/annotations.ts`** - Extension integration
   - Command palette integration
   - Keyboard shortcuts
   - Workspace persistence
   - Message bridge between frontend and backend

## Feature Set

### Drawing Tools

- **Arrow Tool**: Draw arrows with customizable start/end points
  - Adjustable thickness and arrowhead size
  - Multiple line styles (solid, dashed, dotted)
  - Color customization

- **Highlight Box Tool**: Create rectangular highlight areas
  - Adjustable dimensions and position
  - Corner radius control
  - Border and fill color customization
  - Opacity control

### Animation System

- **Keyframe-based Animations**: Create complex animations with multiple keyframes
- **Property Interpolation**: Smooth transitions between states
  - Position and dimensions
  - Colors (with proper color space interpolation)
  - Opacity and visibility
  - Custom properties

- **Built-in Animation Presets**:
  - Fade in/out effects
  - Move animations
  - Scale transformations
  - Color transitions
  - Pulse effects

- **Timeline Controls**:
  - Play/pause functionality
  - Step-by-step navigation
  - Seek to specific time
  - Loop control
  - Variable playback speed

### User Interface

- **Annotation Mode Toggle**: Switch between viewing and editing modes
- **Tool Selection**: Easy switching between arrow and highlight tools
- **Properties Panel**: Real-time customization of selected annotations
- **Context Menus**: Right-click actions for annotation management
- **Animation Controls**: Timeline-based animation playback

### Data Format

Annotations are stored in a transparent JSON format:

```json
{
  "version": "1.0.0",
  "documentId": "/path/to/document.typ",
  "annotations": [
    {
      "id": "arrow1",
      "type": "arrow",
      "pageNumber": 1,
      "start": {"x": 100, "y": 100},
      "end": {"x": 200, "y": 200},
      "color": "#ff0000",
      "thickness": 2,
      "visible": true,
      "opacity": 1.0
    }
  ],
  "animations": [
    {
      "annotationId": "arrow1",
      "keyframes": [
        {"time": 0, "properties": {"opacity": 0}},
        {"time": 1000, "properties": {"opacity": 1}}
      ],
      "duration": 1000,
      "easing": "ease-in-out"
    }
  ],
  "metadata": {
    "created": 1640995200000,
    "modified": 1640995260000,
    "author": "user@example.com"
  }
}
```

## Usage

### Basic Annotation Workflow

1. **Enable Annotation Mode**: Press `Ctrl+Shift+A` or use the command palette
2. **Select Tool**: Choose arrow or highlight box tool
3. **Draw Annotation**: Click and drag to create annotation
4. **Customize Properties**: Use the properties panel to adjust appearance
5. **Save**: Annotations are automatically saved to workspace

### Animation Workflow

1. **Create Annotations**: Add arrows or highlight boxes as needed
2. **Access Context Menu**: Right-click on annotation
3. **Add Animation**: Choose from preset animations (fade in, pulse, etc.)
4. **Control Playback**: Use timeline controls to preview animations
5. **Export**: Save animated annotations for sharing

### Keyboard Shortcuts

- `Ctrl+Shift+A`: Toggle annotation mode
- `Ctrl+Shift+1`: Select arrow tool
- `Ctrl+Shift+2`: Select highlight tool
- `Ctrl+Shift+0`: Select selection tool
- `Delete`: Remove selected annotation
- `Escape`: Clear selection/tool

## Integration Points

### WebSocket Protocol

The system extends the existing Typst preview WebSocket protocol with new message types:

- `annotation-save <data>`: Save annotation data
- `annotation-load`: Request annotation data
- `annotation-update <data>`: Update annotation data
- `annotation-data,<data>`: Annotation data from backend
- `annotation-command,<cmd>,<data>`: Animation commands

### VS Code Commands

- `tinymist.toggleAnnotationMode`: Toggle annotation editing
- `tinymist.annotationArrowTool`: Select arrow tool
- `tinymist.annotationHighlightTool`: Select highlight tool
- `tinymist.exportAnnotations`: Export to file
- `tinymist.importAnnotations`: Import from file

### Storage

Annotations are stored in the workspace at:
```
.vscode/tinymist-annotations/annotations-{hash}.json
```

This ensures:
- Version control compatibility
- Easy backup and sharing
- No interference with Typst documents

## Future Enhancements

### Planned Features

1. **Advanced Animation Controls**
   - Custom easing curve editor
   - Animation layers and blending
   - Synchronized multi-annotation sequences

2. **Collaboration Features**
   - Real-time multi-user editing
   - Comment system for annotations
   - Review and approval workflow

3. **Enhanced Drawing Tools**
   - Freehand drawing tool
   - Text annotations
   - Shape library (circles, polygons, etc.)

4. **Export Options**
   - Video export of animated annotations
   - PDF overlay generation
   - SVG export for web use

### Technical Improvements

1. **Performance Optimization**
   - WebGL rendering for complex animations
   - Efficient diff-based updates
   - Background processing for large documents

2. **Accessibility**
   - Screen reader support
   - Keyboard navigation
   - High contrast themes

3. **Mobile Support**
   - Touch-based drawing
   - Responsive UI adaptation
   - Gesture controls

## Development Notes

### Testing

The system includes comprehensive testing:
- Unit tests for annotation manager
- Integration tests for WebSocket protocol
- UI interaction tests
- Performance benchmarks

### Browser Compatibility

Supports modern browsers with:
- ES2020+ JavaScript features
- SVG manipulation capabilities
- WebSocket support
- CSS Grid and Flexbox

### Performance Considerations

- Annotations are rendered as lightweight SVG elements
- Animation system uses RequestAnimationFrame for smooth playback
- WebSocket messages are batched to reduce network overhead
- Storage operations are debounced to prevent excessive I/O

## Conclusion

The animated annotations feature provides a powerful and intuitive way to add interactive visual elements to Typst documents. The modular architecture ensures maintainability while the transparent data format promotes collaboration and version control compatibility.

The system is designed to be:
- **Non-intrusive**: Annotations don't modify the original Typst document
- **Performant**: Optimized for real-time interaction and smooth animations
- **Extensible**: Easy to add new annotation types and animation effects
- **Collaborative**: Built-in support for multi-user workflows
- **Accessible**: Follows web accessibility best practices