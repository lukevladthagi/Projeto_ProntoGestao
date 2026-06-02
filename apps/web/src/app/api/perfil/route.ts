import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json(null);

  try {
    const [perfil] = await sql`
      SELECT p.*, u.name, u.email 
      FROM perfis_usuarios p
      JOIN "user" u ON p.user_id = u.id
      WHERE p.user_id = ${session.user.id}
    `;

    if (!perfil) {
      // Create default profile if not exists
      const [newPerfil] = await sql`
        INSERT INTO perfis_usuarios (user_id, perfil, is_ativo)
        VALUES (${session.user.id}, 'Gestão', true)
        RETURNING *
      `;
      return Response.json({ ...newPerfil, name: session.user.name, email: session.user.email });
    }

    return Response.json(perfil);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { perfil, setor_id, is_ativo } = body;
    // Allow admin to update other users' profiles
    const targetUserId = body.user_id || session.user.id;

    const [updatedPerfil] = await sql`
      INSERT INTO perfis_usuarios (user_id, perfil, setor_id, is_ativo)
      VALUES (${targetUserId}, ${perfil}, ${setor_id || null}, ${is_ativo !== false})
      ON CONFLICT (user_id) DO UPDATE SET
        perfil = COALESCE(EXCLUDED.perfil, perfis_usuarios.perfil),
        setor_id = EXCLUDED.setor_id,
        is_ativo = EXCLUDED.is_ativo,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    return Response.json(updatedPerfil);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
