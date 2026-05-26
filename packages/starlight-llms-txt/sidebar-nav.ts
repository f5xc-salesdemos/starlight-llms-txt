import micromatch from 'micromatch';

export interface SectionNode {
  title: string;
  description?: string;
  /** Slug for the linkable page; undefined for synthetic parent groups without an index page. */
  slug?: string;
  children: SectionNode[];
}

type DocLike = {
  id: string;
  data: {
    title: string;
    description?: string;
    draft?: boolean;
    sidebar?: { order?: number };
    subcategory?: string;
  };
};

function titleCase(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

/** Sort key emulating generator.ts promote/demote prioritization for a single id. */
function sortKey(id: string, promote: string[], demote: string[]): string {
  const demoted = demote.findIndex((expr) => micromatch.isMatch(id, expr));
  const promoted = demoted > -1 ? -1 : promote.findIndex((expr) => micromatch.isMatch(id, expr));
  const prefixLength = (promoted > -1 ? promote.length - promoted : 0) + demote.length - demoted - 1;
  return '_'.repeat(prefixLength) + id;
}

/** Doc type path prefixes recognized for subcategory grouping. */
const DOC_TYPE_LABELS: Record<string, string> = {
  resources: 'Resources',
  'data-sources': 'Data Sources',
};

/**
 * Build a section tree that groups docs by their `subcategory` frontmatter
 * field. Docs whose first path segment is a recognized doc type (resources/,
 * data-sources/) AND that carry a subcategory value are grouped into a
 * Subcategory → Doc Type → Items hierarchy.  All other docs (guides,
 * functions, top-level pages) use the existing path-based grouping.
 */
function buildSubcategoryTree(docs: DocLike[]): SectionNode[] {
  const nonSubcategoryDocs: DocLike[] = [];
  // subcategory → docType → items
  const subcatMap = new Map<string, Map<string, SectionNode[]>>();

  for (const d of docs) {
    const slashIdx = d.id.indexOf('/');
    const firstSegment = slashIdx === -1 ? undefined : d.id.substring(0, slashIdx);
    const docTypeLabel = firstSegment ? DOC_TYPE_LABELS[firstSegment] : undefined;
    const subcat = d.data.subcategory;

    if (subcat && docTypeLabel && slashIdx !== -1) {
      // Skip index pages within doc-type folders
      const remainder = d.id.substring(slashIdx + 1);
      if (remainder === 'index') continue;

      let typeMap = subcatMap.get(subcat);
      if (!typeMap) {
        typeMap = new Map<string, SectionNode[]>();
        subcatMap.set(subcat, typeMap);
      }
      let items = typeMap.get(docTypeLabel);
      if (!items) {
        items = [];
        typeMap.set(docTypeLabel, items);
      }
      items.push({
        title: d.data.title,
        description: d.data.description,
        slug: d.id,
        children: [],
      });
    } else {
      nonSubcategoryDocs.push(d);
    }
  }

  // Build non-subcategory groups using path-based logic
  const result: SectionNode[] = [];
  const groups = new Map<string, SectionNode>();

  for (const d of nonSubcategoryDocs) {
    const slashIdx = d.id.indexOf('/');
    if (slashIdx === -1) {
      result.push({
        title: d.data.title,
        description: d.data.description,
        slug: d.id,
        children: [],
      });
      continue;
    }

    const groupKey = d.id.substring(0, slashIdx);
    const remainder = d.id.substring(slashIdx + 1);
    const isGroupIndex = remainder === 'index';

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        title: isGroupIndex ? d.data.title : titleCase(groupKey),
        description: isGroupIndex ? d.data.description : undefined,
        slug: isGroupIndex ? groupKey : undefined,
        children: [],
      };
      groups.set(groupKey, group);
      result.push(group);
    } else if (isGroupIndex) {
      group.title = d.data.title;
      group.description = d.data.description;
      group.slug = groupKey;
    }

    if (!isGroupIndex) {
      group.children.push({
        title: d.data.title,
        description: d.data.description,
        slug: d.id,
        children: [],
      });
    }
  }

  // Build subcategory groups sorted alphabetically, Uncategorized last
  const subcatKeys = [...subcatMap.keys()].sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  for (const subcat of subcatKeys) {
    const typeMap = subcatMap.get(subcat);
    if (!typeMap) continue;
    const subcatNode: SectionNode = {
      title: subcat,
      description: `Resources and data sources for ${subcat}`,
      children: [],
    };

    // Sort doc type subgroups in a stable order: Resources before Data Sources
    const docTypeOrder = ['Resources', 'Data Sources'];
    const sortedTypes = [...typeMap.keys()].sort((a, b) => docTypeOrder.indexOf(a) - docTypeOrder.indexOf(b));

    for (const docType of sortedTypes) {
      const items = typeMap.get(docType);
      if (!items) continue;
      // Sort items alphabetically by title
      items.sort((a, b) => a.title.localeCompare(b.title));

      subcatNode.children.push({
        title: docType,
        children: items,
      });
    }

    result.push(subcatNode);
  }

  return result;
}

