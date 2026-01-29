'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { LogOut } from 'lucide-react';

export function GlobalHeader() {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      window.location.href = '/login';
      return;
    }
    setIsLoggingOut(true);
    try {
      const supabase = createBrowserClient(url, anonKey);
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setIsLoggingOut(false);
      window.location.href = '/login';
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-white/10 bg-black/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md"
      style={{ minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}
    >
      <span className="font-bold tracking-tight text-[17px] text-white">
        My Second Brain
      </span>
      <div className="flex items-center gap-3">
        {pathname === '/brain' ? (
          <Link
            href="/"
            className="text-[15px] font-medium text-gray-400 transition-colors hover:text-white"
          >
            Home
          </Link>
        ) : (
          <Link
            href="/brain"
            className="text-[15px] font-medium text-gray-400 transition-colors hover:text-white"
          >
            My Brain →
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5 text-[13px] text-gray-400 transition-colors hover:text-white disabled:opacity-50"
          aria-label="Logout"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{isLoggingOut ? '…' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
}
