import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
const site = import.meta.env.BASE_URL;

// https://astro.build/config
export default defineConfig({
  site: 'https://ibw.com.br',
  integrations: [tailwind()]
});