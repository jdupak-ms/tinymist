/**
 * Annotation system for Typst preview
 * Provides overlay functionality for arrows, highlight boxes, and animations
 */

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum AnnotationType {
  ARROW = 'arrow',
  HIGHLIGHT_BOX = 'highlight-box'
}

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  pageNumber: number;
  zIndex: number;
  opacity: number;
  visible: boolean;
  created: number;
  modified: number;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: AnnotationType.ARROW;
  start: Point;
  end: Point;
  color: string;
  thickness: number;
  arrowHeadSize: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface HighlightBoxAnnotation extends BaseAnnotation {
  type: AnnotationType.HIGHLIGHT_BOX;
  bounds: Bounds;
  color: string;
  borderColor?: string;
  borderWidth: number;
  cornerRadius: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export type Annotation = ArrowAnnotation | HighlightBoxAnnotation;

export interface AnimationKeyframe {
  time: number; // Time in milliseconds
  properties: Partial<Annotation>;
}

export interface AnimationTrack {
  annotationId: string;
  keyframes: AnimationKeyframe[];
  duration: number;
  loop: boolean;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface AnnotationDocument {
  version: string;
  documentId: string;
  annotations: Annotation[];
  animations: AnimationTrack[];
  metadata: {
    created: number;
    modified: number;
    author?: string;
    description?: string;
  };
}

export class AnnotationManager {
  private annotations: Map<string, Annotation> = new Map();
  private animations: Map<string, AnimationTrack> = new Map();
  private selectedAnnotation: string | null = null;
  private isEditMode: boolean = false;
  private currentTool: AnnotationType | null = null;
  private overlayContainer: SVGElement | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(private containerElement: HTMLElement) {
    this.setupOverlay();
    this.setupEventListeners();
  }

  private setupOverlay(): void {
    // Create SVG overlay that sits on top of the typst content
    this.overlayContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.overlayContainer.id = 'annotation-overlay';
    this.overlayContainer.style.position = 'absolute';
    this.overlayContainer.style.top = '0';
    this.overlayContainer.style.left = '0';
    this.overlayContainer.style.width = '100%';
    this.overlayContainer.style.height = '100%';
    this.overlayContainer.style.pointerEvents = 'none';
    this.overlayContainer.style.zIndex = '1000';
    
    // Create groups for different types of annotations
    const arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    arrowGroup.id = 'annotation-arrows';
    this.overlayContainer.appendChild(arrowGroup);
    
    const highlightGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    highlightGroup.id = 'annotation-highlights';
    this.overlayContainer.appendChild(highlightGroup);
    
    this.containerElement.appendChild(this.overlayContainer);
  }

  private setupEventListeners(): void {
    // Setup mouse events for creating and editing annotations
    this.containerElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.containerElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.containerElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.containerElement.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.isEditMode || !this.currentTool) return;
    
    const point = this.getRelativePoint(event);
    this.startCreatingAnnotation(point);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isEditMode) return;
    
    const point = this.getRelativePoint(event);
    this.updateCreatingAnnotation(point);
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isEditMode) return;
    
    const point = this.getRelativePoint(event);
    this.finishCreatingAnnotation(point);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' && this.selectedAnnotation) {
      this.removeAnnotation(this.selectedAnnotation);
    }
  }

  private getRelativePoint(event: MouseEvent): Point {
    const rect = this.containerElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private startCreatingAnnotation(point: Point): void {
    // Implementation depends on current tool
    // This will be expanded in subsequent iterations
  }

  private updateCreatingAnnotation(point: Point): void {
    // Update preview of annotation being created
  }

  private finishCreatingAnnotation(point: Point): void {
    // Finalize annotation creation
  }

  public addAnnotation(annotation: Annotation): void {
    this.annotations.set(annotation.id, annotation);
    this.renderAnnotation(annotation);
    this.emit('annotationAdded', annotation);
  }

  public removeAnnotation(id: string): void {
    const annotation = this.annotations.get(id);
    if (annotation) {
      this.annotations.delete(id);
      this.removeAnnotationElement(id);
      this.emit('annotationRemoved', annotation);
    }
  }

  public updateAnnotation(id: string, updates: Partial<Annotation>): void {
    const annotation = this.annotations.get(id);
    if (annotation) {
      const updated = { ...annotation, ...updates, modified: Date.now() } as Annotation;
      this.annotations.set(id, updated);
      this.renderAnnotation(updated);
      this.emit('annotationUpdated', updated);
    }
  }

  public selectAnnotation(id: string | null): void {
    // Clear previous selection
    if (this.selectedAnnotation) {
      this.updateAnnotationSelection(this.selectedAnnotation, false);
    }
    
    this.selectedAnnotation = id;
    
    // Show new selection
    if (id) {
      this.updateAnnotationSelection(id, true);
    }
    
    this.emit('selectionChanged', id);
  }

  private updateAnnotationSelection(id: string, selected: boolean): void {
    const element = document.getElementById(`annotation-${id}`);
    if (element) {
      if (selected) {
        element.classList.add('annotation-selected');
      } else {
        element.classList.remove('annotation-selected');
      }
    }
  }

  public setEditMode(enabled: boolean): void {
    this.isEditMode = enabled;
    if (this.overlayContainer) {
      this.overlayContainer.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    this.emit('editModeChanged', enabled);
  }

  public setCurrentTool(tool: AnnotationType | null): void {
    this.currentTool = tool;
    this.emit('toolChanged', tool);
  }

  private renderAnnotation(annotation: Annotation): void {
    // Remove existing element if it exists
    this.removeAnnotationElement(annotation.id);
    
    let element: SVGElement;
    
    switch (annotation.type) {
      case AnnotationType.ARROW:
        element = this.createArrowElement(annotation as ArrowAnnotation);
        break;
      case AnnotationType.HIGHLIGHT_BOX:
        element = this.createHighlightBoxElement(annotation as HighlightBoxAnnotation);
        break;
      default:
        return;
    }
    
    element.id = `annotation-${annotation.id}`;
    element.style.opacity = annotation.opacity.toString();
    element.style.visibility = annotation.visible ? 'visible' : 'hidden';
    element.style.zIndex = annotation.zIndex.toString();
    
    // Add interaction handlers
    element.style.pointerEvents = 'auto';
    element.addEventListener('click', () => this.selectAnnotation(annotation.id));
    
    const targetGroup = annotation.type === AnnotationType.ARROW ? 
      document.getElementById('annotation-arrows') :
      document.getElementById('annotation-highlights');
    
    if (targetGroup) {
      targetGroup.appendChild(element);
    }
  }

  private createArrowElement(annotation: ArrowAnnotation): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Create arrow line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', annotation.start.x.toString());
    line.setAttribute('y1', annotation.start.y.toString());
    line.setAttribute('x2', annotation.end.x.toString());
    line.setAttribute('y2', annotation.end.y.toString());
    line.setAttribute('stroke', annotation.color);
    line.setAttribute('stroke-width', annotation.thickness.toString());
    line.setAttribute('stroke-dasharray', this.getStrokeDashArray(annotation.style));
    
    // Create arrowhead
    const arrowhead = this.createArrowhead(annotation);
    
    group.appendChild(line);
    group.appendChild(arrowhead);
    
    return group;
  }

  private createHighlightBoxElement(annotation: HighlightBoxAnnotation): SVGElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', annotation.bounds.x.toString());
    rect.setAttribute('y', annotation.bounds.y.toString());
    rect.setAttribute('width', annotation.bounds.width.toString());
    rect.setAttribute('height', annotation.bounds.height.toString());
    rect.setAttribute('fill', annotation.color);
    rect.setAttribute('rx', annotation.cornerRadius.toString());
    
    if (annotation.borderColor && annotation.borderWidth > 0) {
      rect.setAttribute('stroke', annotation.borderColor);
      rect.setAttribute('stroke-width', annotation.borderWidth.toString());
      rect.setAttribute('stroke-dasharray', this.getStrokeDashArray(annotation.style));
    }
    
    return rect;
  }

  private createArrowhead(annotation: ArrowAnnotation): SVGElement {
    const { start, end, color, arrowHeadSize } = annotation;
    
    // Calculate arrow direction
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    
    // Create arrowhead polygon
    const arrowhead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    
    const headLength = arrowHeadSize;
    const headAngle = Math.PI / 6; // 30 degrees
    
    const x1 = end.x - headLength * Math.cos(angle - headAngle);
    const y1 = end.y - headLength * Math.sin(angle - headAngle);
    const x2 = end.x - headLength * Math.cos(angle + headAngle);
    const y2 = end.y - headLength * Math.sin(angle + headAngle);
    
    const points = `${end.x},${end.y} ${x1},${y1} ${x2},${y2}`;
    arrowhead.setAttribute('points', points);
    arrowhead.setAttribute('fill', color);
    
    return arrowhead;
  }

  private getStrokeDashArray(style: string): string {
    switch (style) {
      case 'dashed':
        return '5,5';
      case 'dotted':
        return '2,2';
      default:
        return 'none';
    }
  }

  private removeAnnotationElement(id: string): void {
    const element = document.getElementById(`annotation-${id}`);
    if (element) {
      element.remove();
    }
  }

  public exportAnnotations(): AnnotationDocument {
    return {
      version: '1.0.0',
      documentId: '', // Will be set based on current document
      annotations: Array.from(this.annotations.values()),
      animations: Array.from(this.animations.values()),
      metadata: {
        created: Date.now(),
        modified: Date.now()
      }
    };
  }

  public importAnnotations(doc: AnnotationDocument): void {
    this.clearAllAnnotations();
    
    doc.annotations.forEach(annotation => {
      this.addAnnotation(annotation);
    });
    
    doc.animations.forEach(animation => {
      this.animations.set(animation.annotationId, animation);
    });
    
    this.emit('annotationsImported', doc);
  }

  public clearAllAnnotations(): void {
    this.annotations.clear();
    this.animations.clear();
    
    const arrowGroup = document.getElementById('annotation-arrows');
    const highlightGroup = document.getElementById('annotation-highlights');
    
    if (arrowGroup) arrowGroup.innerHTML = '';
    if (highlightGroup) highlightGroup.innerHTML = '';
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  public dispose(): void {
    this.clearAllAnnotations();
    this.eventListeners.clear();
    
    if (this.overlayContainer) {
      this.overlayContainer.remove();
    }
  }
}