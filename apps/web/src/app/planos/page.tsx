'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Target,
  User,
  CheckCircle2,
  Calendar,
  ChevronRight,
  FileText,
  XCircle,
  ArrowLeft,
  Paperclip,
  Link2,
  ListChecks,
  Trash2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, parseISO, isPast } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AppShell } from '@/components/AppShell';

// ─── Helpers ──────────────────────────────────────────────
function formatValue(value: number | null, unit: string | null): string {
  if (value == null) return '—';
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'R$') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function isOverdue(prazoDate: string | null, status: string): boolean {
  if (!prazoDate || status === 'Concluído' || status === 'Cancelado') return false;
  return isPast(parseISO(prazoDate));
}

const KANBAN_COLUMNS = [
  { id: 'Aberto', label: 'A fazer', color: 'bg-slate-500' },
  { id: 'Em andamento', label: 'Em execução', color: 'bg-blue-500' },
  { id: 'Concluído', label: 'Feito', color: 'bg-green-500' },
];

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-indigo-500',
];

function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Main Page ────────────────────────────────────────────
export default function PlanosAcaoPage() {
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  const isKanbanView = selectedIndicator !== null;

  // ─── Queries ──────────────────────────────────────────
  const { data: indicadores, isLoading } = useQuery({
    queryKey: ['planos-indicadores'],
    queryFn: async () => {
      const res = await fetch('/api/planos-acao/indicadores');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: planos, isLoading: isLoadingPlanos } = useQuery({
    queryKey: ['planos-acao', selectedIndicator?.id],
    queryFn: async () => {
      const url = selectedIndicator
        ? `/api/planos-acao?indicadorId=${selectedIndicator.id}`
        : '/api/planos-acao';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
    enabled: isKanbanView,
  });

  const { data: allIndicadores } = useQuery({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const res = await fetch('/api/indicadores');
      return res.json();
    },
  });

  // ─── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (newPlan: any) => {
      const res = await fetch('/api/planos-acao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan),
      });
      if (!res.ok) throw new Error('Failed to create plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
      queryClient.invalidateQueries({ queryKey: ['planos-indicadores'] });
      toast.success('Plano de ação criado!');
      setIsModalOpen(false);
    },
    onError: () => toast.error('Erro ao criar plano de ação'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/planos-acao/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update plan');
      return res.json();
    },
    onSuccess: (updatedPlan) => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
      queryClient.invalidateQueries({ queryKey: ['planos-indicadores'] });
      // Update selected plan in detail sheet
      if (selectedPlan && updatedPlan) {
        setSelectedPlan((prev: any) => ({ ...prev, ...updatedPlan }));
      }
      toast.success('Plano atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar plano'),
  });

  // ─── Computed values ──────────────────────────────────
  const areas = useMemo(() => {
    if (!indicadores) return [];
    const areaMap = new Map<string, string>();
    for (const ind of indicadores) {
      if (ind.setor_nome) areaMap.set(ind.setor_id.toString(), ind.setor_nome);
    }
    return Array.from(areaMap.entries()).map(([id, nome]) => ({ id, nome }));
  }, [indicadores]);

  const stats = useMemo(() => {
    if (!indicadores) return { total: 0, comPlano: 0, semPlano: 0, naMeta: 0, foraMeta: 0 };
    const total = indicadores.length;
    const comPlano = indicadores.filter((i: any) => i.tem_plano).length;
    const semPlano = total - comPlano;
    const naMeta = indicadores.filter((i: any) => i.meta_status === 'meta').length;
    const foraMeta = indicadores.filter((i: any) => i.meta_status === 'fora').length;
    return { total, comPlano, semPlano, naMeta, foraMeta };
  }, [indicadores]);

  const filtered = useMemo(() => {
    if (!indicadores) return [];
    return indicadores.filter((ind: any) => {
      if (search) {
        const q = search.toLowerCase();
        const matchName = ind.nome?.toLowerCase().includes(q);
        const matchResp = ind.responsavel_nome?.toLowerCase().includes(q);
        const matchSetor = ind.setor_nome?.toLowerCase().includes(q);
        if (!matchName && !matchResp && !matchSetor) return false;
      }
      if (filterArea !== 'all' && ind.setor_id?.toString() !== filterArea) return false;
      if (filterStatus === 'com_plano' && !ind.tem_plano) return false;
      if (filterStatus === 'sem_plano' && ind.tem_plano) return false;
      if (filterStatus === 'na_meta' && ind.meta_status !== 'meta') return false;
      if (filterStatus === 'fora_meta' && ind.meta_status !== 'fora') return false;
      return true;
    });
  }, [indicadores, search, filterArea, filterStatus]);

  const plansByStatus = useMemo(() => {
    const grouped: Record<string, any[]> = { Aberto: [], 'Em andamento': [], Concluído: [] };
    if (!planos) return grouped;
    for (const p of planos) {
      const s = p.status || 'Aberto';
      if (grouped[s]) grouped[s].push(p);
      else grouped['Aberto'].push(p);
    }
    return grouped;
  }, [planos]);

  // ─── Handlers ─────────────────────────────────────────
  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const indicatorId = formData.get('indicador_id');
    const indicator = allIndicadores?.find((i: any) => i.id.toString() === indicatorId);
    createMutation.mutate({
      indicador_id: parseInt(indicatorId as string),
      setor_id: indicator?.setor_id,
      problema: formData.get('problema'),
      causa: formData.get('causa'),
      acao_proposta: formData.get('acao'),
      responsavel: formData.get('responsavel'),
      prazo_date: formData.get('prazo'),
      competencia_date: formData.get('data_inicio'),
      prioridade: formData.get('prioridade'),
    });
  };

  const handleDrop = useCallback(
    (planId: string, newStatus: string) => {
      const plan = planos?.find((p: any) => p.id.toString() === planId);
      if (!plan || plan.status === newStatus) return;
      const updateData: any = { status: newStatus, old_status: plan.status };
      if (newStatus === 'Em andamento' && !plan.data_inicio_realizado) {
        updateData.set_data_inicio_realizado = true;
      }
      if (newStatus === 'Concluído' && !plan.data_conclusao_date) {
        updateData.set_data_conclusao = true;
      }
      updateMutation.mutate({ id: parseInt(planId), data: updateData });
    },
    [planos, updateMutation]
  );

  const openCreateForIndicator = () => {
    setSelectedIndicatorId(selectedIndicator ? selectedIndicator.id : null);
    setIsModalOpen(true);
  };

  // ─── RENDER ───────────────────────────────────────────
  return (
    <AppShell>
      {isKanbanView ? (
        <KanbanView
          indicator={selectedIndicator}
          plansByStatus={plansByStatus}
          isLoading={isLoadingPlanos}
          onBack={() => {
            setSelectedIndicator(null);
            setSelectedPlan(null);
          }}
          onOpenCreate={openCreateForIndicator}
          onDrop={handleDrop}
          onOpenDetail={(plan: any) => {
            setSelectedPlan(plan);
            setIsDetailOpen(true);
          }}
        />
      ) : (
        <ListView
          stats={stats}
          areas={areas}
          filtered={filtered}
          isLoading={isLoading}
          search={search}
          onSearchChange={setSearch}
          filterArea={filterArea}
          onFilterAreaChange={setFilterArea}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          onSelectIndicator={setSelectedIndicator}
          onOpenCreate={() => {
            setSelectedIndicatorId(null);
            setIsModalOpen(true);
          }}
        />
      )}

      {/* Detail Sheet */}
      <PlanDetailSheet
        plan={selectedPlan}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={(id: number, data: any) => updateMutation.mutate({ id, data })}
        indicatorName={selectedIndicator?.nome}
      />

      {/* Create Modal */}
      <CreatePlanDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        indicadores={allIndicadores}
        defaultIndicatorId={selectedIndicatorId}
        onSubmit={handleCreateSubmit}
        isPending={createMutation.isPending}
      />
    </AppShell>
  );
}

