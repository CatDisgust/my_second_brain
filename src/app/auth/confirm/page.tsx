'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';

type Status = 'idle' | 'verifying' | 'success' | 'error';

export default function AuthConfirmPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setStatus('error');
      setErrorMsg('配置缺失');
      return;
    }

    // Supabase 可能用 token_hash 或 token，type 在 query 中
    const tokenHash = searchParams.get('token_hash') ?? searchParams.get('token');
    const type = searchParams.get('type');
    const hash = typeof window !== 'undefined' ? window.location.hash : '';

    const getTokensFromString = (s: string) => {
      const params = new URLSearchParams(s.startsWith('#') ? s.slice(1) : s);
      return {
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token'),
      };
    };

    const run = async () => {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

      // 若有 hash，先让客户端从 URL 恢复 session（Supabase 会自动解析 hash 并写入 storage）
      if (typeof window !== 'undefined' && hash) {
        await supabase.auth.initialize();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      }

      // 1) 使用 token_hash / token + type 验证（邮件链接带 query 时）
      if (tokenHash && type) {
        setStatus('verifying');
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'email' | 'signup' | 'recovery' | 'invite' | 'email_change',
        });
        if (error) {
          setStatus('error');
          setErrorMsg(error.message);
          return;
        }
        setStatus('success');
        if (typeof window !== 'undefined') {
          const u = new URL(window.location.href);
          u.searchParams.delete('token_hash');
          u.searchParams.delete('token');
          u.searchParams.delete('type');
          window.history.replaceState({}, '', u.pathname);
        }
        return;
      }

      // 2) 使用 hash 或 query 中的 access_token / refresh_token 设置 session
      const fromHash = getTokensFromString(hash);
      const fromQuery = {
        access_token: searchParams.get('access_token'),
        refresh_token: searchParams.get('refresh_token'),
      };
      const access_token = fromHash.access_token ?? fromQuery.access_token;
      const refresh_token = fromHash.refresh_token ?? fromQuery.refresh_token;
      if (access_token && refresh_token) {
        setStatus('verifying');
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          setStatus('error');
          setErrorMsg(error.message);
          return;
        }
        setStatus('success');
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }
        return;
      }

      // 3) 已有 session（例如刚验证完刷新或从其他 tab 已登录）
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('success');
        return;
      }

      setStatus('error');
      setErrorMsg('缺少验证参数，请重新点击邮件中的链接。');
    };

    run();
  }, [supabaseUrl, supabaseAnonKey, searchParams]);

  if (status === 'verifying' || status === 'idle') {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center">
        <p className="text-sm text-neutral-400">正在验证邮箱…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-sm"
        >
          <p className="text-sm text-red-400">{errorMsg}</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-100 underline underline-offset-2"
          >
            返回登录
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_top,_rgba(120,120,255,0.18),_transparent_60%)]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 text-center max-w-sm px-6 space-y-6"
      >
        <div className="flex justify-center">
          <CheckCircle className="h-14 w-14 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-neutral-50">邮箱验证成功</h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            请通过登录页进入主页。
          </p>
        </div>
      </motion.div>
    </div>
  );
}
