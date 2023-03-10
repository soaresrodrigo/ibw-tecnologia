import mime from 'mime';
import { dim, bold, red, yellow, cyan, green } from 'kleur/colors';
import sizeOf from 'image-size';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { c as createAstro, a as createComponent, r as renderTemplate, m as maybeRenderHead, b as addAttribute, d as renderComponent, e as renderSlot } from '../astro.91f111f0.mjs';
import 'html-escaper';
/* empty css                           *//* empty css                             */
const PREFIX = "@astrojs/image";
const dateTimeFormat = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});
const levels = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90
};
function getPrefix(level, timestamp) {
  let prefix = "";
  if (timestamp) {
    prefix += dim(dateTimeFormat.format(new Date()) + " ");
  }
  switch (level) {
    case "debug":
      prefix += bold(green(`[${PREFIX}] `));
      break;
    case "info":
      prefix += bold(cyan(`[${PREFIX}] `));
      break;
    case "warn":
      prefix += bold(yellow(`[${PREFIX}] `));
      break;
    case "error":
      prefix += bold(red(`[${PREFIX}] `));
      break;
  }
  return prefix;
}
const log = (_level, dest) => ({ message, level, prefix = true, timestamp = true }) => {
  if (levels[_level] >= levels[level]) {
    dest(`${prefix ? getPrefix(level, timestamp) : ""}${message}`);
  }
};
const error = log("error", console.error);

async function metadata(src, data) {
  const file = data || await fs.readFile(src);
  const { width, height, type, orientation } = await sizeOf(file);
  const isPortrait = (orientation || 0) >= 5;
  if (!width || !height || !type) {
    return void 0;
  }
  return {
    src: fileURLToPath(src),
    width: isPortrait ? height : width,
    height: isPortrait ? width : height,
    format: type,
    orientation
  };
}

function isRemoteImage(src) {
  return /^(https?:)?\/\//.test(src);
}

function isOutputFormat(value) {
  return ["avif", "jpeg", "jpg", "png", "webp"].includes(value);
}
function isAspectRatioString(value) {
  return /^\d*:\d*$/.test(value);
}
class BaseSSRService {
  async getImageAttributes(transform) {
    const { width, height, src, format, quality, aspectRatio, ...rest } = transform;
    return {
      ...rest,
      width,
      height
    };
  }
  serializeTransform(transform) {
    const searchParams = new URLSearchParams();
    if (transform.quality) {
      searchParams.append("q", transform.quality.toString());
    }
    if (transform.format) {
      searchParams.append("f", transform.format);
    }
    if (transform.width) {
      searchParams.append("w", transform.width.toString());
    }
    if (transform.height) {
      searchParams.append("h", transform.height.toString());
    }
    if (transform.aspectRatio) {
      searchParams.append("ar", transform.aspectRatio.toString());
    }
    if (transform.fit) {
      searchParams.append("fit", transform.fit);
    }
    if (transform.background) {
      searchParams.append("bg", transform.background);
    }
    if (transform.position) {
      searchParams.append("p", encodeURI(transform.position));
    }
    searchParams.append("href", transform.src);
    return { searchParams };
  }
  parseTransform(searchParams) {
    if (!searchParams.has("href")) {
      return void 0;
    }
    let transform = { src: searchParams.get("href") };
    if (searchParams.has("q")) {
      transform.quality = parseInt(searchParams.get("q"));
    }
    if (searchParams.has("f")) {
      const format = searchParams.get("f");
      if (isOutputFormat(format)) {
        transform.format = format;
      }
    }
    if (searchParams.has("w")) {
      transform.width = parseInt(searchParams.get("w"));
    }
    if (searchParams.has("h")) {
      transform.height = parseInt(searchParams.get("h"));
    }
    if (searchParams.has("ar")) {
      const ratio = searchParams.get("ar");
      if (isAspectRatioString(ratio)) {
        transform.aspectRatio = ratio;
      } else {
        transform.aspectRatio = parseFloat(ratio);
      }
    }
    if (searchParams.has("fit")) {
      transform.fit = searchParams.get("fit");
    }
    if (searchParams.has("p")) {
      transform.position = decodeURI(searchParams.get("p"));
    }
    if (searchParams.has("bg")) {
      transform.background = searchParams.get("bg");
    }
    return transform;
  }
}

