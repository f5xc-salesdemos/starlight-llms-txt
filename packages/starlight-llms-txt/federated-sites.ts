export interface FederatedSite {
	label: string;
	url: string;
	description?: string;
}

export function renderFederatedSites(sites: FederatedSite[]): string {
	if (sites.length === 0) return '';

	const lines: string[] = ['## Federated Sites', ''];
	for (const site of sites) {
		const desc = site.description ? `: ${site.description}` : '';
		lines.push(`- [${site.label}](${site.url})${desc}`);
	}
	return lines.join('\n');
}
