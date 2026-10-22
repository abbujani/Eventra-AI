/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API. Server-side secrets must never be prefixed with VITE_. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
