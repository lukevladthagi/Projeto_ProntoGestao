'use client';

import React from 'react';
import { Check, X, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PERFIS, PERMISSIONS } from './perfisData';

function PermissionsList({ perfil }: { perfil: string }) {
  const p = PERMISSIONS[perfil] || { allow: [], deny: [] };
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.allow.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-green-50 text-green-700"
        >
          <Check className="h-3 w-3" />
          {item}
        </span>
      ))}
      {p.deny.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-red-50 text-red-400"
        >
          <X className="h-3 w-3" />
          {item}
        </span>
      ))}
    </div>
  );
}

export default function PerfisTab() {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">Perfis de Acesso do Sistema</p>
          <p className="text-xs text-blue-600 mt-1">
            Os perfis definem o que cada usuário pode ver e fazer no sistema. Atribua perfis na aba
            &quot;Usuários&quot;.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {(PERFIS || []).map((p) => (
          <Card key={p.value} className="overflow-hidden">
            <div className="flex items-start gap-4 p-5">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${p.color}`}>
                <p.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-800">{p.label}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{p.desc}</p>
                <div className="mt-3">
                  <PermissionsList perfil={p.value} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
