import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get all active indicators with sector info, latest result, and plan count
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
      ORDER BY i.nome ASC
    `;

    if (indicators.length === 0) {
      return Response.json([]);
    }

    const indicatorIds = indicators.map((i: any) => i.id);

    // Get latest result for each indicator
    const latestResults = await sql`
      SELECT DISTINCT ON (r.indicador_id)
        r.indicador_id, r.valor_realizado, r.meta_periodo, r.status, r.competencia_date
      FROM resultados r
      WHERE r.indicador_id = ANY(${indicatorIds})
      ORDER BY r.indicador_id, r.competencia_date DESC
    `;

    // Count active plans (not cancelled/concluded) per indicator
    const planCounts = await sql`
      SELECT 
        indicador_id,
        COUNT(*) as total_planos,
        COUNT(*) FILTER (WHERE status NOT IN ('Concluído', 'Cancelado')) as planos_ativos
      FROM planos_acao
      WHERE indicador_id = ANY(${indicatorIds})
      GROUP BY indicador_id
    `;

    // Build lookup maps
    const resultMap: Record<number, any> = {};
    for (const r of latestResults) {
      resultMap[r.indicador_id] = r;
    }

    const planMap: Record<number, any> = {};
    for (const p of planCounts) {
      planMap[p.indicador_id] = p;
    }

    // Enrich each indicator
    const enriched = indicators.map((ind: any) => {
      const latest = resultMap[ind.id] || null;
      const plans = planMap[ind.id] || { total_planos: 0, planos_ativos: 0 };

      // Determine meta status
      let metaStatus: 'meta' | 'fora' | 'sem_dados' = 'sem_dados';
      if (latest && latest.valor_realizado != null) {
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
        id: ind.id,
        nome: ind.nome,
        setor_nome: ind.setor_nome,
        setor_id: ind.setor_id,
        responsavel_nome: ind.responsavel_nome,
        unidade_medida: ind.unidade_medida,
        meta: ind.meta,
        sentido: ind.sentido,
        tags: ind.tags,
        nivel_gestao: ind.nivel_gestao,
        ultimo_valor: latest?.valor_realizado ?? null,
        ultimo_competencia: latest?.competencia_date ?? null,
        meta_status: metaStatus,
        total_planos: parseInt(plans.total_planos) || 0,
        planos_ativos: parseInt(plans.planos_ativos) || 0,
        tem_plano: (parseInt(plans.total_planos) || 0) > 0,
      };
    });

    return Response.json(enriched);
  } catch (error) {
    console.error('Error fetching planos-acao indicadores:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
