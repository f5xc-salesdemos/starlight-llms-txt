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
	const prefixLength =
		(promoted > -1 ? promote.length - promoted : 0) + demote.length - demoted - 1;
	return '_'.repeat(prefixLength) + id;
}

export function buildSectionTree(
	docs: DocLike[],
	promote: string[] = [],
	demote: string[] = [],
): SectionNode[] {
	const filtered = docs.filter((d) => d.id !== 'index' && !d.data.draft);

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

export function renderSectionTree(tree: SectionNode[], site: URL): string {
	if (tree.length === 0) return '';

	const lines: string[] = ['## Sections', ''];

	function renderNode(node: SectionNode, depth: number): void {
		const indent = '  '.repeat(depth);
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
