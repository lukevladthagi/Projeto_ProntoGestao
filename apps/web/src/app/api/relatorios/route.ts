import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'indicador', 'setor', 'planos'
    const indicadorId = searchParams.get('indicador_id');
    const setorId = searchParams.get('setor_id');
    const ano = searchParams.get('ano');

    if (tipo === 'indicador' && indicadorId) {
      // Results over time for a specific indicator
      const resultados = await sql`
        SELECT r.*, i.nome as indicador_nome, i.unidade_medida, i.sentido, i.meta, i.tipo_acumulado,
               s.nome as setor_nome
        FROM resultados r
        JOIN indicadores i ON r.indicador_id = i.id
        LEFT JOIN setores s ON r.setor_id = s.id
        WHERE r.indicador_id = ${parseInt(indicadorId)}
        ORDER BY r.competencia_date ASC
      `;

      // Monthly targets
      let metas: any[] = [];
      if (ano) {
        metas = await sql`
          SELECT * FROM metas_mensais 
          WHERE indicador_id = ${parseInt(indicadorId)} AND ano = ${parseInt(ano)}
          ORDER BY mes ASC
        `;
      } else {
        metas = await sql`
          SELECT * FROM metas_mensais 
          WHERE indicador_id = ${parseInt(indicadorId)}
          ORDER BY ano ASC, mes ASC
        `;
      }

      return Response.json({ resultados, metas });
    }

    if (tipo === 'setor') {
      // All indicators and their latest results for a sector
      let querySetorId = setorId ? parseInt(setorId) : null;

      if (querySetorId) {
        const indicadores = await sql`
          SELECT i.*, s.nome as setor_nome,
            (SELECT r.valor_realizado FROM resultados r WHERE r.indicador_id = i.id ORDER BY r.competencia_date DESC LIMIT 1) as ultimo_realizado,
            (SELECT r.competencia_date FROM resultados r WHERE r.indicador_id = i.id ORDER BY r.competencia_date DESC LIMIT 1) as ultima_competencia,
            (SELECT r.status FROM resultados r WHERE r.indicador_id = i.id ORDER BY r.competencia_date DESC LIMIT 1) as ultimo_status
          FROM indicadores i
          LEFT JOIN setores s ON i.setor_id = s.id
          WHERE i.setor_id = ${querySetorId} AND i.is_ativo = true
          ORDER BY i.nome ASC
        `;
        return Response.json({ indicadores });
      }

      // All sectors with summary
      const setoresResumo = await sql`
        SELECT s.id, s.nome, s.responsavel,
          COUNT(DISTINCT i.id)::int as total_indicadores,
          COUNT(DISTINCT CASE WHEN r_latest.status = 'Dentro da Meta' THEN i.id END)::int as dentro_meta,
          COUNT(DISTINCT CASE WHEN r_latest.status = 'Fora da Meta' THEN i.id END)::int as fora_meta,
          COUNT(DISTINCT CASE WHEN r_latest.status IS NULL THEN i.id END)::int as sem_resultado
        FROM setores s
        LEFT JOIN indicadores i ON i.setor_id = s.id AND i.is_ativo = true
        LEFT JOIN LATERAL (
          SELECT r.status FROM resultados r WHERE r.indicador_id = i.id ORDER BY r.competencia_date DESC LIMIT 1
        ) r_latest ON true
        WHERE s.is_ativo = true
        GROUP BY s.id, s.nome, s.responsavel
        ORDER BY s.nome ASC
      `;
      return Response.json({ setores: setoresResumo });
    }

    if (tipo === 'planos') {
      const planos = await sql`
        SELECT p.*, 
          i.nome as indicador_nome,
          s.nome as setor_nome
        FROM planos_acao p
        LEFT JOIN indicadores i ON p.indicador_id = i.id
        LEFT JOIN setores s ON p.setor_id = s.id
        ORDER BY 
          CASE p.status 
            WHEN 'Atrasado' THEN 1 
            WHEN 'Aberto' THEN 2 
            WHEN 'Em Andamento' THEN 3 
            WHEN 'Concluído' THEN 4 
            WHEN 'Cancelado' THEN 5 
          END,
          p.prazo_date ASC NULLS LAST
      `;

      // Summary counts
      const [summary] = await sql`
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'Aberto' THEN 1 END)::int as abertos,
          COUNT(CASE WHEN status = 'Em Andamento' THEN 1 END)::int as em_andamento,
          COUNT(CASE WHEN status = 'Concluído' THEN 1 END)::int as concluidos,
          COUNT(CASE WHEN status = 'Atrasado' THEN 1 END)::int as atrasados,
          COUNT(CASE WHEN status = 'Cancelado' THEN 1 END)::int as cancelados
        FROM planos_acao
      `;

      return Response.json({ planos, summary });
    }

    return Response.json({ error: 'Tipo de relatório não especificado' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
