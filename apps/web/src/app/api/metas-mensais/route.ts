import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const indicadorId = searchParams.get('indicador_id');
    const ano = searchParams.get('ano');

    if (!indicadorId) {
      return Response.json({ error: 'indicador_id é obrigatório' }, { status: 400 });
    }

    const id = parseInt(indicadorId);

    let rows;
    if (ano) {
      const anoNum = parseInt(ano);
      rows =
        await sql`SELECT * FROM metas_mensais WHERE indicador_id = ${id} AND ano = ${anoNum} ORDER BY ano ASC, mes ASC`;
    } else {
      rows =
        await sql`SELECT * FROM metas_mensais WHERE indicador_id = ${id} ORDER BY ano ASC, mes ASC`;
    }

    return Response.json(rows);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch metas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { indicador_id, metas } = await request.json();

    if (!indicador_id || !metas || !Array.isArray(metas)) {
      return Response.json({ error: 'indicador_id e metas são obrigatórios' }, { status: 400 });
    }

    // Upsert each monthly target
    const results = [];
    for (const m of metas) {
      const valorMeta = m.sem_meta ? null : m.valor_meta;
      const semMeta = m.sem_meta ?? false;
      const [row] = await sql`
        INSERT INTO metas_mensais (indicador_id, ano, mes, valor_meta, sem_meta)
        VALUES (${indicador_id}, ${m.ano}, ${m.mes}, ${valorMeta}, ${semMeta})
        ON CONFLICT (indicador_id, ano, mes) 
        DO UPDATE SET valor_meta = ${valorMeta}, sem_meta = ${semMeta}, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      results.push(row);
    }

    return Response.json(results);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to save metas' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const indicadorId = searchParams.get('indicador_id');
    const ano = searchParams.get('ano');

    if (!indicadorId || !ano) {
      return Response.json({ error: 'indicador_id e ano são obrigatórios' }, { status: 400 });
    }

    const id = parseInt(indicadorId);
    const anoNum = parseInt(ano);

    await sql`DELETE FROM metas_mensais WHERE indicador_id = ${id} AND ano = ${anoNum}`;

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to delete metas' }, { status: 500 });
  }
}
