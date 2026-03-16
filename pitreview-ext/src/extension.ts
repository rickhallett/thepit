import * as vscode from 'vscode';
import { AnnotationIndex } from './index';
import { DecorationManager } from './decorations';
import { NavigationManager } from './navigation';
import { ByFileTreeProvider, BySeverityTreeProvider, ByDomainTreeProvider } from './tree';

let decorationManager: DecorationManager | undefined;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('pitreview');
  const prefixes = config.get<string[]>('prefixes', ['review', 'slop']);
  const scanDirs = config.get<string[]>('scanDirs', ['lib', 'app', 'components', 'db', 'src']);
  const extensions = config.get<string[]>('extensions', ['.ts', '.tsx', '.js', '.jsx']);

  // create the annotation index
  const idx = new AnnotationIndex(prefixes, scanDirs, extensions);

  // create managers
  const nav = new NavigationManager(idx);
  decorationManager = new DecorationManager(idx);

  // create tree view providers
  const byFileProvider = new ByFileTreeProvider(idx);
  const bySeverityProvider = new BySeverityTreeProvider(idx);
  const byDomainProvider = new ByDomainTreeProvider(idx);

  // register tree views
  context.subscriptions.push(
    vscode.window.createTreeView('pitreview.byFile', { treeDataProvider: byFileProvider }),
    vscode.window.createTreeView('pitreview.bySeverity', { treeDataProvider: bySeverityProvider }),
    vscode.window.createTreeView('pitreview.byDomain', { treeDataProvider: byDomainProvider }),
  );

  // create status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'pitreview.listAll';
  context.subscriptions.push(statusBarItem);

  // update status bar on editor change
  const updateStatusBar = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      statusBarItem.hide();
      return;
    }
    const fileAnnotations = idx.getByUri(editor.document.uri);
    if (fileAnnotations.length > 0) {
      const risk = fileAnnotations.filter(a => a.severity === 'risk').length;
      const concern = fileAnnotations.filter(a => a.severity === 'concern').length;
      const sound = fileAnnotations.filter(a => a.severity === 'sound').length;
      const parts: string[] = [];
      if (risk) parts.push(`${risk} risk`);
      if (concern) parts.push(`${concern} concern`);
      if (sound) parts.push(`${sound} sound`);
      statusBarItem.text = `$(search-fuzzy) ${fileAnnotations.length} annotations`;
      statusBarItem.tooltip = `PitReview: ${parts.join(', ')} (${idx.count} total)`;
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
  );

  // register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('pitreview.walkRisk', () => nav.walkRisk()),
    vscode.commands.registerCommand('pitreview.walkDomain', () => nav.walkDomain()),
    vscode.commands.registerCommand('pitreview.walkLayer', () => nav.walkLayer()),
    vscode.commands.registerCommand('pitreview.walkConnections', () => nav.walkConnections()),
    vscode.commands.registerCommand('pitreview.listAll', () => nav.listAll()),
    vscode.commands.registerCommand('pitreview.jumpToAnnotation', () => nav.jumpToAnnotation()),
    vscode.commands.registerCommand('pitreview.jumpToId', (id: string) => nav.jumpToId(id)),
    vscode.commands.registerCommand('pitreview.refresh', async () => {
      await idx.scan();
      vscode.window.showInformationMessage(`PitReview: ${idx.count} annotations indexed`);
    }),
  );

  // watch for file changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}');
  context.subscriptions.push(
    watcher,
    watcher.onDidChange(async uri => {
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        idx.updateDocument(doc);
      } catch { /* skip */ }
    }),
    watcher.onDidCreate(async uri => {
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        idx.updateDocument(doc);
      } catch { /* skip */ }
    }),
    watcher.onDidDelete(uri => {
      const rel = vscode.workspace.asRelativePath(uri);
      // remove from index via scan
      idx.scan();
    }),
  );

  // also update on document save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => {
      idx.updateDocument(doc);
      updateStatusBar();
    }),
  );

  // register decoration manager for cleanup
  context.subscriptions.push(decorationManager);

  // initial scan
  await idx.scan();
  updateStatusBar();

  // initial decoration
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    decorationManager.updateDecorations(editor);
  }

  vscode.window.showInformationMessage(
    `PitReview: ${idx.count} annotations indexed across ${idx.getFiles().length} files`
  );
}

export function deactivate(): void {
  decorationManager?.dispose();
  statusBarItem?.dispose();
}
