import { defineConfig } from 'astro/config';
import image from "@astrojs/image";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";

const site ='https://ibwtecnologia.com.br';

export default defineConfig({
  site,
  integrations: [
    image(),
    partytown(),
    sitemap({
      customPages: [
        site,
        `${site}/sobre`,
        `${site}/faq`,
        `${site}/servicos/manutencao`,
        `${site}/servicos/produtos`,
        `${site}/servicos/solucoes-empresariais`,
      ]
    }),
  ],
  output: "static",
  root: './',
});
