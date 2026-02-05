'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || status === 'loading') return;

    setError(null);
    setStatus('loading');

    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase 配置缺失，请检查环境变量。');
      setStatus('idle');
      return;
    }

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      setStatus('success');
    } catch (err: any) {
      console.error(err);
      let msg = err?.message ?? '登录失败，请稍后再试。';
      if (err?.message === 'Invalid login credentials') msg = '邮箱或密码错误';
      else if (err?.message === 'Email not confirmed' || String(err?.message).includes('Email not confirmed'))
        msg = '请先查收注册邮箱中的确认邮件并点击链接完成验证后再登录。';
      setError(msg);
      setStatus('idle');
    }
  };

  // 成功态：短暂展示后客户端跳转
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => router.push('/'), 900);
    return () => clearTimeout(t);
  }, [status, router]);

  return (
    <div className="min-h-screen text-slate-900 flex items-center justify-center relative overflow-hidden">
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative z-10 text-center px-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
              className="flex justify-center mb-4"
            >
              <CheckCircle className="h-14 w-14 text-emerald-500" />
            </motion.div>
            <p className="text-sm font-medium text-slate-900">登录成功</p>
            <p className="text-xs text-slate-500 mt-1">正在进入主页…</p>
          </motion.div>
        ) : (
          <motion.main
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-sm px-6"
          >
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 px-6 py-7 shadow-[0_8px_30px_rgba(247,235,225,0.8)] space-y-6">
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-slate-500">
              Second Brain
            </p>
            <h1 className="text-base font-semibold text-slate-800">
              密码登录
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              使用邮箱和密码登录，登录状态将保持。
            </p>
            <p className="text-[11px] text-amber-600 leading-relaxed">
              首次使用？请先到注册邮箱中点击确认链接完成验证后再登录。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] text-slate-500">邮箱</label>
              <div className="relative rounded-xl border border-stone-200 bg-[#fcfaf5] px-3 py-2.5 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-500">密码</label>
              <div className="relative rounded-xl border border-stone-200 bg-[#fcfaf5] px-3 py-2.5 flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97, y: 0 }}
              disabled={status === 'loading'}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-xs font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>{status === 'loading' ? '登录中…' : '登录'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
          </form>

          <p className="text-[11px] text-slate-500 text-center">
            还没有账号？{' '}
            <Link
              href="/signup"
              className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
            >
              去注册
            </Link>
          </p>

          {error && (
            <p className="text-[11px] text-red-600">
              {error}
            </p>
          )}
        </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
