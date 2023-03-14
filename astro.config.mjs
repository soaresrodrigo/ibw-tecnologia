import { defineConfig } from 'astro/config';
import image from "@astrojs/image";
import netlify from "@astrojs/netlify/functions";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: 'https://ibwtecnologia.com.br' ,
  integrations: [image(), partytown(), sitemap()],
  output: "server",
  adapter: netlify()
});
