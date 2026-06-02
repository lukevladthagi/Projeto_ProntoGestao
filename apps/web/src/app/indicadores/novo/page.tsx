'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Layers,
  Target,
  ChevronRight,
  X,
  Plus,
  Building2,
  UserPlus,
  CalendarDays,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';

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

const UNIDADES = [
  '%',
  'R$',
  'Unidades',
  'Horas',
  'Dias',
  'Litros',
  'Kg',
  'Pacientes',
  'Atendimentos',
  'Leitos',
  'Ocorrências',
];

const TAGS_SUGERIDAS = [
  'QUICK WIN',
  'ESTRATÉGICO',
  'OPERACIONAL',
  'ASSISTENCIAL',
  'FINANCEIRO',
  'QUALIDADE',
  'SEGURANÇA',
  'SATISFAÇÃO',
];

type MetaMensal = {
  mes: number;
  valor_meta: number | null;
  sem_meta: boolean;
};

type MetasAno = {
  ano: number;
  metas: MetaMensal[];
};

function createEmptyMetas(): MetaMensal[] {
  return Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    valor_meta: null,
    sem_meta: false,
  }));
}

function calcularAcumulado(metas: MetaMensal[], index: number, tipo: string): string {
  const ateAqui = metas.slice(0, index + 1).filter((m) => !m.sem_meta && m.valor_meta !== null);
  if (ateAqui.length === 0) return '-';

  const valores = ateAqui.map((m) => m.valor_meta as number);

  switch (tipo) {
    case 'Soma':
    case 'Acumulado': {
      const sum = valores.reduce((a, b) => a + b, 0);
      return sum.toFixed(2);
    }
    case 'Média': {
      const avg = valores.reduce((a, b) => a + b, 0) / valores.length;
      return avg.toFixed(2);
    }
    case 'Último valor':
      return (valores[valores.length - 1] ?? 0).toFixed(2);
    default: {
      const defaultSum = valores.reduce((a, b) => a + b, 0);
      return defaultSum.toFixed(2);
    }
  }
}