const imagePoolModulePromise = import('../image-pool.8c97b1e1.mjs');
class SquooshService extends BaseSSRService {
  async processAvif(image, transform) {
    const encodeOptions = transform.quality ? { avif: { quality: transform.quality } } : { avif: {} };
    await image.encode(encodeOptions);
    const data = await image.encodedWith.avif;
    return {
      data: data.binary,
      format: "avif"
    };
  }
  async processJpeg(image, transform) {
    const encodeOptions = transform.quality ? { mozjpeg: { quality: transform.quality } } : { mozjpeg: {} };
    await image.encode(encodeOptions);
    const data = await image.encodedWith.mozjpeg;
    return {
      data: data.binary,
      format: "jpeg"
    };
  }
  async processPng(image, transform) {
    await image.encode({ oxipng: {} });
    const data = await image.encodedWith.oxipng;
    return {
      data: data.binary,
      format: "png"
    };
  }
  async processWebp(image, transform) {
    const encodeOptions = transform.quality ? { webp: { quality: transform.quality } } : { webp: {} };
    await image.encode(encodeOptions);
    const data = await image.encodedWith.webp;
    return {
      data: data.binary,
      format: "webp"
    };
  }
  async autorotate(transform, inputBuffer) {
    try {
      const meta = await metadata(transform.src, inputBuffer);
      switch (meta == null ? void 0 : meta.orientation) {
        case 3:
        case 4:
          return { type: "rotate", numRotations: 2 };
        case 5:
        case 6:
          return { type: "rotate", numRotations: 1 };
        case 7:
        case 8:
          return { type: "rotate", numRotations: 3 };
      }
    } catch {
    }
  }
  async transform(inputBuffer, transform) {
    const operations = [];
    if (!isRemoteImage(transform.src)) {
      const autorotate = await this.autorotate(transform, inputBuffer);
      if (autorotate) {
        operations.push(autorotate);
      }
    } else if (transform.src.startsWith("//")) {
      transform.src = `https:${transform.src}`;
    }
    if (transform.width || transform.height) {
      const width = transform.width && Math.round(transform.width);
      const height = transform.height && Math.round(transform.height);
      operations.push({
        type: "resize",
        width,
        height
      });
    }
    if (!transform.format) {
      error({
        level: "info",
        prefix: false,
        message: red(`Unknown image output: "${transform.format}" used for ${transform.src}`)
      });
      throw new Error(`Unknown image output: "${transform.format}" used for ${transform.src}`);
    }
    const { processBuffer } = await imagePoolModulePromise;
    const data = await processBuffer(inputBuffer, operations, transform.format, transform.quality);
    return {
      data: Buffer.from(data),
      format: transform.format
    };
  }
}
const service = new SquooshService();
var squoosh_default = service;

const fnv1a52 = (str) => {
  const len = str.length;
  let i = 0, t0 = 0, v0 = 8997, t1 = 0, v1 = 33826, t2 = 0, v2 = 40164, t3 = 0, v3 = 52210;
  while (i < len) {
    v0 ^= str.charCodeAt(i++);
    t0 = v0 * 435;
    t1 = v1 * 435;
    t2 = v2 * 435;
    t3 = v3 * 435;
    t2 += v0 << 8;
    t3 += v1 << 8;
    t1 += t0 >>> 16;
    v0 = t0 & 65535;
    t2 += t1 >>> 16;
    v1 = t1 & 65535;
    v3 = t3 + (t2 >>> 16) & 65535;
    v2 = t2 & 65535;
  }
  return (v3 & 15) * 281474976710656 + v2 * 4294967296 + v1 * 65536 + (v0 ^ v3 >> 4);
};
const etag = (payload, weak = false) => {
  const prefix = weak ? 'W/"' : '"';
  return prefix + fnv1a52(payload).toString(36) + payload.length.toString(36) + '"';
};

async function loadRemoteImage(src) {
  try {
    const res = await fetch(src);
    if (!res.ok) {
      return void 0;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error(err);
    return void 0;
  }
}
const get = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const transform = squoosh_default.parseTransform(url.searchParams);
    let inputBuffer = void 0;
    const sourceUrl = isRemoteImage(transform.src) ? new URL(transform.src) : new URL(transform.src, url.origin);
    inputBuffer = await loadRemoteImage(sourceUrl);
    if (!inputBuffer) {
      return new Response("Not Found", { status: 404 });
    }
    const { data, format } = await squoosh_default.transform(inputBuffer, transform);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": mime.getType(format) || "",
        "Cache-Control": "public, max-age=31536000",
        ETag: etag(data.toString()),
        Date: new Date().toUTCString()
      }
    });
  } catch (err) {
    console.error(err);
    return new Response(`Server Error: ${err}`, { status: 500 });
  }
};

const _page0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  get
}, Symbol.toStringTag, { value: 'Module' }));

