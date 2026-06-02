'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Info,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

const TEMPLATE_COLUMNS = [
  { key: 'nome', label: 'Nome', required: true, example: 'Taxa de Ocupação' },
  { key: 'descricao', label: 'Descrição', required: false, example: 'Taxa de ocupação dos leitos' },
  { key: 'setor', label: 'Setor', required: true, example: 'UTI Adulto' },
  {
    key: 'responsavel',
    label: 'Responsável',
    required: false,
    example: 'João Silva (nome ou e-mail do usuário)',
  },
  { key: 'tipo', label: 'Tipo', required: false, example: 'Quantitativo' },
  { key: 'frequencia', label: 'Frequência', required: false, example: 'Mensal' },
  { key: 'meta', label: 'Meta', required: false, example: '85' },
  { key: 'sentido', label: 'Sentido', required: false, example: 'Quanto maior melhor' },
  { key: 'unidade_medida', label: 'Unidade de Medida', required: false, example: '%' },
  { key: 'nivel_gestao', label: 'Nível de Gestão', required: false, example: 'Operacional' },
  { key: 'tipo_acumulado', label: 'Tipo Acumulado', required: false, example: 'Média' },
  { key: 'tags', label: 'Tags', required: false, example: 'qualidade;segurança (separadas por ;)' },
];

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  total: number;
  newSectors: string[];
  details: string[];
  error?: string;
}

