import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(_request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get all active indicators with sector, parent and responsible info
    const indicators = await sql`
      SELECT 
        i.id, i.nome, i.descricao, i.tipo, i.frequencia, i.meta, i.sentido,
        i.unidade_medida, i.nivel_gestao, i.tags, i.setor_id,
        s.nome as setor_nome,
        u.name as responsavel_nome
      FROM indicadores i
      LEFT JOIN setores s ON i.setor_id = s.id
      LEFT JOIN "user" u ON i.responsavel_id = u.id
      WHERE i.is_ativo = true
      ORDER BY i.nivel_gestao ASC, i.nome ASC
    `;

    // Get last 6 results for each indicator (for sparkline + variation)
    const allResults = await sql`
      SELECT r.indicador_id, r.valor_realizado, r.meta_periodo, r.status, r.competencia_date
      FROM resultados r
      WHERE r.indicador_id = ANY(${indicators.map((i: any) => i.id)})
      ORDER BY r.competencia_date DESC
    `;

    // Group results by indicator
    const resultsByIndicator: Record<number, any[]> = {};
    for (const r of allResults) {
      if (!resultsByIndicator[r.indicador_id]) {
        resultsByIndicator[r.indicador_id] = [];
      }
      resultsByIndicator[r.indicador_id].push(r);
    }

    // Attach results to indicators
    const enriched = indicators.map((ind: any) => {
      const results = (resultsByIndicator[ind.id] || []).slice(0, 6);
      const latest = results[0] || null;
      const previous = results[1] || null;

      let variacao = null;
      if (latest && previous && previous.valor_realizado !== 0) {
        variacao =
          ((latest.valor_realizado - previous.valor_realizado) /
            Math.abs(previous.valor_realizado)) *
          100;
      }

      // Determine if latest result meets the target
      let metaStatus: string | null = null;
      if (latest) {
        const meta = latest.meta_periodo || ind.meta;
        if (meta != null) {
          if (ind.sentido === 'Quanto maior melhor') {
            metaStatus = latest.valor_realizado >= meta ? 'meta' : 'fora';
          } else if (ind.sentido === 'Quanto menor melhor') {
            metaStatus = latest.valor_realizado <= meta ? 'meta' : 'fora';
          }
        }
      }

      return {
        ...ind,
        ultimo_valor: latest?.valor_realizado ?? null,
        ultimo_status: latest?.status ?? null,
        ultimo_competencia: latest?.competencia_date ?? null,
        variacao,
        meta_status: metaStatus,
        sparkline: results.map((r: any) => r.valor_realizado).reverse(),
      };
    });

    return Response.json(enriched);
  } catch (error) {
    console.error('Error fetching lancamentos data:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
