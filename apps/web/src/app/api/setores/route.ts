import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  try {
    const sectors = await sql`SELECT * FROM setores ORDER BY nome ASC`;
    return Response.json({ setores: sectors });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch sectors' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { nome, responsavel, email_responsavel, is_ativo } = await request.json();
    const [newSector] = await sql`
      INSERT INTO setores (nome, responsavel, email_responsavel, is_ativo)
      VALUES (${nome}, ${responsavel}, ${email_responsavel}, ${is_ativo ?? true})
      RETURNING *
    `;
    return Response.json(newSector);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create sector' }, { status: 500 });
  }
}
