import * as vscode from 'vscode';
import { AnnotationIndex } from './index';
import { Annotation } from './parser';

export class NavigationManager {
  constructor(private idx: AnnotationIndex) {}

  async jumpToAnnotation(): Promise<void> {
    const items = this.idx.all.map(a => ({
      label: `$(${this.severityIcon(a.severity)}) ${a.id}`,
      description: `[${a.severity}] ${a.domain}`,
      detail: a.description,
      annotation: a,
    }));

    const pick = await vscode.window.showQuickPick(items, {
      placeHolder: 'Jump to annotation...',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (pick) {
      await this.revealAnnotation(pick.annotation);
    }
  }

  async jumpToId(id: string): Promise<void> {
    const annotation = this.idx.getById(id);
    if (annotation) {
      await this.revealAnnotation(annotation);
    } else {
      vscode.window.showWarningMessage(`Annotation '${id}' not found`);
    }
  }

  async walkRisk(): Promise<void> {
    const findings = this.idx.getBySeverity('risk');
    if (findings.length === 0) {
      vscode.window.showInformationMessage('No risk findings found');
      return;
    }
    await this.walkSequence(`Risk Findings (${findings.length})`, findings);
  }

  async walkDomain(): Promise<void> {
    const domains = this.idx.getDomains();
    if (domains.length === 0) {
      vscode.window.showInformationMessage('No domains found');
      return;
    }

    const pick = await vscode.window.showQuickPick(
      domains.map(d => {
        const count = this.idx.getByDomain(d).length;
        return { label: d, description: `${count} annotations` };
      }),
      { placeHolder: 'Select domain to walk...' }
    );

    if (pick) {
      const findings = this.idx.getByDomain(pick.label);
      await this.walkSequence(`Domain: ${pick.label} (${findings.length})`, findings);
    }
  }

  async walkLayer(): Promise<void> {
    const layers = this.idx.getLayers();
    if (layers.length === 0) {
      vscode.window.showInformationMessage('No layers found');
      return;
    }

    const pick = await vscode.window.showQuickPick(
      layers.map(l => {
        const count = this.idx.getByLayer(l).length;
        return { label: l, description: `${count} annotations` };
      }),
      { placeHolder: 'Select layer to walk...' }
    );

    if (pick) {
      const findings = this.idx.getByLayer(pick.label);
      await this.walkSequence(`Layer: ${pick.label} (${findings.length})`, findings);
    }
  }

  async walkConnections(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // find annotation at or near cursor
    const cursorLine = editor.selection.active.line;
    const fileAnnotations = this.idx.getByUri(editor.document.uri);
    const nearest = fileAnnotations.find(a => cursorLine >= a.line && cursorLine <= a.endLine + 5);

    if (!nearest) {
      // fall back to picker
      const pick = await vscode.window.showQuickPick(
        this.idx.all.filter(a => a.connects.length > 0).map(a => ({
          label: `${a.id}`,
          description: `connects to: ${a.connects.join(', ')}`,
          annotation: a,
        })),
        { placeHolder: 'Select starting annotation for graph walk...' }
      );
      if (!pick) return;
      const graph = this.idx.walkGraph(pick.annotation.id);
      await this.walkSequence(`Connection graph from ${pick.annotation.id} (${graph.length})`, graph);
      return;
    }

    const graph = this.idx.walkGraph(nearest.id);
    await this.walkSequence(`Connection graph from ${nearest.id} (${graph.length})`, graph);
  }

  async listAll(): Promise<void> {
    const items = this.idx.all
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
      .map(a => ({
        label: `$(${this.severityIcon(a.severity)}) ${a.id}`,
        description: `${a.file}:${a.line + 1}`,
        detail: a.description,
        annotation: a,
      }));

    const pick = await vscode.window.showQuickPick(items, {
      placeHolder: `${items.length} annotations - select to jump`,
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (pick) {
      await this.revealAnnotation(pick.annotation);
    }
  }

  private async walkSequence(title: string, annotations: Annotation[]): Promise<void> {
    const sorted = [...annotations].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const action = await vscode.window.showQuickPick(
        [
          {
            label: `$(arrow-right) ${a.id} [${a.severity}]`,
            description: `${a.file}:${a.line + 1}`,
            detail: a.description,
            value: 'show' as const,
          },
          ...(i < sorted.length - 1
            ? [{ label: '$(arrow-down) Next', description: `${sorted[i + 1].id}`, detail: '', value: 'next' as const }]
            : []),
          { label: '$(close) Stop walking', description: '', detail: '', value: 'stop' as const },
        ],
        {
          placeHolder: `${title} [${i + 1}/${sorted.length}]`,
        }
      );

      if (!action || action.value === 'stop') return;

      await this.revealAnnotation(a);

      if (action.value === 'show' && i < sorted.length - 1) {
        // stay on this item - user can click next on next iteration
        // but we want to show the code first, so just continue
      }
    }

    vscode.window.showInformationMessage(`Walk complete: ${title}`);
  }

  async revealAnnotation(a: Annotation): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(a.uri);
    const editor = await vscode.window.showTextDocument(doc, {
      preview: true,
      preserveFocus: false,
    });

    const range = new vscode.Range(a.line, 0, a.line, 0);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    editor.selection = new vscode.Selection(a.line, 0, a.line, 0);
  }

  private severityIcon(severity: string): string {
    switch (severity) {
      case 'risk': return 'error';
      case 'concern': return 'warning';
      case 'sound': return 'pass';
      case 'info': return 'info';
      default: return 'circle-outline';
    }
  }
}
