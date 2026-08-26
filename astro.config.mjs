// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://erenalpaslan.github.io",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      // "css-variables" hands the colours back to us, so highlighted code
      // resolves through Nocturne's ramps instead of importing a second
      // palette the design system never agreed to. The variables are
      // defined in src/styles/blog.css.
      theme: "css-variables",
      wrap: false,
    },
  },
});
