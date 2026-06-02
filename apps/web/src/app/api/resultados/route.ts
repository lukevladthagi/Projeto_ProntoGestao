import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { calculateIndicatorStatus, updateParentIndicator } from '@/app/api/utils/indicators';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const indicadorId = searchParams.get('indicadorId');
  const limit = searchParams.get('limit') || '12';

  try {
    let results;
    if (indicadorId) {
      results = await sql`
        SELECT * FROM resultados 
        WHERE indicador_id = ${indicadorId} 
        ORDER BY competencia_date DESC, created_at DESC
        LIMIT ${limit}
      `;
    } else {
      results = await sql`
        SELECT r.*, i.nome as indicador_nome, s.nome as setor_nome 
        FROM resultados r
        JOIN indicadores i ON r.indicador_id = i.id
        JOIN setores s ON r.setor_id = s.id
        ORDER BY r.competencia_date DESC, r.created_at DESC
        LIMIT ${limit}
      `;
    }
    return Response.json(results);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch results' }, { status: 500 });
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
      competencia_date,
      valor_realizado,
      meta_periodo,
      observacao,
      anexo_url,
    } = body;

    const [indicator] = await sql`SELECT * FROM indicadores WHERE id = ${indicador_id}`;
    if (!indicator) return Response.json({ error: 'Indicator not found' }, { status: 404 });

    const status = calculateIndicatorStatus(
      valor_realizado,
      meta_periodo || indicator.meta,
      indicator.sentido
    );

    const [existingResult] = await sql`
      SELECT id FROM resultados
      WHERE indicador_id = ${indicador_id}
        AND competencia_date = ${competencia_date}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let result;
    if (existingResult) {
      [result] = await sql`
        UPDATE resultados
        SET setor_id = ${setor_id},
            valor_realizado = ${valor_realizado},
            meta_periodo = ${meta_periodo || indicator.meta},
            observacao = ${observacao},
            anexo_url = ${anexo_url},
            status = ${status},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existingResult.id}
        RETURNING *, true as updated
      `;
    } else {
      [result] = await sql`
        INSERT INTO resultados (indicador_id, setor_id, competencia_date, valor_realizado, meta_periodo, observacao, anexo_url, status)
        VALUES (${indicador_id}, ${setor_id}, ${competencia_date}, ${valor_realizado}, ${meta_periodo || indicator.meta}, ${observacao}, ${anexo_url}, ${status})
        RETURNING *, false as updated
      `;
    }

    // Update parent if exists
    if (indicator.indicador_pai_id) {
      await updateParentIndicator(indicator.indicador_pai_id, competencia_date);
    }

    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create result' }, { status: 500 });
  }
}
