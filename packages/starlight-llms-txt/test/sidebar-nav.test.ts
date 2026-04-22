import { describe, it, expect } from 'vitest';
import { buildSectionTree, renderSectionTree, type SectionNode } from '../sidebar-nav';

type DocFixture = {
	id: string;
	data: {
		title: string;
		description?: string;
		draft?: boolean;
		sidebar?: { order?: number };
	};
};

const doc = (id: string, overrides: Partial<DocFixture['data']> = {}): DocFixture => ({
	id,
	data: { title: id, ...overrides },
});

describe('buildSectionTree', () => {
	it('returns empty array for empty input', () => {
		expect(buildSectionTree([])).toEqual([]);
	});

	it('excludes root index from the tree', () => {
		const tree = buildSectionTree([doc('index'), doc('overview')]);
		expect(tree).toHaveLength(1);
		expect(tree[0]?.slug).toBe('overview');
	});

	it('excludes draft pages', () => {
		const tree = buildSectionTree([doc('overview'), doc('secret', { draft: true })]);
		expect(tree).toHaveLength(1);
		expect(tree[0]?.slug).toBe('overview');
	});

	it('produces a flat tree for top-level pages in title order', () => {
		const tree = buildSectionTree([
			doc('configuration', { title: 'Configuration' }),
			doc('getting-started', { title: 'Getting Started' }),
		]);
		expect(tree.map((n) => n.title)).toEqual(['Configuration', 'Getting Started']);
		expect(tree.every((n) => n.children.length === 0)).toBe(true);
	});

	it('honors sidebar.order over title order', () => {
		const tree = buildSectionTree([
			doc('b', { title: 'B', sidebar: { order: 2 } }),
			doc('a', { title: 'A', sidebar: { order: 1 } }),
		]);
		expect(tree.map((n) => n.slug)).toEqual(['a', 'b']);
	});

	it('groups nested ids under a synthetic title-cased parent when no index page exists', () => {
		const tree = buildSectionTree([
			doc('demo/phase-1-build', { title: 'Phase 1 — Build' }),
			doc('demo/phase-2-attack', { title: 'Phase 2 — Attack' }),
		]);
		expect(tree).toHaveLength(1);
		expect(tree[0]?.title).toBe('Demo');
		expect(tree[0]?.slug).toBeUndefined();
		expect(tree[0]?.children.map((c) => c.title)).toEqual([
			'Phase 1 — Build',
			'Phase 2 — Attack',
		]);
	});

	it('upgrades a group with data from its index page when present', () => {
		const tree = buildSectionTree([
			doc('demo/index', { title: 'Demo', description: '4-phase demo exercise' }),
			doc('demo/phase-1-build', { title: 'Phase 1 — Build' }),
		]);
		expect(tree).toHaveLength(1);
		expect(tree[0]?.title).toBe('Demo');
		expect(tree[0]?.description).toBe('4-phase demo exercise');
		expect(tree[0]?.slug).toBe('demo');
		expect(tree[0]?.children).toHaveLength(1);
		expect(tree[0]?.children[0]?.slug).toBe('demo/phase-1-build');
	});

	it('propagates per-doc description into leaf nodes', () => {
		const tree = buildSectionTree([
			doc('overview', { title: 'Overview', description: 'Product overview' }),
		]);
		expect(tree[0]?.description).toBe('Product overview');
	});

	it('applies promote/demote to top-level sort order', () => {
		const tree = buildSectionTree(
			[doc('zeta'), doc('alpha'), doc('references')],
			['zeta*'], // promote
			['references*'], // demote
		);
		expect(tree.map((n) => n.slug)).toEqual(['zeta', 'alpha', 'references']);
	});
});

describe('renderSectionTree', () => {
	const site = new URL('https://example.com/docs/');

	const node = (
		title: string,
		slug: string | undefined,
		description?: string,
		children: SectionNode[] = [],
	): SectionNode => ({ title, slug, description, children });

	it('returns empty string for empty tree', () => {
		expect(renderSectionTree([], site)).toBe('');
	});

	it('renders a flat list of linked nodes', () => {
		const out = renderSectionTree(
			[node('Overview', 'overview'), node('Configuration', 'configuration')],
			site,
		);
		expect(out).toBe(
			'## Sections\n' +
				'\n' +
				'- [Overview](https://example.com/docs/overview/)\n' +
				'- [Configuration](https://example.com/docs/configuration/)',
		);
	});

	it('appends ": description" when description is present', () => {
		const out = renderSectionTree(
			[node('Overview', 'overview', 'Product overview')],
			site,
		);
		expect(out).toBe(
			'## Sections\n\n- [Overview](https://example.com/docs/overview/): Product overview',
		);
	});

	it('omits the colon when description is absent', () => {
		const out = renderSectionTree([node('Overview', 'overview')], site);
		expect(out.endsWith('(https://example.com/docs/overview/)')).toBe(true);
		expect(out).not.toContain('): ');
	});

	it('renders synthetic groups without a link', () => {
		const out = renderSectionTree(
			[node('Demo', undefined, undefined, [node('Phase 1', 'demo/phase-1')])],
			site,
		);
		expect(out).toBe(
			'## Sections\n' +
				'\n' +
				'- Demo\n' +
				'  - [Phase 1](https://example.com/docs/demo/phase-1/)',
		);
	});

	it('renders nested linked groups with descriptions', () => {
		const out = renderSectionTree(
			[
				node('Demo', 'demo', '4-phase demo exercise', [
					node('Phase 1 — Build', 'demo/phase-1-build', 'Deploy infrastructure via API'),
				]),
			],
			site,
		);
		expect(out).toBe(
			'## Sections\n' +
				'\n' +
				'- [Demo](https://example.com/docs/demo/): 4-phase demo exercise\n' +
				'  - [Phase 1 — Build](https://example.com/docs/demo/phase-1-build/): Deploy infrastructure via API',
		);
	});

	it('matches the xcsh#223 reference output', () => {
		const out = renderSectionTree(
			[
				node('Overview', 'overview', 'Product overview and architecture'),
				node('Demo', 'demo', '4-phase demo exercise', [
					node('Phase 1 — Build', 'demo/phase-1-build', 'Deploy infrastructure via API'),
					node('Phase 2 — Attack', 'demo/phase-2-attack', 'Simulated attack traffic'),
					node('Phase 3 — Mitigate', 'demo/phase-3-mitigate', 'Apply and verify mitigations'),
					node('Phase 4 — Teardown', 'demo/phase-4-teardown', 'Clean up demo objects'),
				]),
				node('API Reference', 'api-reference', 'REST API endpoints'),
				node('FAQ', 'faq', 'Common questions'),
			],
			new URL('https://f5xc-salesdemos.github.io/csd/'),
		);
		expect(out).toMatchSnapshot();
	});
});
