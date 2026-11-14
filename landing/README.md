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

This folder is published separately from the app by the Cloudflare Pages project
`grace-and-gather-home`, connected to this repository's `main` branch. Its build
output directory is `landing/public`; no build command is needed. It is also
available at `grace-and-gather-home.pages.dev`.

The intended public address is `www.graceandgather.online`. In Namecheap
BasicDNS, its `www` CNAME points to `grace-and-gather-home.pages.dev`. Cloudflare
Pages must also have that hostname configured as a custom domain; DNS and
certificate activation may take time. The existing apex URL redirect points to
the HTTPS `www` address, but HTTPS access to the apex itself must be verified
separately. Do not change nameservers without first migrating and testing email:
the current Namecheap email forwarding depends on Namecheap DNS.

## Changing it

- **App Store launch:** the download invitations currently say the app is coming
  soon. Once the App Store listing is publicly available, replace those labels
  with links to `https://apps.apple.com/app/id6833897169` and verify the listing
  opens in the countries where the app is released. The support and privacy
  links currently lead to the app's public pages.
- **Wording:** edit the text in `index.html` directly.
- **App screens:** replace the files in `public/img/` with new captures of the
  same size (540 by 1169).
