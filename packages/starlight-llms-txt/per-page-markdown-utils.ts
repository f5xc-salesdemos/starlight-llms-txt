/**
 * Pure helpers for the `perPageMarkdown` option. Extracted for unit testability.
 */

import micromatch from 'micromatch';

export interface PerPageMarkdownConfig {
	enabled: boolean;
	extensionStrategy: 'append' | 'replace';
	excludePages: string[];
}

export type PerPageMarkdownUserOption =
	| boolean
	| {
			extensionStrategy?: 'append' | 'replace';
			excludePages?: string[];
	  };

const DEFAULT_EXTENSION_STRATEGY: 'append' | 'replace' = 'append';
const DEFAULT_EXCLUDE_PAGES: readonly string[] = ['404'];

/** Resolve the user-supplied `perPageMarkdown` option into a fully-populated config. */
export function resolvePerPageMarkdownOptions(
	option: PerPageMarkdownUserOption | undefined
): PerPageMarkdownConfig {
	if (option === undefined || option === false) {
		return {
			enabled: false,
			extensionStrategy: DEFAULT_EXTENSION_STRATEGY,
			excludePages: [...DEFAULT_EXCLUDE_PAGES],
		};
	}
	if (option === true) {
		return {
			enabled: true,
			extensionStrategy: DEFAULT_EXTENSION_STRATEGY,
			excludePages: [...DEFAULT_EXCLUDE_PAGES],
		};
	}
	return {
		enabled: true,
		extensionStrategy: option.extensionStrategy ?? DEFAULT_EXTENSION_STRATEGY,
		excludePages: option.excludePages ?? [...DEFAULT_EXCLUDE_PAGES],
	};
}

/**
 * Map a page slug to the `params.slug` value used by the `/[...slug].md` route.
 *
 * - `append` strategy: `"foo"` → `"foo.html"` (final URL: `/foo.html.md`)
 * - `replace` strategy: `"foo"` → `"foo"` (final URL: `/foo.md`)
 *
 * The trailing `.md` is supplied by the Astro route pattern itself, so this
 * helper returns the slug portion only.
 */
export function slugToPath(slug: string, strategy: 'append' | 'replace'): string {
	return strategy === 'append' ? `${slug}.html` : slug;
}

/** Return true if `id` matches any of the exclusion patterns (micromatch globs). */
export function shouldExcludePage(id: string, patterns: string[]): boolean {
	if (patterns.length === 0) return false;
	return micromatch.isMatch(id, patterns);
}