export default function ImportarIndicadoresPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    if (typeof window === 'undefined') return;

    const headerRow = TEMPLATE_COLUMNS.map((c) => c.label);
    const exampleRow = TEMPLATE_COLUMNS.map((c) => c.example);
    const csvContent = Papa.unparse(
      {
        fields: headerRow,
        data: [exampleRow],
      },
      {
        delimiter: ';',
      }
    );

    // Add BOM for Excel compatibility with accents
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_indicadores.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setApiError(null);
    setParseErrors([]);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      delimiter: '',
      encoding: 'UTF-8',
      complete: (results) => {
        const headers = results.meta.fields || [];
        const errors: string[] = [];

        // Map headers to internal keys (match by label)
        const headerMap = new Map<string, string>();
        TEMPLATE_COLUMNS.forEach((col) => {
          const found = headers.find(
            (h) => h.toLowerCase().trim() === col.label.toLowerCase().trim()
          );
          if (found) {
            headerMap.set(found, col.key);
          }
        });

        // Check required columns
        const requiredLabels = TEMPLATE_COLUMNS.filter((c) => c.required).map((c) =>
          c.label.toLowerCase().trim()
        );
        const foundLabels = headers.map((h) => h.toLowerCase().trim());
        requiredLabels.forEach((label) => {
          if (!foundLabels.includes(label)) {
            errors.push(`Coluna obrigatória "${label}" não encontrada`);
          }
        });

        if (errors.length > 0) {
          setParseErrors(errors);
          setParsedData([]);
          return;
        }

        // Transform rows to use internal keys
        const mappedRows = results.data.map((row: any) => {
          const mapped: any = {};
          Object.entries(row).forEach(([key, value]) => {
            const internalKey = headerMap.get(key);
            if (internalKey) {
              mapped[internalKey] = value;
            }
          });
          return mapped;
        });

        // Filter out completely empty rows
        const validRows = mappedRows.filter((row: any) => row.nome && row.nome.trim());

        setParsedData(validRows);
      },
      error: (err) => {
        setParseErrors([`Erro ao ler o arquivo: ${err.message}`]);
      },
    });
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    setApiError(null);
    setResult(null);

    try {
      const res = await fetch('/api/indicadores/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedData }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (errData.details) {
          setApiError(errData.details.join('\n'));
        } else {
          throw new Error(errData.error || 'Erro ao importar');
        }
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'Erro inesperado ao importar');
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedData([]);
    setParseErrors([]);
    setResult(null);
    setApiError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/indicadores">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Importar Indicadores</h1>
            <p className="text-slate-500 text-sm">Importe indicadores em lote via planilha CSV</p>
          </div>
        </div>

        {/* Step 1: Download Template */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                1
              </div>
              <div>
                <CardTitle className="text-lg">Baixe o modelo da planilha</CardTitle>
                <CardDescription>
                  Use o modelo para preencher corretamente os dados dos indicadores
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2 mb-3">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-600 space-y-1">
                  <p>
                    <strong>Campos obrigatórios:</strong> Nome e Setor
                  </p>
                  <p>
                    <strong>Setores:</strong> Se o setor não existir, será criado automaticamente
                  </p>
                  <p>
                    <strong>Responsável:</strong> Use o nome ou e-mail de um usuário já cadastrado
                    no sistema
                  </p>
                  <p>
                    <strong>Duplicatas:</strong> Indicadores com mesmo nome e setor serão ignorados
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {TEMPLATE_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="border border-slate-200 bg-white px-2 py-1.5 text-left font-medium text-slate-700"
                        >
                          {col.label}
                          {col.required && <span className="text-red-500 ml-0.5">*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {TEMPLATE_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className="border border-slate-200 px-2 py-1.5 text-slate-500 whitespace-nowrap"
                        >
                          {col.example}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Baixar Modelo CSV
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Upload File */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                2
              </div>
              <div>
                <CardTitle className="text-lg">Envie sua planilha</CardTitle>
                <CardDescription>
                  Selecione o arquivo CSV preenchido com os indicadores
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />

            {!file ? (
              <label
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
              >
                <Upload className="h-10 w-10 text-slate-400 mb-3" />
                <span className="text-sm font-medium text-slate-600">
                  Clique para selecionar o arquivo
                </span>
                <span className="text-xs text-slate-400 mt-1">Formatos aceitos: .csv</span>
              </label>
            ) : (
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleClear}>
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>

                {/* Parse Errors */}
                {parseErrors.length > 0 && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                    {parseErrors.map((err, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                        {err}
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview */}
                {parsedData.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-700">
                        Prévia dos dados ({parsedData.length}{' '}
                        {parsedData.length === 1 ? 'indicador' : 'indicadores'})
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Mostrando até 5
                      </Badge>
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b">
                              #
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b">
                              Nome
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b">
                              Setor
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b">
                              Responsável
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b">
                              Meta
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b">
                              Unidade
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600 border-b">
                              Nível
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b last:border-b-0 hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                              <td className="px-3 py-2 text-slate-800 font-medium">{row.nome}</td>
                              <td className="px-3 py-2 text-slate-600">{row.setor}</td>
                              <td className="px-3 py-2 text-slate-600">{row.responsavel || '—'}</td>
                              <td className="px-3 py-2 text-slate-600">{row.meta || '—'}</td>
                              <td className="px-3 py-2 text-slate-600">
                                {row.unidade_medida || '%'}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {row.nivel_gestao || 'Operacional'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.length > 5 && (
                      <p className="text-xs text-slate-400 mt-2 text-center">
                        ... e mais {parsedData.length - 5}{' '}
                        {parsedData.length - 5 === 1 ? 'indicador' : 'indicadores'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Import */}
        {parsedData.length > 0 && !result && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                  3
                </div>
                <div>
                  <CardTitle className="text-lg">Confirme a importação</CardTitle>
                  <CardDescription>Revise os dados acima e clique para importar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {apiError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <pre className="whitespace-pre-wrap font-sans">{apiError}</pre>
                  </div>
                </div>
              )}
              <Button
                onClick={handleImport}
                disabled={importing}
                className="gap-2 bg-green-600 hover:bg-green-700 w-full md:w-auto"
              >
                {importing ? (
                  <>
                    <Loader2
                      className="h-4 w-4"
                      style={{ animation: 'spin 0.6s linear infinite' }}
                    />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar {parsedData.length}{' '}
                    {parsedData.length === 1 ? 'indicador' : 'indicadores'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className="border-green-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <CardTitle className="text-lg text-green-800">Importação concluída!</CardTitle>
                  <CardDescription>Confira o resumo abaixo</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                  <p className="text-xs text-green-600 mt-1">Importados</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                  <p className="text-xs text-amber-600 mt-1">Ignorados</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{result.total}</p>
                  <p className="text-xs text-blue-600 mt-1">Total na planilha</p>
                </div>
              </div>

              {result.newSectors.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Setores criados automaticamente:</p>
                      <div className="flex flex-wrap gap-1">
                        {result.newSectors.map((s, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-blue-700 border-blue-300 bg-white"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {result.details.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-700">
                      <p className="font-medium mb-1">Detalhes dos itens ignorados:</p>
                      <ul className="space-y-0.5">
                        {result.details.map((d, i) => (
                          <li key={i} className="text-xs">
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Link href="/indicadores">
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700">Ver Indicadores</Button>
                </Link>
                <Button variant="outline" onClick={handleClear} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Nova Importação
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </AppShell>
  );
}
