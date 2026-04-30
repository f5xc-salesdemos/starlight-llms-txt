export interface FederatedSite {
	label: string;
	url: string;
	description?: string;
	category?: string;
}

export interface FederatedSiteCategory {
	id: string;
	label: string;
	description?: string;
}

function renderSiteList(sites: FederatedSite[]): string[] {
	return sites.map((site) => {
		const desc = site.description ? `: ${site.description}` : '';
		return `- [${site.label}](${site.url})${desc}`;
	});
}

export function renderFederatedSites(
	sites: FederatedSite[],
	categories?: FederatedSiteCategory[]
): string {
	if (sites.length === 0) return '';

	if (!categories || categories.length === 0) {
		const lines: string[] = ['## Federated Sites', ''];
		lines.push(...renderSiteList(sites));
		return lines.join('\n');
	}

	const sections: string[] = [];
	const sitesByCategory = new Map<string, FederatedSite[]>();

	for (const site of sites) {
		const key = site.category || '__uncategorized__';
		const list = sitesByCategory.get(key) || [];
		list.push(site);
		sitesByCategory.set(key, list);
	}

	for (const cat of categories) {
		const catSites = sitesByCategory.get(cat.id);
		if (!catSites || catSites.length === 0) continue;
		const lines: string[] = [`## ${cat.label}`];
		if (cat.description) lines.push(cat.description);
		lines.push('');
		lines.push(...renderSiteList(catSites));
		sections.push(lines.join('\n'));
		sitesByCategory.delete(cat.id);
	}

	const uncategorized = sitesByCategory.get('__uncategorized__') || [];
	const remaining = Array.from(sitesByCategory.entries())
		.filter(([key]) => key !== '__uncategorized__')
		.flatMap(([, s]) => s);
	const otherSites = [...remaining, ...uncategorized];

	if (otherSites.length > 0) {
		const lines: string[] = ['## Other', ''];
		lines.push(...renderSiteList(otherSites));
		sections.push(lines.join('\n'));
	}

	return sections.join('\n\n');
}
