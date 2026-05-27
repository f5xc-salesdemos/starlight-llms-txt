import { getCollection } from 'astro:content';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import type { APIRoute } from 'astro';
import { renderFederatedSites } from './federated-sites';
import { buildSectionTree, renderSectionTree } from './sidebar-nav';
import { ensureTrailingSlash, getSiteTitle, isDefaultLocale } from './utils';

export const prerender = true;

export const GET: APIRoute = async (context) => {
  const title = getSiteTitle();
  const description = starlightLllmsTxtContext.description ? `> ${starlightLllmsTxtContext.description}` : '';
  const site = new URL(ensureTrailingSlash(starlightLllmsTxtContext.base), context.site);
  const llmsFullLink = new URL('./llms-full.txt', site);
  const llmsSmallLink = new URL('./llms-small.txt', site);

  const segments = [`# ${title}`];
  if (description) segments.push(description);
  if (starlightLllmsTxtContext.details) segments.push(starlightLllmsTxtContext.details);

  segments.push(`## Documentation Sets`);
  segments.push(
    [
      `- [Abridged documentation](${llmsSmallLink}): a compact version of the documentation for ${getSiteTitle()}, with non-essential content removed`,
      `- [Complete documentation](${llmsFullLink}): the full documentation for ${getSiteTitle()}`,
    ].join('\n'),
  );

  if (starlightLllmsTxtContext.sidebarNav) {
    const docs = await getCollection('docs', (doc) => isDefaultLocale(doc) && !doc.data.draft);
    const tree = buildSectionTree(docs, starlightLllmsTxtContext.promote, starlightLllmsTxtContext.demote);
    const rendered = renderSectionTree(tree, site);
    if (rendered) segments.push(rendered);
  }

  {
    const rendered = renderFederatedSites(
      starlightLllmsTxtContext.federatedSites,
      starlightLllmsTxtContext.federatedSiteCategories,
    );
    if (rendered) segments.push(rendered);
  }

  segments.push(`## Notes`);
  segments.push(`- The complete documentation includes all content from the official documentation
- The content is automatically generated from the same source as the official documentation`);

  if (starlightLllmsTxtContext.optionalLinks.length > 0) {
    segments.push('## Optional');
    segments.push(
      starlightLllmsTxtContext.optionalLinks
        .map((link) => `- [${link.label}](${link.url})${link.description ? `: ${link.description}` : ''}`)
        .join('\n'),
    );
  }

  return new Response(`${segments.join('\n\n')}\n`);
};
