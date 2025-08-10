/**
 * Annotation UI components for the typst preview
 * Provides toolbar, properties panel, and animation controls
 */

import { AnnotationManager, AnnotationType, Annotation, ArrowAnnotation, HighlightBoxAnnotation } from './annotations';
import { AnimationPlayer, createFadeInAnimation, createFadeOutAnimation, createMoveAnimation, createColorChangeAnimation, createPulseAnimation } from './animation-player';

export class AnnotationUI {
  private manager: AnnotationManager;
  private animationPlayer: AnimationPlayer;
  private toolbar: HTMLElement | null = null;
  private propertiesPanel: HTMLElement | null = null;
  private animationControls: HTMLElement | null = null;
  private contextMenu: HTMLElement | null = null;
  private isAnimationMode: boolean = false;
  private animationPlayButton: HTMLElement | null = null;
  private animationTimeline: HTMLElement | null = null;
  private animationTimeDisplay: HTMLElement | null = null;

  constructor(manager: AnnotationManager) {
    this.manager = manager;
    this.animationPlayer = new AnimationPlayer(manager);
    this.setupEventListeners();
    this.createUI();
    this.setupAnimationPlayerListeners();
  }

  private setupEventListeners(): void {
    this.manager.on('selectionChanged', (id: string | null) => {
      this.updatePropertiesPanel(id);
    });

    this.manager.on('toolChanged', (tool: AnnotationType | null) => {
      this.updateToolbarSelection(tool);
    });

    this.manager.on('editModeChanged', (enabled: boolean) => {
      this.toggleUI(enabled);
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.manager.setCurrentTool(null);
        this.manager.selectAnnotation(null);
      }
    });
  }

  private createUI(): void {
    this.createToolbar();
    this.createPropertiesPanel();
    this.createAnimationControls();
    this.createContextMenu();
    this.setupAnimationPlayerListeners();
  }

  private setupAnimationPlayerListeners(): void {
    this.animationPlayer.on('play', () => {
      this.updatePlayButton(true);
    });

    this.animationPlayer.on('pause', () => {
      this.updatePlayButton(false);
    });

    this.animationPlayer.on('stop', () => {
      this.updatePlayButton(false);
    });

    this.animationPlayer.on('timeUpdate', (time: number) => {
      this.updateAnimationProgress(time);
    });

    this.animationPlayer.on('durationChanged', (duration: number) => {
      this.updateAnimationDuration(duration);
    });
  }

  private createToolbar(): void {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'annotation-toolbar';
    this.toolbar.innerHTML = `
      <button class="annotation-tool-button" data-tool="edit" title="Select and Edit (V)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M15.7 1.3c.4.4.4 1 0 1.4L6.1 12.3c-.2.2-.5.3-.8.3H2v-3.3c0-.3.1-.6.3-.8L11.9.3c.4-.4 1-.4 1.4 0l2.4 2.4z"/>
        </svg>
      </button>
      
      <div class="annotation-tool-separator"></div>
      
      <button class="annotation-tool-button" data-tool="${AnnotationType.ARROW}" title="Draw Arrow (A)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 8l10-6v4h2v4h-2v4z"/>
        </svg>
      </button>
      
      <button class="annotation-tool-button" data-tool="${AnnotationType.HIGHLIGHT_BOX}" title="Highlight Box (H)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      
      <div class="annotation-tool-separator"></div>
      
      <button class="annotation-tool-button" data-action="animation" title="Animation Mode (M)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <polygon points="5,3 14,8 5,13"/>
        </svg>
      </button>
      
      <button class="annotation-tool-button" data-action="clear" title="Clear All">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 5v9c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V5h1v-1h-3V3c0-.6-.4-1-1-1H6c-.6 0-1 .4-1 1v1H2v1h1zM7 4h2v1H7V4zM5 6h6v8H5V6z"/>
        </svg>
      </button>
      
      <div class="annotation-tool-separator"></div>
      
      <button class="annotation-tool-button" data-action="export" title="Export Annotations">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1l3 3h-2v4H7V4H5l3-3zM4 9v5h8V9h1v6H3V9h1z"/>
        </svg>
      </button>
      
      <button class="annotation-tool-button" data-action="import" title="Import Annotations">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 8l3-3h-2V1H7v4H5l3 3zM4 9v5h8V9h1v6H3V9h1z"/>
        </svg>
      </button>
    `;

    // Add click handlers
    this.toolbar.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('.annotation-tool-button') as HTMLButtonElement;
      if (!button) return;

      const tool = button.dataset.tool as AnnotationType;
      const action = button.dataset.action;

      if (tool) {
        this.manager.setCurrentTool(tool === this.manager['currentTool'] ? null : tool);
      } else if (action) {
        this.handleToolbarAction(action);
      }
    });

    document.body.appendChild(this.toolbar);
  }

  private createPropertiesPanel(): void {
    this.propertiesPanel = document.createElement('div');
    this.propertiesPanel.className = 'annotation-properties-panel hidden';
    this.propertiesPanel.innerHTML = `
      <div class="annotation-properties-title">Annotation Properties</div>
      <div id="annotation-properties-content"></div>
    `;

    document.body.appendChild(this.propertiesPanel);
  }

  private createAnimationControls(): void {
    this.animationControls = document.createElement('div');
    this.animationControls.className = 'animation-controls hidden';
    this.animationControls.innerHTML = `
      <button class="animation-play-button" data-action="play" title="Play/Pause">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <polygon points="5,3 14,8 5,13" id="play-icon"/>
          <g id="pause-icon" style="display: none;">
            <rect x="5" y="3" width="2" height="10"/>
            <rect x="9" y="3" width="2" height="10"/>
          </g>
        </svg>
      </button>
      
      <div class="animation-timeline">
        <div class="animation-timeline-progress"></div>
        <div class="animation-timeline-thumb"></div>
      </div>
      
      <div class="animation-time-display">0:00 / 0:00</div>
      
      <button class="animation-play-button" data-action="step-back" title="Step Back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3v10l4-5-4-5zm6 0v10l4-5-4-5z"/>
        </svg>
      </button>
      
      <button class="animation-play-button" data-action="step-forward" title="Step Forward">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 3v10l4-5-4-5zm6 0v10l4-5-4-5z"/>
        </svg>
      </button>
    `;

    // Store references to animation control elements
    this.animationPlayButton = this.animationControls.querySelector('[data-action="play"]');
    this.animationTimeline = this.animationControls.querySelector('.animation-timeline');
    this.animationTimeDisplay = this.animationControls.querySelector('.animation-time-display');

    // Add click handlers for animation controls
    this.animationControls.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('[data-action]') as HTMLButtonElement;
      if (!button) return;

      const action = button.dataset.action;
      this.handleAnimationAction(action!);
    });

    // Add timeline interaction
    if (this.animationTimeline) {
      this.animationTimeline.addEventListener('click', (e) => {
        const rect = this.animationTimeline.getBoundingClientRect();
        const progress = (e.clientX - rect.left) / rect.width;
        const time = progress * this.animationPlayer.getTotalDuration();
        this.animationPlayer.seekTo(time);
      });
    }

    document.body.appendChild(this.animationControls);
  }

  private createContextMenu(): void {
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'annotation-context-menu';
    this.contextMenu.style.display = 'none';
    this.contextMenu.innerHTML = `
      <div class="annotation-context-menu-item" data-action="duplicate">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 4v8h8V4H4zm1 1h6v6H5V5z"/>
        </svg>
        Duplicate
      </div>
      <div class="annotation-context-menu-item" data-action="bring-to-front">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2v4h2V4h2V2H2zm8 0v2h2v2h2V2h-4zM2 10v4h4v-2H4v-2H2zm10 0v2h-2v2h4v-4h-2z"/>
        </svg>
        Bring to Front
      </div>
      <div class="annotation-context-menu-item" data-action="send-to-back">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 6v4h4V6H6zm1 1h2v2H7V7z"/>
        </svg>
        Send to Back
      </div>
      <div class="annotation-context-menu-separator"></div>
      <div class="annotation-context-menu-item" data-action="add-fade-in">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3l3 3h-2v4H7V6H5l3-3z"/>
        </svg>
        Add Fade In
      </div>
      <div class="annotation-context-menu-item" data-action="add-fade-out">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 13l-3-3h2V6h2v4h2l-3 3z"/>
        </svg>
        Add Fade Out
      </div>
      <div class="annotation-context-menu-item" data-action="add-pulse">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="3"/>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1"/>
        </svg>
        Add Pulse
      </div>
      <div class="annotation-context-menu-separator"></div>
      <div class="annotation-context-menu-item" data-action="delete">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 5v9c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V5h1v-1h-3V3c0-.6-.4-1-1-1H6c-.6 0-1 .4-1 1v1H2v1h1z"/>
        </svg>
        Delete
      </div>
    `;

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
      this.hideContextMenu();
    });

    document.body.appendChild(this.contextMenu);
  }

  private handleToolbarAction(action: string): void {
    switch (action) {
      case 'animation':
        this.toggleAnimationMode();
        break;
      case 'clear':
        if (confirm('Are you sure you want to clear all annotations?')) {
          this.manager.clearAllAnnotations();
        }
        break;
      case 'export':
        this.exportAnnotations();
        break;
      case 'import':
        this.importAnnotations();
        break;
    }
  }

  private handleAnimationAction(action: string): void {
    switch (action) {
      case 'play':
        if (this.animationPlayer.isAnimationPlaying()) {
          this.animationPlayer.pause();
        } else {
          this.animationPlayer.play();
        }
        break;
      case 'step-back':
        this.animationPlayer.stepBackward();
        break;
      case 'step-forward':
        this.animationPlayer.stepForward();
        break;
    }
  }

  private updatePlayButton(isPlaying: boolean): void {
    if (!this.animationPlayButton) return;

    const playIcon = this.animationPlayButton.querySelector('#play-icon');
    const pauseIcon = this.animationPlayButton.querySelector('#pause-icon');

    if (playIcon && pauseIcon) {
      playIcon.style.display = isPlaying ? 'none' : 'block';
      pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
  }

  private updateAnimationProgress(time: number): void {
    if (!this.animationTimeline) return;

    const progress = this.animationPlayer.getProgress();
    const progressBar = this.animationTimeline.querySelector('.animation-timeline-progress') as HTMLElement;
    const thumb = this.animationTimeline.querySelector('.animation-timeline-thumb') as HTMLElement;

    if (progressBar) {
      progressBar.style.width = `${progress * 100}%`;
    }

    if (thumb) {
      thumb.style.left = `${progress * 100}%`;
    }

    this.updateTimeDisplay(time);
  }

  private updateAnimationDuration(duration: number): void {
    this.updateTimeDisplay(this.animationPlayer.getCurrentTime());
  }

  private updateTimeDisplay(currentTime: number): void {
    if (!this.animationTimeDisplay) return;

    const totalDuration = this.animationPlayer.getTotalDuration();
    const currentMinutes = Math.floor(currentTime / 60000);
    const currentSeconds = Math.floor((currentTime % 60000) / 1000);
    const totalMinutes = Math.floor(totalDuration / 60000);
    const totalSecondsValue = Math.floor((totalDuration % 60000) / 1000);

    const currentTimeStr = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`;
    const totalTimeStr = `${totalMinutes}:${totalSecondsValue.toString().padStart(2, '0')}`;

    this.animationTimeDisplay.textContent = `${currentTimeStr} / ${totalTimeStr}`;
  }

  private updateToolbarSelection(tool: AnnotationType | null): void {
    if (!this.toolbar) return;

    // Clear all active states
    this.toolbar.querySelectorAll('.annotation-tool-button').forEach(btn => {
      btn.classList.remove('active');
    });

    // Set active state for current tool
    if (tool) {
      const toolButton = this.toolbar.querySelector(`[data-tool="${tool}"]`);
      if (toolButton) {
        toolButton.classList.add('active');
      }
    }
  }

  private updatePropertiesPanel(annotationId: string | null): void {
    if (!this.propertiesPanel) return;

    const content = this.propertiesPanel.querySelector('#annotation-properties-content');
    if (!content) return;

    if (!annotationId) {
      this.propertiesPanel.classList.add('hidden');
      return;
    }

    const annotation = this.manager['annotations'].get(annotationId);
    if (!annotation) {
      this.propertiesPanel.classList.add('hidden');
      return;
    }

    this.propertiesPanel.classList.remove('hidden');
    content.innerHTML = this.generatePropertiesHTML(annotation);
    this.setupPropertiesHandlers(annotation);
  }

  private generatePropertiesHTML(annotation: Annotation): string {
    const commonProperties = `
      <div class="annotation-property">
        <label class="annotation-property-label">Opacity</label>
        <input type="range" class="annotation-property-range" 
               data-property="opacity" min="0" max="1" step="0.1" value="${annotation.opacity}">
      </div>
      
      <div class="annotation-property">
        <label class="annotation-property-label">Z-Index</label>
        <input type="number" class="annotation-property-input" 
               data-property="zIndex" value="${annotation.zIndex}">
      </div>
      
      <div class="annotation-property">
        <label class="annotation-property-label">
          <input type="checkbox" class="annotation-property-checkbox" 
                 data-property="visible" ${annotation.visible ? 'checked' : ''}>
          Visible
        </label>
      </div>
    `;

    let specificProperties = '';

    if (annotation.type === AnnotationType.ARROW) {
      const arrow = annotation as ArrowAnnotation;
      specificProperties = `
        <div class="annotation-property">
          <label class="annotation-property-label">Color</label>
          <input type="color" class="annotation-property-color" 
                 data-property="color" value="${arrow.color}">
        </div>
        
        <div class="annotation-property">
          <label class="annotation-property-label">Thickness</label>
          <input type="range" class="annotation-property-range" 
                 data-property="thickness" min="1" max="10" value="${arrow.thickness}">
        </div>
        
        <div class="annotation-property">
          <label class="annotation-property-label">Arrowhead Size</label>
          <input type="range" class="annotation-property-range" 
                 data-property="arrowHeadSize" min="5" max="20" value="${arrow.arrowHeadSize}">
        </div>
        
        <div class="annotation-property">
          <label class="annotation-property-label">Style</label>
          <select class="annotation-property-select" data-property="style">
            <option value="solid" ${arrow.style === 'solid' ? 'selected' : ''}>Solid</option>
            <option value="dashed" ${arrow.style === 'dashed' ? 'selected' : ''}>Dashed</option>
            <option value="dotted" ${arrow.style === 'dotted' ? 'selected' : ''}>Dotted</option>
          </select>
        </div>
      `;
    } else if (annotation.type === AnnotationType.HIGHLIGHT_BOX) {
      const box = annotation as HighlightBoxAnnotation;
      specificProperties = `
        <div class="annotation-property">
          <label class="annotation-property-label">Fill Color</label>
          <input type="color" class="annotation-property-color" 
                 data-property="color" value="${box.color}">
        </div>
        
        <div class="annotation-property">
          <label class="annotation-property-label">Border Color</label>
          <input type="color" class="annotation-property-color" 
                 data-property="borderColor" value="${box.borderColor || '#000000'}">
        </div>
        
        <div class="annotation-property">
          <label class="annotation-property-label">Border Width</label>
          <input type="range" class="annotation-property-range" 
                 data-property="borderWidth" min="0" max="5" value="${box.borderWidth}">
        </div>
        
        <div class="annotation-property">
          <label class="annotation-property-label">Corner Radius</label>
          <input type="range" class="annotation-property-range" 
                 data-property="cornerRadius" min="0" max="20" value="${box.cornerRadius}">
        </div>
        
        <div class="annotation-property">
          <label class="annotation-property-label">Style</label>
          <select class="annotation-property-select" data-property="style">
            <option value="solid" ${box.style === 'solid' ? 'selected' : ''}>Solid</option>
            <option value="dashed" ${box.style === 'dashed' ? 'selected' : ''}>Dashed</option>
            <option value="dotted" ${box.style === 'dotted' ? 'selected' : ''}>Dotted</option>
          </select>
        </div>
      `;
    }

    return specificProperties + commonProperties;
  }

  private setupPropertiesHandlers(annotation: Annotation): void {
    if (!this.propertiesPanel) return;

    this.propertiesPanel.querySelectorAll('[data-property]').forEach(input => {
      const element = input as HTMLInputElement | HTMLSelectElement;
      const property = element.dataset.property!;

      element.addEventListener('change', () => {
        const value = element.type === 'checkbox' ? 
          (element as HTMLInputElement).checked :
          element.type === 'range' || element.type === 'number' ?
            parseFloat(element.value) :
            element.value;

        this.manager.updateAnnotation(annotation.id, { [property]: value });
      });
    });
  }

  private toggleAnimationMode(): void {
    this.isAnimationMode = !this.isAnimationMode;
    
    if (this.animationControls) {
      this.animationControls.classList.toggle('hidden', !this.isAnimationMode);
    }

    // Update toolbar button state
    const animationButton = this.toolbar?.querySelector('[data-action="animation"]');
    if (animationButton) {
      animationButton.classList.toggle('active', this.isAnimationMode);
    }
  }

  private toggleUI(visible: boolean): void {
    if (this.toolbar) {
      this.toolbar.style.display = visible ? 'flex' : 'none';
    }
    if (this.propertiesPanel) {
      this.propertiesPanel.style.display = visible ? 'block' : 'none';
    }
  }

  private exportAnnotations(): void {
    const data = this.manager.exportAnnotations();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  private importAnnotations(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          this.manager.importAnnotations(data);
        } catch (error) {
          alert('Error importing annotations: Invalid file format');
        }
      };
      reader.readAsText(file);
    });
    
    input.click();
  }

  public showContextMenu(x: number, y: number, annotationId: string): void {
    if (!this.contextMenu) return;

    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.style.display = 'block';

    // Update context menu handlers
    this.contextMenu.querySelectorAll('[data-action]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (e.target as HTMLElement).closest('[data-action]')?.getAttribute('data-action');
        this.handleContextMenuAction(action!, annotationId);
        this.hideContextMenu();
      });
    });
  }

  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.style.display = 'none';
    }
  }

  private handleContextMenuAction(action: string, annotationId: string): void {
    switch (action) {
      case 'duplicate':
        // TODO: Implement duplication
        break;
      case 'bring-to-front':
        // TODO: Implement z-index management
        break;
      case 'send-to-back':
        // TODO: Implement z-index management
        break;
      case 'add-fade-in':
        this.addAnimationToAnnotation(annotationId, 'fade-in');
        break;
      case 'add-fade-out':
        this.addAnimationToAnnotation(annotationId, 'fade-out');
        break;
      case 'add-pulse':
        this.addAnimationToAnnotation(annotationId, 'pulse');
        break;
      case 'delete':
        this.manager.removeAnnotation(annotationId);
        break;
    }
  }

  private addAnimationToAnnotation(annotationId: string, animationType: string): void {
    let track;
    const duration = 2000; // Default 2 seconds

    switch (animationType) {
      case 'fade-in':
        track = createFadeInAnimation(annotationId, duration);
        break;
      case 'fade-out':
        track = createFadeOutAnimation(annotationId, duration);
        break;
      case 'pulse':
        track = createPulseAnimation(annotationId, duration);
        break;
      default:
        return;
    }

    this.animationPlayer.addTrack(track);
    
    // Switch to animation mode if not already active
    if (!this.isAnimationMode) {
      this.toggleAnimationMode();
    }
  }

  public dispose(): void {
    this.toolbar?.remove();
    this.propertiesPanel?.remove();
    this.animationControls?.remove();
    this.contextMenu?.remove();
    this.animationPlayer.dispose();
  }
}