const $$Astro$e = createAstro("https://ibw.com.br");
const $$Header = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$e, $$props, $$slots);
  Astro2.self = $$Header;
  return renderTemplate`${maybeRenderHead($$result)}<header class="masthead astro-3EF6KSR2">
  <div class="container astro-3EF6KSR2">
    <div class="masthead-heading text-uppercase astro-3EF6KSR2">IBW Tecnologia</div>
    <div class="masthead-subheading astro-3EF6KSR2">Multi Assistência</div>
    <a class="btn btn-primary btn-xl text-uppercase p-3 astro-3EF6KSR2" href="#services">Conheça os Nossos Serviços</a>
  </div>
</header>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/components/Header.astro");

const $$Astro$d = createAstro("https://ibw.com.br");
const $$Head = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$d, $$props, $$slots);
  Astro2.self = $$Head;
  const canonicalURL = new URL(Astro2.url.pathname, Astro2.site);
  const { title, description, image = "/images/logo.png" } = Astro2.props;
  const completeTitle = "IBW Tecnologia" + " - " + title;
  const loadedImage = new URL(image, Astro2.url);
  return renderTemplate`<!-- Global Metadata --><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/svg+xml"${addAttribute(loadedImage, "href")}>
<meta name="generator"${addAttribute(Astro2.generator, "content")}>

<!-- Canonical URL -->
<link rel="canonical"${addAttribute(canonicalURL, "href")}>

<!-- Primary Meta Tags -->
<title>${completeTitle}</title>
<meta name="title"${addAttribute(completeTitle, "content")}>
<meta name="description"${addAttribute(description, "content")}>

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url"${addAttribute(Astro2.url, "content")}>
<meta property="og:title"${addAttribute(completeTitle, "content")}>
<meta property="og:description"${addAttribute(description, "content")}>
<meta property="og:image"${addAttribute(loadedImage, "content")}>

<!-- Twitter
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content={Astro.url} />
<meta property="twitter:title" content={title} />
<meta property="twitter:description" content={description} />
<meta property="twitter:image" content={loadedImage} /> -->`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/components/Head.astro");

const $$Astro$c = createAstro("https://ibw.com.br");
const $$Facebook = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$c, $$props, $$slots);
  Astro2.self = $$Facebook;
  return renderTemplate`${maybeRenderHead($$result)}<svg viewBox="0 0 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="currentColor" width="24" height="32"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier">
    <title>Facebook-color</title>
    <desc>Created with Sketch.</desc>
    <defs> </defs>
    <g id="Icons" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
      <g id="Color-" transform="translate(-200.000000, -160.000000)" fill="currentColor">
        <path d="M225.638355,208 L202.649232,208 C201.185673,208 200,206.813592 200,205.350603 L200,162.649211 C200,161.18585 201.185859,160 202.649232,160 L245.350955,160 C246.813955,160 248,161.18585 248,162.649211 L248,205.350603 C248,206.813778 246.813769,208 245.350955,208 L233.119305,208 L233.119305,189.411755 L239.358521,189.411755 L240.292755,182.167586 L233.119305,182.167586 L233.119305,177.542641 C233.119305,175.445287 233.701712,174.01601 236.70929,174.01601 L240.545311,174.014333 L240.545311,167.535091 C239.881886,167.446808 237.604784,167.24957 234.955552,167.24957 C229.424834,167.24957 225.638355,170.625526 225.638355,176.825209 L225.638355,182.167586 L219.383122,182.167586 L219.383122,189.411755 L225.638355,189.411755 L225.638355,208 L225.638355,208 Z" id="Facebook">
        </path>
      </g>
    </g>
  </g></svg>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/assets/icons/Facebook.astro");

