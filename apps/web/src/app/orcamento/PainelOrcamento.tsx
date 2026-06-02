'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const MESES_CURTOS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

function getExecColor(execucao: number, hasPlanejado: boolean): string {
  if (!hasPlanejado) return 'bg-slate-100 text-slate-400';
  if (execucao <= 80) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (execucao <= 100) return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
  return 'bg-red-50 text-red-700 border border-red-200';
}

function getExecBadgeColor(execucao: number): string {
  if (execucao <= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (execucao <= 100) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function getCategoryColor(cor: string | null): string {
  return cor || '#3b82f6';
}

export default function PainelOrcamento() {
  const queryClient = useQueryClient();
  const [ano, setAno] = useState(2025);
  const [currentYear, setCurrentYear] = useState(2025);
  const [search, setSearch] = useState('');
  const [setorFilter, setSetorFilter] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [visibleMonthStart, setVisibleMonthStart] = useState(0);
  const visibleMonthCount = 6;

  useEffect(() => {
    const y = new Date().getFullYear();
    setCurrentYear(y);
    setAno(y);
  }, []);

  const { data: setoresData } = useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const res = await fetch('/api/setores');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: categoriasData } = useQuery({
    queryKey: ['categorias-orcamento'],
    queryFn: async () => {
      const res = await fetch('/api/orcamento/categorias');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: painelData, isLoading } = useQuery({
    queryKey: ['orcamento-painel', ano, setorFilter, categoriaFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({ ano: ano.toString() });
      if (setorFilter) params.append('setor_id', setorFilter);
      if (categoriaFilter) params.append('categoria_id', categoriaFilter);
      if (search) params.append('search', search);
      const res = await fetch(`/api/orcamento/painel?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  // Mutation to update monthly value
  const updateValorMutation = useMutation({
    mutationFn: async ({ itemId, mes, ano, valorRealizado }: any) => {
      const res = await fetch(`/api/orcamento/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valores_mensais: [
            {
              mes,
              ano,
              valor_realizado: parseFloat(valorRealizado) || 0,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error('Failed to update value');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento-painel'] });
      toast.success('Valor realizado atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar valor');
    },
  });

  const handleValorRealizadoChange = (itemId: number, mes: number, valor: string) => {
    updateValorMutation.mutate({
      itemId,
      mes,
      ano,
      valorRealizado: valor,
    });
  };

  const setores = setoresData?.setores || [];
  const categorias = categoriasData?.categorias || [];
  const totais = painelData?.totais || { planejado: 0, realizado: 0, execucao: 0, meses: [] };

  const grouped = useMemo(() => {
    const items = painelData?.itens || [];
    const map: Record<string, { setor: string; items: any[] }> = {};
    for (const item of items) {
      const key = item.setor_nome || 'Sem Setor';
      if (!map[key]) map[key] = { setor: key, items: [] };
      map[key].items.push(item);
    }
    return Object.values(map);
  }, [painelData?.itens]);

  const painelItens = painelData?.itens || [];

  const visibleMonths = Array.from(
    { length: visibleMonthCount },
    (_, i) => visibleMonthStart + i
  ).filter((m) => m < 12);

  const canGoLeft = visibleMonthStart > 0;
  const canGoRight = visibleMonthStart + visibleMonthCount < 12;

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <Card className="border-slate-200 bg-white">
        <div className="p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={setorFilter || 'all'}
            onValueChange={(v) => setSetorFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos setores</SelectItem>
              {setores.map((s: any) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={categoriaFilter || 'all'}
            onValueChange={(v) => setCategoriaFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todas categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categorias.map((c: any) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setVisibleMonthStart(Math.max(0, visibleMonthStart - visibleMonthCount))
              }
              disabled={!canGoLeft}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-slate-500 min-w-[70px] text-center">
              {MESES_CURTOS[visibleMonthStart]} –{' '}
              {MESES_CURTOS[Math.min(visibleMonthStart + visibleMonthCount - 1, 11)]}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setVisibleMonthStart(
                  Math.min(12 - visibleMonthCount, visibleMonthStart + visibleMonthCount)
                )
              }
              disabled={!canGoRight}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Matrix Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Card className="border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[260px]">
                    Item
                  </th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[90px]">
                    Previsto
                  </th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[90px]">
                    Realiz.
                  </th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[70px]">
                    Exec.
                  </th>
                  {visibleMonths.map((m) => (
                    <th
                      key={m}
                      className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[80px]"
                    >
                      {MESES_CURTOS[m]} {String(ano).slice(2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map((group) => (
                  <SectorGroup
                    key={group.setor}
                    group={group}
                    visibleMonths={visibleMonths}
                    ano={ano}
                    onValorChange={handleValorRealizadoChange}
                  />
                ))}

                {/* Totals row */}
                {painelItens.length > 0 && (
                  <tr className="border-t-2 border-slate-300 bg-slate-100">
                    <td className="sticky left-0 z-10 bg-slate-100 py-3 px-4 text-sm font-bold text-slate-900">
                      TOTAL GERAL
                    </td>
                    <td className="text-right py-3 px-3 text-sm font-bold text-slate-700">
                      R$ {formatCurrency(totais.planejado)}
                    </td>
                    <td className="text-right py-3 px-3 text-sm font-bold text-slate-700">
                      R$ {formatCurrency(totais.realizado)}
                    </td>
                    <td className="text-center py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getExecBadgeColor(totais.execucao)}`}
                      >
                        {totais.execucao.toFixed(0)}%
                      </span>
                    </td>
                    {visibleMonths.map((m) => {
                      const mesData = totais.meses?.[m] || { planejado: 0, realizado: 0 };
                      const exec =
                        mesData.planejado > 0 ? (mesData.realizado / mesData.planejado) * 100 : 0;
                      return (
                        <td key={m} className="py-2 px-1.5">
                          <div
                            className={`rounded-md px-2 py-1.5 text-center ${getExecColor(exec, mesData.planejado > 0)}`}
                          >
                            <div className="text-[10px] opacity-70">
                              P: {formatCurrency(mesData.planejado)}
                            </div>
                            <div className="text-xs font-bold">
                              R: {formatCurrency(mesData.realizado)}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}

                {painelItens.length === 0 && (
                  <tr>
                    <td
                      colSpan={4 + visibleMonths.length}
                      className="text-center py-16 text-slate-400"
                    >
                      Nenhum item de orçamento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-500 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
          <span>≤ 80% (dentro)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
          <span>80–100% (atenção)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
          <span>&gt; 100% (estourado)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
          <span>Sem planejado</span>
        </div>
      </div>
    </div>
  );
}

function SectorGroup({
  group,
  visibleMonths,
  ano,
  onValorChange,
}: {
  group: { setor: string; items: any[] };
  visibleMonths: number[];
  ano: number;
  onValorChange: (itemId: number, mes: number, valor: string) => void;
}) {
  const sectorTotals = useMemo(() => {
    let planejado = 0;
    let realizado = 0;
    const meses: Record<number, { planejado: number; realizado: number }> = {};
    for (let m = 0; m < 12; m++) meses[m] = { planejado: 0, realizado: 0 };

    for (const item of group.items) {
      planejado += item.total_planejado;
      realizado += item.total_realizado;
      for (const mesData of item.meses) {
        meses[mesData.mes - 1].planejado += mesData.planejado;
        meses[mesData.mes - 1].realizado += mesData.realizado;
      }
    }
    return {
      planejado,
      realizado,
      execucao: planejado > 0 ? (realizado / planejado) * 100 : 0,
      meses,
    };
  }, [group.items]);

  return (
    <>
      {/* Sector header row */}
      <tr className="bg-blue-50 border-t border-slate-200">
        <td className="sticky left-0 z-10 bg-blue-50 py-2.5 px-4 text-xs font-bold text-blue-700 uppercase tracking-wider">
          {group.setor}
          <span className="ml-2 text-slate-400 font-normal normal-case">
            ({group.items.length} {group.items.length === 1 ? 'item' : 'itens'})
          </span>
        </td>
        <td className="text-right py-2.5 px-3 text-xs font-semibold text-slate-600">
          R$ {formatCurrency(sectorTotals.planejado)}
        </td>
        <td className="text-right py-2.5 px-3 text-xs font-semibold text-slate-600">
          R$ {formatCurrency(sectorTotals.realizado)}
        </td>
        <td className="text-center py-2.5 px-3">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${getExecBadgeColor(sectorTotals.execucao)}`}
          >
            {sectorTotals.execucao.toFixed(0)}%
          </span>
        </td>
        {visibleMonths.map((m) => {
          const mesData = sectorTotals.meses[m];
          const exec = mesData.planejado > 0 ? (mesData.realizado / mesData.planejado) * 100 : 0;
          return (
            <td key={m} className="py-1.5 px-1.5">
              <div
                className={`rounded px-1.5 py-1 text-center ${getExecColor(exec, mesData.planejado > 0)}`}
              >
                <div className="text-[9px] opacity-70">{formatCurrency(mesData.planejado)}</div>
                <div className="text-[10px] font-bold">{formatCurrency(mesData.realizado)}</div>
              </div>
            </td>
          );
        })}
      </tr>

      {/* Item rows */}
      {group.items.map((item: any) => (
        <ItemRow
          key={item.id}
          item={item}
          visibleMonths={visibleMonths}
          ano={ano}
          onValorChange={onValorChange}
        />
      ))}
    </>
  );
}

function ItemRow({
  item,
  visibleMonths,
  ano,
  onValorChange,
}: {
  item: any;
  visibleMonths: number[];
  ano: number;
  onValorChange: (itemId: number, mes: number, valor: string) => void;
}) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleCellClick = (mes: number, currentValue: number) => {
    const cellKey = `${item.id}-${mes}`;
    setEditingCell(cellKey);
    setEditValue(currentValue.toString());
  };

  const handleBlur = (mes: number) => {
    if (editValue !== '') {
      onValorChange(item.id, mes, editValue);
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, mes: number) => {
    if (e.key === 'Enter') {
      handleBlur(mes);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 py-2.5 px-4">
        <div className="flex items-center gap-2">
          <div
            className="w-1 h-8 rounded-full flex-shrink-0"
            style={{ backgroundColor: getCategoryColor(item.categoria_cor) }}
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
              {item.nome}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {item.codigo && <span className="text-[10px] text-slate-400">{item.codigo}</span>}
              {item.categoria_nome && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${getCategoryColor(item.categoria_cor)}15`,
                    color: getCategoryColor(item.categoria_cor),
                  }}
                >
                  {item.categoria_nome}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="text-right py-2.5 px-3 text-sm text-slate-600 font-medium">
        R$ {formatCurrency(item.total_planejado)}
      </td>
      <td className="text-right py-2.5 px-3 text-sm text-slate-600 font-medium">
        R$ {formatCurrency(item.total_realizado)}
      </td>
      <td className="text-center py-2.5 px-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getExecBadgeColor(item.execucao)}`}
        >
          {item.execucao.toFixed(0)}%
        </span>
      </td>

      {visibleMonths.map((m) => {
        const mesData = item.meses?.[m] || { planejado: 0, realizado: 0 };
        const exec = mesData.planejado > 0 ? (mesData.realizado / mesData.planejado) * 100 : 0;
        const hasData = mesData.planejado > 0 || mesData.realizado > 0;
        const cellKey = `${item.id}-${m + 1}`;
        const isEditing = editingCell === cellKey;

        return (
          <td key={m} className="py-1.5 px-1.5">
            {hasData ? (
              <div
                className={`rounded-md px-2 py-1.5 text-center ${isEditing ? 'ring-2 ring-blue-500' : 'cursor-pointer hover:ring-2 hover:ring-blue-300'} ${getExecColor(exec, mesData.planejado > 0)}`}
                onClick={() => !isEditing && handleCellClick(m + 1, mesData.realizado)}
              >
                <div className="text-[10px] opacity-70">P: {formatCurrency(mesData.planejado)}</div>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleBlur(m + 1)}
                    onKeyDown={(e) => handleKeyDown(e, m + 1)}
                    className="h-6 text-xs font-bold text-center p-0 border-0 bg-white/80"
                    autoFocus
                  />
                ) : (
                  <div className="text-xs font-bold">R: {formatCurrency(mesData.realizado)}</div>
                )}
              </div>
            ) : (
              <div
                className={`rounded-md px-2 py-1.5 text-center bg-slate-50 text-slate-300 text-xs border border-slate-100 ${isEditing ? 'ring-2 ring-blue-500' : 'cursor-pointer hover:ring-2 hover:ring-blue-300'}`}
                onClick={() => !isEditing && handleCellClick(m + 1, 0)}
              >
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleBlur(m + 1)}
                    onKeyDown={(e) => handleKeyDown(e, m + 1)}
                    className="h-6 text-xs font-bold text-center p-0 border-0 bg-white"
                    autoFocus
                  />
                ) : (
                  '—'
                )}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}
