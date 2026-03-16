import * as vscode from 'vscode';
import { AnnotationIndex } from './index';
import { Annotation } from './parser';

const SEVERITY_COLOURS: Record<string, { gutter: string; bg: string; border: string }> = {
  risk: { gutter: '#f7768e', bg: 'rgba(247, 118, 142, 0.08)', border: 'rgba(247, 118, 142, 0.3)' },
  concern: { gutter: '#ff9e64', bg: 'rgba(255, 158, 100, 0.08)', border: 'rgba(255, 158, 100, 0.3)' },
  sound: { gutter: '#9ece6a', bg: 'rgba(158, 206, 106, 0.08)', border: 'rgba(158, 206, 106, 0.3)' },
  info: { gutter: '#7dcfff', bg: 'rgba(125, 207, 255, 0.08)', border: 'rgba(125, 207, 255, 0.3)' },
};

export class DecorationManager {
  private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor(private idx: AnnotationIndex) {
    // create decoration types for each severity
    for (const [severity, colours] of Object.entries(SEVERITY_COLOURS)) {
      const dt = vscode.window.createTextEditorDecorationType({
        gutterIconPath: this.createGutterIcon(colours.gutter),
        gutterIconSize: 'contain',
        backgroundColor: colours.bg,
        borderColor: colours.border,
        borderWidth: '0 0 0 3px',
        borderStyle: 'solid',
        isWholeLine: true,
        overviewRulerColor: colours.gutter,
        overviewRulerLane: vscode.OverviewRulerLane.Left,
      });
      this.decorationTypes.set(severity, dt);
    }

    // listen for editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) this.updateDecorations(editor);
      }),
      vscode.workspace.onDidChangeTextDocument(e => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === e.document) {
          this.updateDecorations(editor);
        }
      }),
      idx.onDidChange(() => {
        const editor = vscode.window.activeTextEditor;
        if (editor) this.updateDecorations(editor);
      }),
    );
  }

  private createGutterIcon(colour: string): vscode.Uri {
    // SVG data URI for a small circle
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5" fill="${colour}" opacity="0.9"/>
    </svg>`;
    return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  }

  updateDecorations(editor: vscode.TextEditor): void {
    const annotations = this.idx.getByUri(editor.document.uri);

    // group by severity
    const bySeverity: Map<string, vscode.DecorationOptions[]> = new Map();
    for (const sev of Object.keys(SEVERITY_COLOURS)) {
      bySeverity.set(sev, []);
    }

    for (const a of annotations) {
      const range = new vscode.Range(a.line, 0, a.endLine, 0);
      const hoverMessage = this.buildHoverMarkdown(a);
      const options: vscode.DecorationOptions = { range, hoverMessage };
      const list = bySeverity.get(a.severity);
      if (list) list.push(options);
      else bySeverity.get('info')!.push(options);
    }

    for (const [severity, decorations] of bySeverity) {
      const dt = this.decorationTypes.get(severity);
      if (dt) editor.setDecorations(dt, decorations);
    }
  }

  private buildHoverMarkdown(a: Annotation): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    const severityBadge = `**\`${a.severity.toUpperCase()}\`**`;
    const domainBadge = a.domain ? ` | \`${a.domain}\`` : '';

    md.appendMarkdown(`### @${a.prefix}(${a.id}) ${severityBadge}${domainBadge}\n\n`);
    md.appendMarkdown(`${a.description}\n\n`);

    if (a.connects.length > 0) {
      md.appendMarkdown(`**Connects:** `);
      const links = a.connects.map(c =>
        `[${c}](command:pitreview.jumpToId?${encodeURIComponent(JSON.stringify(c))})`
      );
      md.appendMarkdown(links.join(', '));
      md.appendMarkdown('\n\n');
    }

    if (a.layer) {
      md.appendMarkdown(`*Layer: ${a.layer}*\n`);
    }

    return md;
  }

  dispose(): void {
    for (const dt of this.decorationTypes.values()) {
      dt.dispose();
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
