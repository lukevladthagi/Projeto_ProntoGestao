'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Filter,
  Network,
  Search,
  Target,
  XCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type IndicatorStatus = 'meta' | 'fora' | 'atencao' | 'sem';

type MapIndicator = {
  id: number;
  nome: string;
  descricao?: string | null;
  tipo?: string | null;
  frequencia?: string | null;
  meta?: number | null;
  sentido?: string | null;
  unidade_medida?: string | null;
  nivel_gestao?: string | null;
  tags?: string[] | null;
  setor_id?: number | null;
  setor_nome?: string | null;
  setor_responsavel?: string | null;
  responsavel_nome?: string | null;
  ultimo_valor?: number | null;
  ultima_meta?: number | null;
  ultimo_status?: string | null;
  ultima_competencia?: string | null;
  ultima_observacao?: string | null;
  ultimo_lancamento_em?: string | null;
  sparkline?: number[];
};

const statusConfig: Record<
  IndicatorStatus,
  { label: string; dot: string; badge: string; icon: React.ElementType; order: number }
> = {
  fora: {
    label: 'Fora da meta',
    dot: 'bg-red-500 border-red-600 shadow-red-100',
    badge: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
    icon: XCircle,
    order: 0,
  },
  atencao: {
    label: 'Atenção',
    dot: 'bg-amber-400 border-amber-500 shadow-amber-100',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
    icon: AlertTriangle,
    order: 1,
  },
  meta: {
    label: 'Na meta',
    dot: 'bg-green-500 border-green-600 shadow-green-100',
    badge: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50',
    icon: CheckCircle2,
    order: 2,
  },
  sem: {
    label: 'Sem lançamento',
    dot: 'bg-slate-300 border-slate-400 shadow-slate-100',
    badge: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50',
    icon: Circle,
    order: 3,
  },
};

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getStatus(indicator: MapIndicator): IndicatorStatus {
  const status = normalizeText(indicator.ultimo_status);
  if (!indicator.ultimo_status && indicator.ultimo_valor == null) return 'sem';
  if (status.includes('fora')) return 'fora';
  if (status.includes('atencao')) return 'atencao';
  if (status.includes('dentro')) return 'meta';
  return 'sem';
}

function formatValue(value: number | null | undefined, unit?: string | null) {
  if (value == null) return '-';
  if (unit === '%') return `${Number(value).toFixed(1)}%`;
  if (unit === 'R$') return `R$ ${Number(value).toLocaleString('pt-BR')}`;
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem lançamento';
  return format(parseISO(value), 'MMMM/yyyy', { locale: ptBR });
}

function statusCounts(indicators: MapIndicator[]) {
  return indicators.reduce(
    (acc, indicator) => {
      acc[getStatus(indicator)] += 1;
      return acc;
    },
    { meta: 0, fora: 0, atencao: 0, sem: 0 } as Record<IndicatorStatus, number>
  );
}

function IndicatorDot({
  indicator,
  onClick,
}: {
  indicator: MapIndicator;
  onClick: (indicator: MapIndicator) => void;
}) {
  const status = getStatus(indicator);
  return (
    <button
      type="button"
      title={`${indicator.nome} - ${statusConfig[status].label}`}
      onClick={() => onClick(indicator)}
      className="group flex min-w-0 items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:border-slate-200 hover:bg-white hover:shadow-sm"
    >
      <span
        className={`h-3.5 w-3.5 flex-shrink-0 rounded-full border shadow-sm ${statusConfig[status].dot}`}
      />
      <span className="min-w-0 truncate text-xs font-medium text-slate-700 group-hover:text-slate-950">
        {indicator.nome}
      </span>
    </button>
  );
}

function StatusBadge({ status }: { status: IndicatorStatus }) {
  const Icon = statusConfig[status].icon;
  return (
    <Badge className={`gap-1 text-xs ${statusConfig[status].badge}`}>
      <Icon className="h-3 w-3" />
      {statusConfig[status].label}
    </Badge>
  );
}

