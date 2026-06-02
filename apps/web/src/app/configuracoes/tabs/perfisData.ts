import { Shield, Wrench, Users, Edit, Eye } from 'lucide-react';

export const PERFIS = [
  {
    value: 'Administrador',
    label: 'Administrador',
    desc: 'Acesso total ao sistema',
    icon: Shield,
    color: 'text-red-600 bg-red-50',
  },
  {
    value: 'TI',
    label: 'TI',
    desc: 'Configurações técnicas e sistema',
    icon: Wrench,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    value: 'Gestão',
    label: 'Gestão',
    desc: 'Acesso amplo a indicadores e relatórios de todos os setores',
    icon: Users,
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    value: 'Gestor',
    label: 'Gestor de Setor',
    desc: 'Gerencia indicadores do seu setor',
    icon: Users,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    value: 'Operador',
    label: 'Operador',
    desc: 'Lança resultados e acompanha planos',
    icon: Edit,
    color: 'text-green-600 bg-green-50',
  },
  {
    value: 'Visualizador',
    label: 'Visualizador',
    desc: 'Apenas consulta, sem edição',
    icon: Eye,
    color: 'text-slate-600 bg-slate-50',
  },
];

export const PERMISSIONS: Record<string, { allow: string[]; deny: string[] }> = {
  Administrador: {
    allow: [
      'Acesso total ao sistema',
      'Gerenciar usuários e perfis',
      'Configurações do sistema',
      'Todos os indicadores e setores',
      'Relatórios e exportações',
      'Planos de ação',
      'Integrações',
    ],
    deny: [],
  },
  TI: {
    allow: [
      'Configurações do sistema',
      'Gerenciar usuários e perfis',
      'Logs de atividade',
      'Gerenciar setores',
      'Relatórios',
      'Integrações MV',
    ],
    deny: ['Alterar indicadores', 'Lançar resultados'],
  },
  Gestão: {
    allow: [
      'Todos os indicadores e setores',
      'Lançar resultados',
      'Criar planos de ação',
      'Relatórios e exportações',
      'Definir metas',
      'Configurações do sistema',
    ],
    deny: ['Gerenciar usuários e perfis', 'Integrações MV'],
  },
  Gestor: {
    allow: [
      'Indicadores do seu setor',
      'Lançar resultados',
      'Criar planos de ação',
      'Relatórios do setor',
      'Definir metas',
    ],
    deny: ['Configurações do sistema', 'Gerenciar outros setores', 'Gerenciar perfis de acesso'],
  },
  Operador: {
    allow: ['Lançar resultados', 'Acompanhar planos de ação', 'Visualizar indicadores do setor'],
    deny: ['Criar indicadores', 'Configurações', 'Gerenciar usuários', 'Relatórios avançados'],
  },
  Visualizador: {
    allow: ['Visualizar dashboard', 'Visualizar indicadores', 'Visualizar relatórios'],
    deny: ['Editar qualquer dado', 'Lançar resultados', 'Criar planos', 'Configurações'],
  },
};
