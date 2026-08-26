import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    // Presence of mediumUrl IS the "mirrored on Medium" state — the design
    // shows "also on Medium" against "here only", and deriving that from the
    // link itself means there is no second flag to keep in step with it.
    mediumUrl: z.string().url().optional(),
    heroImage: z.string().optional(),
    // The kicker beside date and reading time. Falls back to the first tag
    // when absent, so a post never has to carry it.
    category: z.string().optional(),
    // Medium's API is closed, so this cannot be fetched — it is here for a
    // number typed by hand, and the whole segment is omitted when absent.
    claps: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
