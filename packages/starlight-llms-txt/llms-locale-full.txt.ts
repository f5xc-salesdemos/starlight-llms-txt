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
    minify: false,
    description: `This is the full developer documentation for ${getSiteTitle()} (${locale})`,
    locale,
  });
  return new Response(body);
};
