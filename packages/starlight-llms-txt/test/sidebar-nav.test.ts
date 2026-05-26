import { describe, expect, it } from 'vitest';
import { buildSectionTree, renderSectionTree, type SectionNode } from '../sidebar-nav';

type DocFixture = {
  id: string;
  data: {
    title: string;
    description?: string;
    draft?: boolean;
    sidebar?: { order?: number };
    subcategory?: string;
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
    expect(tree[0]?.children.map((c) => c.title)).toEqual(['Phase 1 — Build', 'Phase 2 — Attack']);
  });

  it('upgrades a group with data from its index page when present', () => {
    const tree = buildSectionTree([
      doc('demo/index', {
        title: 'Demo',
        description: '4-phase demo exercise',
      }),
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
    const tree = buildSectionTree([doc('overview', { title: 'Overview', description: 'Product overview' })]);
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
    const out = renderSectionTree([node('Overview', 'overview'), node('Configuration', 'configuration')], site);
    expect(out).toBe(
      '## Sections\n' +
        '\n' +
        '- [Overview](https://example.com/docs/overview/)\n' +
        '- [Configuration](https://example.com/docs/configuration/)',
    );
  });

  it('appends ": description" when description is present', () => {
    const out = renderSectionTree([node('Overview', 'overview', 'Product overview')], site);
    expect(out).toBe('## Sections\n\n- [Overview](https://example.com/docs/overview/): Product overview');
  });

  it('omits the colon when description is absent', () => {
    const out = renderSectionTree([node('Overview', 'overview')], site);
    expect(out.endsWith('(https://example.com/docs/overview/)')).toBe(true);
    expect(out).not.toContain('): ');
  });

  it('renders synthetic groups without a link', () => {
    const out = renderSectionTree([node('Demo', undefined, undefined, [node('Phase 1', 'demo/phase-1')])], site);
    expect(out).toBe('## Sections\n' + '\n' + '- Demo\n' + '  - [Phase 1](https://example.com/docs/demo/phase-1/)');
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

  describe('with customSets', () => {
    const sets = [
      { label: 'Load Balancing', slug: 'load-balancing', description: 'Resources and data sources for Load Balancing' },
      { label: 'Security', slug: 'security', description: 'Resources and data sources for Security' },
      { label: 'Guides', slug: 'guides', description: 'Step-by-step guides' },
    ];

    it('links a matched node to _llms-txt/{slug}.txt instead of its page URL', () => {
      const out = renderSectionTree([node('Load Balancing', undefined, 'LB resources')], site, sets);
      expect(out).toBe(
        '## Sections\n\n- [Load Balancing](https://example.com/docs/_llms-txt/load-balancing.txt): LB resources',
      );
    });

    it('suppresses children for a matched node', () => {
      const lb = node('Load Balancing', undefined, undefined, [
        node('HTTP Load Balancer', 'resources/http_loadbalancer'),
        node('Origin Pool', 'resources/origin_pool'),
      ]);
      const out = renderSectionTree([lb], site, sets);
      expect(out).not.toContain('http_loadbalancer');
      expect(out).not.toContain('origin_pool');
    });

    it('uses custom set description when node has none', () => {
      const out = renderSectionTree([node('Security', undefined)], site, sets);
      expect(out).toContain(': Resources and data sources for Security');
    });

    it('prefers node description over custom set description', () => {
      const out = renderSectionTree([node('Security', undefined, 'Node description')], site, sets);
      expect(out).toContain(': Node description');
      expect(out).not.toContain('Resources and data sources for Security');
    });

    it('matches labels case-insensitively', () => {
      const out = renderSectionTree([node('LOAD BALANCING', undefined)], site, sets);
      expect(out).toContain('_llms-txt/load-balancing.txt');
    });

    it('does not affect unmatched nodes (backward compat)', () => {
      const out = renderSectionTree([node('Demo', 'demo', 'demo section')], site, sets);
      expect(out).toContain('https://example.com/docs/demo/');
      expect(out).not.toContain('_llms-txt');
    });

    it('mixed: matched nodes link to custom sets, unmatched nodes link to pages', () => {
      const tree = [
        node('Guides', undefined, 'guides desc', [node('Getting Started', 'guides/getting-started')]),
        node('Demo', 'demo', 'demo section', [node('Phase 1', 'demo/phase-1')]),
      ];
      const out = renderSectionTree(tree, site, sets);
      expect(out).toContain('_llms-txt/guides.txt');
      expect(out).not.toContain('getting-started');
      expect(out).toContain('https://example.com/docs/demo/');
      expect(out).toContain('https://example.com/docs/demo/phase-1/');
    });

    it('backward compat: no customSets arg produces original behavior', () => {
      const lb = node('Load Balancing', undefined, undefined, [
        node('HTTP Load Balancer', 'resources/http_loadbalancer'),
      ]);
      const out = renderSectionTree([lb], site);
      expect(out).not.toContain('_llms-txt');
      expect(out).toContain('http_loadbalancer');
    });
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

describe('buildSectionTree with subcategory', () => {
  it('groups resources and data-sources by subcategory when present', () => {
    const tree = buildSectionTree([
      doc('resources/http_loadbalancer', {
        title: 'HTTP Load Balancer',
        subcategory: 'Load Balancing',
      }),
      doc('resources/tcp_loadbalancer', {
        title: 'TCP Load Balancer',
        subcategory: 'Load Balancing',
      }),
      doc('data-sources/http_loadbalancer', {
        title: 'HTTP Load Balancer Data',
        subcategory: 'Load Balancing',
      }),
      doc('resources/app_firewall', {
        title: 'App Firewall',
        subcategory: 'Security',
      }),
    ]);

    expect(tree).toHaveLength(2);

    // First subcategory group: Load Balancing (alphabetical)
    const lb = tree[0];
    expect(lb.title).toBe('Load Balancing');
    expect(lb.slug).toBeUndefined();
    expect(lb.description).toBe('Resources and data sources for Load Balancing');
    expect(lb.children).toHaveLength(2);
    expect(lb.children[0].title).toBe('Resources');
    expect(lb.children[0].slug).toBeUndefined();
    expect(lb.children[0].children.map((c) => c.title)).toEqual(['HTTP Load Balancer', 'TCP Load Balancer']);
    expect(lb.children[1].title).toBe('Data Sources');
    expect(lb.children[1].children.map((c) => c.title)).toEqual(['HTTP Load Balancer Data']);

    // Second subcategory group: Security
    const sec = tree[1];
    expect(sec.title).toBe('Security');
    expect(sec.children).toHaveLength(1);
    expect(sec.children[0].title).toBe('Resources');
    expect(sec.children[0].children).toHaveLength(1);
    expect(sec.children[0].children[0]?.title).toBe('App Firewall');
  });

  it('places guides and functions before subcategory groups', () => {
    const tree = buildSectionTree([
      doc('guides/getting-started', { title: 'Getting Started' }),
      doc('functions/encrypt', { title: 'Encrypt' }),
      doc('resources/http_loadbalancer', {
        title: 'HTTP Load Balancer',
        subcategory: 'Load Balancing',
      }),
    ]);

    expect(tree).toHaveLength(3);
    expect(tree[0].title).toBe('Guides');
    expect(tree[1].title).toBe('Functions');
    expect(tree[2].title).toBe('Load Balancing');
  });

  it('sorts Uncategorized to the bottom', () => {
    const tree = buildSectionTree([
      doc('resources/http_loadbalancer', {
        title: 'HTTP Load Balancer',
        subcategory: 'Load Balancing',
      }),
      doc('resources/legacy_thing', {
        title: 'Legacy Thing',
        subcategory: 'Uncategorized',
      }),
    ]);

    expect(tree).toHaveLength(2);
    expect(tree[0].title).toBe('Load Balancing');
    expect(tree[1].title).toBe('Uncategorized');
  });

  it('falls back to path-based grouping when no subcategory fields exist', () => {
    const tree = buildSectionTree([
      doc('demo/phase-1-build', { title: 'Phase 1 -- Build' }),
      doc('demo/phase-2-attack', { title: 'Phase 2 -- Attack' }),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe('Demo');
    expect(tree[0].children).toHaveLength(2);
  });

  it('omits doc-type subgroup when only one type exists in a subcategory', () => {
    const tree = buildSectionTree([
      doc('resources/http_loadbalancer', {
        title: 'HTTP Load Balancer',
        subcategory: 'Load Balancing',
      }),
      doc('resources/tcp_loadbalancer', {
        title: 'TCP Load Balancer',
        subcategory: 'Load Balancing',
      }),
    ]);

    expect(tree).toHaveLength(1);
    const lb = tree[0];
    expect(lb.title).toBe('Load Balancing');
    // Only Resources subgroup, no empty Data Sources
    expect(lb.children).toHaveLength(1);
    expect(lb.children[0].title).toBe('Resources');
    expect(lb.children[0].children).toHaveLength(2);
  });
});
