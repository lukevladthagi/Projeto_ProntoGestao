'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Plus,
  Target,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/AppShell';

const COLORS = {
  'Dentro da meta': '#22c55e',
  Atenção: '#eab308',
  'Fora da meta': '#ef4444',
  Aberto: '#3b82f6',
  'Em andamento': '#8b5cf6',
  Concluído: '#22c55e',
};

export default function DashboardPage() {
  const [period, setPeriod] = useState('all');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', period],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?period=${period}`);
      return res.json();
    },
  });

  const pieData =
    stats?.stats?.map((s: any) => ({
      name: s.status,
      value: parseInt(s.count),
    })) || [];

  const planPieData =
    stats?.planStats?.map((s: any) => ({
      name: s.status,
      value: parseInt(s.count),
    })) || [];

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Dashboard Executivo
            </h1>
            <p className="text-slate-500">
              Visão geral do desempenho organizacional e planos de ação.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrar Setor
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Clock className="h-4 w-4" />
              Últimos 12 Meses
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total de Indicadores
              </CardTitle>
              <Target className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-slate-500 mt-1">+2 novos este mês</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600">Dentro da Meta</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">18</div>
              <p className="text-xs text-slate-500 mt-1">75% do total</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600">Atenção</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">4</div>
              <p className="text-xs text-slate-500 mt-1">Requer acompanhamento</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600">Fora da Meta</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">2</div>
              <p className="text-xs text-slate-500 mt-1">Planos de ação necessários</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Status dos Indicadores</CardTitle>
              <CardDescription>Distribuição dos resultados atuais por categoria.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 1 }]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry: { name: string; value: number }, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.name as keyof typeof COLORS] || '#94a3b8'}
                      />
                    ))}
                    {pieData.length === 0 && <Cell fill="#f1f5f9" />}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance by Sector */}
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Setor</CardTitle>
              <CardDescription>Status consolidado de cada departamento.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.sectorStats || []} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="setor" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="dentro_meta" name="Dentro" fill="#22c55e" stackId="a" />
                  <Bar dataKey="atencao" name="Atenção" fill="#eab308" stackId="a" />
                  <Bar dataKey="fora_meta" name="Fora" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Action Plan Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status dos Planos de Ação</CardTitle>
              <CardDescription>Progresso das ações corretivas registradas.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planPieData.length > 0 ? planPieData : [{ name: 'Sem dados', value: 1 }]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {planPieData.map((entry: { name: string; value: number }, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.name as keyof typeof COLORS] || '#94a3b8'}
                      />
                    ))}
                    {planPieData.length === 0 && <Cell fill="#f1f5f9" />}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Critical Indicators List */}
          <Card>
            <CardHeader>
              <CardTitle>Indicadores Críticos</CardTitle>
              <CardDescription>Itens que requerem atenção imediata.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center text-red-600">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">Taxa de Conversão</h4>
                        <p className="text-xs text-slate-500">Comercial • Meta: 15%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">12.4%</div>
                      <div className="flex items-center gap-1 text-xs text-red-500">
                        <ArrowDownRight className="h-3 w-3" />
                        -2.1%
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-blue-600 text-xs">
                  Ver todos os indicadores
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