function SectorCard({
  setor,
  indicators,
  onSelect,
}: {
  setor: string;
  indicators: MapIndicator[];
  onSelect: (indicator: MapIndicator) => void;
}) {
  const counts = statusCounts(indicators);
  const sorted = [...indicators].sort((a, b) => {
    const statusDiff = statusConfig[getStatus(a)].order - statusConfig[getStatus(b)].order;
    return statusDiff || a.nome.localeCompare(b.nome);
  });
  const hasCritical = counts.fora > 0;

  return (
    <section
      className={`min-h-[190px] rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md ${
        hasCritical ? 'border-red-200' : 'border-slate-200'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-slate-900">{setor}</h2>
          <p className="text-xs text-slate-500">{indicators.length} indicadores</p>
        </div>
        {hasCritical ? <StatusBadge status="fora" /> : <StatusBadge status="meta" />}
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        {(['fora', 'atencao', 'meta', 'sem'] as IndicatorStatus[]).map((status) => (
          <div key={status} className="rounded-md bg-slate-50 px-2 py-1">
            <div className="text-sm font-bold text-slate-900">{counts[status]}</div>
            <div className="text-[10px] text-slate-500">{statusConfig[status].label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-1">
        {sorted.map((indicator) => (
          <IndicatorDot key={indicator.id} indicator={indicator} onClick={onSelect} />
        ))}
      </div>
    </section>
  );
}

function IndicatorPerspectiveCard({
  indicator,
  onSelect,
}: {
  indicator: MapIndicator;
  onSelect: (indicator: MapIndicator) => void;
}) {
  const status = getStatus(indicator);
  return (
    <button
      type="button"
      onClick={() => onSelect(indicator)}
      className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md md:grid-cols-[1fr_auto]"
    >
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {indicator.setor_nome && (
            <Badge variant="outline" className="bg-slate-50 text-xs text-slate-600">
              {indicator.setor_nome}
            </Badge>
          )}
        </div>
        <h2 className="truncate text-sm font-bold text-slate-900">{indicator.nome}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {indicator.tipo || 'Indicador'} {indicator.frequencia ? `| ${indicator.frequencia}` : ''}
        </p>
      </div>
      <div className="flex items-end justify-between gap-6 md:block md:text-right">
        <div>
          <div className="text-2xl font-black text-slate-900">
            {formatValue(indicator.ultimo_valor, indicator.unidade_medida)}
          </div>
          <div className="text-xs text-slate-400">
            meta {formatValue(indicator.ultima_meta ?? indicator.meta, indicator.unidade_medida)}
          </div>
        </div>
        <Eye className="h-4 w-4 text-slate-400 md:ml-auto md:mt-2" />
      </div>
    </button>
  );
}

function IndicatorDetailsDialog({
  indicator,
  open,
  onOpenChange,
}: {
  indicator: MapIndicator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: history, isLoading } = useQuery({
    queryKey: ['mapa-historico', indicator?.id],
    queryFn: async () => {
      const res = await fetch(`/api/resultados?indicadorId=${indicator?.id}&limit=6`);
      if (!res.ok) throw new Error('Failed to fetch results');
      return res.json();
    },
    enabled: open && !!indicator,
  });

  if (!indicator) return null;

  const status = getStatus(indicator);
  const meta = indicator.ultima_meta ?? indicator.meta;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {indicator.setor_nome && (
              <Badge variant="outline" className="bg-slate-50 text-xs">
                {indicator.setor_nome}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl">{indicator.nome}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Último resultado</p>
              <p className="text-2xl font-black text-slate-900">
                {formatValue(indicator.ultimo_valor, indicator.unidade_medida)}
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Meta</p>
              <p className="text-2xl font-black text-slate-900">
                {formatValue(meta, indicator.unidade_medida)}
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Competência</p>
              <p className="text-sm font-bold text-slate-900">
                {formatDate(indicator.ultima_competencia)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{indicator.sentido || 'Sem sentido'}</p>
            </div>
          </div>

          {indicator.ultima_observacao && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-700">Observação do último lançamento</p>
              <p className="mt-1 text-sm text-blue-900">{indicator.ultima_observacao}</p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-800">Histórico recente</h3>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-4 gap-3 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <span>Competência</span>
                <span>Valor</span>
                <span>Meta</span>
                <span>Status</span>
              </div>
              {isLoading ? (
                <div className="p-3">
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !history || history.length === 0 ? (
                <p className="p-3 text-sm text-slate-400">Nenhum lançamento encontrado.</p>
              ) : (
                history.map((row: any) => {
                  const rowStatus = getStatus({
                    ...indicator,
                    ultimo_status: row.status,
                    ultimo_valor: row.valor_realizado,
                  });
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-4 gap-3 border-t px-3 py-2 text-sm text-slate-700"
                    >
                      <span>{formatDate(row.competencia_date)}</span>
                      <span>{formatValue(row.valor_realizado, indicator.unidade_medida)}</span>
                      <span>{formatValue(row.meta_periodo, indicator.unidade_medida)}</span>
                      <span className="text-xs">
                        <StatusBadge status={rowStatus} />
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => router.push(`/indicadores/${indicator.id}`)}
            >
              Abrir indicador
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MapaPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IndicatorStatus | 'todos'>('todos');
  const [selectedIndicator, setSelectedIndicator] = useState<MapIndicator | null>(null);

  const { data, isLoading } = useQuery<MapIndicator[]>({
    queryKey: ['mapa-desempenho'],
    queryFn: async () => {
      const res = await fetch('/api/mapa-desempenho');
      if (!res.ok) throw new Error('Failed to fetch map');
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = normalizeText(search);
    return data.filter((indicator) => {
      const matchesSearch =
        !q ||
        normalizeText(indicator.nome).includes(q) ||
        normalizeText(indicator.setor_nome).includes(q) ||
        normalizeText(indicator.responsavel_nome).includes(q) ||
        normalizeText(indicator.nivel_gestao).includes(q);
      const matchesStatus = statusFilter === 'todos' || getStatus(indicator) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  const sectors = useMemo(() => {
    const grouped = new Map<string, MapIndicator[]>();
    for (const indicator of filtered) {
      const setor = indicator.setor_nome || 'Sem setor';
      grouped.set(setor, [...(grouped.get(setor) || []), indicator]);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const byIndicator = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const statusDiff = statusConfig[getStatus(a)].order - statusConfig[getStatus(b)].order;
      return statusDiff || a.nome.localeCompare(b.nome);
    });
  }, [filtered]);

  const totals = statusCounts(filtered);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <Network className="h-4 w-4" />
              Mapa visual
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Mapa de Desempenho</h1>
            <p className="mt-1 text-sm text-slate-500">
              Visualize setores como caixas e indicadores como pontos de status.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {(['fora', 'atencao', 'meta', 'sem'] as IndicatorStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(statusFilter === status ? 'todos' : status)}
                className={`rounded-lg border bg-white px-3 py-2 text-left transition hover:shadow-sm ${
                  statusFilter === status ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusConfig[status].dot}`} />
                  <span className="text-lg font-black text-slate-900">{totals[status]}</span>
                </div>
                <div className="text-[10px] text-slate-500">{statusConfig[status].label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por setor, indicador, responsável ou nível..."
              className="h-9 pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setSearch('');
              setStatusFilter('todos');
            }}
          >
            <Filter className="h-4 w-4" />
            Limpar filtros
          </Button>
        </div>

        <Tabs defaultValue="setores" className="space-y-4">
          <TabsList>
            <TabsTrigger value="setores" className="gap-2">
              <Target className="h-4 w-4" />
              Por setor
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Por indicador
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setores">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-52 rounded-lg" />
                ))}
              </div>
            ) : sectors.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-white p-12 text-center text-slate-400">
                Nenhum setor encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sectors.map(([setor, indicators]) => (
                  <SectorCard
                    key={setor}
                    setor={setor}
                    indicators={indicators}
                    onSelect={setSelectedIndicator}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="indicadores">
            {isLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : byIndicator.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-white p-12 text-center text-slate-400">
                Nenhum indicador encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="grid gap-3">
                {byIndicator.map((indicator) => (
                  <IndicatorPerspectiveCard
                    key={indicator.id}
                    indicator={indicator}
                    onSelect={setSelectedIndicator}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <IndicatorDetailsDialog
        indicator={selectedIndicator}
        open={!!selectedIndicator}
        onOpenChange={(open) => {
          if (!open) setSelectedIndicator(null);
        }}
      />
    </AppShell>
  );
}
