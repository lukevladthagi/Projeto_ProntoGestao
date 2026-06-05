import sql from '@/app/api/utils/sql';

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        i.id,
        i.nome,
        i.descricao,
        i.tipo,
        i.frequencia,
        i.meta,
        i.sentido,
        i.unidade_medida,
        i.nivel_gestao,
        i.tags,
        i.setor_id,
        s.nome as setor_nome,
        s.responsavel as setor_responsavel,
        u.name as responsavel_nome,
        latest.valor_realizado as ultimo_valor,
        latest.meta_periodo as ultima_meta,
        latest.status as ultimo_status,
        latest.competencia_date as ultima_competencia,
        latest.observacao as ultima_observacao,
        latest.created_at as ultimo_lancamento_em,
        COALESCE(history.sparkline, ARRAY[]::numeric[]) as sparkline
      FROM indicadores i
      LEFT JOIN setores s ON i.setor_id = s.id
      LEFT JOIN "user" u ON i.responsavel_id = u.id
      LEFT JOIN LATERAL (
        SELECT r.*
        FROM resultados r
        WHERE r.indicador_id = i.id
        ORDER BY r.competencia_date DESC, r.created_at DESC
        LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(valor_realizado ORDER BY competencia_date ASC, created_at ASC) as sparkline
        FROM (
          SELECT r.valor_realizado, r.competencia_date, r.created_at
          FROM resultados r
          WHERE r.indicador_id = i.id
          ORDER BY r.competencia_date DESC, r.created_at DESC
          LIMIT 8
        ) recent
      ) history ON true
      WHERE i.is_ativo = true
      ORDER BY s.nome ASC NULLS LAST, i.nome ASC
    `;

    return Response.json(rows);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch performance map' }, { status: 500 });
  }
}
