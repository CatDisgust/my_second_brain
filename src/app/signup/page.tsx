'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword || status === 'loading') return;

    setError(null);
    setStatus('loading');

    if (password !== confirmPassword) {
      setError('两次密码不一致');
      setStatus('idle');
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase 配置缺失，请检查环境变量。');
      setStatus('idle');
      return;
    }

    if (password.length < 6) {
      setError('密码至少 6 位');
      setStatus('idle');
      return;
    }

    // #region agent log
    try {
      const urlObj = supabaseUrl ? new URL(supabaseUrl) : null;
      const payload1 = {
        location: 'signup/page.tsx:handleSubmit:beforeSignUp',
        message: 'signUp attempt env and origin',
        data: {
          hasSupabaseUrl: !!supabaseUrl,
          urlHost: urlObj?.hostname ?? null,
          urlScheme: urlObj?.protocol ?? null,
          urlLen: supabaseUrl?.length ?? 0,
          origin: typeof window !== 'undefined' ? window.location.origin : null,
          hasAnonKey: !!supabaseAnonKey,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'H1,H3,H4',
      };
      fetch('/api/debug-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload1) }).catch(() => {});
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload1) }).catch(() => {});
    } catch (_) {}
    // #endregion

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

      // #region agent log
      const payload2 = { location: 'signup/page.tsx:handleSubmit:preSignUp', message: 'about to call signUp', data: {}, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2' };
      fetch('/api/debug-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload2) }).catch(() => {});
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload2) }).catch(() => {});
      // #endregion

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/confirm`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess(true);
      setStatus('idle');
    } catch (err: any) {
      // #region agent log
      const payload3 = {
        location: 'signup/page.tsx:handleSubmit:catch',
        message: 'signUp error',
        data: { errName: err?.name ?? null, errMessage: err?.message ?? null, errStatus: err?.status ?? null, errCode: err?.code ?? null },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'H2,H5',
      };
      fetch('/api/debug-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload3) }).catch(() => {});
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload3) }).catch(() => {});
      // #endregion
      console.error(err);
      let msg = err?.message ?? '注册失败，请稍后再试。';
      if (err?.message?.includes('already registered') || err?.message?.includes('already exists'))
        msg = '你已经注册过了，请直接登录';
      else if (err?.message?.includes('rate limit') || err?.message?.toLowerCase().includes('rate limit exceeded'))
        msg = '发送邮件过于频繁，请稍后再试（约 1 小时后再注册或联系管理员）。';
      setError(msg);
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen text-slate-900 flex items-center justify-center relative overflow-hidden">
      <AnimatePresence mode="wait">
        {success ? (
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
            <p className="text-sm font-medium text-slate-900">注册成功</p>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              我们已向你的邮箱发送了验证链接。<br />
              请到邮箱中查收并点击链接完成验证，验证后再来登录即可使用。
            </p>
            <motion.button
              type="button"
              onClick={() => router.push('/login')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-6 w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-medium tracking-wide transition-colors"
            >
              我知道了
            </motion.button>
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
              注册账号
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              使用邮箱和密码注册，密码至少 6 位。注册后请到邮箱中点击确认链接，完成验证后再登录。
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
              <label className="text-[11px] text-slate-500">密码（至少 6 位）</label>
              <div className="relative rounded-xl border border-stone-200 bg-[#fcfaf5] px-3 py-2.5 flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-500">确认密码</label>
              <div className="relative rounded-xl border border-stone-200 bg-[#fcfaf5] px-3 py-2.5 flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  autoComplete="new-password"
                  required
                  minLength={6}
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
              <span>{status === 'loading' ? '注册中…' : '注册'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
          </form>

          <p className="text-[11px] text-slate-500 text-center">
            已有账号？{' '}
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
            >
              去登录
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
