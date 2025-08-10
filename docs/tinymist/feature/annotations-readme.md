# Animated Annotations for Tinymist Preview

A feature-rich annotation system that allows users to add animated arrows and highlight boxes to Typst document previews.

## ✨ Features

- 🎯 **Interactive Drawing Tools**: Draw arrows and highlight boxes directly on the preview
- 🎬 **Keyframe Animations**: Create smooth animations with customizable timing and easing
- 🎨 **Rich Customization**: Adjust colors, opacity, thickness, and styling
- 💾 **Transparent Storage**: JSON-based format that doesn't modify your Typst documents
- 🔄 **Real-time Sync**: WebSocket-based synchronization between frontend and backend
- ⌨️ **Keyboard Shortcuts**: Efficient workflow with customizable shortcuts
- 📱 **Responsive Design**: Works across different screen sizes and devices

## 🚀 Quick Start

### Enabling Annotation Mode

1. **Via Keyboard**: Press `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac)
2. **Via Command Palette**: Run "Tinymist: Toggle Annotation Mode"
3. **Via Context Menu**: Right-click in preview and select "Toggle Annotations"

### Creating Annotations

1. **Select Tool**: Click arrow or highlight box tool in toolbar
2. **Draw**: Click and drag on the preview to create annotation
3. **Customize**: Use properties panel to adjust appearance
4. **Animate**: Right-click annotation and choose animation preset

### Animation Playback

1. **Enter Animation Mode**: Click the play button in toolbar
2. **Control Playback**: Use timeline controls to play, pause, step through
3. **Adjust Speed**: Use speed controls for faster/slower playback
4. **Loop**: Toggle loop mode for continuous playback

## 🎮 Controls

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Toggle annotation mode |
| `Ctrl+Shift+1` | Select arrow tool |
| `Ctrl+Shift+2` | Select highlight box tool |
| `Ctrl+Shift+0` | Select selection tool |
| `Delete` | Remove selected annotation |
| `Escape` | Clear selection/tool |

### Mouse Controls

| Action | Result |
|--------|--------|
| Click + Drag | Create new annotation |
| Click | Select annotation |
| Right-click | Open context menu |
| Click timeline | Seek to time position |

## 🔧 Customization Options

### Arrow Annotations

- **Position**: Adjust start and end points by dragging
- **Color**: Choose any color via color picker
- **Thickness**: Adjust line weight (1-10px)
- **Arrowhead Size**: Control arrowhead dimensions
- **Style**: Solid, dashed, or dotted lines
- **Opacity**: Full transparency control

### Highlight Box Annotations

- **Dimensions**: Resize by dragging corner handles
- **Position**: Move by dragging the annotation
- **Fill Color**: Background color with transparency
- **Border**: Optional border with color and thickness
- **Corner Radius**: Rounded corners (0-20px)
- **Style**: Solid, dashed, or dotted borders

### Animation Properties

- **Duration**: Animation length in milliseconds
- **Easing**: Linear, ease-in, ease-out, ease-in-out
- **Loop**: Continuous playback option
- **Keyframes**: Multiple property states over time

## 🎬 Animation Presets

### Built-in Animations

- **Fade In**: Smooth opacity transition from 0 to 1
- **Fade Out**: Smooth opacity transition from 1 to 0
- **Pulse**: Rhythmic opacity animation
- **Move**: Position-based movement animation
- **Color Change**: Smooth color transitions
- **Scale**: Size transformation effects

### Custom Animations

Create custom animations by defining keyframes:

```javascript
// Example: Custom bounce animation
{
  annotationId: "arrow1",
  keyframes: [
    { time: 0, properties: { opacity: 0, thickness: 1 } },
    { time: 500, properties: { opacity: 1, thickness: 3 } },
    { time: 1000, properties: { opacity: 1, thickness: 1 } }
  ],
  duration: 1000,
  easing: "ease-in-out"
}
```

## 💾 Storage Format

Annotations are stored in a clean JSON format that doesn't interfere with your Typst documents:

```json
{
  "version": "1.0.0",
  "documentId": "/path/to/document.typ",
  "annotations": [...],
  "animations": [...],
  "metadata": {
    "created": 1640995200000,
    "modified": 1640995260000,
    "author": "user@example.com"
  }
}
```

### Storage Location

Annotations are saved in your workspace at:
```
.vscode/tinymist-annotations/annotations-{hash}.json
```

This ensures:
- ✅ Version control friendly
- ✅ Easy to backup and share
- ✅ No document modification
- ✅ Per-document isolation

## 🔄 Import/Export

### Export Options

1. **Individual File Export**: Save specific document annotations
2. **Workspace Export**: Export all annotations in workspace
3. **Animation Export**: Include animation data in export

### Import Options

1. **File Import**: Load annotations from JSON file
2. **Merge Import**: Combine with existing annotations
3. **Replace Import**: Overwrite current annotations

### Sharing Workflow

```bash
# Export annotations
Cmd+Shift+P → "Tinymist: Export Annotations"

