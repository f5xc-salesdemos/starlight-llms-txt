import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateSubcategorySets } from '../subcategory-sets';

let testDir: string;

function writeDoc(relativePath: string, frontmatter: string): void {
  const fullPath = join(testDir, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, `---\n${frontmatter}\n---\n\n# Content\n`);
}

beforeEach(() => {
  testDir = join(tmpdir(), `subcategory-sets-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('generateSubcategorySets', () => {
  it('returns undefined when the directory does not exist', () => {
    const result = generateSubcategorySets('/nonexistent/path');
    expect(result).toBeUndefined();
  });

  it('returns undefined when no docs have subcategory frontmatter', () => {
    writeDoc('resources/some-resource.md', 'title: "Some Resource"');
    const result = generateSubcategorySets(testDir);
    expect(result).toBeUndefined();
  });

  it('groups docs by subcategory', () => {
    writeDoc('resources/http_loadbalancer.md', 'title: "HTTP Load Balancer"\nsubcategory: "Load Balancing"');
    writeDoc('resources/tcp_loadbalancer.md', 'title: "TCP Load Balancer"\nsubcategory: "Load Balancing"');
    writeDoc('resources/app_firewall.md', 'title: "App Firewall"\nsubcategory: "Security"');

    const result = generateSubcategorySets(testDir);
    expect(result).toBeDefined();
    expect(result).toHaveLength(2);

    // Sorted alphabetically: Load Balancing, Security
    const lb = result?.[0];
    expect(lb.label).toBe('Load Balancing');
    expect(lb.slug).toBe('load-balancing');
    expect(lb.description).toBe('Resources and data sources for Load Balancing');
    expect(lb.paths).toHaveLength(2);
    expect(lb.paths).toContain('resources/http_loadbalancer');
    expect(lb.paths).toContain('resources/tcp_loadbalancer');

    const sec = result?.[1];
    expect(sec.label).toBe('Security');
    expect(sec.slug).toBe('security');
    expect(sec.paths).toEqual(['resources/app_firewall']);
  });

  it('sorts Uncategorized to the end', () => {
    writeDoc('resources/http_loadbalancer.md', 'title: "HTTP LB"\nsubcategory: "Load Balancing"');
    writeDoc('resources/legacy.md', 'title: "Legacy"\nsubcategory: "Uncategorized"');

    const result = generateSubcategorySets(testDir);
    expect(result).toHaveLength(2);
    expect(result?.[0].label).toBe('Load Balancing');
    expect(result?.[1].label).toBe('Uncategorized');
  });

  it('skips files without frontmatter', () => {
    writeDoc('resources/http_loadbalancer.md', 'title: "HTTP LB"\nsubcategory: "Load Balancing"');
    // Write a file without frontmatter
    const noFmPath = join(testDir, 'resources/no-frontmatter.md');
    mkdirSync(join(testDir, 'resources'), { recursive: true });
    writeFileSync(noFmPath, '# Just content, no frontmatter\n');

    const result = generateSubcategorySets(testDir);
    expect(result).toHaveLength(1);
    expect(result?.[0].paths).toEqual(['resources/http_loadbalancer']);
  });

  it('strips .md extension from paths', () => {
    writeDoc('data-sources/http_loadbalancer.md', 'title: "HTTP LB Data"\nsubcategory: "Load Balancing"');

    const result = generateSubcategorySets(testDir);
    expect(result).toHaveLength(1);
    expect(result?.[0].paths).toEqual(['data-sources/http_loadbalancer']);
  });

  it('only picks up .md files', () => {
    writeDoc('resources/http_loadbalancer.md', 'title: "HTTP LB"\nsubcategory: "Load Balancing"');
    // Write a non-.md file
    const txtPath = join(testDir, 'resources/readme.txt');
    mkdirSync(join(testDir, 'resources'), { recursive: true });
    writeFileSync(txtPath, '---\nsubcategory: "Nope"\n---\n');

    const result = generateSubcategorySets(testDir);
    expect(result).toHaveLength(1);
    expect(result?.[0].paths).toHaveLength(1);
  });
});
