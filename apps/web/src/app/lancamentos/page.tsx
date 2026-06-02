'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Download,
  Plus,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  User,
  ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/utils/toast';
import { AppShell } from '@/components/AppShell';

// Mini sparkline SVG component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) {
    return (
      <div className="w-20 h-10 flex items-center justify-center">
        <div className="text-[10px] text-slate-300">Sem dados</div>
      </div>
    );
  }

  const width = 80;
  const height = 36;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ];

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints.join(' ')} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatValue(value: number | null, unit: string | null): string {
  if (value == null) return '—';
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'R$') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M R$`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k R$`;
    return `${value.toFixed(2)} R$`;
  }
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

export default function LancamentosPage() {
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: indicadores, isLoading } = useQuery({
    queryKey: ['lancamentos-indicadores'],
    queryFn: async () => {
      const res = await fetch('/api/lancamentos');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: allIndicadores } = useQuery({
    queryKey: ['indicadores-ativos'],
    queryFn: async () => {
      const res = await fetch('/api/indicadores');
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (newResult: any) => {
      const res = await fetch('/api/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResult),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos-indicadores'] });
      queryClient.invalidateQueries({ queryKey: ['resultados-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Lançamento realizado!');
      setIsModalOpen(false);
      if (data.status === 'Fora da meta') {
        toast.error('Indicador fora da meta. Considere criar um plano de ação.');
      }
    },
    onError: () => toast.error('Erro ao realizar lançamento'),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const indicatorId = formData.get('indicador_id');
    const indicator = allIndicadores?.find((i: any) => i.id.toString() === indicatorId);

    const data = {
      indicador_id: parseInt(indicatorId as string),
      setor_id: indicator?.setor_id,
      competencia_date: formData.get('competencia'),
      valor_realizado: parseFloat(formData.get('valor') as string),
      meta_periodo: parseFloat(formData.get('meta') as string) || indicator?.meta,
      observacao: formData.get('observacao'),
    };
    mutation.mutate(data);
  };

  // Extract all unique tags from indicators
  const allTags = useMemo(() => {
    if (!indicadores) return [];
    const tagSet = new Set<string>();
    for (const ind of indicadores) {
      if (ind.tags && Array.isArray(ind.tags)) {
        for (const tag of ind.tags) {
          tagSet.add(tag);
        }
      }
      if (ind.nivel_gestao) tagSet.add(ind.nivel_gestao);
    }
    return Array.from(tagSet).sort();
  }, [indicadores]);

  // Extract unique areas (setores)
  const areas = useMemo(() => {
    if (!indicadores) return [];
    const areaSet = new Map<string, string>();
    for (const ind of indicadores) {
      if (ind.setor_nome) areaSet.set(ind.setor_id.toString(), ind.setor_nome);
    }
    return Array.from(areaSet.entries()).map(([id, nome]) => ({ id, nome }));
  }, [indicadores]);

  // Filter indicators
  const filtered = useMemo(() => {
    if (!indicadores) return [];
    return indicadores.filter((ind: any) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matchName = ind.nome?.toLowerCase().includes(q);
        const matchResponsavel = ind.responsavel_nome?.toLowerCase().includes(q);
        const matchTags = ind.tags?.some((t: string) => t.toLowerCase().includes(q));
        if (!matchName && !matchResponsavel && !matchTags) return false;
      }
      // Area filter
      if (filterArea !== 'all' && ind.setor_id?.toString() !== filterArea) return false;
      // Tag filter
      if (filterTag !== 'all') {
        const hasTags = ind.tags?.includes(filterTag) || ind.nivel_gestao === filterTag;
        if (!hasTags) return false;
      }
      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'meta' && ind.meta_status !== 'meta') return false;
        if (filterStatus === 'fora' && ind.meta_status !== 'fora') return false;
        if (filterStatus === 'sem' && ind.ultimo_valor != null) return false;
      }
      return true;
    });
  }, [indicadores, search, filterArea, filterTag, filterStatus]);

  const getSparklineColor = (ind: any) => {
    if (ind.meta_status === 'meta') return '#22c55e';
    if (ind.meta_status === 'fora') return '#ef4444';
    return '#94a3b8';
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lançamentos</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isLoading ? '...' : `${filtered?.length || 0} indicadores`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-slate-600">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Lançamento
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white rounded-xl border p-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar indicador, responsável ou tag..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
              <SelectValue placeholder="Todas as áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
              <SelectValue placeholder="Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="meta">Na meta</SelectItem>
              <SelectItem value="fora">Fora da meta</SelectItem>
              <SelectItem value="sem">Sem lançamento</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
            <Filter className="h-4 w-4 text-slate-500" />
          </Button>
        </div>

        {/* Indicator Cards */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : filtered?.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
              <p className="text-lg font-medium">Nenhum indicador encontrado</p>
              <p className="text-sm mt-1">
                Tente ajustar os filtros ou cadastre novos indicadores.
              </p>
            </div>
          ) : (
            filtered.map((ind: any, index: number) => {
              const sparkColor = getSparklineColor(ind);
              const tags: string[] = [];
              if (ind.nivel_gestao) tags.push(ind.nivel_gestao);
              if (ind.tags && Array.isArray(ind.tags)) {
                for (const t of ind.tags) {
                  if (!tags.includes(t)) tags.push(t);
                }
              }

              const isMeta = ind.meta_status === 'meta';
              const isFora = ind.meta_status === 'fora';

              return (
                <div
                  key={ind.id}
                  className="bg-white rounded-xl border hover:shadow-md transition-shadow p-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => router.push(`/indicadores/${ind.id}`)}
                >
                  {/* Row number */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                    {index + 1}
                  </div>

                  {/* Indicator info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{ind.nome}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {/* Tags */}
                      {tags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-5 font-medium bg-slate-50 text-slate-600 border-slate-200"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {/* Meta status badge */}
                      {isMeta && (
                        <Badge className="text-[10px] px-1.5 py-0 h-5 gap-0.5 bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
                          <CheckCircle2 className="h-3 w-3" />
                          Meta
                        </Badge>
                      )}
                      {isFora && (
                        <Badge className="text-[10px] px-1.5 py-0 h-5 gap-0.5 bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
                          <XCircle className="h-3 w-3" />
                          Fora
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Responsável */}
                  <div className="hidden md:flex items-center gap-2 flex-shrink-0 min-w-[140px]">
                    <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                      {ind.responsavel_nome ? (
                        ind.responsavel_nome.charAt(0).toUpperCase()
                      ) : (
                        <User className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </div>
                    <span className="text-xs text-slate-600 truncate">
                      {ind.responsavel_nome || 'Sem responsável'}
                    </span>
                  </div>

                  {/* Sparkline */}
                  <div className="hidden sm:block flex-shrink-0">
                    <Sparkline data={ind.sparkline} color={sparkColor} />
                  </div>

                  {/* Value and variation */}
                  <div className="flex-shrink-0 text-right min-w-[100px]">
                    <div className="text-lg font-bold text-slate-900">
                      {formatValue(ind.ultimo_valor, ind.unidade_medida)}
                    </div>
                    {ind.variacao != null ? (
                      <div
                        className={`flex items-center justify-end gap-0.5 text-xs font-medium ${
                          ind.variacao >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {ind.variacao >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {ind.variacao >= 0 ? '+' : ''}
                        {ind.variacao.toFixed(2)}%
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-300">Sem variação</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Novo Lançamento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
              <DialogDescription>
                Informe o resultado alcançado no período de referência.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="indicador_id">Indicador</Label>
                <Select
                  name="indicador_id"
                  onValueChange={(val) => {
                    const ind = allIndicadores?.find((i: any) => i.id.toString() === val);
                    setSelectedIndicator(ind);
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o indicador" />
                  </SelectTrigger>
                  <SelectContent>
                    {allIndicadores?.map((i: any) => (
                      <SelectItem key={i.id} value={i.id.toString()}>
                        {i.nome} {i.setor_nome ? `(${i.setor_nome})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="competencia">Mês de Referência</Label>
                  <Input id="competencia" name="competencia" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="valor">Valor Realizado</Label>
                  <Input
                    id="valor"
                    name="valor"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meta">Meta do Período (Opcional)</Label>
                <Input
                  id="meta"
                  name="meta"
                  type="number"
                  step="0.01"
                  placeholder={selectedIndicator?.meta?.toString() || 'Meta padrão'}
                />
                <p className="text-[10px] text-slate-400">
                  Deixe em branco para usar a meta padrão do indicador.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="observacao">Observações / Análise de Causa</Label>
                <Textarea
                  id="observacao"
                  name="observacao"
                  placeholder="Comente sobre o desempenho ou justificativas..."
                />
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
                {mutation.isPending ? 'Lançando...' : 'Confirmar Lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
