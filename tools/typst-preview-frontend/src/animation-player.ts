/**
 * Animation system for annotation management
 * Provides timeline-based animations for arrows and highlight boxes
 */

import { AnnotationManager, Annotation, AnimationTrack, AnimationKeyframe } from './annotations';

export interface AnimationPlayerOptions {
  duration?: number;
  loop?: boolean;
  autoPlay?: boolean;
  speed?: number;
}

export class AnimationPlayer {
  private manager: AnnotationManager;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private animationId: number | null = null;
  private tracks: Map<string, AnimationTrack> = new Map();
  private startTime: number = 0;
  private totalDuration: number = 0;
  private speed: number = 1;
  private loop: boolean = false;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(manager: AnnotationManager, options: AnimationPlayerOptions = {}) {
    this.manager = manager;
    this.speed = options.speed || 1;
    this.loop = options.loop || false;
    
    if (options.autoPlay) {
      this.play();
    }
  }

  public addTrack(track: AnimationTrack): void {
    this.tracks.set(track.annotationId, track);
    this.calculateTotalDuration();
    this.emit('trackAdded', track);
  }

  public removeTrack(annotationId: string): void {
    const track = this.tracks.get(annotationId);
    if (track) {
      this.tracks.delete(annotationId);
      this.calculateTotalDuration();
      this.emit('trackRemoved', track);
    }
  }

  public clearTracks(): void {
    this.tracks.clear();
    this.totalDuration = 0;
    this.emit('tracksCleared');
  }

  public play(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now() - this.currentTime / this.speed;
    this.animate();
    this.emit('play');
  }

  public pause(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.isPaused = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.emit('pause');
  }

