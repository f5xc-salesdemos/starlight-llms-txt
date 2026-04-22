import { describe, it, expect } from 'vitest';
import {
	resolvePerPageMarkdownOptions,
	slugToPath,
	shouldExcludePage,
} from '../per-page-markdown-utils';

describe('resolvePerPageMarkdownOptions', () => {
	it('disables the feature when option is undefined', () => {
		const c = resolvePerPageMarkdownOptions(undefined);
		expect(c.enabled).toBe(false);
		expect(c.extensionStrategy).toBe('append');
		expect(c.excludePages).toEqual(['404']);
	});

	it('disables the feature when option is false', () => {
		expect(resolvePerPageMarkdownOptions(false).enabled).toBe(false);
	});

	it('enables the feature with defaults when option is true', () => {
		const c = resolvePerPageMarkdownOptions(true);
		expect(c.enabled).toBe(true);
		expect(c.extensionStrategy).toBe('append');
		expect(c.excludePages).toEqual(['404']);
	});

	it('merges partial overrides with defaults', () => {
		const c = resolvePerPageMarkdownOptions({ extensionStrategy: 'replace' });
		expect(c.enabled).toBe(true);
		expect(c.extensionStrategy).toBe('replace');
		expect(c.excludePages).toEqual(['404']);
	});

	it('overrides both fields when provided', () => {
		const c = resolvePerPageMarkdownOptions({
			extensionStrategy: 'replace',
			excludePages: ['index*', 'draft*'],
		});
		expect(c).toEqual({
			enabled: true,
			extensionStrategy: 'replace',
			excludePages: ['index*', 'draft*'],
		});
	});

	it('does not mutate the default excludePages across calls', () => {
		const a = resolvePerPageMarkdownOptions(true);
		a.excludePages.push('pollution');
		const b = resolvePerPageMarkdownOptions(true);
		expect(b.excludePages).toEqual(['404']);
	});
});

describe('slugToPath', () => {
	it('appends .html for the append strategy', () => {
		expect(slugToPath('getting-started', 'append')).toBe('getting-started.html');
	});

	it('returns the slug unchanged for the replace strategy', () => {
		expect(slugToPath('getting-started', 'replace')).toBe('getting-started');
	});

	it('handles nested slugs', () => {
		expect(slugToPath('demo/phase-1-build', 'append')).toBe('demo/phase-1-build.html');
		expect(slugToPath('demo/phase-1-build', 'replace')).toBe('demo/phase-1-build');
	});
});

describe('shouldExcludePage', () => {
	it('returns false for empty pattern list', () => {
		expect(shouldExcludePage('anything', [])).toBe(false);
	});

	it('returns true on literal match', () => {
		expect(shouldExcludePage('404', ['404'])).toBe(true);
	});

	it('returns false on literal mismatch', () => {
		expect(shouldExcludePage('getting-started', ['404'])).toBe(false);
	});

	it('returns true on glob match', () => {
		expect(shouldExcludePage('index', ['index*'])).toBe(true);
	});

	it('returns true on glob match at a nested path', () => {
		expect(shouldExcludePage('guides/index', ['**/index'])).toBe(true);
	});

	it('returns false when glob does not match', () => {
		expect(shouldExcludePage('guides/intro', ['index*'])).toBe(false);
	});

	it('matches any pattern in a multi-pattern list', () => {
		expect(shouldExcludePage('draft', ['index*', 'draft*'])).toBe(true);
		expect(shouldExcludePage('published', ['index*', 'draft*'])).toBe(false);
	});
});
