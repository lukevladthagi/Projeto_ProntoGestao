'use client';

import React, { useState } from 'react';
import {
  Database,
  Plus,
  Edit,
  Trash2,
  Plug,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Link2,
  Zap,
  Info,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { toast } from 'sonner';

export default function IntegracoesTab() {
  const [configModal, setConfigModal] = useState(false);
  const [mapModal, setMapModal] = useState(false);
  const [editingIntegracao, setEditingIntegracao] = useState<any>(null);
  const [editingMap, setEditingMap] = useState<any>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Form state for integration
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('api');
  const [urlBase, setUrlBase] = useState('');
  const [token, setToken] = useState('');
  const [usuarioMv, setUsuarioMv] = useState('');
  const [senhaMv, setSenhaMv] = useState('');
  const [isAtivo, setIsAtivo] = useState(false);
  const [intervalo, setIntervalo] = useState('60');

  // Form state for mapping
  const [mapIntegracaoId, setMapIntegracaoId] = useState('');
  const [mapIndicadorId, setMapIndicadorId] = useState('');
  const [mapCodigoMv, setMapCodigoMv] = useState('');
  const [mapQueryMv, setMapQueryMv] = useState('');
  const [mapCampoValor, setMapCampoValor] = useState('valor');
  const [mapCampoData, setMapCampoData] = useState('data');
  const [mapAtivo, setMapAtivo] = useState(true);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['integracoes-mv'],
    queryFn: async () => {
      const res = await fetch('/api/integracoes-mv');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      return {
        integracoes: Array.isArray(json?.integracoes) ? json.integracoes : [],
        mapeamentos: Array.isArray(json?.mapeamentos) ? json.mapeamentos : [],
      };
    },
  });

  const { data: indicadores } = useQuery({
    queryKey: ['indicadores-list'],
    queryFn: async () => {
      const res = await fetch('/api/indicadores');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      return Array.isArray(json) ? json : json.indicadores || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/integracoes-mv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes-mv'] });
      toast.success('Salvo com sucesso!');
      setConfigModal(false);
      setMapModal(false);
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/integracoes-mv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes-mv'] });
      toast.success('Removido!');
    },
  });

  const openNewIntegracao = () => {
    setEditingIntegracao(null);
    setNome('');
    setDescricao('');
    setTipo('api');
    setUrlBase('');
    setToken('');
    setUsuarioMv('');
    setSenhaMv('');
    setIsAtivo(false);
    setIntervalo('60');
    setTestResult(null);
    setConfigModal(true);
  };

  const openEditIntegracao = (integ: any) => {
    setEditingIntegracao(integ);
    setNome(integ.nome || '');
    setDescricao(integ.descricao || '');
    setTipo(integ.tipo || 'api');
    setUrlBase(integ.url_base || '');
    setToken(integ.token || '');
    setUsuarioMv(integ.usuario_mv || '');
    setSenhaMv(integ.senha_mv || '');
    setIsAtivo(integ.is_ativo || false);
    setIntervalo((integ.intervalo_minutos || 60).toString());
    setTestResult(null);
    setConfigModal(true);
  };

  const handleSaveIntegracao = () => {
    if (!nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    saveMutation.mutate({
      action: 'save_integracao',
      id: editingIntegracao?.id,
      nome: nome.trim(),
      descricao: descricao.trim(),
      tipo,
      url_base: urlBase.trim(),
      token: token.trim(),
      usuario_mv: usuarioMv.trim(),
      senha_mv: senhaMv.trim(),
      is_ativo: isAtivo,
      intervalo_minutos: parseInt(intervalo) || 60,
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/integracoes-mv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'testar_conexao',
          url_base: urlBase.trim(),
          token: token.trim(),
          usuario_mv: usuarioMv.trim(),
        }),
      });
      const result = await res.json();
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: 'Erro ao testar conexão' });
    } finally {
      setTesting(false);
    }
  };

  const openNewMapping = () => {
    setEditingMap(null);
    setMapIntegracaoId(data?.integracoes?.[0]?.id?.toString() || '');
    setMapIndicadorId('');
    setMapCodigoMv('');
    setMapQueryMv('');
    setMapCampoValor('valor');
    setMapCampoData('data');
    setMapAtivo(true);
    setMapModal(true);
  };

  const openEditMapping = (map: any) => {
    setEditingMap(map);
    setMapIntegracaoId(map.integracao_id?.toString() || '');
    setMapIndicadorId(map.indicador_id?.toString() || '');
    setMapCodigoMv(map.codigo_mv || '');
    setMapQueryMv(map.query_mv || '');
    setMapCampoValor(map.campo_valor || 'valor');
    setMapCampoData(map.campo_data || 'data');
    setMapAtivo(map.is_ativo !== false);
    setMapModal(true);
  };

  const handleSaveMapping = () => {
    if (!mapIntegracaoId || !mapIndicadorId || !mapCodigoMv.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    saveMutation.mutate({
      action: 'save_mapeamento',
      id: editingMap?.id,
      integracao_id: parseInt(mapIntegracaoId),
      indicador_id: parseInt(mapIndicadorId),
      codigo_mv: mapCodigoMv.trim(),
      query_mv: mapQueryMv.trim(),
      campo_valor: mapCampoValor,
      campo_data: mapCampoData,
      is_ativo: mapAtivo,
    });
  };

  const integracoes = data?.integracoes || [];
  const mapeamentos = data?.mapeamentos || [];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 flex items-start gap-3">
        <Info className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-purple-800">Integração com MV Sistemas</p>
          <p className="text-xs text-purple-600 mt-1">
            Configure a conexão com o MV para puxar dados automaticamente. Os indicadores mapeados
            serão alimentados sem necessidade de lançamento manual.
          </p>
        </div>
      </div>

      {/* Connections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Conexões</CardTitle>
            <CardDescription>Configure as conexões com instâncias do MV.</CardDescription>
          </div>
          <Button
            onClick={openNewIntegracao}
            size="sm"
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Nova Conexão
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Carregando...</div>
          ) : !integracoes.length ? (
            <div className="py-12 text-center">
              <Database className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm text-slate-400">Nenhuma conexão configurada.</p>
              <p className="text-xs text-slate-300 mt-1">
                Clique em &quot;Nova Conexão&quot; para configurar o acesso ao MV.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {(integracoes || []).map((integ: any) => {
                const mapCount = (mapeamentos || []).filter(
                  (m: any) => m.integracao_id === integ.id
                ).length;
                return (
                  <div
                    key={integ.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${integ.is_ativo ? 'bg-green-50' : 'bg-slate-100'}`}
                      >
                        <Plug
                          className={`h-5 w-5 ${integ.is_ativo ? 'text-green-600' : 'text-slate-400'}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold">{integ.nome}</h4>
                          <Badge
                            variant={integ.is_ativo ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {integ.is_ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {integ.tipo === 'api'
                            ? 'API REST'
                            : integ.tipo === 'db'
                              ? 'Banco de Dados'
                              : integ.tipo}
                          {integ.url_base ? ` • ${integ.url_base}` : ''}
                          {` • ${mapCount} indicador(es) mapeado(s)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditIntegracao(integ)}
                        className="text-xs gap-1"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 text-xs"
                        onClick={() => {
                          if (confirm('Remover essa conexão e todos os mapeamentos vinculados?')) {
                            deleteMutation.mutate({ action: 'delete_integracao', id: integ.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mappings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Mapeamentos de Indicadores</CardTitle>
            <CardDescription>Vincule indicadores do sistema aos dados do MV.</CardDescription>
          </div>
          {integracoes.length > 0 && (
            <Button onClick={openNewMapping} size="sm" variant="outline" className="gap-2">
              <Link2 className="h-4 w-4" />
              Novo Mapeamento
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead>Código MV</TableHead>
                <TableHead>Conexão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!(mapeamentos || []).length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    {integracoes.length === 0
                      ? 'Configure uma conexão primeiro para mapear indicadores.'
                      : 'Nenhum indicador mapeado. Clique em "Novo Mapeamento" para começar.'}
                  </TableCell>
                </TableRow>
              ) : (
                (mapeamentos || []).map((map: any) => {
                  const integ = (integracoes || []).find((i: any) => i.id === map.integracao_id);
                  return (
                    <TableRow key={map.id}>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {map.indicador_nome || `ID ${map.indicador_id}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {map.codigo_mv}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">{integ?.nome || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={map.is_ativo ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {map.is_ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditMapping(map)}
                          className="text-xs gap-1"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 text-xs"
                          onClick={() => {
                            if (confirm('Remover este mapeamento?')) {
                              deleteMutation.mutate({ action: 'delete_mapeamento', id: map.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Connection Config Modal */}
      <Dialog open={configModal} onOpenChange={setConfigModal}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIntegracao ? 'Editar Conexão MV' : 'Nova Conexão MV'}</DialogTitle>
            <DialogDescription>Configure os dados de acesso à instância do MV.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome da conexão *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="MV Produção"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API REST</SelectItem>
                    <SelectItem value="db">Banco de Dados (view/query)</SelectItem>
                    <SelectItem value="arquivo">Arquivo / CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ambiente de produção do MV Soul"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{tipo === 'db' ? 'String de conexão (JDBC/URL)' : 'URL Base da API'}</Label>
              <Input
                value={urlBase}
                onChange={(e) => setUrlBase(e.target.value)}
                placeholder={
                  tipo === 'db' ? 'jdbc:oracle:thin:@host:1521:sid' : 'https://mv.hospital.com/api'
                }
              />
            </div>
            {tipo === 'api' && (
              <div className="space-y-1.5">
                <Label>Token / API Key</Label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Bearer token de autenticação"
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Usuário {tipo === 'db' ? 'do banco' : 'da API'}</Label>
                <Input
                  value={usuarioMv}
                  onChange={(e) => setUsuarioMv(e.target.value)}
                  placeholder="usuario_mv"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={senhaMv}
                  onChange={(e) => setSenhaMv(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Intervalo de sincronização (min)</Label>
                <Input
                  type="number"
                  value={intervalo}
                  onChange={(e) => setIntervalo(e.target.value)}
                  placeholder="60"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={isAtivo} onCheckedChange={setIsAtivo} />
                <Label>Conexão ativa</Label>
              </div>
            </div>

            {/* Test Connection */}
            {tipo === 'api' && urlBase && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="gap-2 w-full"
                >
                  {testing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {testing ? 'Testando...' : 'Testar Conexão'}
                </Button>
                {testResult && (
                  <div
                    className={`p-3 rounded-lg flex items-center gap-2 text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {testResult.message}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveIntegracao}
              disabled={saveMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Conexão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Modal */}
      <Dialog open={mapModal} onOpenChange={setMapModal}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingMap ? 'Editar Mapeamento' : 'Novo Mapeamento'}</DialogTitle>
            <DialogDescription>Vincule um indicador do sistema a um dado do MV.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Conexão MV *</Label>
              <Select value={mapIntegracaoId} onValueChange={setMapIntegracaoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conexão" />
                </SelectTrigger>
                <SelectContent>
                  {(integracoes || []).map((i: any) => (
                    <SelectItem key={i.id} value={i.id.toString()}>
                      {i.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Indicador do Sistema *</Label>
              <Select value={mapIndicadorId} onValueChange={setMapIndicadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o indicador" />
                </SelectTrigger>
                <SelectContent>
                  {(indicadores || []).map((ind: any) => (
                    <SelectItem key={ind.id} value={ind.id.toString()}>
                      {ind.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Código / Identificador no MV *</Label>
              <Input
                value={mapCodigoMv}
                onChange={(e) => setMapCodigoMv(e.target.value)}
                placeholder="Ex: IND_TAXA_OCUP_UTI, P_INT_001"
              />
              <p className="text-xs text-slate-400">Código do indicador ou endpoint na API do MV</p>
            </div>
            <div className="space-y-1.5">
              <Label>Query / Endpoint (opcional)</Label>
              <Textarea
                value={mapQueryMv}
                onChange={(e) => setMapQueryMv(e.target.value)}
                placeholder="SELECT valor, data_ref FROM vw_indicadores WHERE cd_indicador = :codigo"
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-slate-400">
                Query SQL (para tipo banco) ou path da API (para tipo REST)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campo do valor</Label>
                <Input
                  value={mapCampoValor}
                  onChange={(e) => setMapCampoValor(e.target.value)}
                  placeholder="valor"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Campo da data</Label>
                <Input
                  value={mapCampoData}
                  onChange={(e) => setMapCampoData(e.target.value)}
                  placeholder="data"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={mapAtivo} onCheckedChange={setMapAtivo} />
              <Label>Mapeamento ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveMapping}
              disabled={saveMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Mapeamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
