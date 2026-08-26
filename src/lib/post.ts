import type { CollectionEntry } from "astro:content";

/** Words per minute used for the reading estimate shown beside the date. */
const WPM = 220;

export function readingTime(body: string | undefined): string {
  const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / WPM))} min read`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The kicker beside the date: an explicit category, else the first tag. */
export function category(entry: CollectionEntry<"blog">): string {
  const explicit = entry.data.category;
  if (explicit) return explicit;
  const first = entry.data.tags[0];
  if (!first) return "";
  return first
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Newest first — the order the index lists in and the pager walks. */
export function byNewest(a: CollectionEntry<"blog">, b: CollectionEntry<"blog">) {
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}
