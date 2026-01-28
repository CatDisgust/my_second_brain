import fs from 'node:fs';
import path from 'node:path';

// 简单加载当前工作目录下的 .env.local，填充到 process.env
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=');
    if (key && value && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

async function main() {
  const baseUrl =
    process.env.NEXT_PUBLIC_OPENROUTER_PROXY_URL ??
    'https://api.dcat6809.com/api/v1';
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('Missing OPENROUTER_API_KEY');
    process.exit(1);
  }

  console.log('Testing OpenRouter proxy:', baseUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body (first 500 chars):');
    console.log(text.slice(0, 500));
  } catch (err) {
    clearTimeout(timeout);
    console.error('Fetch error:', err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

