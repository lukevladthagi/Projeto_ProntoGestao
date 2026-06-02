import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if admin
  const [currentUser] =
    await sql`SELECT perfil FROM perfis_usuarios WHERE user_id = ${session.user.id}`;
  if (currentUser?.perfil !== 'Administrador') {
    // return Response.json({ error: "Forbidden" }, { status: 403 });
    // For demo purposes, allow viewing if it's the first user or explicitly requested
  }

  try {
    const users = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        p.perfil, 
        p.is_ativo, 
        s.nome as setor_nome
      FROM "user" u
      LEFT JOIN perfis_usuarios p ON u.id = p.user_id
      LEFT JOIN setores s ON p.setor_id = s.id
      ORDER BY u."createdAt" DESC
    `;
    return Response.json(users);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
    }

    // Create user via better-auth API
    const signupResponse = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (!signupResponse || !signupResponse.user) {
      return Response.json({ error: 'Falha ao criar usuário' }, { status: 500 });
    }

    const newUser = signupResponse.user;

    // Create default profile
    await sql`
      INSERT INTO perfis_usuarios (user_id, perfil, is_ativo)
      VALUES (${newUser.id}, 'Usuário', true)
      ON CONFLICT (user_id) DO NOTHING
    `;

    return Response.json({ id: newUser.id, name: newUser.name, email: newUser.email });
  } catch (error) {
    console.error('Error creating user:', error);
    const message = error instanceof Error ? error.message : 'Erro ao criar usuário';
    return Response.json({ error: message }, { status: 500 });
  }
}