const $$Astro$b = createAstro("https://ibw.com.br");
const $$Instagram = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$b, $$props, $$slots);
  Astro2.self = $$Instagram;
  return renderTemplate`${maybeRenderHead($$result)}<svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier">
    <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M17.6361 7H17.6477" stroke="#292D32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
  </g></svg>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/assets/icons/Instagram.astro");

const $$Astro$a = createAstro("https://ibw.com.br");
const $$Tiktok = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$a, $$props, $$slots);
  Astro2.self = $$Tiktok;
  return renderTemplate`${maybeRenderHead($$result)}<svg fill="currentColor" viewBox="0 0 32 32" width="28" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier">
    <title>tiktok</title>
    <path d="M16.656 1.029c1.637-0.025 3.262-0.012 4.886-0.025 0.054 2.031 0.878 3.859 2.189 5.213l-0.002-0.002c1.411 1.271 3.247 2.095 5.271 2.235l0.028 0.002v5.036c-1.912-0.048-3.71-0.489-5.331-1.247l0.082 0.034c-0.784-0.377-1.447-0.764-2.077-1.196l0.052 0.034c-0.012 3.649 0.012 7.298-0.025 10.934-0.103 1.853-0.719 3.543-1.707 4.954l0.020-0.031c-1.652 2.366-4.328 3.919-7.371 4.011l-0.014 0c-0.123 0.006-0.268 0.009-0.414 0.009-1.73 0-3.347-0.482-4.725-1.319l0.040 0.023c-2.508-1.509-4.238-4.091-4.558-7.094l-0.004-0.041c-0.025-0.625-0.037-1.25-0.012-1.862 0.49-4.779 4.494-8.476 9.361-8.476 0.547 0 1.083 0.047 1.604 0.136l-0.056-0.008c0.025 1.849-0.050 3.699-0.050 5.548-0.423-0.153-0.911-0.242-1.42-0.242-1.868 0-3.457 1.194-4.045 2.861l-0.009 0.030c-0.133 0.427-0.21 0.918-0.21 1.426 0 0.206 0.013 0.41 0.037 0.61l-0.002-0.024c0.332 2.046 2.086 3.59 4.201 3.59 0.061 0 0.121-0.001 0.181-0.004l-0.009 0c1.463-0.044 2.733-0.831 3.451-1.994l0.010-0.018c0.267-0.372 0.45-0.822 0.511-1.311l0.001-0.014c0.125-2.237 0.075-4.461 0.087-6.698 0.012-5.036-0.012-10.060 0.025-15.083z"></path>
  </g></svg>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/assets/icons/Tiktok.astro");

const $$Astro$9 = createAstro("https://ibw.com.br");
const $$Whatsapp = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$9, $$props, $$slots);
  Astro2.self = $$Whatsapp;
  return renderTemplate`${maybeRenderHead($$result)}<svg fill="currentColor" viewBox="0 0 32 32" width="28" height="28" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier">
    <title>whatsapp</title>
    <path d="M26.576 5.363c-2.69-2.69-6.406-4.354-10.511-4.354-8.209 0-14.865 6.655-14.865 14.865 0 2.732 0.737 5.291 2.022 7.491l-0.038-0.070-2.109 7.702 7.879-2.067c2.051 1.139 4.498 1.809 7.102 1.809h0.006c8.209-0.003 14.862-6.659 14.862-14.868 0-4.103-1.662-7.817-4.349-10.507l0 0zM16.062 28.228h-0.005c-0 0-0.001 0-0.001 0-2.319 0-4.489-0.64-6.342-1.753l0.056 0.031-0.451-0.267-4.675 1.227 1.247-4.559-0.294-0.467c-1.185-1.862-1.889-4.131-1.889-6.565 0-6.822 5.531-12.353 12.353-12.353s12.353 5.531 12.353 12.353c0 6.822-5.53 12.353-12.353 12.353h-0zM22.838 18.977c-0.371-0.186-2.197-1.083-2.537-1.208-0.341-0.124-0.589-0.185-0.837 0.187-0.246 0.371-0.958 1.207-1.175 1.455-0.216 0.249-0.434 0.279-0.805 0.094-1.15-0.466-2.138-1.087-2.997-1.852l0.010 0.009c-0.799-0.74-1.484-1.587-2.037-2.521l-0.028-0.052c-0.216-0.371-0.023-0.572 0.162-0.757 0.167-0.166 0.372-0.434 0.557-0.65 0.146-0.179 0.271-0.384 0.366-0.604l0.006-0.017c0.043-0.087 0.068-0.188 0.068-0.296 0-0.131-0.037-0.253-0.101-0.357l0.002 0.003c-0.094-0.186-0.836-2.014-1.145-2.758-0.302-0.724-0.609-0.625-0.836-0.637-0.216-0.010-0.464-0.012-0.712-0.012-0.395 0.010-0.746 0.188-0.988 0.463l-0.001 0.002c-0.802 0.761-1.3 1.834-1.3 3.023 0 0.026 0 0.053 0.001 0.079l-0-0.004c0.131 1.467 0.681 2.784 1.527 3.857l-0.012-0.015c1.604 2.379 3.742 4.282 6.251 5.564l0.094 0.043c0.548 0.248 1.25 0.513 1.968 0.74l0.149 0.041c0.442 0.14 0.951 0.221 1.479 0.221 0.303 0 0.601-0.027 0.889-0.078l-0.031 0.004c1.069-0.223 1.956-0.868 2.497-1.749l0.009-0.017c0.165-0.366 0.261-0.793 0.261-1.242 0-0.185-0.016-0.366-0.047-0.542l0.003 0.019c-0.092-0.155-0.34-0.247-0.712-0.434z"></path>
  </g></svg>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/assets/icons/Whatsapp.astro");

const $$Astro$8 = createAstro("https://ibw.com.br");
const $$Youtube = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$8, $$props, $$slots);
  Astro2.self = $$Youtube;
  return renderTemplate`${maybeRenderHead($$result)}<svg fill="currentColor" width="32" height="32" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-271 311.2 256 179.8" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier">
    <path d="M-59.1,311.2h-167.8c0,0-44.1,0-44.1,44.1v91.5c0,0,0,44.1,44.1,44.1h167.8c0,0,44.1,0,44.1-44.1v-91.5 C-15,355.3-15,311.2-59.1,311.2z M-177.1,450.3v-98.5l83.8,49.3L-177.1,450.3z"></path>
  </g></svg>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/assets/icons/Youtube.astro");

