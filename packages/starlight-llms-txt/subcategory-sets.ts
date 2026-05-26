import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import GithubSlugger from 'github-slugger';

export interface AutoCustomSet {
  label: string;
  slug: string;
  description: string;
  paths: string[];
}

function walkDir(dir: string, base: string = dir): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, base));
    } else if (/\.mdx?$/.test(entry.name)) {
      results.push(relative(base, fullPath));
    }
  }
  return results;
}

function extractSubcategory(filePath: string): string | undefined {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return undefined;
  }
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return undefined;
  const yaml = fmMatch[1];
  if (!yaml) return undefined;
  const scMatch = yaml.match(/^subcategory:\s*["'](.+)["']/m);
  return scMatch?.[1];
}

export function generateSubcategorySets(contentDir: string): AutoCustomSet[] | undefined {
  let files: string[];
  try {
    files = walkDir(contentDir);
  } catch {
    return undefined;
  }

  const subcategoryPaths = new Map<string, string[]>();

  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, '');
    // Skip index pages
    if (slug.endsWith('/index') || slug === 'index') continue;

    const fullPath = join(contentDir, file);
    const subcategory = extractSubcategory(fullPath);
    if (!subcategory) continue;
    let paths = subcategoryPaths.get(subcategory);
    if (!paths) {
      paths = [];
      subcategoryPaths.set(subcategory, paths);
    }
    paths.push(slug);
  }

  if (subcategoryPaths.size === 0) return undefined;

  const slugger = new GithubSlugger();
  const sorted = [...subcategoryPaths.entries()].sort(([a], [b]) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return sorted.map(([label, paths]) => ({
    label,
    slug: slugger.slug(label),
    description: `Resources and data sources for ${label}`,
    paths,
  }));
}
