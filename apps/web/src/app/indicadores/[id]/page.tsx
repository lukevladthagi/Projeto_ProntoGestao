'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Target,
  Plus,
  ClipboardList,
  FileText,
  History,
  Paperclip,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { IndicadorChart } from '@/components/IndicadorChart';
import { IndicadorComparisonChart } from '@/components/IndicadorComparisonChart';

type TabType = 'detalhes' | 'plano' | 'checkin' | 'historico';

const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'detalhes', label: 'Detalhes', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'plano', label: 'Plano de Ação', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'checkin', label: 'Check-in', icon: <FileText className="h-4 w-4" /> },
  { key: 'historico', label: 'Histórico', icon: <History className="h-4 w-4" /> },
];

// Months for select
const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type ChartViewMode = 'mensal' | 'anual' | 'acumulado' | 'comparativo';

function getResultDate(result: any) {
  return parseISO(String(result.competencia_date));
}

function getPeriodAverage(results: any[]) {
  if (!results.length) return null;
  const total = results.reduce((sum, result) => sum + Number(result.valor_realizado || 0), 0);
  return total / results.length;
}

function getPeriodMeta(results: any[], fallbackMeta: number) {
  if (!results.length) return fallbackMeta;
  const total = results.reduce((sum, result) => sum + Number(result.meta_periodo || fallbackMeta || 0), 0);
  return total / results.length;
}

