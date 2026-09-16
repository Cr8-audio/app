This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

- Install [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation#third-party-package-managers) with the appropriate version for your OS

- Install dependencies with `pnpm i`

- Run the development server with `pnpm dev`

- Open [http://localhost:1995](http://localhost:1995) with your browser to see the result.

- You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

- This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

# Convex

## Syncing Data Between Deployments

To clone data from another Convex deployment (e.g., syncing a teammate's dev data to your local dev):

### 1. Set up the source deployment credentials

Create a `.env.source` file with a deploy key from the source deployment:

1. Go to the source deployment's [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to **Settings → URL & Deploy Key**
3. Click **"+ Generate Development Deploy Key"**
4. Copy the full key and add it to `.env.source`:

```bash
echo "CONVEX_DEPLOY_KEY=dev:source-deployment-name|YOUR_FULL_TOKEN" > .env.source
```

> ⚠️ The `.env.source` file is gitignored and should never be committed.

### 2. Export data from the source deployment

```bash
nr convex:export:from
```

This downloads all data to `convex-data.zip`.

### 3. Import data to your dev deployment

```bash
nr convex:import:replace
```

This replaces all data in your local dev deployment with the exported data.

### Available Scripts

| Script                     | Description                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| `nr convex:export:from`    | Export data from source deployment (configured in `.env.source`) |
| `nr convex:import`         | Import data (append to existing)                                 |
| `nr convex:import:replace` | Import data (replace all existing data)                          |
