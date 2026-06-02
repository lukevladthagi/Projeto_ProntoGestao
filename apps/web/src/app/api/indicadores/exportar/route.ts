import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const formato = searchParams.get('formato') || 'csv';

    const indicadores = await sql`
      SELECT 
        i.nome,
        i.descricao,
        s.nome as setor,
        u.name as responsavel,
        i.tipo,
        i.frequencia,
        i.meta,
        i.sentido,
        i.unidade_medida,
        i.nivel_gestao,
        i.tipo_acumulado,
        i.tags
      FROM indicadores i
      LEFT JOIN setores s ON i.setor_id = s.id
      LEFT JOIN "user" u ON i.responsavel_id = u.id
      WHERE i.is_ativo = true
      ORDER BY s.nome ASC, i.nome ASC
    `;

    if (formato === 'json') {
      return Response.json(indicadores);
    }

    // Build CSV
    const csvHeaders = [
      'Nome',
      'Descrição',
      'Setor',
      'Responsável',
      'Tipo',
      'Frequência',
      'Meta',
      'Sentido',
      'Unidade de Medida',
      'Nível de Gestão',
      'Tipo Acumulado',
      'Tags',
    ];

    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(';') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = indicadores.map((ind: any) =>
      [
        escapeCSV(ind.nome),
        escapeCSV(ind.descricao),
        escapeCSV(ind.setor),
        escapeCSV(ind.responsavel),
        escapeCSV(ind.tipo),
        escapeCSV(ind.frequencia),
        escapeCSV(ind.meta),
        escapeCSV(ind.sentido),
        escapeCSV(ind.unidade_medida),
        escapeCSV(ind.nivel_gestao),
        escapeCSV(ind.tipo_acumulado),
        escapeCSV(Array.isArray(ind.tags) ? ind.tags.join(';') : ind.tags || ''),
      ].join(';')
    );

    const bom = '\uFEFF';
    const csvContent = bom + csvHeaders.join(';') + '\r\n' + rows.join('\r\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="indicadores.csv"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: 'Erro ao exportar indicadores' }, { status: 500 });
  }
}
