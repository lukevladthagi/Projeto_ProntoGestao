import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const indicadorId = searchParams.get('indicadorId');
  const setorId = searchParams.get('setorId');
  const status = searchParams.get('status');

  try {
    let query = `
      SELECT pa.*, i.nome as indicador_nome, s.nome as setor_nome 
      FROM planos_acao pa
      JOIN indicadores i ON pa.indicador_id = i.id
      JOIN setores s ON pa.setor_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (indicadorId) {
      params.push(indicadorId);
      query += ` AND pa.indicador_id = $${params.length}`;
    }
    if (setorId) {
      params.push(setorId);
      query += ` AND pa.setor_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND pa.status = $${params.length}`;
    }

    query += ' ORDER BY pa.created_at DESC';

    const plans = await sql(query, params);
    return Response.json(plans);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch action plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      indicador_id,
      setor_id,
      resultado_id,
      competencia_date,
      problema,
      causa,
      acao_proposta,
      responsavel,
      prazo_date,
      prioridade,
    } = body;

    const [newPlan] = await sql`
      INSERT INTO planos_acao (
        indicador_id, setor_id, resultado_id, competencia_date, 
        problema, causa, acao_proposta, responsavel, prazo_date, prioridade, status
      )
      VALUES (
        ${indicador_id}, ${setor_id}, ${resultado_id}, ${competencia_date}, 
        ${problema}, ${causa}, ${acao_proposta}, ${responsavel}, ${prazo_date}, ${prioridade}, 'Aberto'
      )
      RETURNING *
    `;

    // Create initial tracking entry
    await sql`
      INSERT INTO acompanhamentos (plano_acao_id, usuario, status_novo, comentario)
      VALUES (${newPlan.id}, ${session.user.name}, 'Aberto', 'Plano de ação criado')
    `;

    return Response.json(newPlan);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create action plan' }, { status: 500 });
  }
}
