import * as vscode from 'vscode';
import { Annotation, parseAnnotationsFromDocument } from './parser';

export class AnnotationIndex {
  private annotations: Annotation[] = [];
  private byId: Map<string, Annotation> = new Map();
  private byFile: Map<string, Annotation[]> = new Map();
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private prefixes: string[], private scanDirs: string[], private extensions: string[]) {}

  get all(): Annotation[] {
    return this.annotations;
  }

  get count(): number {
    return this.annotations.length;
  }

  getById(id: string): Annotation | undefined {
    return this.byId.get(id.toUpperCase());
  }

  getByFile(relativePath: string): Annotation[] {
    return this.byFile.get(relativePath) || [];
  }

  getByUri(uri: vscode.Uri): Annotation[] {
    const rel = vscode.workspace.asRelativePath(uri);
    return this.getByFile(rel);
  }

  getBySeverity(severity: string): Annotation[] {
    return this.annotations.filter(a => a.severity === severity);
  }

  getByDomain(domain: string): Annotation[] {
    return this.annotations.filter(a => a.domain === domain);
  }

  getByLayer(layer: string): Annotation[] {
    return this.annotations.filter(a => a.layer === layer);
  }

  getDomains(): string[] {
    const domains = new Set<string>();
    for (const a of this.annotations) {
      if (a.domain) domains.add(a.domain);
    }
    return [...domains].sort();
  }

  getLayers(): string[] {
    const layers = new Set<string>();
    for (const a of this.annotations) {
      if (a.layer) layers.add(a.layer);
    }
    return [...layers].sort();
  }

  getFiles(): string[] {
    return [...this.byFile.keys()].sort();
  }

  walkGraph(startId: string): Annotation[] {
    const visited: Annotation[] = [];
    const seen = new Set<string>();
    const queue = [startId.toUpperCase()];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;
      seen.add(current);

      const annotation = this.byId.get(current);
      if (annotation) {
        visited.push(annotation);
        for (const c of annotation.connects) {
          if (!seen.has(c.toUpperCase())) {
            queue.push(c.toUpperCase());
          }
        }
      }
    }

    return visited;
  }

  async scan(): Promise<void> {
    this.annotations = [];
    this.byId.clear();
    this.byFile.clear();

    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return;

    for (const folder of folders) {
      for (const dir of this.scanDirs) {
        for (const ext of this.extensions) {
          const pattern = new vscode.RelativePattern(folder, `${dir}/**/*${ext}`);
          const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 5000);

          for (const fileUri of files) {
            try {
              const doc = await vscode.workspace.openTextDocument(fileUri);
              const fileAnnotations = parseAnnotationsFromDocument(doc, this.prefixes);
              if (fileAnnotations.length > 0) {
                this.annotations.push(...fileAnnotations);
                const rel = vscode.workspace.asRelativePath(fileUri);
                this.byFile.set(rel, fileAnnotations);
              }
            } catch {
              // skip unreadable files
            }
          }
        }
      }
    }

    // build ID index
    for (const a of this.annotations) {
      this.byId.set(a.id.toUpperCase(), a);
    }

    this._onDidChange.fire();
  }

  updateDocument(document: vscode.TextDocument): void {
    const rel = vscode.workspace.asRelativePath(document.uri);

    // remove old annotations for this file
    this.annotations = this.annotations.filter(a => a.file !== rel);
    this.byFile.delete(rel);

    // re-parse
    const fileAnnotations = parseAnnotationsFromDocument(document, this.prefixes);
    if (fileAnnotations.length > 0) {
      this.annotations.push(...fileAnnotations);
      this.byFile.set(rel, fileAnnotations);
    }

    // rebuild ID index
    this.byId.clear();
    for (const a of this.annotations) {
      this.byId.set(a.id.toUpperCase(), a);
    }

    this._onDidChange.fire();
  }
}
