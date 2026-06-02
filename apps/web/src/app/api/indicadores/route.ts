import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectorId = searchParams.get('sectorId');
  const nivel = searchParams.get('nivel');

  try {
    let query =
      'SELECT i.*, s.nome as setor_nome, ip.nome as indicador_pai_nome, u.name as responsavel_nome FROM indicadores i LEFT JOIN setores s ON i.setor_id = s.id LEFT JOIN indicadores ip ON i.indicador_pai_id = ip.id LEFT JOIN "user" u ON i.responsavel_id = u.id WHERE i.is_ativo = true';
    const params: any[] = [];

    if (sectorId) {
      params.push(sectorId);
      query += ` AND i.setor_id = $${params.length}`;
    }
    if (nivel) {
      params.push(nivel);
      query += ` AND i.nivel_gestao = $${params.length}`;
    }

    query += ' ORDER BY i.nivel_gestao ASC, i.nome ASC';

    const indicators = await sql(query, params);
    return Response.json(indicators);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch indicators' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      setor_id,
      nome,
      descricao,
      tipo,
      frequencia,
      meta,
      sentido,
      unidade_medida,
      nivel_gestao,
      is_pai,
      indicador_pai_id,
      tipo_calculo,
      formula_calculo,
      responsavel_id,
      tipo_acumulado,
      ano_inicio,
      tags,
    } = body;

    const [newIndicator] = await sql`
      INSERT INTO indicadores (
        setor_id, nome, descricao, tipo, frequencia, meta, sentido, 
        unidade_medida, nivel_gestao, is_pai, indicador_pai_id, tipo_calculo,
        formula_calculo, responsavel_id, tipo_acumulado, ano_inicio, tags
      )
      VALUES (
        ${setor_id}, ${nome}, ${descricao}, ${tipo}, ${frequencia}, ${meta}, ${sentido}, 
        ${unidade_medida}, ${nivel_gestao}, ${is_pai ?? false}, ${indicador_pai_id}, ${tipo_calculo},
        ${formula_calculo ?? null}, ${responsavel_id ?? null}, ${tipo_acumulado ?? null}, ${ano_inicio ?? null}, ${tags ?? null}
      )
      RETURNING *
    `;
    return Response.json(newIndicator);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create indicator' }, { status: 500 });
  }
}
