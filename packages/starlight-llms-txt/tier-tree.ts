// packages/starlight-llms-txt/tier-tree.ts
import micromatch from 'micromatch';

export interface DirectoryNode {
  type: 'directory';
  slug: string;
  segment: string;
  meta: { title: string; description?: string };
  children: Map<string, DirectoryNode | LeafNode>;
}

export interface LeafNode {
  type: 'leaf';
  slug: string;
  segment: string;
  meta: { title: string; description?: string };
  entry: {
    id: string;
    data: {
      title: string;
      description?: string;
      draft?: boolean;
      sidebar?: { order?: number };
      hero?: { title?: string; tagline?: string };
    };
  };
}

export type TierNode = DirectoryNode | LeafNode;

export interface TierTreeOptions {
  promote?: string[];
  demote?: string[];
}

function titleCase(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function sortKey(id: string, promote: string[], demote: string[]): string {
  const demoted = demote.findIndex((expr) => micromatch.isMatch(id, expr));
  const promoted = demoted > -1 ? -1 : promote.findIndex((expr) => micromatch.isMatch(id, expr));
  const prefixLength = (promoted > -1 ? promote.length - promoted : 0) + demote.length - demoted - 1;
  return '_'.repeat(prefixLength) + id;
}

type DocLike = {
  id: string;
  data: {
    title: string;
    description?: string;
    draft?: boolean;
    sidebar?: { order?: number };
  };
};

export function buildTierTree(entries: DocLike[], options: TierTreeOptions = {}): DirectoryNode {
  const { promote = [], demote = [] } = options;

  const filtered = entries.filter((e) => !e.data.draft);

  const sorted = [...filtered].sort((a, b) => {
    const keyA = sortKey(a.id, promote, demote);
    const keyB = sortKey(b.id, promote, demote);
    if (keyA !== keyB) return keyA.localeCompare(keyB);
    const orderA = a.data.sidebar?.order ?? Infinity;
    const orderB = b.data.sidebar?.order ?? Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return a.data.title.localeCompare(b.data.title);
  });

  const root: DirectoryNode = {
    type: 'directory',
    slug: '',
    segment: '',
    meta: { title: '' },
    children: new Map(),
  };

  for (const entry of sorted) {
    const segments = entry.id.split('/');

    if (segments.length === 1) {
      const seg0 = segments[0];
      if (!seg0) continue;
      root.children.set(seg0, {
        type: 'leaf',
        slug: entry.id,
        segment: seg0,
        meta: { title: entry.data.title, description: entry.data.description },
        entry,
      });
      continue;
    }

    let current = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!seg) continue;
      const existingChild = current.children.get(seg);
      if (!existingChild) {
        const slugPath = segments.slice(0, i + 1).join('/');
        const dirNode: DirectoryNode = {
          type: 'directory',
          slug: slugPath,
          segment: seg,
          meta: { title: titleCase(seg) },
          children: new Map(),
        };
        current.children.set(seg, dirNode);
        current = dirNode;
      } else if (existingChild.type === 'leaf') {
        const slugPath = segments.slice(0, i + 1).join('/');
        const dirNode: DirectoryNode = {
          type: 'directory',
          slug: slugPath,
          segment: seg,
          meta: { title: existingChild.meta.title, description: existingChild.meta.description },
          children: new Map(),
        };
        dirNode.children.set('index', {
          ...existingChild,
          slug: `${slugPath}/index`,
          segment: 'index',
        });
        current.children.set(seg, dirNode);
        current = dirNode;
      } else {
        current = existingChild;
      }
    }

    const leafSegment = segments[segments.length - 1];
    if (!leafSegment) continue;
    const leaf: LeafNode = {
      type: 'leaf',
      slug: entry.id,
      segment: leafSegment,
      meta: { title: entry.data.title, description: entry.data.description },
      entry,
    };
    current.children.set(leafSegment, leaf);

    if (leafSegment === 'index') {
      current.meta.title = entry.data.title;
      current.meta.description = entry.data.description;
    }
  }

  pruneEmptyDirectories(root);

  return root;
}

function pruneEmptyDirectories(node: DirectoryNode): boolean {
  for (const [key, child] of node.children) {
    if (child.type === 'directory') {
      const isEmpty = pruneEmptyDirectories(child);
      if (isEmpty) node.children.delete(key);
    }
  }
  return node.children.size === 0;
}

export interface TierPath {
  path: string;
  type: 'directory' | 'leaf';
}

export function getAllTierPaths(root: DirectoryNode): TierPath[] {
  const paths: TierPath[] = [];

  function walk(node: DirectoryNode): void {
    for (const [, child] of node.children) {
      if (child.type === 'directory') {
        paths.push({ path: child.slug, type: 'directory' });
        walk(child);
      } else {
        paths.push({ path: child.slug, type: 'leaf' });
      }
    }
  }

  walk(root);
  return paths;
}
