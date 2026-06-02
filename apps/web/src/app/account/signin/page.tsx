'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { getErrorMessage, logError } from '@/utils/errorHandler';

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      logError('Sign In', signInError);
      setError(getErrorMessage(signInError) || 'Falha ao entrar');
      setLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = callbackUrl;
    } else {
      console.warn('signin: window is undefined; cannot redirect to callbackUrl');
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2563EB] p-6">
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo inside card */}
          <div className="flex justify-center mb-4">
            <img
              src="https://dtvoeevhaseb5.cloudfront.net/user-uploads/aecd2835-4ce9-4551-b951-fe93003676cd.png"
              alt="Logo"
              className="h-28 w-auto object-contain"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-slate-800">Bem-vindo ao sistema</h1>
            <p className="text-slate-400 mt-1 text-sm">Faça login para acessar sua conta</p>
          </div>

          <form
            onSubmit={(e) => {
              void onSubmit(e);
            }}
            className="flex flex-col gap-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-600">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-600">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-600 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] py-3 text-sm font-semibold text-white transition-all hover:bg-[#1D4ED8] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div
                    className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                    style={{ animation: 'spin 0.6s linear infinite' }}
                  />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <a
                href={`/account/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-sm text-slate-400 hover:text-[#2563EB] transition-colors"
              >
                Não tem conta? <span className="text-[#2563EB] font-medium">Cadastre-se</span>
              </a>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
