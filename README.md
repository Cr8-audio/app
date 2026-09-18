# Crate

Crate helps DJs work with the records they own. You sign in with Discogs,
Crate syncs your collection, and from there you can search it, play tracks
through YouTube, build playlists and ask a DJ assistant for help with a set.

Live at [cr8.audio](https://cr8.audio).

Crate is moving toward an MCP server, so the same capabilities work from any
agent harness as well as the app. The app's own agent tools
([#98](https://github.com/Cr8-audio/app/issues/98),
[#87](https://github.com/Cr8-audio/app/issues/87)) come first.

## Stack

| Layer     | What                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App       | React 18, [TanStack Start](https://tanstack.com/start) and Router (file routes in `app/`), Tailwind CSS 4, Zustand                                              |
| Backend   | [Convex](https://convex.dev): database, queries and mutations, [Convex Auth](https://labs.convex.dev/auth), [Convex Agent](https://github.com/get-convex/agent) |
| Assistant | Anthropic through the AI SDK, run by the `djAssistant` Convex agent                                                                                             |
| Hosting   | Cloudflare Workers, built with `@cloudflare/vite-plugin`                                                                                                        |
| Discogs   | [`@cr8.audio/discogs-sdk`](https://github.com/Cr8-audio/discogs-sdk)                                                                                            |

## Getting started

You need Node 20+, pnpm 9+ and a Convex account.

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs Vite on [localhost:1995](http://localhost:1995) and
`convex dev` side by side. The first run asks you to create or pick a Convex
dev deployment and writes its URL to `.env.local`.

On a new Convex deployment, generate the auth keys once:

```bash
npx @convex-dev/auth
```

Then set the variables below.

## Environment variables

| Variable                                          | Where                               | Used for                                                                  |
| ------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `DISCOGS_CONSUMER_KEY`, `DISCOGS_CONSUMER_SECRET` | Convex deployment                   | Discogs sign-in, collection sync and search                               |
| `ANTHROPIC_API_KEY`                               | Convex deployment                   | The DJ assistant                                                          |
| `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`             | Convex deployment                   | Convex Auth (set by `npx @convex-dev/auth`)                               |
| `YOUTUBE_API_KEY`                                 | Worker secret (`.dev.vars` locally) | `/api/external/youtube/*` track lookup                                    |
| `VITE_CONVEX_URL`                                 | Build (`.env.local` locally)        | The Convex deployment the app talks to                                    |
| `VITE_BASE_URL`                                   | Build, optional                     | Base URL for the YouTube API routes (defaults to `http://localhost:1995`) |

Set Convex variables with `npx convex env set NAME value` or in the Convex
dashboard. The Discogs secret only lives on Convex, never in the browser
bundle.

Discogs sign-in only redirects back to known origins: `cr8.audio`,
`www.cr8.audio`, `localhost:1995`, `pr-<n>.cr8.audio` and the `crate-app`
Workers on `workers.dev`. See `convex/lib/discogsOAuth.ts`.

## Scripts

| Command                                                               | What it does                                     |
| --------------------------------------------------------------------- | ------------------------------------------------ |
| `pnpm dev`                                                            | App and Convex in watch mode                     |
| `pnpm build`                                                          | Production build into `dist/`                    |
| `pnpm test`                                                           | Vitest                                           |
| `pnpm format:check`, `pnpm lint:warn`, `pnpm type-check`, `pnpm test` | What CI runs on every PR                         |
| `pnpm pre-pr`                                                         | Format check, lint and tests before opening a PR |

## Project layout

```text
app/          routes (TanStack file routes); app/api/ holds server routes
convex/       backend: schema, auth, Discogs, playlists, chat, agents/
lib/          components, hooks, stores (player), API clients
__tests__/    Vitest suites (convex, features, hooks)
.github/      CI and deploy workflows
```

## Deployments

| Target     | Trigger            | URL                                                                     |
| ---------- | ------------------ | ----------------------------------------------------------------------- |
| Production | Push to `main`     | [cr8.audio](https://cr8.audio) and `www`                                |
| PR preview | Every push to a PR | `https://pr-<number>.cr8.audio`, deleted when the PR closes             |
| Staging    | Push to `stage`    | `crate-app` on `workers.dev` (still on the previous Cloudflare account) |

Production and previews deploy to the cr8.audio Cloudflare account with the
`CLOUDFLARE_PRODUCTION_API_TOKEN` secret. The preview bot comments on the PR
with its link.

CI doesn't deploy Convex. After a change in `convex/` is merged, deploy it:

```bash
npx convex deploy
```

Production, staging and previews all use the Convex deployment in the
`VITE_CONVEX_URL` secret, so previews read and write production data.

## Copying Convex data between deployments

To copy data from another deployment (for example a teammate's dev data)
into yours:

1. In the source deployment's [Convex dashboard](https://dashboard.convex.dev),
   open **Settings → URL & Deploy Key** and generate a development deploy key.
2. Save it to `.env.source`, which is gitignored:

   ```bash
   echo "CONVEX_DEPLOY_KEY=dev:source-deployment-name|YOUR_FULL_TOKEN" > .env.source
   ```

3. Export, then import:

   | Command                      | What it does                                   |
   | ---------------------------- | ---------------------------------------------- |
   | `pnpm convex:export:from`    | Downloads the source data to `convex-data.zip` |
   | `pnpm convex:import`         | Imports it, appending to existing data         |
   | `pnpm convex:import:replace` | Imports it, replacing all existing data        |
