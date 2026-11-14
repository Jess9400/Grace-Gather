# Landing page

The public page for **graceandgather.online**. It introduces Grace & Gather and
sends people to the app; it is separate from the app itself.

- `public/index.html` is the whole page: its words, styles and the small
  script that moves the night scene as you scroll. There is no build step.
- `public/img/` holds the pictures: four screens from the app and the three
  churches.
- `wrangler.jsonc` describes it to Cloudflare as a static site.

## Seeing it on your computer

```bash
npx serve landing/public
```

## Putting it on the domain

This folder is not published by the app's own deploy. It needs its own
Cloudflare project, set up once:

1. In Cloudflare, create a new Worker from this repository with **root
   directory** `landing` and **deploy command** `npx wrangler deploy`. After
   that, every merge to `main` republishes the page.
2. Add `graceandgather.online` (and `www`) to that Worker as a custom domain.
   The domain is registered at Namecheap, so Cloudflare will ask for a DNS
   change there; follow the steps its dashboard gives.

## Changing it

- **Where the buttons lead:** search `index.html` for
  `grace-gather.findflockie.workers.dev`. When the app has its own address, or
  an App Store page, change those links.
- **Wording:** edit the text in `index.html` directly.
- **App screens:** replace the files in `public/img/` with new captures of the
  same size (540 by 1169).
