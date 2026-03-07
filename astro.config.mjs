// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [tailwind(), react(), mdx(), sitemap({
    filter: (page) => !page.includes('/console/') && !/\/v\d+\/?$/.test(page)
  })],
  site: 'https://catalyst-neuromorphic.com',
});
