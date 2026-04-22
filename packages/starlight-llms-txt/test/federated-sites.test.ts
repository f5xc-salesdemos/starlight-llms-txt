import { describe, it, expect } from 'vitest';
import { renderFederatedSites } from '../federated-sites';

describe('renderFederatedSites', () => {
	it('returns empty string for empty list', () => {
		expect(renderFederatedSites([])).toBe('');
	});

	it('renders a single entry without description', () => {
		expect(
			renderFederatedSites([{ label: 'WAF', url: 'https://example.com/waf/llms.txt' }]),
		).toBe('## Federated Sites\n\n- [WAF](https://example.com/waf/llms.txt)');
	});

	it('renders a single entry with description', () => {
		expect(
			renderFederatedSites([
				{ label: 'WAF', url: 'https://example.com/waf/llms.txt', description: 'Web application firewall' },
			]),
		).toBe('## Federated Sites\n\n- [WAF](https://example.com/waf/llms.txt): Web application firewall');
	});

	it('preserves given order and handles mixed entries', () => {
		const out = renderFederatedSites([
			{ label: 'WAF', url: 'https://example.com/waf/llms.txt', description: 'Web application firewall' },
			{ label: 'CSD', url: 'https://example.com/csd/llms.txt' },
			{ label: 'DDOS', url: 'https://example.com/ddos/llms.txt', description: 'DDoS protection' },
		]);
		expect(out).toBe(
			'## Federated Sites\n' +
				'\n' +
				'- [WAF](https://example.com/waf/llms.txt): Web application firewall\n' +
				'- [CSD](https://example.com/csd/llms.txt)\n' +
				'- [DDOS](https://example.com/ddos/llms.txt): DDoS protection',
		);
	});

	it('matches the xcsh#223 reference output', () => {
		const out = renderFederatedSites([
			{ label: 'WAF', url: 'https://f5xc-salesdemos.github.io/waf/llms.txt', description: 'Web application firewall' },
			{ label: 'CSD', url: 'https://f5xc-salesdemos.github.io/csd/llms.txt', description: 'Client-side defense' },
		]);
		expect(out).toMatchSnapshot();
	});
});