// ══════════════════════════════════════════════════════════
// LIST VIEW
// ══════════════════════════════════════════════════════════
function ListView({
  stats,
  areas,
  filtered,
  isLoading,
  search,
  onSearchChange,
  filterArea,
  onFilterAreaChange,
  filterStatus,
  onFilterStatusChange,
  onSelectIndicator,
  onOpenCreate,
}: any) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planos de Ação</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie ações corretivas para indicadores fora da meta
          </p>
        </div>
        <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={onOpenCreate}>
          <Plus className="h-4 w-4" /> Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Indicadores"
          value={stats.total}
          color="text-slate-900"
          labelColor="text-slate-500"
        />
        <SummaryCard
          label="Na Meta"
          value={stats.naMeta}
          color="text-green-700"
          labelColor="text-green-600"
          icon={<CheckCircle2 className="h-3 w-3" />}
        />
        <SummaryCard
          label="Fora da Meta"
          value={stats.foraMeta}
          color="text-red-700"
          labelColor="text-red-600"
          icon={<XCircle className="h-3 w-3" />}
        />
        <SummaryCard
          label="Com Plano"
          value={stats.comPlano}
          color="text-blue-700"
          labelColor="text-blue-600"
          icon={<FileText className="h-3 w-3" />}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white rounded-xl border p-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar indicador..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Select value={filterArea} onValueChange={onFilterAreaChange}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
            <SelectValue placeholder="Todas as áreas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {areas.map((a: any) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="com_plano">Com plano de ação</SelectItem>
            <SelectItem value="sem_plano">Sem plano de ação</SelectItem>
            <SelectItem value="na_meta">Na meta</SelectItem>
            <SelectItem value="fora_meta">Fora da meta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))
        ) : filtered?.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum indicador encontrado</p>
            <p className="text-sm mt-1">Tente ajustar os filtros.</p>
          </div>
        ) : (
          filtered.map((ind: any) => (
            <IndicatorRow key={ind.id} ind={ind} onClick={() => onSelectIndicator(ind)} />
          ))
        )}
      </div>

      <div className="flex items-center gap-6 text-xs text-slate-400 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span>Com plano de ação</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span>Sem plano de ação</span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, labelColor, icon }: any) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className={`text-xs font-medium flex items-center gap-1 ${labelColor}`}>
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function IndicatorRow({ ind, onClick }: { ind: any; onClick: () => void }) {
  const metaLabel =
    ind.meta_status === 'meta'
      ? 'Na meta'
      : ind.meta_status === 'fora'
        ? 'Fora da meta'
        : 'Sem dados';
  const metaColorClass =
    ind.meta_status === 'meta'
      ? 'text-green-700 bg-green-50 border-green-200'
      : ind.meta_status === 'fora'
        ? 'text-red-700 bg-red-50 border-red-200'
        : 'text-slate-500 bg-slate-50 border-slate-200';
  const metaIcon =
    ind.meta_status === 'meta' ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : ind.meta_status === 'fora' ? (
      <XCircle className="h-3 w-3" />
    ) : null;
  const dotColor = ind.tem_plano ? 'bg-green-500' : 'bg-slate-300';

  return (
    <div
      className="bg-white rounded-xl border hover:border-blue-300 cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          className="flex-shrink-0"
          title={ind.tem_plano ? 'Possui plano de ação' : 'Sem plano de ação'}
        >
          <div className={`w-3 h-3 rounded-full ${dotColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm truncate">{ind.nome}</h3>
          {ind.setor_nome && <span className="text-xs text-slate-400">{ind.setor_nome}</span>}
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] px-2 py-0.5 h-5 gap-1 font-medium ${metaColorClass}`}
        >
          {metaIcon}
          {metaLabel}
        </Badge>
        {ind.tem_plano && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span>
              {ind.planos_ativos} {ind.planos_ativos === 1 ? 'ativo' : 'ativos'}
            </span>
          </div>
        )}
        <div className="flex-shrink-0 text-right min-w-[70px]">
          <div className="text-sm font-bold text-slate-900">
            {formatValue(ind.ultimo_valor, ind.unidade_medida)}
          </div>
          {ind.meta != null && (
            <div className="text-[10px] text-slate-400">
              Meta: {formatValue(ind.meta, ind.unidade_medida)}
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// KANBAN VIEW
// ══════════════════════════════════════════════════════════
function KanbanView({
  indicator,
  plansByStatus,
  isLoading,
  onBack,
  onOpenCreate,
  onDrop,
  onOpenDetail,
}: any) {
  return (
    <div className="space-y-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{indicator?.nome}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {indicator?.setor_nome && (
              <span className="text-xs text-slate-400">{indicator.setor_nome}</span>
            )}
            {indicator?.meta_status === 'meta' && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200 gap-1"
              >
                <CheckCircle2 className="h-3 w-3" /> Na meta
              </Badge>
            )}
            {indicator?.meta_status === 'fora' && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 bg-red-50 text-red-700 border-red-200 gap-1"
              >
                <XCircle className="h-3 w-3" /> Fora da meta
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={onOpenCreate}>
          <Plus className="h-4 w-4" /> Novo Plano
        </Button>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: '60vh' }}>
        {KANBAN_COLUMNS.map((col) => {
          const colPlans = plansByStatus[col.id] || [];
          return (
            <KanbanColumn
              key={col.id}
              column={col}
              plans={colPlans}
              isLoading={isLoading}
              onDrop={onDrop}
              onOpenCreate={onOpenCreate}
              onOpenDetail={onOpenDetail}
            />
          );
        })}
      </div>
    </div>
  );
}

