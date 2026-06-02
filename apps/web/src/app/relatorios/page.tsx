'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Target,
  Building2,
  ClipboardCheck,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
  Printer,
  Filter,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AppShell } from '@/components/AppShell';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CORES_PIE = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#6b7280'];

function formatDateSafe(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.replace('T', ' ').replace('Z', '').split(/[- :]/);
  if (parts.length < 3) return dateStr;
  return `${parts[2]?.substring(0, 2)}/${parts[1]}/${parts[0]}`;
}

// ─── Export Helpers ─────────────────────────────────────────
function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(';'),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          return typeof val === 'string' && val.includes(';') ? `"${val}"` : val;
        })
        .join(';')
    ),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function handlePrint() {
  window.print();
}

// ─── Indicadores Report ─────────────────────────────────────
function IndicadoresReport() {
  const [selectedIndicador, setSelectedIndicador] = useState('');

  const { data: indicadores } = useQuery({
    queryKey: ['indicadores-list'],
    queryFn: async () => {
      const res = await fetch('/api/indicadores');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['relatorio-indicador', selectedIndicador],
    queryFn: async () => {
      const res = await fetch(`/api/relatorios?tipo=indicador&indicador_id=${selectedIndicador}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedIndicador,
  });

  const chartData =
    reportData?.resultados?.map((r: any) => {
      const dateParts = (r.competencia_date || '').split('-');
      const mesIdx = parseInt(dateParts[1] || '1') - 1;
      const label = `${MESES[mesIdx] || ''}/${dateParts[0]?.substring(2) || ''}`;
      return {
        competencia: label,
        realizado: r.valor_realizado,
        meta: r.meta_periodo || r.meta,
      };
    }) || [];

  const selectedInfo = indicadores?.find((i: any) => i.id.toString() === selectedIndicador);

  const handleExport = () => {
    if (!reportData?.resultados?.length) return;
    const exportData = reportData.resultados.map((r: any) => ({
      Indicador: selectedInfo?.nome || '',
      Competência: formatDateSafe(r.competencia_date),
      Realizado: r.valor_realizado,
      Meta: r.meta_periodo || r.meta || '',
      Status: r.status || '',
      Unidade: r.unidade_medida || '',
    }));
    exportCSV(exportData, `relatorio-indicador-${selectedInfo?.nome || 'export'}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select value={selectedIndicador} onValueChange={setSelectedIndicador}>
          <SelectTrigger className="w-full sm:w-[400px]">
            <SelectValue placeholder="Selecione um indicador..." />
          </SelectTrigger>
          <SelectContent>
            {indicadores?.map((ind: any) => (
              <SelectItem key={ind.id} value={ind.id.toString()}>
                {ind.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedIndicador && (
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel/CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        )}
      </div>

      {!selectedIndicador && (
        <div className="py-16 text-center text-slate-400">
          <Target className="h-12 w-12 mx-auto mb-3 text-slate-200" />
          <p className="text-sm">Selecione um indicador para visualizar o relatório.</p>
        </div>
      )}

      {selectedIndicador && isLoading && (
        <div className="py-16 text-center text-slate-400">Carregando dados...</div>
      )}

      {selectedIndicador && !isLoading && selectedInfo && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selectedInfo.nome}</CardTitle>
              <CardDescription>
                {selectedInfo.descricao || 'Evolução mensal — Meta vs Realizado'}
                {selectedInfo.unidade_medida ? ` • Unidade: ${selectedInfo.unidade_medida}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="competencia" fontSize={12} tick={{ fill: '#64748b' }} />
                      <YAxis fontSize={12} tick={{ fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="realizado"
                        name="Realizado"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="meta"
                        name="Meta"
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Nenhum resultado lançado para este indicador.
                </div>
              )}
            </CardContent>
          </Card>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados Detalhados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Realizado</TableHead>
                      <TableHead>Meta</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.resultados.map((r: any, i: number) => {
                      const statusColor =
                        r.status === 'Dentro da Meta'
                          ? 'text-green-600'
                          : r.status === 'Fora da Meta'
                            ? 'text-red-600'
                            : 'text-slate-500';
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-sm">
                            {formatDateSafe(r.competencia_date)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {r.valor_realizado ?? '-'}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {r.meta_periodo ?? r.meta ?? '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${statusColor}`}>
                              {r.status || '-'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Setores Report ─────────────────────────────────────────
function SetoresReport() {
  const [selectedSetor, setSelectedSetor] = useState('');

  const { data: setoresData, isLoading: loadingSetores } = useQuery({
    queryKey: ['relatorio-setores'],
    queryFn: async () => {
      const res = await fetch('/api/relatorios?tipo=setor');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: setorDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['relatorio-setor-detail', selectedSetor],
    queryFn: async () => {
      const res = await fetch(`/api/relatorios?tipo=setor&setor_id=${selectedSetor}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedSetor,
  });

  const handleExportSetores = () => {
    if (!setoresData?.setores?.length) return;
    const data = setoresData.setores.map((s: any) => ({
      Setor: s.nome,
      Responsável: s.responsavel || '',
      'Total Indicadores': s.total_indicadores,
      'Dentro da Meta': s.dentro_meta,
      'Fora da Meta': s.fora_meta,
      'Sem Resultado': s.sem_resultado,
    }));
    exportCSV(data, 'relatorio-setores');
  };

  const handleExportSetor = () => {
    if (!setorDetail?.indicadores?.length) return;
    const data = setorDetail.indicadores.map((ind: any) => ({
      Indicador: ind.nome,
      Setor: ind.setor_nome || '',
      'Último Realizado': ind.ultimo_realizado ?? '',
      'Última Competência': ind.ultima_competencia ? formatDateSafe(ind.ultima_competencia) : '',
      Status: ind.ultimo_status || 'Sem resultado',
      Meta: ind.meta ?? '',
    }));
    exportCSV(data, `relatorio-setor-${selectedSetor}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Select value={selectedSetor} onValueChange={setSelectedSetor}>
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="Visão geral de setores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Visão Geral</SelectItem>
            {setoresData?.setores?.map((s: any) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={
              selectedSetor && selectedSetor !== 'all' ? handleExportSetor : handleExportSetores
            }
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel/CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {(!selectedSetor || selectedSetor === 'all') && (
        <>
          {loadingSetores ? (
            <div className="py-16 text-center text-slate-400">Carregando...</div>
          ) : (
            <>
              {setoresData?.setores?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {setoresData.setores.map((setor: any) => {
                    const total = setor.total_indicadores || 0;
                    const dentroPercent =
                      total > 0 ? Math.round((setor.dentro_meta / total) * 100) : 0;
                    return (
                      <Card
                        key={setor.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedSetor(setor.id.toString())}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-slate-800">{setor.nome}</h3>
                              <p className="text-xs text-slate-400">
                                {setor.responsavel || 'Sem responsável'}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded bg-green-50">
                              <p className="text-lg font-bold text-green-600">
                                {setor.dentro_meta}
                              </p>
                              <p className="text-[10px] text-green-600">Na Meta</p>
                            </div>
                            <div className="p-2 rounded bg-red-50">
                              <p className="text-lg font-bold text-red-600">{setor.fora_meta}</p>
                              <p className="text-[10px] text-red-600">Fora</p>
                            </div>
                            <div className="p-2 rounded bg-slate-50">
                              <p className="text-lg font-bold text-slate-500">
                                {setor.sem_resultado}
                              </p>
                              <p className="text-[10px] text-slate-500">Sem Dado</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${dentroPercent}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {dentroPercent}% dentro da meta • {total} indicadores
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {selectedSetor && selectedSetor !== 'all' && (
        <>
          {loadingDetail ? (
            <div className="py-16 text-center text-slate-400">Carregando...</div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Indicadores do Setor</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicador</TableHead>
                      <TableHead>Último Resultado</TableHead>
                      <TableHead>Meta</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!setorDetail?.indicadores?.length ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                          Nenhum indicador neste setor.
                        </TableCell>
                      </TableRow>
                    ) : (
                      setorDetail.indicadores.map((ind: any) => {
                        const statusBadge =
                          ind.ultimo_status === 'Dentro da Meta' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              Na Meta
                            </Badge>
                          ) : ind.ultimo_status === 'Fora da Meta' ? (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Fora</Badge>
                          ) : (
                            <Badge variant="secondary">Sem dado</Badge>
                          );
                        return (
                          <TableRow key={ind.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{ind.nome}</span>
                                <span className="text-xs text-slate-400">
                                  {ind.unidade_medida || ''}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{ind.ultimo_realizado ?? '-'}</TableCell>
                            <TableCell className="text-sm text-slate-500">
                              {ind.meta ?? '-'}
                            </TableCell>
                            <TableCell>{statusBadge}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Planos Report ──────────────────────────────────────────
function PlanosReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-planos'],
    queryFn: async () => {
      const res = await fetch('/api/relatorios?tipo=planos');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const summary = data?.summary || {};
  const planos = data?.planos || [];

  const pieData = [
    { name: 'Concluído', value: summary.concluidos || 0, color: '#22c55e' },
    { name: 'Em Andamento', value: summary.em_andamento || 0, color: '#3b82f6' },
    { name: 'Aberto', value: summary.abertos || 0, color: '#f59e0b' },
    { name: 'Atrasado', value: summary.atrasados || 0, color: '#ef4444' },
    { name: 'Cancelado', value: summary.cancelados || 0, color: '#6b7280' },
  ].filter((d) => d.value > 0);

  const handleExport = () => {
    if (!planos.length) return;
    const exportData = planos.map((p: any) => ({
      Indicador: p.indicador_nome || '',
      Setor: p.setor_nome || '',
      Problema: p.problema || '',
      Ação: p.acao_proposta || '',
      Responsável: p.responsavel || '',
      Prazo: p.prazo_date ? formatDateSafe(p.prazo_date) : '',
      Status: p.status || '',
      Prioridade: p.prioridade || '',
    }));
    exportCSV(exportData, 'relatorio-planos-acao');
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Aberto: 'bg-amber-100 text-amber-700',
      'Em Andamento': 'bg-blue-100 text-blue-700',
      Concluído: 'bg-green-100 text-green-700',
      Atrasado: 'bg-red-100 text-red-700',
      Cancelado: 'bg-slate-100 text-slate-500',
    };
    return (
      <Badge className={`${styles[status] || 'bg-slate-100 text-slate-600'} hover:opacity-90`}>
        {status}
      </Badge>
    );
  };

  const prioridadeBadge = (p: string) => {
    const styles: Record<string, string> = {
      Alta: 'text-red-600',
      Média: 'text-amber-600',
      Baixa: 'text-green-600',
    };
    return (
      <span className={`text-xs font-medium ${styles[p] || 'text-slate-500'}`}>{p || '-'}</span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <FileSpreadsheet className="h-4 w-4" />
          Excel/CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400">Carregando...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              {
                label: 'Total',
                value: summary.total || 0,
                color: 'text-slate-700',
                bg: 'bg-slate-50',
              },
              {
                label: 'Abertos',
                value: summary.abertos || 0,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
              },
              {
                label: 'Em Andamento',
                value: summary.em_andamento || 0,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Concluídos',
                value: summary.concluidos || 0,
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
              {
                label: 'Atrasados',
                value: summary.atrasados || 0,
                color: 'text-red-600',
                bg: 'bg-red-50',
              },
              {
                label: 'Cancelados',
                value: summary.cancelados || 0,
                color: 'text-slate-500',
                bg: 'bg-slate-50',
              },
            ].map((item) => (
              <Card key={item.label} className={item.bg}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart + Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {pieData.length > 0 && (
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          fontSize={11}
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className={pieData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <CardHeader>
                <CardTitle className="text-base">Detalhamento</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicador / Setor</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!planos.length ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          Nenhum plano de ação.
                        </TableCell>
                      </TableRow>
                    ) : (
                      planos.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{p.indicador_nome || '-'}</span>
                              <span className="text-xs text-slate-400">{p.setor_nome || ''}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-sm text-slate-700 line-clamp-2">
                              {p.acao_proposta || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{p.responsavel || '-'}</TableCell>
                          <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                            {p.prazo_date ? formatDateSafe(p.prazo_date) : '-'}
                          </TableCell>
                          <TableCell>{prioridadeBadge(p.prioridade)}</TableCell>
                          <TableCell>{statusBadge(p.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function RelatoriosPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Relatórios</h1>
          <p className="text-slate-500">Visualize e exporte dados consolidados do sistema.</p>
        </div>

        <Tabs defaultValue="indicadores" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="indicadores" className="gap-2 py-2.5 text-xs sm:text-sm">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Por Indicador</span>
              <span className="sm:hidden">Indicador</span>
            </TabsTrigger>
            <TabsTrigger value="setores" className="gap-2 py-2.5 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Por Setor</span>
              <span className="sm:hidden">Setor</span>
            </TabsTrigger>
            <TabsTrigger value="planos" className="gap-2 py-2.5 text-xs sm:text-sm">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Planos de Ação</span>
              <span className="sm:hidden">Planos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="indicadores">
            <IndicadoresReport />
          </TabsContent>
          <TabsContent value="setores">
            <SetoresReport />
          </TabsContent>
          <TabsContent value="planos">
            <PlanosReport />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
