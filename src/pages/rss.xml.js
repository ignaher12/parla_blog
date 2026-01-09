import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const posts = await getCollection('post');
	const travels = await getCollection('travel');

	const items = [
		...posts.map((post) => ({
			...post.data,
			link: `/past-travels/${post.id}/`,
		})),
		...travels.map((post) => ({
			...post.data,
			pubDate: post.data.travelDate,
			link: `/travel/${post.id}/`,
		})),
	];

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: items,
		heroImage: "public/imgs/logo.png",
	});
}
