import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import type { APIRoute, GetStaticPaths } from 'astro';
import { generateLlmsTxt } from './generator';
import { getLocaleKeys, getSiteTitle } from './utils';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = () => {
  return getLocaleKeys().map((locale) => ({ params: { locale } }));
};

export const GET: APIRoute = async (context) => {
  const locale = context.params.locale as string;
  const body = await generateLlmsTxt(context, {
    minify: true,
    description: `This is the abridged developer documentation for ${getSiteTitle()} (${locale})`,
    exclude: starlightLllmsTxtContext.exclude,
    locale,
  });
  return new Response(body);
};
