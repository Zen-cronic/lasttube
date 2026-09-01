// Single place that reads provider configuration. Values never leave this
// module except inside request headers/URLs built by the provider clients.

import fs from 'node:fs';
import path from 'node:path';

let loaded = false;

/** Load `.env` from the repo root if present (no-op when absent). */
export function loadEnvFile(): void {
  if (loaded) return;
  loaded = true;
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Missing/unreadable .env is fine — providers report 'unavailable'.
  }
}

export interface SerpApiConfig {
  apiKey: string;
  baseUrl: string;
}

export interface PerfectCorpConfig {
  apiKey: string;
  baseUrl: string;
}

export function getSerpApiConfig(): SerpApiConfig | null {
  loadEnvFile();
  const apiKey = process.env.SERPAPI_KEY ?? '';
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: process.env.SERPAPI_BASE_URL || 'https://serpapi.com',
  };
}

export function getPerfectCorpConfig(): PerfectCorpConfig | null {
  loadEnvFile();
  const apiKey = process.env.PERFECT_CORP_API_KEY ?? '';
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: process.env.PERFECT_CORP_API_BASE_URL || 'https://yce-api-01.makeupar.com',
  };
}
