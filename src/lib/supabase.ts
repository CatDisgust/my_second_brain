import { createClient } from '@supabase/supabase-js';

// 这里使用 service role key 创建 admin 客户端，仅在服务端（如 API Routes、server actions）使用
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env var: SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // 使用 service role 时通常不需要自动刷新 token
    autoRefreshToken: false,
    persistSession: false,
  },
});

