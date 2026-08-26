# erenalpaslan.github.io

Personal blog. Astro, static, deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`.

## Writing

Posts are markdown under `src/content/blog/`. Frontmatter:

| field | required | what it does |
|---|---|---|
| `title` | yes | |
| `description` | yes | the standfirst, and the index entry's summary |
| `pubDate` | yes | orders the index and the Newer/Older pager |
| `tags` | no | first three show on the index |
| `mediumUrl` | no | **presence is the mirrored-on-Medium state** — it draws the "Read on Medium" button and the "also on Medium" mark; absent draws "here only" |
| `category` | no | the kicker beside date and reading time; falls back to the first tag |
| `claps` | no | Medium's API is closed, so this is typed by hand; the whole segment is omitted when absent |
| `heroImage` | no | |
| `draft` | no | `true` keeps it out of the index and the feed |

Reading time is computed from the body, never stored.

## Publishing to Medium

Medium stopped issuing integration tokens and archived its API in March 2023,
so there is no automated push. The flow is:

1. Push here. The Action builds and Pages publishes.
2. Open Medium's **Import a Story** and paste the post's URL.
3. Medium sets the canonical back to this site, which is the right way round —
   this is the original, Medium is the mirror.

Then add `mediumUrl` to the post's frontmatter so the link appears here.

`/rss.xml` carries **full** post content, which is what an importer like
dev.to reads. These posts were themselves recovered from Medium's own
full-content feed.

## Design

`design/personal-blog/` holds the design system (`nocturne/`), the approved
mockup, and the `prompts/` each artefact was generated from — so the design
can be regenerated rather than re-invented. `src/styles/blog.css` is a
transcription of that mockup: retune the design and re-transcribe, never nudge
a value in the stylesheet until it looks right.

## Local

```sh
npm install
npm run dev
npm run build
```
