'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';

const ALLOWED_EMAILS =
  process.env.NEXT_PUBLIC_ALLOWED_EMAILS ??
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL ??
  'your-email@gmail.com';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;

    setError(null);

    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase 配置缺失，请检查环境变量。');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const allowedList = ALLOWED_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedList.includes(normalizedEmail)) {
      setError('Access Denied');
      return;
    }

    setStatus('loading');

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}`,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setStatus('sent');
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? '发送登录链接失败，请稍后再试。');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center relative overflow-hidden">
      {/* 背景光晕 */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_top,_rgba(120,120,255,0.18),_transparent_60%)]" />
        <div className="absolute bottom-[-120px] right-[-40px] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_60%)]" />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        <div className="rounded-3xl border border-neutral-800/80 bg-gradient-to-b from-neutral-950/90 to-black/80 px-6 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.85)] backdrop-blur-sm space-y-6">
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-neutral-500">
              Second Brain
            </p>
            <h1 className="text-base font-semibold text-neutral-50">
              魔法链接登录
            </h1>
            <p className="text-xs text-neutral-500 leading-relaxed">
              这是一个私密的 Second Brain，仅你的邮箱可以访问。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] text-neutral-400">
                邮箱地址
              </label>
              <div className="relative rounded-xl border border-neutral-800/80 bg-neutral-950/60 px-3 py-2.5 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={ALLOWED_EMAILS}
                  className="flex-1 bg-transparent text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97, y: 0 }}
              disabled={status === 'loading'}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-neutral-100 text-black py-2 text-xs font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-white"
            >
              <span>
                {status === 'loading'
                  ? '正在发送登录链接…'
                  : '发送登录链接'}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
          </form>

          {status === 'sent' && (
            <p className="text-[11px] text-emerald-400">
              登录链接已发送至你的邮箱，请在 5 分钟内点击完成登录。
            </p>
          )}

          {error && (
            <p className="text-[11px] text-red-400">
              {error}
            </p>
          )}
        </div>
      </motion.main>
    </div>
  );
}

