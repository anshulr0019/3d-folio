# Vercel deployment

This repository is a Next.js Pages Router application. Deploy it from the repository root with:

- Framework: `nextjs`
- Install: `npm ci`
- Build: `npm run build`
- Output: `.next`

`vercel.json` pins those settings so an older Vite preset cannot select the stale `dist` folder. `.vercelignore` excludes local dependencies, old build output, source-model files, rejected character experiments and local credentials from CLI uploads. `.vercel/` and `.env*` are also ignored by Git.

## Blank-screen diagnosis — 2026-10-17

The production domain served the legacy Vite `dist/index.html`, with an empty `#root` and references to `/assets/index-CB7yNcTH.js` and `/assets/index-D1JfPs6z.css`. The referenced JavaScript returned HTTP 404. Vercel's saved project preset was still `vite`, despite the source migration to Next.js.

The corrected saved project settings use Next.js, `npm ci`, `npm run build` and `.next`. The local production build and the fresh Vercel build both pass. The Next.js deployment renders portfolio copy in its initial HTML and serves JavaScript from `/_next/static/`.

The protected preview `3d-folio-n9gnm6ax4-date-buddy.vercel.app` passed HTML, JavaScript, CSS and avatar HTTP checks. Promotion produced production deployment `dpl_4qiQqAAtyTZoxohhwrMExvqsAQ4m` (`3d-folio-f3t482rf8-date-buddy.vercel.app`), which is Ready and assigned to `https://3d-folio-iota.vercel.app/`. The public homepage renders, 3D entry reaches the Developer Studio, and returning to the portfolio works. No JavaScript errors were recorded during that live browser check.

CLI uploads can be checked before deployment with `vercel deploy --dry --json`. For this repair, an interrupted upload created no deployment; a clean staging copy of the checked regular files was archived and built successfully. Local `.env` files were excluded.

The repository still tracks some historical `dist`/`node_modules` files. They are not the current application output, and `npm ci` ensures a fresh dependency installation. Removing those tracked historical files is a separate repository-cleanup task; do not serve `dist` as a workaround.