  public stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTime = 0;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.seekTo(0);
    this.emit('stop');
  }

  public seekTo(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.totalDuration));
    this.applyAnimationsAtTime(this.currentTime);
    this.emit('timeUpdate', this.currentTime);
  }

  public stepForward(stepSize: number = 100): void {
    this.seekTo(this.currentTime + stepSize);
  }

  public stepBackward(stepSize: number = 100): void {
    this.seekTo(this.currentTime - stepSize);
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(speed, 5.0));
    if (this.isPlaying) {
      this.startTime = performance.now() - this.currentTime / this.speed;
    }
    this.emit('speedChanged', this.speed);
  }

  public setLoop(loop: boolean): void {
    this.loop = loop;
    this.emit('loopChanged', loop);
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getTotalDuration(): number {
    return this.totalDuration;
  }

  public getProgress(): number {
    return this.totalDuration > 0 ? this.currentTime / this.totalDuration : 0;
  }

  public isAnimationPlaying(): boolean {
    return this.isPlaying;
  }

  public isAnimationPaused(): boolean {
    return this.isPaused;
  }

  private animate(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    this.currentTime = (now - this.startTime) * this.speed;

    if (this.currentTime >= this.totalDuration) {
      if (this.loop) {
        this.currentTime = 0;
        this.startTime = now;
      } else {
        this.currentTime = this.totalDuration;
        this.stop();
        this.emit('finished');
        return;
      }
    }

    this.applyAnimationsAtTime(this.currentTime);
    this.emit('timeUpdate', this.currentTime);

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private applyAnimationsAtTime(time: number): void {
    for (const [annotationId, track] of this.tracks) {
      const annotation = this.manager['annotations'].get(annotationId);
      if (!annotation) continue;

      const animatedProperties = this.interpolateTrackAtTime(track, time);
      if (animatedProperties) {
        // Apply the animated properties to the annotation
        this.manager.updateAnnotation(annotationId, animatedProperties);
      }
    }
  }

  private interpolateTrackAtTime(track: AnimationTrack, time: number): Partial<Annotation> | null {
    if (track.keyframes.length === 0) return null;

    // Handle time outside track duration
    if (time <= 0) {
      return track.keyframes[0].properties as Partial<Annotation>;
    }
    if (time >= track.duration) {
      return track.keyframes[track.keyframes.length - 1].properties as Partial<Annotation>;
    }

    // Find the keyframes to interpolate between
    let prevKeyframe: AnimationKeyframe | null = null;
    let nextKeyframe: AnimationKeyframe | null = null;

    for (let i = 0; i < track.keyframes.length; i++) {
      const keyframe = track.keyframes[i];
      if (keyframe.time <= time) {
        prevKeyframe = keyframe;
      }
      if (keyframe.time >= time && !nextKeyframe) {
        nextKeyframe = keyframe;
        break;
      }
    }

    // If we have an exact match, return it
    if (prevKeyframe && prevKeyframe.time === time) {
      return prevKeyframe.properties as Partial<Annotation>;
    }

    // If we only have one keyframe or we're at the end, return the last one
    if (!nextKeyframe || !prevKeyframe) {
      const keyframe = nextKeyframe || prevKeyframe || track.keyframes[0];
      return keyframe.properties as Partial<Annotation>;
    }

    // Interpolate between keyframes
    const t = (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
    const easedT = this.applyEasing(t, track.easing);

    return this.interpolateProperties(
      prevKeyframe.properties,
      nextKeyframe.properties,
      easedT
    );
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - (1 - t) * (1 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
      case 'linear':
      default:
        return t;
    }
  }

  private interpolateProperties(prev: any, next: any, t: number): Partial<Annotation> {
    const result: any = {};

    for (const key in next) {
      if (prev.hasOwnProperty(key)) {
        const prevValue = prev[key];
        const nextValue = next[key];

        if (typeof prevValue === 'number' && typeof nextValue === 'number') {
          result[key] = prevValue + (nextValue - prevValue) * t;
        } else if (this.isPoint(prevValue) && this.isPoint(nextValue)) {
          result[key] = {
            x: prevValue.x + (nextValue.x - prevValue.x) * t,
            y: prevValue.y + (nextValue.y - prevValue.y) * t
          };
        } else if (this.isBounds(prevValue) && this.isBounds(nextValue)) {
          result[key] = {
            x: prevValue.x + (nextValue.x - prevValue.x) * t,
            y: prevValue.y + (nextValue.y - prevValue.y) * t,
            width: prevValue.width + (nextValue.width - prevValue.width) * t,
            height: prevValue.height + (nextValue.height - prevValue.height) * t
          };
        } else if (this.isColor(prevValue) && this.isColor(nextValue)) {
          result[key] = this.interpolateColor(prevValue, nextValue, t);
        } else {
          // For non-interpolatable values, use threshold interpolation
          result[key] = t < 0.5 ? prevValue : nextValue;
        }
      } else {
        result[key] = next[key];
      }
    }

    return result;
  }

  private isPoint(value: any): boolean {
    return value && typeof value.x === 'number' && typeof value.y === 'number';
  }

  private isBounds(value: any): boolean {
    return value && 
           typeof value.x === 'number' && 
           typeof value.y === 'number' &&
           typeof value.width === 'number' && 
           typeof value.height === 'number';
  }

  private isColor(value: any): boolean {
    return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return t < 0.5 ? color1 : color2;

    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

    return this.rgbToHex(r, g, b);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private calculateTotalDuration(): void {
    this.totalDuration = 0;
    for (const track of this.tracks.values()) {
      this.totalDuration = Math.max(this.totalDuration, track.duration);
    }
    this.emit('durationChanged', this.totalDuration);
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
    this.stop();
    this.clearTracks();
    this.eventListeners.clear();
  }
}

// Utility functions for creating animation tracks

export function createFadeInAnimation(annotationId: string, duration: number = 1000): AnimationTrack {
  return {
    annotationId,
    keyframes: [
      { time: 0, properties: { opacity: 0 } },
      { time: duration, properties: { opacity: 1 } }
    ],
    duration,
    loop: false,
    easing: 'ease-in-out'
  };
}

export function createFadeOutAnimation(annotationId: string, duration: number = 1000): AnimationTrack {
  return {
    annotationId,
    keyframes: [
      { time: 0, properties: { opacity: 1 } },
      { time: duration, properties: { opacity: 0 } }
    ],
    duration,
    loop: false,
    easing: 'ease-in-out'
  };
}

export function createMoveAnimation(
  annotationId: string, 
  fromPoint: { x: number; y: number }, 
  toPoint: { x: number; y: number }, 
  duration: number = 2000
): AnimationTrack {
  return {
    annotationId,
    keyframes: [
      { time: 0, properties: { start: fromPoint } },
      { time: duration, properties: { start: toPoint } }
    ],
    duration,
    loop: false,
    easing: 'ease-in-out'
  };
}

export function createScaleAnimation(
  annotationId: string,
  fromScale: number,
  toScale: number,
  duration: number = 1500
): AnimationTrack {
  // This would need to be adapted based on the specific annotation type
  return {
    annotationId,
    keyframes: [
      { time: 0, properties: { thickness: fromScale } },
      { time: duration, properties: { thickness: toScale } }
    ],
    duration,
    loop: false,
    easing: 'ease-in-out'
  };
}

export function createColorChangeAnimation(
  annotationId: string,
  fromColor: string,
  toColor: string,
  duration: number = 1000
): AnimationTrack {
  return {
    annotationId,
    keyframes: [
      { time: 0, properties: { color: fromColor } },
      { time: duration, properties: { color: toColor } }
    ],
    duration,
    loop: false,
    easing: 'linear'
  };
}

export function createPulseAnimation(annotationId: string, duration: number = 2000): AnimationTrack {
  return {
    annotationId,
    keyframes: [
      { time: 0, properties: { opacity: 1 } },
      { time: duration / 2, properties: { opacity: 0.3 } },
      { time: duration, properties: { opacity: 1 } }
    ],
    duration,
    loop: true,
    easing: 'ease-in-out'
  };
}