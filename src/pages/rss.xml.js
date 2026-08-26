import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

/* Full content, deliberately. This blog's own posts were recovered from
 * Medium's full-content feed; publishing the same way keeps the door open
 * in the other direction — dev.to and other importers read a feed, not a
 * summary. */
export async function GET(context) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: "Eren Alpaslan",
    description: "Notes on Android, Kotlin and the tools around them.",
    site: context.site,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/writing/${post.id}/`,
      categories: post.data.tags,
      content: post.body,
    })),
  });
}
