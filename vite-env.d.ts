/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCOGS_CONSUMER_KEY: string;
  readonly VITE_DISCOGS_CONSUMER_SECRET: string;
  readonly VITE_BASE_URL: string;
  readonly REPLICATE_API_TOKEN: string;
  readonly YOUTUBE_API_KEY: string;
  readonly ANTHROPIC_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
