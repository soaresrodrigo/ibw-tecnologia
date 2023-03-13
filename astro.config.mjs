import { defineConfig } from 'astro/config';
import image from "@astrojs/image";
import netlify from "@astrojs/netlify/functions";
const site = import.meta.env.BASE_URL;

// https://astro.build/config

// https://astro.build/config

// https://astro.build/config
export default defineConfig({
  site: 'https://ibw.com.br' || site,
  integrations: [image()],
  output: "server",
  adapter: netlify()
});