export default function NovoIndicadorPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [formulaCalculo, setFormulaCalculo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [setorId, setSetorId] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [sentido, setSentido] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState('');
  const [tipoAcumulado, setTipoAcumulado] = useState('');
  const [anoInicio, setAnoInicio] = useState('');
  const [meta, setMeta] = useState('');
  const [nivelGestao, setNivelGestao] = useState('');
  const [frequencia, setFrequencia] = useState('');

  // Parent/child
  const [tipoIndicador, setTipoIndicador] = useState('independente');
  const [selectedPaiId, setSelectedPaiId] = useState('');
  const [tipoCalculo, setTipoCalculo] = useState('');

  // Tags - free form
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Sections
  const [opcoesOpen, setOpcoesOpen] = useState(true);

  // Metas mensais
  const [metasAnuais, setMetasAnuais] = useState<MetasAno[]>([]);
  const [metasModalOpen, setMetasModalOpen] = useState(false);
  const [metasModalAno, setMetasModalAno] = useState<number | null>(null);
  const [metasModalData, setMetasModalData] = useState<MetaMensal[]>(createEmptyMetas());
  const [novoAnoInput, setNovoAnoInput] = useState('');
  const [replicarValor, setReplicarValor] = useState('');

  // Inline creation modals
  const [newSetorModal, setNewSetorModal] = useState(false);
  const [newSetorNome, setNewSetorNome] = useState('');
  const [newSetorResponsavel, setNewSetorResponsavel] = useState('');
  const [newSetorEmail, setNewSetorEmail] = useState('');

  const [newResponsavelModal, setNewResponsavelModal] = useState(false);
  const [newResponsavelNome, setNewResponsavelNome] = useState('');
  const [newResponsavelEmail, setNewResponsavelEmail] = useState('');
  const [newResponsavelSenha, setNewResponsavelSenha] = useState('');

  // Years
  const [years, setYears] = useState<number[]>([]);
  const [currentYear, setCurrentYear] = useState(2026);
  useEffect(() => {
    const yr = new Date().getFullYear();
    setYears(Array.from({ length: 10 }, (_, i) => yr - 5 + i));
    setCurrentYear(yr);
  }, []);

  // Data queries
  const { data: setores } = useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const res = await fetch('/api/setores');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return Array.isArray(json) ? json : json.setores || [];
    },
  });

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const res = await fetch('/api/usuarios');
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.users || json.usuarios || [];
    },
  });

  const { data: indicadores } = useQuery({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const res = await fetch('/api/indicadores');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return Array.isArray(json) ? json : json.indicadores || [];
    },
  });

  const indicadoresPai = indicadores?.filter((i: any) => i.is_pai) || [];

  // Inline create setor
  const createSetorMutation = useMutation({
    mutationFn: async (data: { nome: string; responsavel: string; email_responsavel: string }) => {
      const res = await fetch('/api/setores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: (newSetor: any) => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      setSetorId(newSetor.id.toString());
      setNewSetorModal(false);
      setNewSetorNome('');
      setNewSetorResponsavel('');
      setNewSetorEmail('');
      toast.success('Setor criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar setor');
    },
  });

  // Inline create responsável (user)
  const createResponsavelMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const signupRes = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!signupRes.ok) throw new Error('Failed to create');
      return signupRes.json();
    },
    onSuccess: (newUser: any) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setResponsavelId(newUser.id);
      setNewResponsavelModal(false);
      setNewResponsavelNome('');
      setNewResponsavelEmail('');
      setNewResponsavelSenha('');
      toast.success('Usuário criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar usuário');
    },
  });

  // Main save mutation
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/indicadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: async (newIndicador: any) => {
      // Save metas mensais if any configured
      if (metasAnuais.length > 0) {
        const allMetas: any[] = [];
        for (const anoData of metasAnuais) {
          for (const m of anoData.metas) {
            allMetas.push({
              ano: anoData.ano,
              mes: m.mes,
              valor_meta: m.valor_meta,
              sem_meta: m.sem_meta,
            });
          }
        }
        try {
          const metasRes = await fetch('/api/metas-mensais', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ indicador_id: newIndicador.id, metas: allMetas }),
          });
          if (!metasRes.ok) {
            console.error('Failed to save metas mensais');
          }
        } catch (err) {
          console.error('Error saving metas mensais:', err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['indicadores'] });
      toast.success('Indicador criado com sucesso!');
      router.push('/indicadores');
    },
    onError: () => {
      toast.error('Erro ao criar indicador');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate meta geral from monthly targets or use manual
    let metaGeral = meta ? parseFloat(meta) : null;
    if (metasAnuais.length > 0 && !meta) {
      // Use the first year's average as meta geral if no manual meta set
      const firstYear = metasAnuais[0];
      const validMetas = firstYear.metas.filter((m) => !m.sem_meta && m.valor_meta !== null);
      if (validMetas.length > 0) {
        metaGeral = validMetas.reduce((a, b) => a + (b.valor_meta ?? 0), 0) / validMetas.length;
      }
    }

    mutation.mutate({
      nome,
      formula_calculo: formulaCalculo || null,
      descricao: descricao || null,
      setor_id: setorId ? parseInt(setorId) : null,
      responsavel_id: responsavelId || null,
      sentido: sentido || null,
      unidade_medida: unidadeMedida || null,
      tipo_acumulado: tipoAcumulado || null,
      ano_inicio: anoInicio ? parseInt(anoInicio) : null,
      meta: metaGeral,
      nivel_gestao: nivelGestao || null,
      frequencia: frequencia || null,
      is_pai: tipoIndicador === 'pai',
      indicador_pai_id: tipoIndicador === 'filho' && selectedPaiId ? parseInt(selectedPaiId) : null,
      tipo_calculo: tipoIndicador === 'pai' ? tipoCalculo : null,
      tags: selectedTags.length > 0 ? selectedTags : null,
    });
  };

  // Tag helpers
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const trimmed = tagInput.trim().toUpperCase();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  const availableSuggestions = TAGS_SUGERIDAS.filter((t) => !selectedTags.includes(t));

  // Metas mensais helpers
  const openMetasModal = (ano?: number) => {
    if (ano !== undefined) {
      const existing = metasAnuais.find((m) => m.ano === ano);
      if (existing) {
        setMetasModalAno(ano);
        setMetasModalData(JSON.parse(JSON.stringify(existing.metas)));
      }
    } else {
      // New year
      const usedYears = metasAnuais.map((m) => m.ano);
      let defaultYear = currentYear;
      while (usedYears.includes(defaultYear)) {
        defaultYear++;
      }
      setMetasModalAno(null);
      setNovoAnoInput(defaultYear.toString());
      setMetasModalData(createEmptyMetas());
    }
    setReplicarValor('');
    setMetasModalOpen(true);
  };

  const saveMetasModal = () => {
    const ano = metasModalAno ?? parseInt(novoAnoInput);
    if (!ano || isNaN(ano)) {
      toast.error('Informe um ano válido');
      return;
    }

    const existingIndex = metasAnuais.findIndex((m) => m.ano === ano);
    const newEntry: MetasAno = { ano, metas: metasModalData };

    if (existingIndex >= 0) {
      const updated = [...metasAnuais];
      updated[existingIndex] = newEntry;
      setMetasAnuais(updated);
    } else {
      setMetasAnuais([...metasAnuais, newEntry].sort((a, b) => a.ano - b.ano));
    }

    setMetasModalOpen(false);
    toast.success(`Metas de ${ano} configuradas!`);
  };

  const removeAno = (ano: number) => {
    setMetasAnuais((prev) => prev.filter((m) => m.ano !== ano));
    toast.success(`Metas de ${ano} removidas`);
  };

  const handleReplicar = () => {
    const val = parseFloat(replicarValor);
    if (isNaN(val)) return;
    setMetasModalData((prev) => prev.map((m) => (m.sem_meta ? m : { ...m, valor_meta: val })));
    setReplicarValor('');
  };

  const updateMetaMes = (mes: number, field: 'valor_meta' | 'sem_meta', value: any) => {
    setMetasModalData((prev) =>
      prev.map((m) => {
        if (m.mes !== mes) return m;
        if (field === 'sem_meta') {
          return { ...m, sem_meta: value, valor_meta: value ? null : m.valor_meta };
        }
        return { ...m, [field]: value };
      })
    );
  };

  // Summary helpers
  const metasConfiguradas = metasAnuais.length > 0;
  const totalMesesComMeta = metasAnuais.reduce(
    (acc, a) => acc + a.metas.filter((m) => !m.sem_meta && m.valor_meta !== null).length,
    0
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push('/indicadores')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Cadastro Indicador</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Indicador */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Tipo de Indicador
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTipoIndicador('independente');
                  setSelectedPaiId('');
                  setTipoCalculo('');
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${tipoIndicador === 'independente' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
              >
                <Target className="h-5 w-5" />
                <span className="text-sm font-medium">Independente</span>
                <span className="text-[10px] text-center leading-tight opacity-70">
                  Indicador simples
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoIndicador('pai');
                  setSelectedPaiId('');
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${tipoIndicador === 'pai' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
              >
                <Layers className="h-5 w-5" />
                <span className="text-sm font-medium">Pai</span>
                <span className="text-[10px] text-center leading-tight opacity-70">
                  Consolida filhos
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoIndicador('filho');
                  setTipoCalculo('');
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${tipoIndicador === 'filho' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
              >
                <ChevronRight className="h-5 w-5" />
                <span className="text-sm font-medium">Filho</span>
                <span className="text-[10px] text-center leading-tight opacity-70">
                  Alimenta um pai
                </span>
              </button>
            </div>

            {tipoIndicador === 'pai' && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <Label className="text-blue-800 text-sm font-medium">Tipo de Cálculo *</Label>
                <Select value={tipoCalculo} onValueChange={setTipoCalculo} required>
                  <SelectTrigger className="bg-white mt-1.5">
                    <SelectValue placeholder="Como consolidar os filhos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Soma">Soma</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Média Ponderada">Média Ponderada</SelectItem>
                    <SelectItem value="Mínimo">Mínimo</SelectItem>
                    <SelectItem value="Máximo">Máximo</SelectItem>
                    <SelectItem value="Contagem">Contagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipoIndicador === 'filho' && (
              <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <Label className="text-amber-800 text-sm font-medium">Indicador Pai *</Label>
                {indicadoresPai.length === 0 ? (
                  <p className="text-sm text-amber-700 mt-1">
                    Nenhum indicador pai cadastrado ainda.
                  </p>
                ) : (
                  <Select value={selectedPaiId} onValueChange={setSelectedPaiId} required>
                    <SelectTrigger className="bg-white mt-1.5">
                      <SelectValue placeholder="Selecione o indicador pai" />
                    </SelectTrigger>
                    <SelectContent>
                      {indicadoresPai.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.nome} — {p.tipo_calculo || 'sem cálculo'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Dados Principais */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Dados do Indicador
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-sm text-slate-700">Nome do Indicador *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Taxa de Ocupação de Leitos"
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-sm text-slate-700">Fórmula de Cálculo</Label>
                <Input
                  value={formulaCalculo}
                  onChange={(e) => setFormulaCalculo(e.target.value)}
                  placeholder="Ex: (Leitos Ocupados / Total de Leitos) x 100"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-sm text-slate-700">Descrição</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o objetivo e contexto deste indicador..."
                  rows={3}
                />
              </div>

              {/* Setor with inline create */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-700">Área / Setor *</Label>
                  <button
                    type="button"
                    onClick={() => setNewSetorModal(true)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="h-3 w-3" />
                    Novo
                  </button>
                </div>
                <Select value={setorId} onValueChange={setSetorId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsável with inline create */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-700">Responsável *</Label>
                  <button
                    type="button"
                    onClick={() => setNewResponsavelModal(true)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="h-3 w-3" />
                    Novo
                  </button>
                </div>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios?.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">Polaridade *</Label>
                <Select value={sentido} onValueChange={setSentido} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quanto maior melhor">↑ Quanto maior melhor</SelectItem>
                    <SelectItem value="Quanto menor melhor">↓ Quanto menor melhor</SelectItem>
                    <SelectItem value="Igual à meta">= Igual à meta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">Unidade de Medida *</Label>
                <Select value={unidadeMedida} onValueChange={setUnidadeMedida} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">Tipo Acumulado *</Label>
                <Select value={tipoAcumulado} onValueChange={setTipoAcumulado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Soma">Soma</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Último valor">Último valor</SelectItem>
                    <SelectItem value="Acumulado">Acumulado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">Início do Indicador *</Label>
                <Select value={anoInicio} onValueChange={setAnoInicio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ano" />
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

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">Nível de Gestão</Label>
                <Select value={nivelGestao} onValueChange={setNivelGestao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N0">N0 - Estratégico</SelectItem>
                    <SelectItem value="N1">N1 - Tático</SelectItem>
                    <SelectItem value="N2">N2 - Operacional</SelectItem>
                    <SelectItem value="N3">N3 - Execução</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">Frequência</Label>
                <Select value={frequencia} onValueChange={setFrequencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diária">Diária</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* METAS Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Metas
              </h2>
              <button
                type="button"
                onClick={() => openMetasModal()}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Ano
              </button>
            </div>

            {!metasConfiguradas ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-dashed border-slate-300">
                  <CalendarDays className="h-8 w-8 text-slate-300" />
                  <div>
                    <p className="text-sm text-slate-500 font-medium">
                      Nenhuma meta mensal configurada
                    </p>
                    <p className="text-xs text-slate-400">
                      Clique em &quot;Novo Ano&quot; para definir metas por mês, ou use o campo
                      abaixo para uma meta geral.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-700">Meta Geral (valor fixo)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={meta}
                    onChange={(e) => setMeta(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {metasAnuais.map((anoData) => {
                  const metasValidas = anoData.metas.filter(
                    (m) => !m.sem_meta && m.valor_meta !== null
                  );
                  const mesesSemMeta = anoData.metas.filter((m) => m.sem_meta).length;
                  return (
                    <div
                      key={anoData.ano}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm">
                          {anoData.ano}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {metasValidas.length} {metasValidas.length === 1 ? 'mês' : 'meses'} com
                            meta
                          </p>
                          <p className="text-xs text-slate-400">
                            {mesesSemMeta > 0
                              ? `${mesesSemMeta} sem meta`
                              : 'Todos os meses configurados'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openMetasModal(anoData.ano)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeAno(anoData.ano)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Opções Adicionais - Tags */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpcoesOpen(!opcoesOpen)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
            >
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Opções Adicionais
              </h2>
              {opcoesOpen ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {opcoesOpen && (
              <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-5">
                <div className="space-y-3">
                  <Label className="text-sm text-slate-700">Tags</Label>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag}
                          className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 text-xs cursor-pointer"
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      ref={tagInputRef}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Digite uma tag e pressione Enter..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomTag}
                      disabled={!tagInput.trim()}
                      className="gap-1 h-9 px-3"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                  {availableSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-slate-400 font-medium">Sugestões rápidas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {availableSuggestions.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-all"
                          >
                            <Plus className="h-2.5 w-2.5" />
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/indicadores')}
              className="px-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              CANCELAR
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending || (tipoIndicador === 'filho' && indicadoresPai.length === 0)
              }
              className="px-8 bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? 'SALVANDO...' : 'SALVAR'}
            </Button>
          </div>
        </form>
      </div>

      {/* Modal: Metas Mensais */}
      <Dialog open={metasModalOpen} onOpenChange={setMetasModalOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              {metasModalAno ? `Metas Mensais — ${metasModalAno}` : 'Configurar Metas Mensais'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Year selector for new */}
            {metasModalAno === null && (
              <div className="space-y-1.5">
                <Label className="text-sm">Ano *</Label>
                <Input
                  type="number"
                  value={novoAnoInput}
                  onChange={(e) => setNovoAnoInput(e.target.value)}
                  placeholder="Ex: 2026"
                  min={2020}
                  max={2040}
                />
              </div>
            )}

            {/* Replicate value */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-xs text-blue-700 font-medium whitespace-nowrap">
                Replicar valor:
              </span>
              <Input
                type="number"
                step="0.01"
                value={replicarValor}
                onChange={(e) => setReplicarValor(e.target.value)}
                placeholder="0.00"
                className="h-8 text-xs flex-1 bg-white"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleReplicar}
                disabled={!replicarValor}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 px-3"
              >
                Aplicar a todos
              </Button>
            </div>

            {/* Monthly table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2.5 px-3 font-medium text-slate-600 text-xs uppercase">
                      Mês
                    </th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-600 text-xs uppercase">
                      Valor Mensal
                    </th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-600 text-xs uppercase">
                      Acumulado
                    </th>
                    <th className="text-center py-2.5 px-3 font-medium text-slate-600 text-xs uppercase">
                      Sem Meta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metasModalData.map((m, idx) => {
                    const acumuladoValue = calcularAcumulado(
                      metasModalData,
                      idx,
                      tipoAcumulado || 'Soma'
                    );
                    return (
                      <tr
                        key={m.mes}
                        className={`border-b border-slate-100 ${m.sem_meta ? 'bg-slate-50 opacity-60' : ''}`}
                      >
                        <td className="py-2 px-3 font-medium text-slate-700 text-xs">
                          {MESES[m.mes - 1]}
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={m.valor_meta ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              updateMetaMes(m.mes, 'valor_meta', val);
                            }}
                            disabled={m.sem_meta}
                            className="h-8 text-xs w-full"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-2 px-3 text-xs text-slate-500 font-mono">
                          {acumuladoValue}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Checkbox
                            checked={m.sem_meta}
                            onCheckedChange={(checked) =>
                              updateMetaMes(m.mes, 'sem_meta', !!checked)
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMetasModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={saveMetasModal}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Salvar Metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Setor */}
      <Dialog open={newSetorModal} onOpenChange={setNewSetorModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Novo Setor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Nome do Setor *</Label>
              <Input
                value={newSetorNome}
                onChange={(e) => setNewSetorNome(e.target.value)}
                placeholder="Ex: UTI Adulto"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Responsável</Label>
              <Input
                value={newSetorResponsavel}
                onChange={(e) => setNewSetorResponsavel(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">E-mail do Responsável</Label>
              <Input
                type="email"
                value={newSetorEmail}
                onChange={(e) => setNewSetorEmail(e.target.value)}
                placeholder="responsavel@hospital.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewSetorModal(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!newSetorNome.trim() || createSetorMutation.isPending}
              onClick={() =>
                createSetorMutation.mutate({
                  nome: newSetorNome.trim(),
                  responsavel: newSetorResponsavel.trim() || '',
                  email_responsavel: newSetorEmail.trim() || '',
                })
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createSetorMutation.isPending ? 'Criando...' : 'Criar Setor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Responsável */}
      <Dialog open={newResponsavelModal} onOpenChange={setNewResponsavelModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Nome Completo *</Label>
              <Input
                value={newResponsavelNome}
                onChange={(e) => setNewResponsavelNome(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">E-mail *</Label>
              <Input
                type="email"
                value={newResponsavelEmail}
                onChange={(e) => setNewResponsavelEmail(e.target.value)}
                placeholder="usuario@hospital.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Senha *</Label>
              <Input
                type="password"
                value={newResponsavelSenha}
                onChange={(e) => setNewResponsavelSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewResponsavelModal(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                !newResponsavelNome.trim() ||
                !newResponsavelEmail.trim() ||
                newResponsavelSenha.length < 8 ||
                createResponsavelMutation.isPending
              }
              onClick={() =>
                createResponsavelMutation.mutate({
                  name: newResponsavelNome.trim(),
                  email: newResponsavelEmail.trim(),
                  password: newResponsavelSenha,
                })
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createResponsavelMutation.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
