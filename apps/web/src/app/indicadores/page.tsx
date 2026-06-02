'use client';

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Filter,
  MoreVertical,
  Upload,
  Download,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

export default function IndicadoresPage() {
  const [search, setSearch] = useState('');

  const { data: indicadores, isLoading } = useQuery({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const res = await fetch('/api/indicadores');
      return res.json();
    },
  });

  const filteredIndicadores = indicadores?.filter(
    (i: any) =>
      i.nome.toLowerCase().includes(search.toLowerCase()) ||
      i.setor_nome?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Indicadores</h1>
            <p className="text-slate-500">
              Defina metas e acompanhe o desempenho por nível de gestão.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                window.open('/api/indicadores/exportar', '_blank');
              }}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Link href="/indicadores/importar">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Importar
              </Button>
            </Link>
            <Link href="/indicadores/novo">
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Novo Indicador
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar por nome ou setor..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? [1, 2, 3].map((i) => <Card key={i} className="h-48 animate-pulse bg-slate-100" />)
            : filteredIndicadores?.map((indicador: any) => {
                const filhosCount =
                  indicadores?.filter((i: any) => i.indicador_pai_id === indicador.id).length || 0;
                return (
                  <Link key={indicador.id} href={`/indicadores/${indicador.id}`} className="block">
                    <Card
                      className={`group hover:border-blue-400 transition-all cursor-pointer h-full ${
                        indicador.is_pai
                          ? 'border-l-4 border-l-blue-500'
                          : indicador.indicador_pai_id
                            ? 'border-l-4 border-l-amber-400'
                            : ''
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold">
                              {indicador.nivel_gestao}
                            </Badge>
                            {indicador.is_pai && (
                              <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">
                                <Layers className="h-3 w-3 mr-1" />
                                Pai · {indicador.tipo_calculo || 'Soma'} · {filhosCount}{' '}
                                {filhosCount === 1 ? 'filho' : 'filhos'}
                              </Badge>
                            )}
                            {indicador.indicador_pai_id && (
                              <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100">
                                <ChevronRight className="h-3 w-3 mr-1" />
                                Filho de {indicador.indicador_pai_nome}
                              </Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                          {indicador.nome}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {indicador.setor_nome}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end justify-between mt-4">
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500">Meta</span>
                            <div className="text-xl font-bold text-slate-800">
                              {indicador.meta}
                              {indicador.unidade_medida}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="text-xs text-slate-500">Sentido</span>
                            <div className="flex items-center gap-1 text-xs font-medium">
                              {indicador.sentido === 'Quanto maior melhor' ? (
                                <ArrowUpRight className="h-3 w-3 text-green-500" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 text-red-500" />
                              )}
                              {indicador.sentido}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-blue-600 font-medium">
                          Ver detalhes e histórico
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
        </div>
      </div>
    </AppShell>
  );
}
