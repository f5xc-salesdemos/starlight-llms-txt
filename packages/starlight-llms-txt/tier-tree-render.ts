import type { DirectoryNode, LeafNode } from './tier-tree';

export function renderDirectoryIndex(node: DirectoryNode, site: URL): string {
  const segments: string[] = [];

  segments.push(`# ${node.meta.title}`);
  if (node.meta.description) {
    segments.push(`> ${node.meta.description}`);
  }

  segments.push('## Contents');

  const lines: string[] = [];
  for (const [, child] of node.children) {
    const childPath = child.slug;
    const url = new URL(`./_llms-txt/${childPath}.txt`, site);
    const title = child.meta.title;
    const desc = child.meta.description ? `: ${child.meta.description}` : '';
    lines.push(`- [${title}](${url})${desc}`);
  }

  segments.push(lines.join('\n'));

  return segments.join('\n\n');
}

export function renderLeafContent(leaf: LeafNode, renderedContent?: string): string {
  const segments: string[] = [];

  const title = leaf.entry.data.hero?.title || leaf.entry.data.title;
  segments.push(`# ${title}`);

  const description = leaf.entry.data.hero?.tagline || leaf.entry.data.description;
  if (description) {
    segments.push(`> ${description}`);
  }

  if (renderedContent !== undefined) {
    segments.push(renderedContent);
  }

  return segments.join('\n\n');
}
