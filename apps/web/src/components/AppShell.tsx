'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  ClipboardCheck,
  Target,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserCircle,
  FileBarChart,
  Settings,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { useQuery } from '@tanstack/react-query';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Indicadores', href: '/indicadores', icon: Target },
  { label: 'Lançamentos', href: '/lancamentos', icon: ClipboardCheck },
  { label: 'Planos de Ação', href: '/planos', icon: BarChart3 },
  { label: 'Orçamento', href: '/orcamento', icon: DollarSign },
  { label: 'Relatórios', href: '/relatorios', icon: FileBarChart },
  { label: 'Configurações', href: '/configuracoes', icon: Settings, adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  const isAuthPage = pathname.startsWith('/account');

  const { data: perfil } = useQuery({
    queryKey: ['perfil'],
    queryFn: async () => {
      const res = await fetch('/api/perfil');
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session && !isAuthPage,
  });

  useEffect(() => {
    if (!isPending && !session && !isAuthPage) {
      router.push('/account/signin');
    }
  }, [session, isPending, isAuthPage, router]);

  // Auth pages render without the sidebar
  if (isAuthPage) {
    return <>{children}</>;
  }

  if (isPending) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div style={{ animation: 'pulse 2s ease-in-out infinite' }}>
            <img
              src="https://dtvoeevhaseb5.cloudfront.net/user-uploads/aecd2835-4ce9-4551-b951-fe93003676cd.png"
              alt="Gestão de Indicadores"
              className="h-20 w-auto object-contain"
            />
          </div>
          <p className="text-slate-500 font-medium">Carregando...</p>
        </div>
        <style jsx global>{`
          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    );
  }

  if (!session) return null;

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/account/signin');
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly) {
      const userPerfil = perfil?.perfil;
      return userPerfil === 'Administrador' || userPerfil === 'TI' || userPerfil === 'Gestão';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-50">
        <img
          src="https://dtvoeevhaseb5.cloudfront.net/user-uploads/aecd2835-4ce9-4551-b951-fe93003676cd.png"
          alt="Gestão de Indicadores"
          className="h-10 w-auto object-contain"
        />
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full md:translate-x-0 bg-white border-r',
          isMobileMenuOpen && 'translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b hidden md:flex items-center justify-center">
            <img
              src="https://dtvoeevhaseb5.cloudfront.net/user-uploads/aecd2835-4ce9-4551-b951-fe93003676cd.png"
              alt="Gestão de Indicadores"
              className="h-16 w-auto object-contain"
            />
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? 'text-blue-600' : 'text-slate-400')} />
                  {item.label}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t space-y-4">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <UserCircle className="h-6 w-6" />
              </div>
              <div className="flex flex-col overflow-hidden text-ellipsis whitespace-nowrap">
                <span className="text-sm font-semibold text-slate-800">
                  {perfil?.name || session?.user?.name || 'Usuário'}
                </span>
                <span className="text-xs text-slate-500">{perfil?.perfil || 'Gestão'}</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-hidden">{children}</main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
