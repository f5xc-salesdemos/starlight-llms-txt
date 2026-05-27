import { describe, expect, it } from 'vitest';
import { buildTierTree, type DirectoryNode, type LeafNode } from '../tier-tree';
import { renderDirectoryIndex, renderLeafContent } from '../tier-tree-render';

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

describe('renderDirectoryIndex', () => {
  it('renders a directory with title, description, and child links', () => {
    const tree = buildTierTree([
      doc('guides/index', { title: 'Guides', description: 'All guides here' }),
      doc('guides/setup', { title: 'Setup', description: 'How to set up' }),
      doc('guides/deploy', { title: 'Deploy', description: 'How to deploy' }),
    ]);
    const guides = tree.children.get('guides') as DirectoryNode;
    const output = renderDirectoryIndex(guides, site);

    expect(output).toContain('# Guides');
    expect(output).toContain('> All guides here');
    expect(output).toContain('## Contents');
    expect(output).toContain('- [Setup](https://example.com/docs/_llms-txt/guides/setup.txt): How to set up');
    expect(output).toContain('- [Deploy](https://example.com/docs/_llms-txt/guides/deploy.txt): How to deploy');
    expect(output).toContain('- [Guides](https://example.com/docs/_llms-txt/guides/index.txt)');
  });

  it('links to child directory index .txt for directory children', () => {
    const tree = buildTierTree([doc('guides/advanced/deployment', { title: 'Deployment' })]);
    const guides = tree.children.get('guides') as DirectoryNode;
    const output = renderDirectoryIndex(guides, site);
    expect(output).toContain('- [Advanced](https://example.com/docs/_llms-txt/guides/advanced.txt)');
  });

  it('omits description suffix when child has no description', () => {
    const tree = buildTierTree([doc('guides/setup', { title: 'Setup' })]);
    const guides = tree.children.get('guides') as DirectoryNode;
    const output = renderDirectoryIndex(guides, site);
    expect(output).toContain('- [Setup](https://example.com/docs/_llms-txt/guides/setup.txt)');
    expect(output).not.toContain(': ');
  });

  it('uses slug-derived title when no index page exists', () => {
    const tree = buildTierTree([doc('my-section/page', { title: 'A Page' })]);
    const section = tree.children.get('my-section') as DirectoryNode;
    const output = renderDirectoryIndex(section, site);
    expect(output).toContain('# My Section');
    expect(output).not.toContain('> ');
  });

  it('does NOT include any page content in directory index', () => {
    const tree = buildTierTree([
      doc('guides/index', { title: 'Guides', description: 'All guides' }),
      doc('guides/setup', { title: 'Setup', description: 'How to set up' }),
    ]);
    const guides = tree.children.get('guides') as DirectoryNode;
    const output = renderDirectoryIndex(guides, site);
    const lines = output.split('\n');
    const contentLines = lines.filter(
      (l) => l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('-'),
    );
    expect(contentLines.every((l) => l.trim() === '')).toBe(true);
  });
});

describe('renderLeafContent', () => {
  it('renders title, description, and placeholder for content', () => {
    const tree = buildTierTree([doc('overview', { title: 'Overview', description: 'Product overview' })]);
    const leaf = tree.children.get('overview') as LeafNode;
    const output = renderLeafContent(leaf);
    expect(output).toContain('# Overview');
    expect(output).toContain('> Product overview');
  });

  it('omits description blockquote when none exists', () => {
    const tree = buildTierTree([doc('overview', { title: 'Overview' })]);
    const leaf = tree.children.get('overview') as LeafNode;
    const output = renderLeafContent(leaf);
    expect(output).toContain('# Overview');
    expect(output).not.toContain('> ');
  });
});