function KanbanColumn({ column, plans, isLoading, onDrop, onOpenCreate, onOpenDetail }: any) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`bg-slate-100/70 rounded-xl flex flex-col transition-all ${isDragOver ? 'ring-2 ring-blue-300 bg-blue-50/30' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const planId = e.dataTransfer.getData('planId');
        if (planId) onDrop(planId, column.id);
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
          <span className="text-sm font-semibold text-slate-700">{column.label}</span>
          <span className="text-xs bg-white text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
            {plans.length}
          </span>
        </div>
        <button
          className="h-6 w-6 rounded-md hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          onClick={onOpenCreate}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div
        className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto"
        style={{ maxHeight: 'calc(60vh - 56px)' }}
      >
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <p className="text-xs">Nenhum plano aqui</p>
          </div>
        ) : (
          plans.map((plan: any) => (
            <KanbanCard key={plan.id} plan={plan} onOpenDetail={onOpenDetail} />
          ))
        )}
      </div>
    </div>
  );
}

function KanbanCard({ plan, onOpenDetail }: { plan: any; onOpenDetail: (p: any) => void }) {
  const overdue = isOverdue(plan.prazo_date, plan.status);
  const cardTitle = plan.acao_proposta || plan.problema || 'Sem descrição';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('planId', plan.id.toString());
        e.currentTarget.style.opacity = '0.5';
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      className="bg-white rounded-lg border shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onOpenDetail(plan)}
    >
      <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">{cardTitle}</p>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {overdue && (
          <Badge className="text-[10px] px-1.5 py-0 h-5 bg-red-100 text-red-700 border-red-200 gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" /> Atraso
          </Badge>
        )}
        {plan.prioridade && (
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-5 ${
              plan.prioridade === 'Alta'
                ? 'bg-red-50 text-red-600 border-red-200'
                : plan.prioridade === 'Média'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}
          >
            {plan.prioridade}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        {plan.responsavel ? (
          <div
            className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${getAvatarColor(plan.responsavel)}`}
            title={plan.responsavel}
          >
            {getInitials(plan.responsavel)}
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="h-3 w-3 text-slate-400" />
          </div>
        )}
        {plan.prazo_date && (
          <span
            className={`text-[10px] flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}
          >
            <Calendar className="h-2.5 w-2.5" />
            {format(parseISO(plan.prazo_date), 'dd/MM/yy')}
          </span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PLAN DETAIL SHEET
// ══════════════════════════════════════════════════════════
function PlanDetailSheet({
  plan,
  open,
  onOpenChange,
  onUpdate,
  indicatorName,
}: {
  plan: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (id: number, data: any) => void;
  indicatorName?: string;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newCheckItem, setNewCheckItem] = useState('');

  if (!plan) return null;

  const overdue = isOverdue(plan.prazo_date, plan.status);
  const checklist: { text: string; done: boolean }[] = (() => {
    try {
      if (Array.isArray(plan.checklist)) return plan.checklist;
      if (typeof plan.checklist === 'string') return JSON.parse(plan.checklist);
      return [];
    } catch {
      return [];
    }
  })();

  const saveField = (field: string, value: any) => {
    onUpdate(plan.id, { [field]: value });
    setEditingField(null);
  };

  const toggleCheckItem = (index: number) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], done: !updated[index].done };
    onUpdate(plan.id, { checklist: updated });
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const updated = [...checklist, { text: newCheckItem.trim(), done: false }];
    onUpdate(plan.id, { checklist: updated });
    setNewCheckItem('');
  };

  const removeCheckItem = (index: number) => {
    const updated = checklist.filter((_: any, i: number) => i !== index);
    onUpdate(plan.id, { checklist: updated });
  };

  const completedCount = checklist.filter((c: any) => c.done).length;
  const checklistProgress =
    checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-base font-bold text-slate-900 leading-snug pr-8">
              {plan.acao_proposta || plan.problema || 'Plano de Ação'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {overdue && (
              <Badge className="text-[10px] px-1.5 py-0 h-5 bg-red-100 text-red-700 border-red-200 gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Atraso
              </Badge>
            )}
            {plan.prioridade && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-5 ${
                  plan.prioridade === 'Alta'
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : plan.prioridade === 'Média'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}
              >
                {plan.prioridade}
              </Badge>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Responsável */}
          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(plan.responsavel || '')}`}
            >
              {getInitials(plan.responsavel)}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Responsável
              </p>
              <p className="text-sm font-medium text-slate-900">{plan.responsavel || '—'}</p>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-3 space-y-3">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Previsto
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-slate-400">Início</p>
                  <p className="text-sm font-medium text-slate-900">
                    {plan.competencia_date
                      ? format(parseISO(plan.competencia_date), 'dd/MM/yyyy')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Fim</p>
                  <p className="text-sm font-medium text-slate-900">
                    {plan.prazo_date ? format(parseISO(plan.prazo_date), 'dd/MM/yyyy') : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 space-y-3">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Realizado
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-slate-400">Início</p>
                  {editingField === 'data_inicio_realizado' ? (
                    <Input
                      type="date"
                      className="h-7 text-xs"
                      defaultValue={plan.data_inicio_realizado || ''}
                      onBlur={(e) => saveField('data_inicio_realizado', e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-sm font-medium text-slate-900 cursor-pointer hover:text-blue-600"
                      onClick={() => setEditingField('data_inicio_realizado')}
                    >
                      {plan.data_inicio_realizado
                        ? format(parseISO(plan.data_inicio_realizado), 'dd/MM/yyyy')
                        : 'Definir'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Data fim</p>
                  {editingField === 'data_conclusao_date' ? (
                    <Input
                      type="date"
                      className="h-7 text-xs"
                      defaultValue={plan.data_conclusao_date || ''}
                      onBlur={(e) => saveField('data_conclusao_date', e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-sm font-medium text-slate-900 cursor-pointer hover:text-blue-600"
                      onClick={() => setEditingField('data_conclusao_date')}
                    >
                      {plan.data_conclusao_date
                        ? format(parseISO(plan.data_conclusao_date), 'dd/MM/yyyy')
                        : 'Definir'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Indicador */}
          {indicatorName && (
            <>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Link2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                    Indicador
                  </p>
                  <p className="text-sm font-medium text-blue-800">{indicatorName}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Etapa */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Etapa
            </p>
            <Select
              value={plan.status || 'Aberto'}
              onValueChange={(value) =>
                onUpdate(plan.id, { status: value, old_status: plan.status })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aberto">A fazer</SelectItem>
                <SelectItem value="Em andamento">Em execução</SelectItem>
                <SelectItem value="Concluído">Feito</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Descrição */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Descrição
            </p>
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              {plan.problema && (
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Problema:</p>
                  <p className="text-sm text-slate-700">{plan.problema}</p>
                </div>
              )}
              {plan.causa && (
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Causa raiz:</p>
                  <p className="text-sm text-slate-700">{plan.causa}</p>
                </div>
              )}
              {plan.acao_proposta && (
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Ação proposta:</p>
                  <p className="text-sm text-slate-700">{plan.acao_proposta}</p>
                </div>
              )}
              {plan.observacoes && (
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Observações:</p>
                  <p className="text-sm text-slate-700">{plan.observacoes}</p>
                </div>
              )}
              {!plan.problema && !plan.causa && !plan.acao_proposta && !plan.observacoes && (
                <p className="text-sm text-slate-400">Nenhuma descrição adicionada.</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <ListChecks className="h-3 w-3" /> Checklist
              </p>
              {checklist.length > 0 && (
                <span className="text-[10px] text-slate-400">
                  {completedCount}/{checklist.length} ({checklistProgress}%)
                </span>
              )}
            </div>

            {checklist.length > 0 && (
              <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              {checklist.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={() => toggleCheckItem(index)}
                    className="h-4 w-4"
                  />
                  <span
                    className={`text-sm flex-1 ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}
                  >
                    {item.text}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                    onClick={() => removeCheckItem(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Novo item..."
                className="h-8 text-sm"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCheckItem();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={addCheckItem}
                disabled={!newCheckItem.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Anexos */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> Anexos
            </p>
            {plan.evidencia_url ? (
              <a
                href={plan.evidencia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Paperclip className="h-3 w-3" /> Ver anexo
              </a>
            ) : (
              <p className="text-sm text-slate-400">Nenhum anexo adicionado.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ══════════════════════════════════════════════════════════
// CREATE PLAN DIALOG
// ══════════════════════════════════════════════════════════
function CreatePlanDialog({
  open,
  onOpenChange,
  indicadores,
  defaultIndicatorId,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  indicadores: any[];
  defaultIndicatorId: number | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Novo Plano de Ação</DialogTitle>
            <DialogDescription>
              Defina o 5W2H simplificado para tratar o desvio do indicador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-2 col-span-2">
              <Label>Indicador Relacionado</Label>
              <Select
                name="indicador_id"
                defaultValue={defaultIndicatorId?.toString() || undefined}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o indicador" />
                </SelectTrigger>
                <SelectContent>
                  {indicadores?.map((i: any) => (
                    <SelectItem key={i.id} value={i.id.toString()}>
                      {i.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 col-span-2">
              <Label>O quê (Problema Identificado)</Label>
              <Input name="problema" placeholder="Descreva o desvio ou problema" required />
            </div>
            <div className="grid gap-2 col-span-2">
              <Label>Por quê (Causa Raiz)</Label>
              <Textarea name="causa" placeholder="Análise da causa raiz" required />
            </div>
            <div className="grid gap-2 col-span-2">
              <Label>Como (Ação Proposta)</Label>
              <Textarea name="acao" placeholder="Ação detalhada para resolução" required />
            </div>
            <div className="grid gap-2">
              <Label>Quem (Responsável)</Label>
              <Input name="responsavel" placeholder="Nome do responsável" required />
            </div>
            <div className="grid gap-2">
              <Label>Data Início Previsto</Label>
              <Input name="data_inicio" type="date" required />
            </div>
            <div className="grid gap-2">
              <Label>Prazo Final</Label>
              <Input name="prazo" type="date" required />
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
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
              {isPending ? 'Criando...' : 'Criar Plano de Ação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
