import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const categorias = await sql`
      SELECT 
        id, 
        nome, 
        descricao, 
        cor, 
        is_ativo,
        created_at,
        updated_at
      FROM categorias_orcamento
      WHERE is_ativo = true
      ORDER BY nome ASC
    `;

    return Response.json({ categorias });
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    return Response.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nome, descricao, cor } = body;

    if (!nome) {
      return Response.json({ error: 'Nome is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO categorias_orcamento (nome, descricao, cor)
      VALUES (${nome}, ${descricao || null}, ${cor || '#3b82f6'})
      RETURNING *
    `;

    return Response.json({ categoria: result[0] });
  } catch (error) {
    console.error('Error creating budget category:', error);
    return Response.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
