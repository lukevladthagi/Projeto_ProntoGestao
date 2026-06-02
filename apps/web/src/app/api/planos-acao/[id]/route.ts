import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(_request: Request, { params }: { params: any }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const [plan] = await sql`
      SELECT pa.*, i.nome as indicador_nome, s.nome as setor_nome
      FROM planos_acao pa
      LEFT JOIN indicadores i ON pa.indicador_id = i.id
      LEFT JOIN setores s ON pa.setor_id = s.id
      WHERE pa.id = ${parseInt(id)}
    `;

    if (!plan) {
      return Response.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    // Get follow-ups
    const acompanhamentos = await sql`
      SELECT * FROM acompanhamentos 
      WHERE plano_acao_id = ${parseInt(id)}
      ORDER BY created_at DESC
    `;

    return Response.json({ ...plan, acompanhamentos });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: any }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    const allowedFields: Record<string, string> = {
      status: 'status',
      problema: 'problema',
      causa: 'causa',
      acao_proposta: 'acao_proposta',
      responsavel: 'responsavel',
      prazo_date: 'prazo_date',
      prioridade: 'prioridade',
      observacoes: 'observacoes',
      evidencia_url: 'evidencia_url',
      data_conclusao_date: 'data_conclusao_date',
      data_inicio_realizado: 'data_inicio_realizado',
      descricao: 'descricao',
      checklist: 'checklist',
      competencia_date: 'competencia_date',
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, col] of Object.entries(allowedFields)) {
      if (body[key] !== undefined) {
        if (key === 'checklist') {
          setClauses.push(`${col} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(body[key]));
        } else {
          setClauses.push(`${col} = $${paramIndex}`);
          values.push(body[key] === '' ? null : body[key]);
        }
        paramIndex++;
      }
    }

    // Handle server-side date setting flags
    if (body.set_data_inicio_realizado) {
      setClauses.push(`data_inicio_realizado = CURRENT_DATE`);
    }
    if (body.set_data_conclusao) {
      setClauses.push(`data_conclusao_date = CURRENT_DATE`);
    }

    if (setClauses.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);

    const query = `UPDATE planos_acao SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    values.push(parseInt(id));

    const [updated] = await sql(query, values);

    // Log status change
    if (body.status) {
      await sql`
        INSERT INTO acompanhamentos (plano_acao_id, usuario, status_anterior, status_novo, comentario)
        VALUES (${parseInt(id)}, ${session.user.name}, ${body.old_status || null}, ${body.status}, ${body.comentario || 'Status atualizado'})
      `;
    }

    return Response.json(updated);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}
