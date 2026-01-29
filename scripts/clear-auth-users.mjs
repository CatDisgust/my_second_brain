/**
 * 清除 Supabase Auth 中所有用户（仅本地/开发使用）
 * 用法：在项目根目录执行
 *   node --env-file=.env.local scripts/clear-auth-users.mjs
 * 或（若 Node < 20.6）先设置环境变量再执行：
 *   export $(grep -v '^#' .env.local | xargs) && node scripts/clear-auth-users.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// 若未通过 --env-file 注入，则从 .env.local 读取
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) {
    console.error('未找到 .env.local，请先配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key === 'SUPABASE_URL' || key === 'SUPABASE_SERVICE_ROLE_KEY') process.env[key] = value;
    }
  }
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function clearAllUsers() {
  let totalDeleted = 0;
  let page = 1;
  const perPage = 1000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('listUsers 失败:', error.message);
      process.exit(1);
    }
    const users = data?.users ?? [];
    if (users.length === 0) break;

    for (const user of users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.warn('删除用户失败:', user.email ?? user.id, delErr.message);
      } else {
        totalDeleted++;
        console.log('已删除:', user.email ?? user.id);
      }
    }
    if (users.length < perPage) break;
    page++;
  }

  console.log('\n共删除', totalDeleted, '个账号。');
}

clearAllUsers().catch((e) => {
  console.error(e);
  process.exit(1);
});
