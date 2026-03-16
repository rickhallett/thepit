import * as vscode from 'vscode';
import { AnnotationIndex } from './index';
import { Annotation } from './parser';

class AnnotationTreeItem extends vscode.TreeItem {
  constructor(
    public readonly annotation: Annotation | undefined,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    private isGroup: boolean = false,
    private children: Annotation[] = []
  ) {
    super(label, collapsibleState);

    if (annotation && !isGroup) {
      this.description = `${annotation.file}:${annotation.line + 1}`;
      this.tooltip = annotation.description;
      this.iconPath = new vscode.ThemeIcon(
        annotation.severity === 'risk' ? 'error' :
        annotation.severity === 'concern' ? 'warning' :
        annotation.severity === 'sound' ? 'pass' : 'info',
        new vscode.ThemeColor(
          annotation.severity === 'risk' ? 'errorForeground' :
          annotation.severity === 'concern' ? 'editorWarning.foreground' :
          annotation.severity === 'sound' ? 'testing.iconPassed' :
          'editorInfo.foreground'
        )
      );
      this.command = {
        command: 'pitreview.jumpToId',
        title: 'Jump to annotation',
        arguments: [annotation.id],
      };
    } else if (isGroup) {
      this.description = `${children.length}`;
    }
  }

  getChildren(): Annotation[] {
    return this.children;
  }
}

abstract class BaseAnnotationTreeProvider implements vscode.TreeDataProvider<AnnotationTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<AnnotationTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(protected idx: AnnotationIndex) {
    idx.onDidChange(() => this._onDidChangeTreeData.fire(undefined));
  }

  abstract getChildren(element?: AnnotationTreeItem): vscode.ProviderResult<AnnotationTreeItem[]>;

  getTreeItem(element: AnnotationTreeItem): vscode.TreeItem {
    return element;
  }

  protected makeLeaf(a: Annotation): AnnotationTreeItem {
    return new AnnotationTreeItem(a, a.id, vscode.TreeItemCollapsibleState.None);
  }

  protected makeGroup(label: string, children: Annotation[]): AnnotationTreeItem {
    return new AnnotationTreeItem(
      undefined,
      label,
      vscode.TreeItemCollapsibleState.Collapsed,
      true,
      children
    );
  }
}

export class ByFileTreeProvider extends BaseAnnotationTreeProvider {
  getChildren(element?: AnnotationTreeItem): AnnotationTreeItem[] {
    if (!element) {
      return this.idx.getFiles().map(f => {
        const annotations = this.idx.getByFile(f);
        return this.makeGroup(f, annotations);
      });
    }
    return element.getChildren().map(a => this.makeLeaf(a));
  }
}

export class BySeverityTreeProvider extends BaseAnnotationTreeProvider {
  getChildren(element?: AnnotationTreeItem): AnnotationTreeItem[] {
    if (!element) {
      return ['risk', 'concern', 'sound', 'info']
        .map(s => {
          const annotations = this.idx.getBySeverity(s);
          if (annotations.length === 0) return null;
          return this.makeGroup(s.toUpperCase(), annotations);
        })
        .filter((item): item is AnnotationTreeItem => item !== null);
    }
    return element.getChildren().map(a => this.makeLeaf(a));
  }
}

export class ByDomainTreeProvider extends BaseAnnotationTreeProvider {
  getChildren(element?: AnnotationTreeItem): AnnotationTreeItem[] {
    if (!element) {
      return this.idx.getDomains().map(d => {
        const annotations = this.idx.getByDomain(d);
        return this.makeGroup(d, annotations);
      });
    }
    return element.getChildren().map(a => this.makeLeaf(a));
  }
}
