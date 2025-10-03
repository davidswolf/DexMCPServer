import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DexConfig } from './types.js';

// Load .env file manually to avoid dotenv's stdout pollution
function loadEnv(): void {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const envPath = join(__dirname, '..', '.env');
    const envFile = readFileSync(envPath, 'utf-8');

    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    }
  } catch {
    // .env file not found, will use environment variables directly
  }
}

// Load environment variables
loadEnv();

export function getConfig(): DexConfig {
  const apiKey = process.env.DEX_API_KEY;
  const baseUrl = process.env.DEX_API_BASE_URL || 'https://api.getdex.com/api/rest';
  const searchCacheTTLMinutes = process.env.DEX_SEARCH_CACHE_TTL_MINUTES
    ? parseInt(process.env.DEX_SEARCH_CACHE_TTL_MINUTES, 10)
    : 30;

  if (!apiKey) {
    throw new Error('DEX_API_KEY environment variable is required');
  }

  return {
    apiKey,
    baseUrl,
    searchCacheTTLMinutes,
  };
}
