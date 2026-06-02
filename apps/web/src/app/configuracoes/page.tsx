'use client';

import React, { useState } from 'react';
import {
  Users,
  Shield,
  Building2,
  ScrollText,
  Palette,
  Search,
  Plus,
  Mail,
  Edit,
  Save,
  Check,
  X,
  Info,
  Clock,
  User,
  Eye,
  Wrench,
  Plug,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
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
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';

import UsuariosTab from './tabs/UsuariosTab';
import PerfisTab from './tabs/PerfisTab';
import IntegracoesTab from './tabs/IntegracoesTab';

// ─── Setores Tab ────────────────────────────────────────────
function SetoresTab() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSetor, setEditingSetor] = useState<any>(null);
  const [nome, setNome] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [email, setEmail] = useState('');
  const queryClient = useQueryClient();

  const { data: setores, isLoading } = useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const res = await fetch('/api/setores');
      const json = await res.json();
      return Array.isArray(json) ? json : json.setores || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/setores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      toast.success('Setor salvo com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao salvar setor'),
  });

  const openNew = () => {
    setEditingSetor(null);
    setNome('');
    setResponsavel('');
    setEmail('');
    setModalOpen(true);
  };

  const openEdit = (setor: any) => {
    setEditingSetor(setor);
    setNome(setor.nome);
    setResponsavel(setor.responsavel || '');
    setEmail(setor.email_responsavel || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSetor(null);
  };

  const handleSave = () => {
    mutation.mutate({
      id: editingSetor?.id,
      nome,
      responsavel,
      email_responsavel: email,
      is_ativo: true,
    });
  };

  const filtered = (setores || []).filter(
    (s: any) =>
      s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.responsavel?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar setor..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Novo Setor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : !filtered?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    Nenhum setor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                (filtered || []).map((setor: any) => (
                  <TableRow key={setor.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        {setor.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{setor.responsavel || '-'}</span>
                        <span className="text-xs text-slate-400">
                          {setor.email_responsavel || ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={setor.is_ativo ? 'default' : 'secondary'}>
                        {setor.is_ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(setor)}
                        className="gap-1 text-xs"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingSetor ? 'Editar Setor' : 'Novo Setor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Setor *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: UTI Adulto"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="responsavel@hospital.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!nome.trim() || mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Logs Tab ───────────────────────────────────────────────
function formatDateString(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.replace('T', ' ').replace('Z', '').split(/[- :]/);
  if (parts.length < 5) return dateStr;
  const day = parts[2]?.substring(0, 2) || '';
  const month = parts[1] || '';
  const year = parts[0] || '';
  const hour = parts[3]?.substring(0, 2) || '00';
  const minute = parts[4]?.substring(0, 2) || '00';
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function LogsTab() {
  const [filterEntidade, setFilterEntidade] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['logs', filterEntidade],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterEntidade && filterEntidade !== 'todos') params.set('entidade', filterEntidade);
      params.set('limit', '100');
      const res = await fetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const acaoBadge = (acao: string) => {
    const colors: Record<string, string> = {
      Criação: 'bg-green-50 text-green-700',
      Atualização: 'bg-blue-50 text-blue-700',
      Exclusão: 'bg-red-50 text-red-700',
      Login: 'bg-purple-50 text-purple-700',
    };
    return (
      <Badge variant="outline" className={colors[acao] || 'bg-slate-50 text-slate-600'}>
        {acao}
      </Badge>
    );
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <Select value={filterEntidade} onValueChange={setFilterEntidade}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar por tipo..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Indicador">Indicadores</SelectItem>
            <SelectItem value="Resultado">Resultados</SelectItem>
            <SelectItem value="Plano de Ação">Planos de Ação</SelectItem>
            <SelectItem value="Setor">Setores</SelectItem>
            <SelectItem value="Usuário">Usuários</SelectItem>
            <SelectItem value="Configurações">Configurações</SelectItem>
            <SelectItem value="Integração">Integrações</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    Carregando logs...
                  </TableCell>
                </TableRow>
              ) : !data?.logs?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                    <ScrollText className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-sm">Nenhum registro de atividade ainda.</p>
                    <p className="text-xs mt-1">
                      As ações dos usuários aparecerão aqui conforme o sistema for usado.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                data.logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span suppressHydrationWarning>{formatDateString(log.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <span className="text-sm">
                          {log.user_display_name || log.user_name || 'Sistema'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{acaoBadge(log.acao)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{log.entidade}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400 max-w-[200px] truncate block">
                        {log.detalhes || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Sistema Tab ────────────────────────────────────────────
function SistemaTab() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['config-sistema'],
    queryFn: async () => {
      const res = await fetch('/api/configuracoes');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const [nomeSistema, setNomeSistema] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [emailSuporte, setEmailSuporte] = useState('');
  const [rodapeTexto, setRodapeTexto] = useState('');
  const [corPrimaria, setCorPrimaria] = useState('#2563eb');
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    if (config && !loaded) {
      setNomeSistema(config.nome_sistema || '');
      setSubtitulo(config.subtitulo || '');
      setEmailSuporte(config.email_suporte || '');
      setRodapeTexto(config.rodape_texto || '');
      setCorPrimaria(config.cor_primaria || '#2563eb');
      setLoaded(true);
    }
  }, [config, loaded]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-sistema'] });
      toast.success('Configurações salvas!');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const handleSave = () => {
    saveMutation.mutate({
      nome_sistema: nomeSistema,
      subtitulo,
      email_suporte: emailSuporte,
      rodape_texto: rodapeTexto,
      cor_primaria: corPrimaria,
    });
  };

  if (isLoading)
    return <div className="py-12 text-center text-slate-400">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações Gerais</CardTitle>
          <CardDescription>Nome e identidade do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Sistema</Label>
              <Input value={nomeSistema} onChange={(e) => setNomeSistema(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Subtítulo</Label>
              <Input value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>E-mail de Suporte</Label>
              <Input
                type="email"
                value={emailSuporte}
                onChange={(e) => setEmailSuporte(e.target.value)}
                placeholder="suporte@hospital.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cor Primária</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="h-9 w-14 rounded border border-slate-200 cursor-pointer"
                />
                <Input
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-28 font-mono text-sm"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Texto do Rodapé</Label>
            <Input value={rodapeTexto} onChange={(e) => setRodapeTexto(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function ConfiguracoesPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações</h1>
          <p className="text-slate-500">
            Gerencie usuários, perfis, integrações e configurações do sistema.
          </p>
        </div>

        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
            <TabsTrigger value="usuarios" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span>Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="perfis" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span>Perfis</span>
            </TabsTrigger>
            <TabsTrigger value="setores" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              <span>Setores</span>
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
              <span className="sm:hidden">MV</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <ScrollText className="h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
            <TabsTrigger value="sistema" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <Palette className="h-4 w-4" />
              <span>Sistema</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios">
            <UsuariosTab />
          </TabsContent>
          <TabsContent value="perfis">
            <PerfisTab />
          </TabsContent>
          <TabsContent value="setores">
            <SetoresTab />
          </TabsContent>
          <TabsContent value="integracoes">
            <IntegracoesTab />
          </TabsContent>
          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>
          <TabsContent value="sistema">
            <SistemaTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
