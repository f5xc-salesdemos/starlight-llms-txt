import type {
	APIRoute,
	GetStaticPaths,
	InferGetStaticParamsType,
	InferGetStaticPropsType,
} from 'astro';
import type { CollectionEntry } from 'astro:content';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import { generatePageMarkdown, getAllPages } from './page-markdown-generator';
import { slugToPath } from './per-page-markdown-utils';

export const getStaticPaths = (async () => {
	const { perPageMarkdown } = starlightLllmsTxtContext;

	// Only generate paths if the feature is enabled
	if (!perPageMarkdown.enabled) {
		return [];
	}

	// Get all pages (already filtered by excludePages inside getAllPages).
	const pages = await getAllPages();

	// Generate paths based on the file pattern
	const paths = pages.map((doc) => ({
		params: { slug: slugToPath(doc.id, perPageMarkdown.extensionStrategy) },
		props: { doc },
	}));

	return paths;
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;
type Params = InferGetStaticParamsType<typeof getStaticPaths>;

/**
 * Route that generates individual Markdown files for each documentation page.
 */
export const GET: APIRoute<Props, Params> = async (context) => {
	// Generate the Markdown content using the doc from props
	const content = await generatePageMarkdown(context.props.doc, context);

	// Return the Markdown content with appropriate headers
	return new Response(content, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
};