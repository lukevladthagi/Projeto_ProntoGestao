'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Mail,
  Edit,
  UserPlus,
  Shield,
  Eye,
  Wrench,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { PERFIS } from './perfisData';

export default function UsuariosTab() {
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editPerfil, setEditPerfil] = useState('');
  const [editSetor, setEditSetor] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);
  // create form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPerfil, setNewPerfil] = useState('Operador');
  const [newSetor, setNewSetor] = useState('');
  const queryClient = useQueryClient();

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios-config'],
    queryFn: async () => {
      const res = await fetch('/api/usuarios');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      return Array.isArray(json) ? json : json.users || json.usuarios || [];
    },
  });

  const { data: setores } = useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const res = await fetch('/api/setores');
      const json = await res.json();
      return Array.isArray(json) ? json : json.setores || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-config'] });
      toast.success('Perfil atualizado!');
      setEditModal(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao atualizar perfil'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: async (newUser) => {
      // Set profile for the new user
      if (newPerfil) {
        await fetch('/api/perfil', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: newUser.id,
            perfil: newPerfil,
            setor_id: newSetor ? parseInt(newSetor) : null,
          }),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['usuarios-config'] });
      toast.success('Usuário criado com sucesso!');
      setCreateModal(false);
      resetCreateForm();
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao criar usuário'),
  });

  const resetCreateForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewPerfil('Operador');
    setNewSetor('');
  };

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setEditPerfil(user.perfil || '');
    setEditSetor(user.setor_id?.toString() || '');
    setEditAtivo(user.is_ativo !== false);
    setEditModal(true);
  };

  const handleSaveProfile = () => {
    if (!selectedUser) return;
    updateMutation.mutate({
      user_id: selectedUser.id,
      perfil: editPerfil,
      setor_id: editSetor && editSetor !== 'geral' ? parseInt(editSetor) : null,
      is_ativo: editAtivo,
    });
  };

  const handleCreateUser = () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    createMutation.mutate({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      password: newPassword,
    });
  };

  const filtered = (usuarios || []).filter(
    (u: any) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const perfilBadge = (perfil: string) => {
    const p = PERFIS.find((pp) => pp.value === perfil);
    if (!p) return <Badge variant="outline">Sem Perfil</Badge>;
    return (
      <Badge variant="outline" className={`gap-1 ${p.color}`}>
        <p.icon className="h-3 w-3" />
        {p.label}
      </Badge>
    );
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar usuário ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => setCreateModal(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : !filtered?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name || 'Sem nome'}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{perfilBadge(user.perfil)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {user.setor_nome || 'Acesso Geral'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_ativo !== false ? 'default' : 'secondary'}>
                        {user.is_ativo !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(user)}
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

      {/* Edit Profile Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Perfil de Acesso</DialogTitle>
            <DialogDescription>
              {selectedUser?.name} — {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Perfil *</Label>
              <Select value={editPerfil} onValueChange={setEditPerfil}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {(PERFIS || []).map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <p.icon className="h-4 w-4" />
                        <span>{p.label}</span>
                        <span className="text-xs text-slate-400">— {p.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Setor Vinculado</Label>
              <Select value={editSetor} onValueChange={setEditSetor}>
                <SelectTrigger>
                  <SelectValue placeholder="Acesso Geral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Acesso Geral (todos os setores)</SelectItem>
                  {(setores || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                Gestor e Operador ficam limitados ao setor selecionado.
              </p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Usuário ativo</p>
                <p className="text-xs text-slate-400">Desativar impede o login no sistema</p>
              </div>
              <button
                type="button"
                onClick={() => setEditAtivo(!editAtivo)}
                className="focus:outline-none"
              >
                {editAtivo ? (
                  <ToggleRight className="h-7 w-7 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-7 w-7 text-slate-300" />
                )}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={!editPerfil || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog
        open={createModal}
        onOpenChange={(open) => {
          setCreateModal(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá acesso ao sistema com as credenciais definidas abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome completo *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="João Silva"
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="joao@hospital.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Senha *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Perfil de acesso</Label>
                <Select value={newPerfil} onValueChange={setNewPerfil}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(PERFIS || []).map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <p.icon className="h-4 w-4" />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Setor</Label>
                <Select value={newSetor} onValueChange={setNewSetor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Acesso Geral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Acesso Geral</SelectItem>
                    {(setores || []).map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateModal(false);
                resetCreateForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