const $$Astro$7 = createAstro("https://ibw.com.br");
const $$Footer = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$Footer;
  const title = "IBW Tecnologia";
  const currentYear = new Date().getFullYear();
  return renderTemplate`${maybeRenderHead($$result)}<div class="footer-dark bg-ibw-dark astro-SZ7XMLTE">
  <footer class="astro-SZ7XMLTE">
    <div class="container astro-SZ7XMLTE">
      <div class="row mb-5 astro-SZ7XMLTE">
        <div class="col-md-3 mx-auto astro-SZ7XMLTE">
          <img src="/images/logo.png" alt="logo" height="100" class="mx-auto d-block astro-SZ7XMLTE">
        </div>
      </div>
      <div class="row astro-SZ7XMLTE">
        <div class="col-md-6 item text astro-SZ7XMLTE">
          <h3 class="astro-SZ7XMLTE">${title}</h3>
          <p class="astro-SZ7XMLTE">Empresa Especializada em Manutenção de Notebook e Computador.</p>
          <p class="astro-SZ7XMLTE">Soluções em Tecnologia para Empresas.</p>
        </div>
        <div class="col-sm-6 col-md-3 item astro-SZ7XMLTE">
          <h3 class="astro-SZ7XMLTE">Contatos</h3>
          <ul class="astro-SZ7XMLTE">
            <li class="astro-SZ7XMLTE">
              <a href="mailto:contato@ibwtecnologia.com.br" aria-label="Email" title="Email" class="astro-SZ7XMLTE">contato@ibwtecnologia.com.br</a>
            </li>
            <li class="astro-SZ7XMLTE">
              <a href="tel:+5571987465932" aria-label="Telefone" title="Telefone" class="astro-SZ7XMLTE">(71) 98746-5932</a>
            </li>
          </ul>
        </div>
        <div class="col-sm-6 col-md-1 item astro-SZ7XMLTE">
          <h3 class="astro-SZ7XMLTE">Endereço</h3>
          <ul class="astro-SZ7XMLTE">
            <li class="astro-SZ7XMLTE">
              <a target="_blank" href="https://www.google.com/maps/search/Tv.%20Ant%C3%B4nio%20Fel%C3%ADcio%20P%C3%ADmentel%2C%2013A%20-%20Centro%2C%20Lauro%20de%20Freitas%20-%20BA%2C%2042700-000%2C%20Brasil/@-12.8945,-38.3225,17z?hl=pt-BR" class="astro-SZ7XMLTE">Tv. Antônio Felício Pímentel, 13A - Centro, Lauro de Freitas - BA,
                42700-000, Brasil</a>

            </li>
          </ul>
        </div>
        <div class="col-sm-6 col-md-2 item text astro-SZ7XMLTE">
          <h3 class="astro-SZ7XMLTE">Horários</h3>
            <p class="astro-SZ7XMLTE">seg-sex: 9hrs - 17hrs</p>
            <p class="astro-SZ7XMLTE">sab: 8hrs - 12hrs</p>
        </div>

        <div class="col social astro-SZ7XMLTE">
          <a href="#" class="astro-SZ7XMLTE">${renderComponent($$result, "Instagram", $$Instagram, { "class": "astro-SZ7XMLTE" })}</a>
          <a href="#" class="astro-SZ7XMLTE">${renderComponent($$result, "Facebook", $$Facebook, { "class": "astro-SZ7XMLTE" })}</a>
          <a href="#" class="astro-SZ7XMLTE">${renderComponent($$result, "Youtube", $$Youtube, { "class": "astro-SZ7XMLTE" })}</a>
          <a href="#" class="astro-SZ7XMLTE">${renderComponent($$result, "Whatsapp", $$Whatsapp, { "class": "astro-SZ7XMLTE" })}</a>
          <a href="#" class="astro-SZ7XMLTE">${renderComponent($$result, "Tiktok", $$Tiktok, { "class": "astro-SZ7XMLTE" })}</a>
        </div>
      </div>
      <hr class="astro-SZ7XMLTE">
      <p class="copyright astro-SZ7XMLTE">${title} © ${currentYear}</p>
    </div>
  </footer>
</div>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/components/Footer.astro");

const $$Astro$6 = createAstro("https://ibw.com.br");
const $$Menu = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$Menu;
  return renderTemplate`${maybeRenderHead($$result)}<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="36"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier">
    <path d="M3 7H21" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path>
    <path d="M3 12H21" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path>
    <path d="M3 17H21" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"></path>
  </g></svg>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/assets/icons/Menu.astro");

