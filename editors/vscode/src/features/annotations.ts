/**
 * Annotation commands for VS Code extension
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { extensionState } from "../state";

export interface AnnotationData {
  version: string;
  documentId: string;
  annotations: any[];
  animations: any[];
  metadata: {
    created: number;
    modified: number;
    author?: string;
    description?: string;
  };
}

export class AnnotationController {
  private static instance: AnnotationController | undefined;
  private annotationDataStore: Map<string, AnnotationData> = new Map();
  private currentDocumentId: string | null = null;

  private constructor(private context: vscode.ExtensionContext) {
    this.loadAnnotationsFromWorkspace();
  }

  public static getInstance(context?: vscode.ExtensionContext): AnnotationController {
    if (!AnnotationController.instance && context) {
      AnnotationController.instance = new AnnotationController(context);
    }
    return AnnotationController.instance!;
  }

  public registerCommands(): void {
    const commands = [
      vscode.commands.registerCommand('tinymist.toggleAnnotationMode', this.toggleAnnotationMode.bind(this)),
      vscode.commands.registerCommand('tinymist.annotationArrowTool', () => this.setAnnotationTool('arrow')),
      vscode.commands.registerCommand('tinymist.annotationHighlightTool', () => this.setAnnotationTool('highlight-box')),
      vscode.commands.registerCommand('tinymist.annotationSelectTool', () => this.setAnnotationTool(null)),
      vscode.commands.registerCommand('tinymist.exportAnnotations', this.exportAnnotations.bind(this)),
      vscode.commands.registerCommand('tinymist.importAnnotations', this.importAnnotations.bind(this)),
      vscode.commands.registerCommand('tinymist.clearAnnotations', this.clearAnnotations.bind(this)),
      vscode.commands.registerCommand('tinymist.saveAnnotations', this.saveAnnotations.bind(this)),
      vscode.commands.registerCommand('tinymist.loadAnnotations', this.loadAnnotations.bind(this)),
    ];

    commands.forEach(command => this.context.subscriptions.push(command));
  }

  private async toggleAnnotationMode(): Promise<void> {
    const activePanel = this.getActivePreviewPanel();
    if (!activePanel) {
      vscode.window.showWarningMessage('No active preview panel found');
      return;
    }

    activePanel.webview.postMessage({
      type: 'toggleAnnotationMode'
    });
  }

  private async setAnnotationTool(tool: string | null): Promise<void> {
    const activePanel = this.getActivePreviewPanel();
    if (!activePanel) {
      vscode.window.showWarningMessage('No active preview panel found');
      return;
    }

    activePanel.webview.postMessage({
      type: 'setAnnotationTool',
      tool: tool
    });
  }

  private async exportAnnotations(): Promise<void> {
    const activePanel = this.getActivePreviewPanel();
    if (!activePanel) {
      vscode.window.showWarningMessage('No active preview panel found');
      return;
    }

    // Request annotation data from webview
    activePanel.webview.postMessage({
      type: 'exportAnnotations'
    });

    // The webview will respond with annotation data via message handler
  }

  private async importAnnotations(): Promise<void> {
    const fileUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectMany: false,
      filters: {
        'Annotation Files': ['json']
      }
    });

    if (!fileUri || fileUri.length === 0) {
      return;
    }

    try {
      const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
      const annotationData = JSON.parse(fileContent.toString());

      const activePanel = this.getActivePreviewPanel();
      if (!activePanel) {
        vscode.window.showWarningMessage('No active preview panel found');
        return;
      }

      activePanel.webview.postMessage({
        type: 'importAnnotations',
        data: annotationData
      });

      vscode.window.showInformationMessage('Annotations imported successfully');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import annotations: ${error}`);
    }
  }

  private async clearAnnotations(): Promise<void> {
    const result = await vscode.window.showWarningMessage(
      'Are you sure you want to clear all annotations?',
      { modal: true },
      'Yes', 'No'
    );

    if (result === 'Yes') {
      const activePanel = this.getActivePreviewPanel();
      if (activePanel) {
        activePanel.webview.postMessage({
          type: 'importAnnotations',
          data: {
            version: '1.0.0',
            documentId: '',
            annotations: [],
            animations: [],
            metadata: {
              created: Date.now(),
              modified: Date.now()
            }
          }
        });
      }
    }
  }

  private async saveAnnotations(): Promise<void> {
    if (!this.currentDocumentId) {
      vscode.window.showWarningMessage('No active document');
      return;
    }

    const activePanel = this.getActivePreviewPanel();
    if (!activePanel) {
      vscode.window.showWarningMessage('No active preview panel found');
      return;
    }

    // Request current annotation data
    activePanel.webview.postMessage({
      type: 'exportAnnotations'
    });
  }

  private async loadAnnotations(): Promise<void> {
    if (!this.currentDocumentId) {
      vscode.window.showWarningMessage('No active document');
      return;
    }

    const annotationData = this.annotationDataStore.get(this.currentDocumentId);
    if (!annotationData) {
      vscode.window.showInformationMessage('No saved annotations found for this document');
      return;
    }

    const activePanel = this.getActivePreviewPanel();
    if (!activePanel) {
      vscode.window.showWarningMessage('No active preview panel found');
      return;
    }

    activePanel.webview.postMessage({
      type: 'importAnnotations',
      data: annotationData
    });
  }

  public setCurrentDocument(documentUri: vscode.Uri): void {
    this.currentDocumentId = documentUri.toString();
  }

  public handleAnnotationData(data: AnnotationData): void {
    if (this.currentDocumentId) {
      data.documentId = this.currentDocumentId;
      this.annotationDataStore.set(this.currentDocumentId, data);
      this.saveAnnotationsToWorkspace();
    }
  }

  private getActivePreviewPanel(): vscode.WebviewPanel | undefined {
    // Get the currently focusing preview panel from the extension state
    const focusingContext = extensionState.getFocusingPreviewPanelContext();
    return focusingContext?.panel;
  }

  private async saveAnnotationsToWorkspace(): Promise<void> {
    if (!vscode.workspace.workspaceFolders) {
      return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
    const annotationsDir = vscode.Uri.joinPath(workspaceRoot, '.vscode', 'tinymist-annotations');
    
    try {
      await vscode.workspace.fs.createDirectory(annotationsDir);
    } catch {
      // Directory might already exist
    }

    for (const [documentId, data] of this.annotationDataStore) {
      const fileName = this.getAnnotationFileName(documentId);
      const filePath = vscode.Uri.joinPath(annotationsDir, fileName);
      
      try {
        const content = JSON.stringify(data, null, 2);
        await vscode.workspace.fs.writeFile(filePath, Buffer.from(content));
      } catch (error) {
        console.error(`Failed to save annotations for ${documentId}:`, error);
      }
    }
  }

  private async loadAnnotationsFromWorkspace(): Promise<void> {
    if (!vscode.workspace.workspaceFolders) {
      return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
    const annotationsDir = vscode.Uri.joinPath(workspaceRoot, '.vscode', 'tinymist-annotations');
    
    try {
      const files = await vscode.workspace.fs.readDirectory(annotationsDir);
      
      for (const [fileName, fileType] of files) {
        if (fileType === vscode.FileType.File && fileName.endsWith('.json')) {
          try {
            const filePath = vscode.Uri.joinPath(annotationsDir, fileName);
            const content = await vscode.workspace.fs.readFile(filePath);
            const data: AnnotationData = JSON.parse(content.toString());
            
            if (data.documentId) {
              this.annotationDataStore.set(data.documentId, data);
            }
          } catch (error) {
            console.error(`Failed to load annotation file ${fileName}:`, error);
          }
        }
      }
    } catch {
      // Annotations directory doesn't exist yet
    }
  }

  private getAnnotationFileName(documentId: string): string {
    // Create a safe filename from the document URI
    const hash = require('crypto').createHash('sha256').update(documentId).digest('hex').substring(0, 16);
    return `annotations-${hash}.json`;
  }

  public dispose(): void {
    this.saveAnnotationsToWorkspace();
    this.annotationDataStore.clear();
    AnnotationController.instance = undefined;
  }
}

// Keybinding definitions for package.json
export const annotationKeybindings = [
  {
    "command": "tinymist.toggleAnnotationMode",
    "key": "ctrl+shift+a",
    "mac": "cmd+shift+a",
    "when": "tinymist.previewActive"
  },
  {
    "command": "tinymist.annotationArrowTool",
    "key": "ctrl+shift+1",
    "mac": "cmd+shift+1", 
    "when": "tinymist.annotationMode"
  },
  {
    "command": "tinymist.annotationHighlightTool",
    "key": "ctrl+shift+2",
    "mac": "cmd+shift+2",
    "when": "tinymist.annotationMode"
  },
  {
    "command": "tinymist.annotationSelectTool",
    "key": "ctrl+shift+0",
    "mac": "cmd+shift+0",
    "when": "tinymist.annotationMode"
  }
];

// Command definitions for package.json
export const annotationCommands = [
  {
    "command": "tinymist.toggleAnnotationMode",
    "title": "Toggle Annotation Mode",
    "category": "Tinymist"
  },
  {
    "command": "tinymist.annotationArrowTool",
    "title": "Select Arrow Tool",
    "category": "Tinymist"
  },
  {
    "command": "tinymist.annotationHighlightTool", 
    "title": "Select Highlight Tool",
    "category": "Tinymist"
  },
  {
    "command": "tinymist.annotationSelectTool",
    "title": "Select Annotation Tool",
    "category": "Tinymist"
  },
  {
    "command": "tinymist.exportAnnotations",
    "title": "Export Annotations",
    "category": "Tinymist"
  },
  {
    "command": "tinymist.importAnnotations",
    "title": "Import Annotations", 
    "category": "Tinymist"
  },
  {
    "command": "tinymist.clearAnnotations",
    "title": "Clear All Annotations",
    "category": "Tinymist"
  },
  {
    "command": "tinymist.saveAnnotations",
    "title": "Save Annotations",
    "category": "Tinymist"
  },
  {
    "command": "tinymist.loadAnnotations",
    "title": "Load Annotations",
    "category": "Tinymist"
  }
];