function getPeriodSum(results: any[]) {
  return results.reduce((sum, result) => sum + Number(result.valor_realizado || 0), 0);
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getMetaStatus(
  valor: number | null,
  meta: number | null,
  sentido: string | null,
  savedStatus?: string | null
) {
  const status = normalizeText(savedStatus);
  if (status.includes('fora')) return 'fora';
  if (status.includes('atencao')) return 'atencao';
  if (status.includes('dentro')) return 'dentro';

  if (valor == null || meta == null) return 'sem-resultado';

  const tolerance = 0.05;
  const normalizedSentido = normalizeText(sentido);

  if (normalizedSentido.includes('maior')) {
    if (valor >= meta) return 'dentro';
    if (valor >= meta * (1 - tolerance)) return 'atencao';
    return 'fora';
  }

  if (normalizedSentido.includes('menor')) {
    if (valor <= meta) return 'dentro';
    if (valor <= meta * (1 + tolerance)) return 'atencao';
    return 'fora';
  }

  if (normalizedSentido.includes('igual')) {
    return Math.abs(valor - meta) <= Math.abs(meta) * tolerance ? 'dentro' : 'fora';
  }

  return 'sem-resultado';
}

export default function IndicadorDetalhesPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('detalhes');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch indicator
  const { data: indicador, isLoading: loadingIndicator } = useQuery({
    queryKey: ['indicador', id],
    queryFn: async () => {
      const res = await fetch(`/api/indicadores/${id}`);
      if (!res.ok) throw new Error('Failed to fetch indicator');
      return res.json();
    },
  });

  // Fetch results
  const { data: resultados, isLoading: loadingResults } = useQuery({
    queryKey: ['resultados', id],
    queryFn: async () => {
      const res = await fetch(`/api/resultados?indicadorId=${id}&limit=2000`);
      if (!res.ok) throw new Error('Failed to fetch results');
      return res.json();
    },
  });

  // Fetch action plans
  const { data: planos, isLoading: loadingPlanos } = useQuery({
    queryKey: ['planos-acao', id],
    queryFn: async () => {
      const res = await fetch(`/api/planos-acao?indicadorId=${id}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  if (loadingIndicator) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppShell>
    );
  }

  if (!indicador) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500">Indicador não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Voltar
          </Button>
        </div>
      </AppShell>
    );
  }

  // Get latest result
  const latestResult = resultados?.[0] || null;
  const latestValue = latestResult?.valor_realizado ?? null;
  const metaValue = indicador.meta;
  const metaStatus = getMetaStatus(latestValue, metaValue, indicador.sentido, latestResult?.status);
  const metaBadge = {
    dentro: {
      label: 'Meta',
      icon: CheckCircle2,
      className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50',
    },
    fora: {
      label: 'Fora',
      icon: XCircle,
      className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
    },
    atencao: {
      label: 'Atenção',
      icon: AlertCircle,
      className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
    },
    'sem-resultado': {
      label: 'Meta',
      icon: Target,
      className: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50',
    },
  }[metaStatus];
  const MetaBadgeIcon = metaBadge.icon;

  // Metadata labels
  const metaLabels = [
    indicador.tipo,
    indicador.unidade_medida ? `${indicador.unidade_medida}` : null,
    indicador.frequencia,
  ].filter(Boolean);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {indicador.nivel_gestao && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-xs font-bold px-2">
                    {indicador.nivel_gestao}
                  </Badge>
                )}
                <span className="text-sm text-slate-500">{metaLabels.join(' | ')}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{indicador.nome}</h1>
              <p className="text-sm text-slate-500">{indicador.descricao || 'Sem descrição'}</p>
              {indicador.responsavel_nome && (
                <p className="text-xs text-slate-400">Responsável: {indicador.responsavel_nome}</p>
              )}
            </div>

            {/* Value / Meta display */}
            <div className="flex items-end gap-1 flex-shrink-0">
              <span className="text-5xl font-black text-slate-900 leading-none">
                {latestValue != null ? Math.round(latestValue) : '—'}
              </span>
              <span className="text-2xl text-slate-400 font-bold leading-none mb-1">/</span>
              <span className="text-2xl text-slate-400 font-bold leading-none mb-1">
                {metaValue != null ? Math.round(metaValue) : '—'}
              </span>
              {metaValue != null && (
                <Badge className={`ml-2 mb-1 text-xs ${metaBadge.className}`}>
                  <MetaBadgeIcon className="h-3 w-3 mr-1" />
                  {metaBadge.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'detalhes' && (
          <DetalhesTab
            indicador={indicador}
            resultados={resultados}
            loading={loadingResults}
            isMounted={isMounted}
          />
        )}
        {activeTab === 'plano' && (
          <PlanoAcaoTab
            indicador={indicador}
            planos={planos}
            loading={loadingPlanos}
            queryClient={queryClient}
          />
        )}
        {activeTab === 'checkin' && (
          <CheckinTab indicador={indicador} resultados={resultados} queryClient={queryClient} />
        )}
        {activeTab === 'historico' && (
          <HistoricoTab resultados={resultados} loading={loadingResults} />
        )}
      </div>
    </AppShell>
  );
}

/* ===================== DETALHES TAB ===================== */
function DetalhesTab({
  indicador,
  resultados,
  loading,
  isMounted,
}: {
  indicador: any;
  resultados: any;
  loading: boolean;
  isMounted: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [chartView, setChartView] = useState<ChartViewMode>('mensal');

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);

    (resultados || []).forEach((result: any) => {
      const year = getResultDate(result).getFullYear();
      if (Number.isFinite(year)) years.add(year);
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [resultados, currentYear]);

  useEffect(() => {
    if (!availableYears.length) return;
    if (!availableYears.includes(Number(selectedYear))) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  const chartData = useMemo(() => {
    if (!resultados) return [];

    const metaPadrao = Number(indicador.meta || 0);
    const selectedYearNumber = Number(selectedYear);
    const previousYear = selectedYearNumber - 1;
    const isSentidoMaior = indicador.sentido === 'Quanto maior melhor';
    const isOnTarget = (valor: number | null, meta: number) => {
      if (valor == null) return false;
      return isSentidoMaior ? valor >= meta : valor <= meta;
    };

    if (chartView === 'anual') {
      const years = Array.from<number>(
        new Set((resultados || []).map((result: any) => getResultDate(result).getFullYear()))
      ).sort((a, b) => a - b);

      return years.map((year) => {
        const yearResults = resultados.filter(
          (result: any) => getResultDate(result).getFullYear() === year
        );
        const valor = getPeriodAverage(yearResults);
        const meta = getPeriodMeta(yearResults, metaPadrao);

        return {
          date: String(year),
          valor,
          meta,
          isOnTarget: isOnTarget(valor, meta),
        };
      });
    }

    if (chartView === 'acumulado') {
      let currentAccumulated = 0;
      let previousAccumulated = 0;

      return MESES_ABREV.map((month, index) => {
        const currentMonthResults = resultados.filter((result: any) => {
          const date = getResultDate(result);
          return date.getFullYear() === selectedYearNumber && date.getMonth() === index;
        });
        const previousMonthResults = resultados.filter((result: any) => {
          const date = getResultDate(result);
          return date.getFullYear() === previousYear && date.getMonth() === index;
        });

        currentAccumulated += currentMonthResults.reduce(
          (sum: number, result: any) => sum + Number(result.valor_realizado || 0),
          0
        );
        previousAccumulated += previousMonthResults.reduce(
          (sum: number, result: any) => sum + Number(result.valor_realizado || 0),
          0
        );

        const hasCurrentValue = currentMonthResults.length > 0 || currentAccumulated > 0;
        const hasPreviousValue = previousMonthResults.length > 0 || previousAccumulated > 0;
        const meta = metaPadrao * (index + 1);
        const valor = hasCurrentValue ? currentAccumulated : null;

        return {
          date: month,
          valor,
          meta,
          comparativo: hasPreviousValue ? previousAccumulated : null,
          isOnTarget: isOnTarget(valor, meta),
        };
      });
    }

    return MESES_ABREV.map((month, index) => {
      const monthResults = resultados.filter((result: any) => {
        const date = getResultDate(result);
        return date.getFullYear() === selectedYearNumber && date.getMonth() === index;
      });
      const valor = getPeriodAverage(monthResults);
      const meta = getPeriodMeta(monthResults, metaPadrao);

      return {
        date: month,
        valor,
        meta,
        isOnTarget: isOnTarget(valor, meta),
      };
    });
  }, [resultados, indicador, selectedYear, chartView]);

  const comparisonData = useMemo(() => {
    if (!resultados) {
      return { monthlyData: [], yearlyData: [] };
    }

    const selectedYearNumber = Number(selectedYear);
    const previousYear = selectedYearNumber - 1;
    let selectedYearTotal = 0;
    let previousYearTotal = 0;

    const monthlyData = MESES_ABREV.map((month, index) => {
      const currentMonthResults = resultados.filter((result: any) => {
        const date = getResultDate(result);
        return date.getFullYear() === selectedYearNumber && date.getMonth() === index;
      });
      const previousMonthResults = resultados.filter((result: any) => {
        const date = getResultDate(result);
        return date.getFullYear() === previousYear && date.getMonth() === index;
      });

      const currentValue = getPeriodSum(currentMonthResults);
      const previousValue = getPeriodSum(previousMonthResults);
      selectedYearTotal += currentValue;
      previousYearTotal += previousValue;

      if (!currentMonthResults.length && !previousMonthResults.length) {
        return {
          date: month,
          diferenca: null,
          variacao: null,
          isPositive: false,
        };
      }

      const diferenca = currentValue - previousValue;
      const variacao = previousValue === 0 ? null : (diferenca / Math.abs(previousValue)) * 100;

      return {
        date: month,
        diferenca,
        variacao,
        isPositive: diferenca >= 0,
      };
    });

    return {
      monthlyData,
      yearlyData: [
        {
          year: String(previousYear),
          valor: previousYearTotal,
          isCurrent: false,
        },
        {
          year: String(selectedYearNumber),
          valor: selectedYearTotal,
          isCurrent: true,
        },
      ],
    };
  }, [resultados, selectedYear]);

  const hasChartValues = chartData.some(
    (point: any) => point.valor != null || point.comparativo != null
  );
  const hasComparisonValues =
    comparisonData.monthlyData.some((point: any) => point.diferenca != null) ||
    comparisonData.yearlyData.some((point: any) => point.valor !== 0);

  if (loading) return <Skeleton className="h-[400px] w-full rounded-xl" />;

  if (chartView !== 'comparativo' && !hasChartValues) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Nenhum resultado lancado ainda</p>
        <p className="text-sm text-slate-400 mt-1">
          Faca o primeiro check-in na aba correspondente.
        </p>
      </div>
    );
  }

  const previousYear = Number(selectedYear) - 1;
  const chartTitle =
    chartView === 'anual'
      ? 'Evolucao por ano'
      : chartView === 'acumulado'
        ? `Acumulado ${selectedYear} x ${previousYear}`
        : chartView === 'comparativo'
          ? `Comparativo ${selectedYear} x ${previousYear}`
        : 'Evolucao';

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-800">{chartTitle}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {chartView !== 'anual' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-11 min-w-28 rounded-full bg-slate-50 px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={chartView} onValueChange={(value) => setChartView(value as ChartViewMode)}>
            <SelectTrigger className="h-11 min-w-36 rounded-full bg-slate-50 px-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
              <SelectItem value="acumulado">Acumulado</SelectItem>
              <SelectItem value="comparativo">Comparativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isMounted && chartView === 'comparativo' && hasComparisonValues && (
        <IndicadorComparisonChart
          monthlyData={comparisonData.monthlyData}
          yearlyData={comparisonData.yearlyData}
          unidadeMedida={indicador.unidade_medida || ''}
        />
      )}

      {isMounted && chartView === 'comparativo' && !hasComparisonValues && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <BarChart3 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">
            Ainda nao ha dados suficientes para comparar este ano com o ano anterior.
          </p>
        </div>
      )}

      {isMounted && chartView !== 'comparativo' && (
        <div style={{ width: '100%', height: 400 }}>
          <IndicadorChart
            data={chartData}
            realizadoLabel={
              chartView === 'acumulado' ? `Acumulado ${selectedYear}` : `Realizado ${selectedYear}`
            }
            comparativoLabel={`${previousYear}`}
            unidadeMedida={indicador.unidade_medida || ''}
          />
        </div>
      )}
    </div>
  );
}
/* ===================== PLANO DE AÇÃO TAB ===================== */
function PlanoAcaoTab({ indicador, planos, loading, queryClient }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/planos-acao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao', indicador.id.toString()] });
      toast.success('Plano de ação criado!');
      setIsModalOpen(false);
    },
    onError: () => toast.error('Erro ao criar plano'),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      indicador_id: indicador.id,
      setor_id: indicador.setor_id,
      problema: fd.get('problema'),
      causa: fd.get('causa'),
      acao_proposta: fd.get('acao_proposta'),
      responsavel: fd.get('responsavel'),
      prazo_date: fd.get('prazo_date'),
      prioridade: fd.get('prioridade'),
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Aberto':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Em andamento':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Concluído':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Cancelado':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getPrioridadeStyle = (p: string) => {
    switch (p) {
      case 'Alta':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Média':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Baixa':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  if (loading) return <Skeleton className="h-60 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Planos de Ação</h2>
        <Button
          size="sm"
          className="gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {!planos || planos.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed p-12 text-center">
          <ClipboardList className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum plano de ação</p>
          <p className="text-sm text-slate-400 mt-1">Crie o primeiro plano para este indicador.</p>
          <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar primeiro plano
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {planos.map((p: any) => {
            const prazoFormatted = p.prazo_date
              ? format(parseISO(p.prazo_date), 'dd/MM/yyyy')
              : '—';
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge className={`text-[10px] ${getStatusStyle(p.status)}`}>
                        {p.status}
                      </Badge>
                      {p.prioridade && (
                        <Badge className={`text-[10px] ${getPrioridadeStyle(p.prioridade)}`}>
                          {p.prioridade}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 mt-1">
                      {p.acao_proposta || 'Sem ação definida'}
                    </h3>
                    {p.problema && (
                      <p className="text-xs text-slate-500 mt-1">
                        <strong>Problema:</strong> {p.problema}
                      </p>
                    )}
                    {p.causa && (
                      <p className="text-xs text-slate-500">
                        <strong>Causa:</strong> {p.causa}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {prazoFormatted}
                    </div>
                    {p.responsavel && <p className="text-xs text-slate-400">{p.responsavel}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Novo Plano */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Novo Plano de Ação</DialogTitle>
              <DialogDescription>
                Defina um plano corretivo para o indicador {indicador.nome}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Problema Identificado</Label>
                <Textarea name="problema" placeholder="Descreva o problema..." required />
              </div>
              <div className="grid gap-2">
                <Label>Causa Raiz</Label>
                <Textarea name="causa" placeholder="Qual a causa do problema?" required />
              </div>
              <div className="grid gap-2">
                <Label>Ação Proposta</Label>
                <Textarea
                  name="acao_proposta"
                  placeholder="O que será feito para resolver?"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Responsável</Label>
                  <Input name="responsavel" placeholder="Nome do responsável" required />
                </div>
                <div className="grid gap-2">
                  <Label>Prazo</Label>
                  <Input name="prazo_date" type="date" required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select name="prioridade" defaultValue="Média">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {mutation.isPending ? 'Salvando...' : 'Criar Plano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===================== CHECK-IN TAB ===================== */
function CheckinTab({
  indicador,
  resultados,
  queryClient,
}: {
  indicador: any;
  resultados: any;
  queryClient: any;
}) {
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('2026');
  const [valor, setValor] = useState('');
  const [comentario, setComentario] = useState('');

  const competenciaDate =
    mes && ano ? `${parseInt(ano)}-${String(parseInt(mes)).padStart(2, '0')}-01` : null;
  const existingResult = useMemo(() => {
    if (!competenciaDate || !resultados) return null;
    return resultados.find((r: any) => String(r.competencia_date).slice(0, 10) === competenciaDate);
  }, [competenciaDate, resultados]);

  useEffect(() => {
    if (!mes || !ano) return;

    if (existingResult) {
      setValor(String(existingResult.valor_realizado ?? ''));
      setComentario(existingResult.observacao ?? '');
    } else {
      setValor('');
      setComentario('');
    }
  }, [ano, mes, existingResult]);

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resultados', indicador.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['indicador', indicador.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos-indicadores'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(data?.updated ? 'Check-in atualizado com sucesso!' : 'Check-in realizado com sucesso!');
      if (data.status === 'Fora da meta') {
        toast.error('Indicador fora da meta. Considere criar um plano de ação.');
      }
    },
    onError: () => toast.error('Erro ao salvar check-in'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mes || !ano || !valor) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    mutation.mutate({
      indicador_id: indicador.id,
      setor_id: indicador.setor_id,
      competencia_date: competenciaDate,
      valor_realizado: parseFloat(valor),
      meta_periodo: indicador.meta,
      observacao: comentario || null,
    });
  };

  const years = [2024, 2025, 2026, 2027];

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Realizar Check-in</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mês + Ano */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Mês</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Ano</Label>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {existingResult && (
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Já existe check-in para este período. Ao salvar, o lançamento será atualizado.
          </div>
        )}

        {/* Resultado */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Resultado Mensal</Label>
          <Input
            type="number"
            step="0.01"
            placeholder={`Ex: ${indicador.meta || '0'}`}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="h-11"
          />
          <p className="text-xs text-slate-400">
            Meta atual: {indicador.meta}
            {indicador.unidade_medida || ''} · {indicador.sentido || ''}
          </p>
        </div>

        {/* Comentários */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Comentários</Label>
          <Textarea
            placeholder="Observações sobre o resultado do período..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
          />
        </div>

        {/* Anexar arquivo (visual placeholder) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Evidência</Label>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
            <Paperclip className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-500">Anexar arquivo de evidência (opcional)</span>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-sm font-bold uppercase tracking-wide"
        >
          {mutation.isPending ? 'Salvando...' : existingResult ? 'Atualizar' : 'Salvar'}
        </Button>
      </form>
    </div>
  );
}

/* ===================== HISTÓRICO TAB ===================== */
function HistoricoTab({ resultados, loading }: { resultados: any; loading: boolean }) {
  if (loading) return <Skeleton className="h-60 w-full rounded-xl" />;

  if (!resultados || resultados.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed p-12 text-center">
        <History className="h-12 w-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Nenhum histórico disponível</p>
        <p className="text-sm text-slate-400 mt-1">Os check-ins realizados aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Histórico de Check-ins</h2>
      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-3">Data do Check-in</div>
          <div className="col-span-2">Valor</div>
          <div className="col-span-2">Meta</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Observação</div>
        </div>

        {/* Table rows */}
        {resultados.map((r: any) => {
          const dateFormatted = format(parseISO(r.competencia_date), 'MMMM yyyy', { locale: ptBR });
          const createdFormatted = r.created_at
            ? format(parseISO(r.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
            : '—';
          const isGood = r.status === 'Dentro da meta';
          const isAtencao = r.status === 'Atenção';

          return (
            <div
              key={r.id}
              className="grid grid-cols-12 gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-slate-50 transition-colors items-center"
            >
              <div className="col-span-3">
                <p className="text-sm font-medium text-slate-800 capitalize">{dateFormatted}</p>
                <p className="text-[10px] text-slate-400">{createdFormatted}</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm font-bold text-slate-900">{r.valor_realizado}</span>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-slate-500">{r.meta_periodo}</span>
              </div>
              <div className="col-span-2">
                <Badge
                  className={`text-[10px] ${
                    isGood
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : isAtencao
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {isGood ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {r.status}
                </Badge>
              </div>
              <div className="col-span-3">
                <p className="text-xs text-slate-500 truncate">{r.observacao || '—'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