const $$Astro$5 = createAstro("https://ibw.com.br");
const $$CTAButton = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$CTAButton;
  return renderTemplate`${maybeRenderHead($$result)}<a class="cta btn btn-success text-uppercase p-2 astro-PXXNPLNO" href="#services">
    ${renderComponent($$result, "Whatsapp", $$Whatsapp, { "class": "astro-PXXNPLNO" })}
    <span class="astro-PXXNPLNO">Solicitar serviço</span>
</a>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/components/CTAButton.astro");

const $$Astro$4 = createAstro("https://ibw.com.br");
const $$Navbar = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$Navbar;
  return renderTemplate`${maybeRenderHead($$result)}<div class="astro-5BLMO7YK">
  <nav class="navbar navbar-expand-lg navbar-dark fixed-top astro-5BLMO7YK" id="mainNav">
    <div class="container astro-5BLMO7YK">
      <a class="navbar-brand astro-5BLMO7YK" href="#page-top"><img src="/images/logo.png" alt="..." width="100" class="astro-5BLMO7YK"></a>
      <button class="navbar-toggler astro-5BLMO7YK" type="button" data-bs-toggle="collapse" data-bs-target="#navbarResponsive" aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
        ${renderComponent($$result, "Menu", $$Menu, { "class": "astro-5BLMO7YK" })}
        <i class="fas fa-bars ms-1 astro-5BLMO7YK"></i>
      </button>
      <div class="collapse navbar-collapse astro-5BLMO7YK" id="navbarResponsive">
        <ul class="navbar-nav text-uppercase ms-auto py-4 py-lg-0 astro-5BLMO7YK">
          <li class="nav-item astro-5BLMO7YK">
            <a class="nav-link astro-5BLMO7YK" href="#services">Serviços</a>
          </li>
          <li class="nav-item astro-5BLMO7YK">
            <a class="nav-link astro-5BLMO7YK" href="#portfolio">Produtos</a>
          </li>
          <li class="nav-item astro-5BLMO7YK"><a class="nav-link astro-5BLMO7YK" href="#about">Sobre</a></li>
          <li class="nav-item astro-5BLMO7YK"><a class="nav-link astro-5BLMO7YK" href="#faq">FAQ</a></li>
          <li class="nav-item astro-5BLMO7YK">
            <a class="nav-link astro-5BLMO7YK" href="#contact">Contato</a>
          </li>
        </ul>

        <div class="col-3 astro-5BLMO7YK">
          ${renderComponent($$result, "CTAButton", $$CTAButton, { "class": "astro-5BLMO7YK" })}
        </div>
      </div>
    </div>
  </nav>
</div>

`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/components/Navbar.astro");

const bootstrap = "/_astro/bootstrap.bundle.min.9520018f.js";

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro$3 = createAstro("https://ibw.com.br");
const $$DefaultPage = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$DefaultPage;
  const { title, description, image } = Astro2.props;
  return renderTemplate(_a || (_a = __template(['<html lang="pt-br">\n  ', "\n  ", "<body>\n    ", "\n    ", "\n    ", "\n    <script", "><\/script>\n  </body>\n</html>"])), renderComponent($$result, "Head", $$Head, { "title": title, "description": description, "image": image }), maybeRenderHead($$result), renderComponent($$result, "Navbar", $$Navbar, {}), renderSlot($$result, $$slots["default"]), renderComponent($$result, "Footer", $$Footer, {}), addAttribute(bootstrap, "src"));
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/layouts/DefaultPage.astro");

const $$Astro$2 = createAstro("https://ibw.com.br");
const $$Card = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$Card;
  const { icon, title, description, buttonCTA, buttonLink } = Astro2.props;
  return renderTemplate`${maybeRenderHead($$result)}<div class="card shadow-light bg-ibw-dark astro-DOHJNAO5">
  <img${addAttribute(icon, "src")}${addAttribute(title, "alt")} width="100px" class="astro-DOHJNAO5">
  <h1 class="astro-DOHJNAO5">${title}</h1>
  <p class="astro-DOHJNAO5">${description}</p>

  ${buttonCTA && buttonLink ? renderTemplate`<a class="btn btn-success astro-DOHJNAO5"${addAttribute(buttonLink, "href")}> ${buttonCTA}</a>` : null}
