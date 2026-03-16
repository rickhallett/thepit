import * as vscode from 'vscode';

export interface Annotation {
  id: string;
  prefix: string;
  file: string;
  uri: vscode.Uri;
  line: number;
  endLine: number;
  description: string;
  severity: string;
  domain: string;
  connects: string[];
  layer: string;
}

const META_PATTERN = /\[(\w+):([^\]]+)\]/g;

export function parseAnnotationsFromDocument(
  document: vscode.TextDocument,
  prefixes: string[]
): Annotation[] {
  const annotations: Annotation[] = [];
  const prefixAlts = prefixes.join('|');
  const pattern = new RegExp(
    `//\\s*@(${prefixAlts})\\(([^)]+)\\)\\s*(.*)`,
  );

  const lines = document.getText().split('\n');
  let i = 0;

  while (i < lines.length) {
    const m = pattern.exec(lines[i].trimStart());
    if (m) {
      const prefix = m[1];
      const findingId = m[2].trim();
      const descParts = [m[3].trim()];

      // collect continuation lines
      let j = i + 1;
      while (j < lines.length) {
        const cont = lines[j].trimStart();
        if (cont.startsWith('//') && !cont.match(new RegExp(`//\\s*@(${prefixAlts})\\(`))) {
          const contText = cont.replace(/^\/\/\s*/, '').trim();
          if (contText) {
            descParts.push(contText);
          }
          j++;
        } else {
          break;
        }
      }

      const fullDesc = descParts.join(' ');

      // extract metadata
      let severity = 'info';
      let domain = '';
      let connects: string[] = [];
      let match: RegExpExecArray | null;
      const metaRegex = new RegExp(META_PATTERN.source, 'g');
      while ((match = metaRegex.exec(fullDesc)) !== null) {
        const key = match[1];
        const val = match[2];
        if (key === 'severity') severity = val;
        else if (key === 'domain') domain = val;
        else if (key === 'connects') connects = val.split(',').map(c => c.trim());
      }

      // clean description
      const cleanDesc = fullDesc.replace(META_PATTERN, '').trim();

      // extract layer from ID
      const layerMatch = findingId.match(/^(L\d+)/);
      const layer = layerMatch ? layerMatch[1] : '';

      annotations.push({
        id: findingId,
        prefix,
        file: vscode.workspace.asRelativePath(document.uri),
        uri: document.uri,
        line: i,
        endLine: j - 1,
        description: cleanDesc,
        severity,
        domain,
        connects,
        layer,
      });

      i = j;
    } else {
      i++;
    }
  }

  return annotations;
}
