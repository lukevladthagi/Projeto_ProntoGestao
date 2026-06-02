'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { toast } from 'sonner';
import Papa from 'papaparse';
import {
  Upload,
  Download,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  AlertCircle,
  Link as LinkIcon,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import PainelOrcamento from './PainelOrcamento';

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

export default function OrcamentoPage() {
  const queryClient = useQueryClient();
  const [currentYear, setCurrentYear] = useState(2025);
  const [viewMode, setViewMode] = useState<'gestao' | 'painel'>('gestao');

  const [ano, setAno] = useState(2025);
  const [setorFilter, setSetorFilter] = useState<string>('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    setAno(new Date().getFullYear());
  }, []);

  // Fetch data
  const { data: resumo, isLoading: loadingResumo } = useQuery({
    queryKey: ['orcamento-resumo', ano],
    queryFn: async () => {
      const res = await fetch(`/api/orcamento/resumo?ano=${ano}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
  });

  const { data: itensData, isLoading: loadingItens } = useQuery({
    queryKey: ['orcamento-itens', ano, setorFilter, categoriaFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ ano: ano.toString() });
      if (setorFilter) params.append('setor_id', setorFilter);
      if (categoriaFilter) params.append('categoria_id', categoriaFilter);
      const res = await fetch(`/api/orcamento?${params}`);
      if (!res.ok) throw new Error('Failed to fetch items');
      return res.json();
    },
  });

  const { data: setoresData } = useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const res = await fetch('/api/setores');
      if (!res.ok) throw new Error('Failed to fetch setores');
      return res.json();
    },
  });

  const { data: categoriasData } = useQuery({
    queryKey: ['categorias-orcamento'],
    queryFn: async () => {
      const res = await fetch('/api/orcamento/categorias');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
  });

  const { data: indicadoresData } = useQuery({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const res = await fetch('/api/indicadores');
      if (!res.ok) throw new Error('Failed to fetch indicators');
      return res.json();
    },
  });

  const itens = useMemo(() => itensData?.itens || [], [itensData?.itens]);
  const setores = setoresData?.setores || [];
  const categorias = categoriasData?.categorias || [];
  const indicadores = indicadoresData?.indicadores || [];

  // Filter items by search
  const filteredItens = useMemo(() => {
    if (!searchTerm) return itens;
    const term = searchTerm.toLowerCase();
    return itens.filter(
      (item: any) =>
        item.nome?.toLowerCase().includes(term) ||
        item.codigo?.toLowerCase().includes(term) ||
        item.descricao?.toLowerCase().includes(term)
    );
  }, [itens, searchTerm]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/orcamento/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento-itens'] });
      queryClient.invalidateQueries({ queryKey: ['orcamento-resumo'] });
      toast.success('Item excluído com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir item');
    },
  });

  // Export to CSV
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ ano: ano.toString() });
      if (setorFilter) params.append('setor_id', setorFilter);
      const res = await fetch(`/api/orcamento/export?${params}`);
      if (!res.ok) throw new Error('Failed to export');
      const { data } = await res.json();

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orcamento_${ano}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Orçamento exportado com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar orçamento');
    }
  };

  // Import from CSV
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const res = await fetch('/api/orcamento/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: results.data }),
          });

          if (!res.ok) throw new Error('Failed to import');
          const result = await res.json();

          queryClient.invalidateQueries({ queryKey: ['orcamento-itens'] });
          queryClient.invalidateQueries({ queryKey: ['orcamento-resumo'] });

          toast.success(`${result.imported} itens importados. ${result.errors} erros.`);
          setImportDialogOpen(false);
        } catch (error) {
          toast.error('Erro ao importar orçamento');
        }
      },
    });
  };

  const totais = resumo?.totais || { total_planejado: 0, total_realizado: 0 };
  const porSetor = resumo?.porSetor || [];
  const porCategoria = resumo?.porCategoria || [];
  const evolucaoMensal = resumo?.evolucaoMensal || [];

  const execucaoPercentual =
    totais.total_planejado > 0 ? (totais.total_realizado / totais.total_planejado) * 100 : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Orçamento</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestão de orçamento por setor</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-200 rounded-lg p-1 mr-2">
              <button
                type="button"
                onClick={() => setViewMode('gestao')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'gestao'
                    ? 'bg-white shadow text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Table2 className="w-4 h-4" />
                Gestão
              </button>
              <button
                type="button"
                onClick={() => setViewMode('painel')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'painel'
                    ? 'bg-white shadow text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Painel
              </button>
            </div>

            {viewMode === 'gestao' && (
              <>
                <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                  <SelectTrigger className="w-32">
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
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Importar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Importar Orçamento via CSV</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Envie um arquivo CSV com as colunas: nome, setor_id, categoria_id, codigo,
                        descricao, ano, planejado_1 a planejado_12
                      </p>
                      <Input type="file" accept=".csv" onChange={handleImport} />
                    </div>
                  </DialogContent>
                </Dialog>
                <ItemDialog
                  open={itemDialogOpen}
                  onOpenChange={setItemDialogOpen}
                  item={editingItem}
                  setores={setores}
                  categorias={categorias}
                  indicadores={indicadores}
                  ano={ano}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['orcamento-itens'] });
                    queryClient.invalidateQueries({ queryKey: ['orcamento-resumo'] });
                    setItemDialogOpen(false);
                    setEditingItem(null);
                  }}
                />
                <Button
                  onClick={() => {
                    setEditingItem(null);
                    setItemDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Item
                </Button>
              </>
            )}
          </div>
        </div>

        {viewMode === 'painel' ? (
          <PainelOrcamento />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Planejado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingResumo ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      R${' '}
                      {totais.total_planejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Realizado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingResumo ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      R${' '}
                      {totais.total_realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Execução</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingResumo ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {execucaoPercentual.toFixed(1)}%
                      </div>
                      {execucaoPercentual >= 100 ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : execucaoPercentual >= 90 ? (
                        <TrendingUp className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Saldo</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingResumo ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div
                      className={`text-2xl font-bold ${totais.total_planejado - totais.total_realizado >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      R${' '}
                      {(totais.total_planejado - totais.total_realizado).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Orçamento por Setor</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingResumo ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={porSetor}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="setor" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) =>
                            `R$ ${parseFloat(value).toLocaleString('pt-BR')}`
                          }
                        />
                        <Legend />
                        <Bar dataKey="total_planejado" fill="#3b82f6" name="Planejado" />
                        <Bar dataKey="total_realizado" fill="#10b981" name="Realizado" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Orçamento por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingResumo ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={porCategoria}
                          dataKey="total_planejado"
                          nameKey="categoria"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {porCategoria.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.cor || '#3b82f6'} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) =>
                            `R$ ${parseFloat(value).toLocaleString('pt-BR')}`
                          }
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Evolução Mensal - Planejado vs Realizado</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingResumo ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={evolucaoMensal}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" tickFormatter={(mes) => MESES[mes - 1]?.slice(0, 3)} />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) =>
                            `R$ ${parseFloat(value).toLocaleString('pt-BR')}`
                          }
                          labelFormatter={(mes) => MESES[mes - 1]}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="total_planejado"
                          stroke="#3b82f6"
                          name="Planejado"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="total_realizado"
                          stroke="#10b981"
                          name="Realizado"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Filters and Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Itens do Orçamento</CardTitle>
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <Select
                      value={setorFilter || 'all'}
                      onValueChange={(v) => setSetorFilter(v === 'all' ? '' : v)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Todos os setores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os setores</SelectItem>
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
                      <SelectTrigger className="w-48">
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingItens ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                            Código
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                            Nome
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                            Setor
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                            Categoria
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                            Indicador
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                            Planejado
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                            Realizado
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                            Execução
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItens.map((item: any) => {
                          const execucao =
                            item.total_planejado > 0
                              ? (item.total_realizado / item.total_planejado) * 100
                              : 0;

                          return (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {item.codigo || '-'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">{item.nome}</div>
                                {item.descricao && (
                                  <div className="text-xs text-gray-500 mt-1">{item.descricao}</div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">{item.setor_nome}</td>
                              <td className="py-3 px-4">
                                {item.categoria_nome && (
                                  <Badge style={{ backgroundColor: item.categoria_cor }}>
                                    {item.categoria_nome}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {item.indicador_nome ? (
                                  <div className="flex items-center gap-1">
                                    <LinkIcon className="w-3 h-3 text-blue-500" />
                                    <span className="text-xs">{item.indicador_nome}</span>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                                R${' '}
                                {parseFloat(item.total_planejado).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                                R${' '}
                                {parseFloat(item.total_realizado).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Badge
                                  variant={
                                    execucao >= 100
                                      ? 'destructive'
                                      : execucao >= 90
                                        ? 'default'
                                        : 'secondary'
                                  }
                                >
                                  {execucao.toFixed(1)}%
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingItem(item);
                                      setItemDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Tem certeza que deseja excluir este item?')) {
                                        deleteMutation.mutate(item.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredItens.length === 0 && (
                      <div className="text-center py-12 text-gray-500">Nenhum item encontrado</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ItemDialog({
  open,
  onOpenChange,
  item,
  setores,
  categorias,
  indicadores,
  ano,
  onSuccess,
}: any) {
  const [formData, setFormData] = useState({
    setor_id: '',
    categoria_id: '',
    indicador_id: '',
    nome: '',
    descricao: '',
    ano: ano,
    tipo_unidade: 'dinheiro',
  });

  const [valoresMensais, setValoresMensais] = useState<any[]>(
    Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      valor_planejado: 0,
      valor_realizado: 0,
    }))
  );

  const [valorReplicar, setValorReplicar] = useState('');

  const { data: itemDetails } = useQuery({
    queryKey: ['orcamento-item', item?.id],
    queryFn: async () => {
      const res = await fetch(`/api/orcamento/${item.id}`);
      if (!res.ok) throw new Error('Failed to fetch item');
      return res.json();
    },
    enabled: !!item?.id,
  });

  // Update form when item or open state changes
  useEffect(() => {
    if (open && item) {
      setFormData({
        setor_id: item.setor_id?.toString() || '',
        categoria_id: item.categoria_id?.toString() || '',
        indicador_id: item.indicador_id?.toString() || '',
        nome: item.nome || '',
        descricao: item.descricao || '',
        ano: item.ano || ano,
        tipo_unidade: item.tipo_unidade || 'dinheiro',
      });
    } else if (open && !item) {
      setFormData({
        setor_id: '',
        categoria_id: '',
        indicador_id: '',
        nome: '',
        descricao: '',
        ano: ano,
        tipo_unidade: 'dinheiro',
      });
      setValoresMensais(
        Array.from({ length: 12 }, (_, i) => ({
          mes: i + 1,
          valor_planejado: 0,
          valor_realizado: 0,
        }))
      );
    }
  }, [open, item, ano]);

  // Update monthly values when details load
  useEffect(() => {
    if (itemDetails?.valores) {
      const valores = Array.from({ length: 12 }, (_, i) => {
        const mesData = itemDetails.valores.find((v: any) => v.mes === i + 1);
        return {
          mes: i + 1,
          ano: itemDetails.item.ano,
          valor_planejado: mesData?.valor_planejado || 0,
          valor_realizado: mesData?.valor_realizado || 0,
        };
      });
      setValoresMensais(valores);
    }
  }, [itemDetails]);

  const formatValue = (value: number) => {
    if (formData.tipo_unidade === 'dinheiro') {
      return `R$ ${value.toFixed(2)}`;
    } else if (formData.tipo_unidade === 'percentual') {
      return `${value.toFixed(2)}%`;
    } else {
      return value.toString();
    }
  };

  const getPlaceholder = () => {
    if (formData.tipo_unidade === 'dinheiro') {
      return 'Valor em R$';
    } else if (formData.tipo_unidade === 'percentual') {
      return 'Valor em %';
    } else {
      return 'Quantidade';
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = item?.id ? `/api/orcamento/${item.id}` : '/api/orcamento';
      const method = item?.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save item');
      return res.json();
    },
    onSuccess: () => {
      toast.success(item?.id ? 'Item atualizado' : 'Item criado');
      onSuccess();
    },
    onError: () => {
      toast.error('Erro ao salvar item');
    },
  });

  const handleReplicarPlanejado = () => {
    const valor = parseFloat(valorReplicar) || 0;
    const newValores = valoresMensais.map((v) => ({
      ...v,
      valor_planejado: valor,
    }));
    setValoresMensais(newValores);
    toast.success(`Valor ${formatValue(valor)} replicado para todos os meses`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      setor_id: parseInt(formData.setor_id),
      categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
      indicador_id: formData.indicador_id ? parseInt(formData.indicador_id) : null,
      valores_mensais: valoresMensais,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {item?.codigo && (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              <span className="font-medium">Código:</span>
              <Badge variant="outline">{item.codigo}</Badge>
            </div>
          )}
          {!item && (
            <p className="text-xs text-slate-400">
              O código será gerado automaticamente (ex: ORC-001)
            </p>
          )}

          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Setor *</Label>
              <Select
                value={formData.setor_id}
                onValueChange={(v) => setFormData({ ...formData, setor_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Input
                type="number"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>Tipo de Unidade *</Label>
              <Select
                value={formData.tipo_unidade}
                onValueChange={(v) => setFormData({ ...formData, tipo_unidade: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">💰 Dinheiro (R$)</SelectItem>
                  <SelectItem value="quantidade">📊 Quantidade</SelectItem>
                  <SelectItem value="percentual">📈 Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.categoria_id || 'none'}
                onValueChange={(v) =>
                  setFormData({ ...formData, categoria_id: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categorias.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Indicador Vinculado</Label>
              <Select
                value={formData.indicador_id || 'none'}
                onValueChange={(v) =>
                  setFormData({ ...formData, indicador_id: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {indicadores.map((ind: any) => (
                    <SelectItem key={ind.id} value={ind.id.toString()}>
                      {ind.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Valores Mensais</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder={getPlaceholder()}
                  value={valorReplicar}
                  onChange={(e) => setValorReplicar(e.target.value)}
                  className="w-40"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReplicarPlanejado}
                  disabled={!valorReplicar}
                >
                  Replicar para todos
                </Button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {valoresMensais.map((valor, idx) => (
                <div key={idx} className="border rounded p-3 bg-gray-50">
                  <div className="font-medium text-sm mb-2">{MESES[idx]}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Planejado</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={getPlaceholder()}
                        value={valor.valor_planejado}
                        onChange={(e) => {
                          const newValores = [...valoresMensais];
                          newValores[idx].valor_planejado = parseFloat(e.target.value) || 0;
                          setValoresMensais(newValores);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Realizado</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={getPlaceholder()}
                        value={valor.valor_realizado}
                        onChange={(e) => {
                          const newValores = [...valoresMensais];
                          newValores[idx].valor_realizado = parseFloat(e.target.value) || 0;
                          setValoresMensais(newValores);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