</div>`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/components/Card.astro");

const $$Astro$1 = createAstro("https://ibw.com.br");
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Index;
  const articles = [
    {
      photoUrl: "https://thispersondoesnotexist.com/image",
      author: "Rodrigo Soares",
      description: "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Hic quo, ad iusto corporis neque tempora voluptate perspiciatis adipisci laboriosam. Deleniti temporibus iure voluptates quae modi laboriosam quibusdam amet reprehenderit esse."
    },
    {
      photoUrl: "https://thispersondoesnotexist.com/image",
      author: "La\xEDs Santana",
      description: "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Hic quo, ad iusto corporis neque tempora voluptate perspiciatis adipisci laboriosam. Deleniti temporibus iure voluptates quae modi laboriosam quibusdam amet reprehenderit esse."
    },
    {
      photoUrl: "https://thispersondoesnotexist.com/image",
      author: "Danilo Ferreira",
      description: "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Hic quo, ad iusto corporis neque tempora voluptate perspiciatis adipisci laboriosam. Deleniti temporibus iure voluptates quae modi laboriosam quibusdam amet reprehenderit esse."
    },
    {
      photoUrl: "https://thispersondoesnotexist.com/image",
      author: "Jessica Garcia",
      description: "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Hic quo, ad iusto corporis neque tempora voluptate perspiciatis adipisci laboriosam. Deleniti temporibus iure voluptates quae modi laboriosam quibusdam amet reprehenderit esse."
    },
    {
      photoUrl: "https://thispersondoesnotexist.com/image",
      author: "Vinicius Silva",
      description: "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Hic quo, ad iusto corporis neque tempora voluptate perspiciatis adipisci laboriosam. Deleniti temporibus iure voluptates quae modi laboriosam quibusdam amet reprehenderit esse."
    }
  ];
  return renderTemplate`${renderComponent($$result, "DefaultPage", $$DefaultPage, { "title": "Multi tecnologia", "description": "", "class": "astro-J7PV25F6" }, { "default": () => renderTemplate`${renderComponent($$result, "Header", $$Header, { "class": "astro-J7PV25F6" })}${maybeRenderHead($$result)}<section class="services section-config astro-J7PV25F6">
    <div class="container astro-J7PV25F6">
      <div class="title-config astro-J7PV25F6">
        <h1 class="astro-J7PV25F6">Serviços</h1>
        <p class="astro-J7PV25F6">Clique em <mark class="astro-J7PV25F6">Saiba mais</mark> para obter mais detalhes.</p>
      </div>

      <div class="row m-2 astro-J7PV25F6">
        <div class="col-md-4 astro-J7PV25F6">
          ${renderComponent($$result, "Card", $$Card, { "icon": "/icons/maintenance.svg", "title": "Manuten\xE7\xE3o", "description": "Somos especialistas em manuten\xE7\xE3o de notebooks e computadores. Temos um laborat\xF3rio completo para repara\xE7\xE3o do seu equipamento.", "buttonCTA": "Saiba mais", "buttonLink": "/contato", "class": "astro-J7PV25F6" })}
        </div>
        <div class="col-md-4 astro-J7PV25F6">
          ${renderComponent($$result, "Card", $$Card, { "icon": "/icons/business.svg", "title": "Solu\xE7\xF5es empresariais", "description": "Oferecemos solu\xE7\xF5es de T.I para empresas. Dentre as solu\xE7\xF5es est\xE3o: Redes, CFTV, Alarmes, Interfonia e Controle de Acesso.", "buttonCTA": "Saiba mais", "buttonLink": "/contato", "class": "astro-J7PV25F6" })}
        </div>
        <div class="col-md-4 astro-J7PV25F6">
          ${renderComponent($$result, "Card", $$Card, { "icon": "/icons/sale.svg", "title": "Vendas", "description": "Compre computadores e itens de inform\xE1tica na IBW. Pc Gamers, mem\xF3rias, SSD, mouses, teclados e muito mais.", "buttonCTA": "Saiba mais", "buttonLink": "/contato", "class": "astro-J7PV25F6" })}
        </div>
      </div>
    </div>
  </section><section class="quantity section-config bg-dark astro-J7PV25F6">
    <div class="container astro-J7PV25F6">
      <div class="row text-secondary astro-J7PV25F6">
        <div class="col-3 m-1 mx-auto shadow-light border-top border-primary astro-J7PV25F6">
          <h2 class="astro-J7PV25F6">300+</h2>
          <p class="text-primary astro-J7PV25F6">Clientes atendidos</p>
        </div>
        <div class="col-3 m-1 mx-auto shadow-light border-top border-warning astro-J7PV25F6">
          <h2 class="astro-J7PV25F6">200+</h2>
          <p class="text-warning astro-J7PV25F6">Avaliações</p>
        </div>
        <div class="col-3 m-1 mx-auto shadow-light border-top border-danger astro-J7PV25F6">
          <h2 class="astro-J7PV25F6">100+</h2>
          <p class="text-danger astro-J7PV25F6">Produtos à venda</p>
        </div>
      </div>
      <div class="row mt-5 astro-J7PV25F6">
        <div class="col-3 mx-auto astro-J7PV25F6">

          ${renderComponent($$result, "CTAButton", $$CTAButton, { "class": "astro-J7PV25F6" })}
        </div>

      </div>
    </div>
  </section><section class="section-config bg-ibw astro-J7PV25F6">
    <div class="container astro-J7PV25F6">
      <div class="testimonial js-tabcontent astro-J7PV25F6">
        <img class="quotation astro-J7PV25F6" src="/icons/quotation.svg" alt="quotation">
        ${articles.map((item) => {
    return renderTemplate`<article class="astro-J7PV25F6">
                <p class="astro-J7PV25F6">${item.description}</p>
                <div class="author astro-J7PV25F6">${item.author}</div>
              </article>`;
  })}

        <ul class="avatars js-tabmenu astro-J7PV25F6">
          ${articles.map((item) => {
    return renderTemplate`<li class="astro-J7PV25F6">
                  <img${addAttribute(item.photoUrl, "src")}${addAttribute(item.author, "alt")} class="astro-J7PV25F6">
                </li>`;
  })}
        </ul>
      </div>
    </div>
  </section><section class="brands section-config bg-white astro-J7PV25F6">
    <ul class="container-fluid astro-J7PV25F6">
      <li class="astro-J7PV25F6"><img src="/images/brands/avell.png" src="avell" width="100" class="astro-J7PV25F6"></li>
      <li class="astro-J7PV25F6"><img src="/images/brands/vaio.png" src="vaio" width="100" class="astro-J7PV25F6"></li>
      <li class="astro-J7PV25F6">
        <img src="/images/brands/lenovo.png" src="lenovo" width="150" class="astro-J7PV25F6">
      </li>
      <li class="astro-J7PV25F6">
        <img src="/images/brands/samsung.png" src="samsung" width="100" class="astro-J7PV25F6">
      </li>
      <li class="astro-J7PV25F6"><img src="/images/brands/lg.png" src="lg" width="100" class="astro-J7PV25F6"></li>
      <li class="astro-J7PV25F6"><img src="/images/brands/dell.png" src="dell" width="70" class="astro-J7PV25F6"></li>
      <li class="astro-J7PV25F6"><img src="/images/brands/apple.png" src="apple" width="100" class="astro-J7PV25F6"></li>
      <li class="astro-J7PV25F6"><img src="/images/brands/asus.png" src="asus" width="100" class="astro-J7PV25F6"></li>
      <li class="astro-J7PV25F6"><img src="/images/brands/hp.png" src="hp" width="100" class="astro-J7PV25F6"></li>
      <li class="astro-J7PV25F6">
        <img src="/images/brands/positivo.png" src="positivo" width="100" class="astro-J7PV25F6">
      </li>
    </ul>
  </section>` })}

`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/pages/index.astro");

const $$file$1 = "/home/rodrigo/Programação/Projetos/ibw/src/pages/index.astro";
const $$url$1 = "";

const _page1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file$1,
  url: $$url$1
}, Symbol.toStringTag, { value: 'Module' }));

const $$Astro = createAstro("https://ibw.com.br");
const $$Contato = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Contato;
  return renderTemplate`${renderComponent($$result, "DefaultPage", $$DefaultPage, { "title": "Contato", "description": "" }, { "default": () => renderTemplate`
  Minha página de contato
` })}`;
}, "/home/rodrigo/Programa\xE7\xE3o/Projetos/ibw/src/pages/contato.astro");

const $$file = "/home/rodrigo/Programação/Projetos/ibw/src/pages/contato.astro";
const $$url = "/contato";

const _page2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Contato,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

export { _page0 as _, _page1 as a, _page2 as b };