# Share the JSON file with team members

# Import on another machine
Cmd+Shift+P → "Tinymist: Import Annotations"
```

## 🛠️ Technical Architecture

### Frontend Components

- **Annotation Manager**: Core annotation logic and storage
- **Animation Player**: Keyframe-based animation engine
- **UI Controller**: Toolbar, properties panel, and controls
- **SVG Overlay**: Non-intrusive rendering system

### Backend Integration

- **WebSocket Protocol**: Real-time synchronization
- **Rust Storage**: Efficient annotation persistence
- **Message Routing**: Cross-component communication

### VS Code Extension

- **Command Integration**: Command palette and shortcuts
- **Workspace Persistence**: File-based storage management
- **Settings Sync**: User preference synchronization

## 🎯 Use Cases

### Educational Content

- **Lecture Annotations**: Highlight key concepts during presentations
- **Step-by-step Tutorials**: Animated arrows to guide attention
- **Interactive Diagrams**: Progressive revelation of information

### Documentation

- **Feature Callouts**: Highlight UI elements in screenshots
- **Process Flows**: Animated sequences showing workflows
- **Version Comparisons**: Visual diff highlighting

### Collaboration

- **Review Comments**: Visual feedback on document sections
- **Design Reviews**: Markup for layout discussions
- **Presentation Notes**: Speaker notes and emphasis

## 🐛 Troubleshooting

### Common Issues

**Annotations not appearing**
- Ensure annotation mode is enabled (`Ctrl+Shift+A`)
- Check if overlay is hidden (refresh preview)
- Verify WebSocket connection is active

**Animation not playing**
- Confirm animation tracks are added to player
- Check animation controls are visible
- Verify timeline duration is > 0

**Storage issues**
- Check workspace permissions
- Verify `.vscode` directory exists
- Ensure sufficient disk space

### Performance Tips

- **Large Documents**: Use pagination for better performance
- **Complex Animations**: Reduce keyframe count for smoother playback
- **Many Annotations**: Consider using annotation layers

## 🚧 Development

### Building from Source

```bash
# Frontend
cd tools/typst-preview-frontend
npm install
npm run build

# Backend
cargo build -p tinymist-preview

# VS Code Extension
cd editors/vscode
npm install
npm run build
```

### Running Tests

```bash
# Rust tests
cargo test -p tinymist-preview

# TypeScript tests
cd tools/typst-preview-frontend
npm test

# VS Code extension tests
cd editors/vscode
npm test
```

### Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This feature is part of the Tinymist project and follows the same licensing terms.

## 🙏 Acknowledgments

- Inspired by modern annotation tools like Figma and Adobe Creative Suite
- Built on the solid foundation of the Typst typesetting system
- Powered by the robust Tinymist language server architecture

---

**Made with ❤️ for the Typst community**