export function buildSectionTree(docs: DocLike[], promote: string[] = [], demote: string[] = []): SectionNode[] {
  const filtered = docs.filter((d) => d.id !== 'index' && !d.data.draft);

  // Auto-detect subcategory mode: if any doc has a truthy subcategory, use
  // the subcategory-aware grouping.
  const hasSubcategory = filtered.some((d) => d.data.subcategory);
  if (hasSubcategory) {
    return buildSubcategoryTree(filtered);
  }

  const sorted = [...filtered].sort((a, b) => {
    const keyA = sortKey(a.id, promote, demote);
    const keyB = sortKey(b.id, promote, demote);
    if (keyA !== keyB) return keyA.localeCompare(keyB);
    const orderA = a.data.sidebar?.order ?? Infinity;
    const orderB = b.data.sidebar?.order ?? Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return a.data.title.localeCompare(b.data.title);
  });

  const groups = new Map<string, SectionNode>();
  const result: SectionNode[] = [];

  for (const d of sorted) {
    const slashIdx = d.id.indexOf('/');
    if (slashIdx === -1) {
      result.push({
        title: d.data.title,
        description: d.data.description,
        slug: d.id,
        children: [],
      });
      continue;
    }

    const groupKey = d.id.substring(0, slashIdx);
    const remainder = d.id.substring(slashIdx + 1);
    const isGroupIndex = remainder === 'index';

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        title: isGroupIndex ? d.data.title : titleCase(groupKey),
        description: isGroupIndex ? d.data.description : undefined,
        slug: isGroupIndex ? groupKey : undefined,
        children: [],
      };
      groups.set(groupKey, group);
      result.push(group);
    } else if (isGroupIndex) {
      group.title = d.data.title;
      group.description = d.data.description;
      group.slug = groupKey;
    }

    if (!isGroupIndex) {
      group.children.push({
        title: d.data.title,
        description: d.data.description,
        slug: d.id,
        children: [],
      });
    }
  }

  return result;
}

export function renderSectionTree(
  tree: SectionNode[],
  site: URL,
  customSets?: Array<{ label: string; slug: string; description?: string }>,
): string {
  if (tree.length === 0) return '';

  const setMap = new Map<string, { slug: string; description?: string }>();
  if (customSets) {
    for (const s of customSets) {
      setMap.set(s.label.toLowerCase(), { slug: s.slug, description: s.description });
    }
  }

  const lines: string[] = ['## Sections', ''];
  const emitted = new Set<string>();

  function renderNode(node: SectionNode, depth: number): void {
    const key = node.title.toLowerCase();
    const indent = '  '.repeat(depth);
    const matched = setMap.get(key);
    if (matched) {
      if (emitted.has(key)) return;
      emitted.add(key);
      const url = new URL(`./_llms-txt/${matched.slug}.txt`, site);
      const desc = node.description ?? matched.description;
      const descSuffix = desc ? `: ${desc}` : '';
      lines.push(`${indent}- [${node.title}](${url})${descSuffix}`);
      return;
    }
    const descSuffix = node.description ? `: ${node.description}` : '';
    if (node.slug !== undefined) {
      const url = new URL(`./${node.slug}/`, site);
      lines.push(`${indent}- [${node.title}](${url})${descSuffix}`);
    } else {
      lines.push(`${indent}- ${node.title}${descSuffix}`);
    }
    for (const child of node.children) {
      renderNode(child, depth + 1);
    }
  }

  for (const node of tree) {
    renderNode(node, 0);
  }

  return lines.join('\n');
}
