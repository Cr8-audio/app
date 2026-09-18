/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'cloudflare:workers' {
  export const env: {
    readonly ENVIRONMENT?: string;
    readonly YOUTUBE_API_KEY?: string;
  };
}
