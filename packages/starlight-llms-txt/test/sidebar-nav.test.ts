import { describe, expect, it } from 'vitest';
import { buildSectionTree, renderSectionTree } from '../sidebar-nav';

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

const site = new URL('https://example.com/docs/');

describe('buildSectionTree', () => {
  it('returns a tree with empty children for empty input', () => {
    const tree = buildSectionTree([]);
    expect(tree.children.size).toBe(0);
  });

  it('excludes draft pages', () => {
    const tree = buildSectionTree([
      doc('overview', { title: 'Overview' }),
      doc('secret', { title: 'Secret', draft: true }),
    ]);
    expect(tree.children.size).toBe(1);
    expect(tree.children.has('overview')).toBe(true);
  });

  it('applies promote/demote ordering', () => {
    const tree = buildSectionTree([doc('zeta'), doc('alpha'), doc('references')], ['zeta*'], ['references*']);
    const keys = [...tree.children.keys()];
    expect(keys).toEqual(['zeta', 'alpha', 'references']);
  });
});

describe('renderSectionTree', () => {
  it('returns empty string for empty tree', () => {
    const tree = buildSectionTree([]);
    expect(renderSectionTree(tree, site)).toBe('');
  });

  it('renders all links as _llms-txt/*.txt — never HTML pages', () => {
    const tree = buildSectionTree([
      doc('overview', { title: 'Overview' }),
      doc('configuration', { title: 'Configuration' }),
    ]);
    const out = renderSectionTree(tree, site);
    expect(out).toBe(
      '## Sections\n' +
        '\n' +
        '- [Configuration](https://example.com/docs/_llms-txt/configuration.txt)\n' +
        '- [Overview](https://example.com/docs/_llms-txt/overview.txt)',
    );
  });

  it('renders directories with _llms-txt/{slug}.txt links', () => {
    const tree = buildSectionTree([
      doc('guides/index', { title: 'Guides', description: 'All guides' }),
      doc('guides/setup', { title: 'Setup' }),
    ]);
    const out = renderSectionTree(tree, site);
    expect(out).toContain('- [Guides](https://example.com/docs/_llms-txt/guides.txt): All guides');
    expect(out).not.toContain('setup');
  });

  it('appends description when present', () => {
    const tree = buildSectionTree([doc('overview', { title: 'Overview', description: 'Product overview' })]);
    const out = renderSectionTree(tree, site);
    expect(out).toContain('_llms-txt/overview.txt): Product overview');
  });

  it('contains no HTML page links (no trailing-slash page URLs)', () => {
    const tree = buildSectionTree([
      doc('overview', { title: 'Overview' }),
      doc('guides/index', { title: 'Guides' }),
      doc('guides/setup', { title: 'Setup' }),
    ]);
    const out = renderSectionTree(tree, site);
    const linkPattern = /\(https:\/\/[^)]+\)/g;
    const links = out.match(linkPattern) || [];
    for (const link of links) {
      expect(link).toMatch(/\.txt\)$/);
    }
  });
});
