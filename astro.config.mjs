import { defineConfig } from 'astro/config';
import image from "@astrojs/image";
import netlify from "@astrojs/netlify/functions";
import partytown from "@astrojs/partytown";

const site = import.meta.env.BASE_URL;

// https://astro.build/config
export default defineConfig({
  site: 'https://ibw.com.br' || site,
  integrations: [image(), partytown()],
  output: "server",
  adapter: netlify()
});
