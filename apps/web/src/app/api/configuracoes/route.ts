import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS configuracoes_sistema (
      id SERIAL PRIMARY KEY,
      chave TEXT NOT NULL UNIQUE,
      valor TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT
    )
  `;
  await sql`
    INSERT INTO configuracoes_sistema (chave, valor) VALUES
      ('nome_sistema', 'Gestão de Indicadores'),
      ('subtitulo', 'e Planos de Ação Setorial'),
      ('cor_primaria', '#2563eb'),
      ('cor_secundaria', '#1e40af'),
      ('email_suporte', ''),
      ('rodape_texto', '© 2026 Gestão de Indicadores')
    ON CONFLICT (chave) DO NOTHING
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const rows = await sql`SELECT chave, valor FROM configuracoes_sistema ORDER BY id ASC`;
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.chave] = row.valor || '';
    }
    return Response.json(config);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const updates = await request.json();

    for (const [chave, valor] of Object.entries(updates)) {
      await sql`
        INSERT INTO configuracoes_sistema (chave, valor, updated_by, updated_at)
        VALUES (${chave}, ${valor as string}, ${session.user.id}, CURRENT_TIMESTAMP)
        ON CONFLICT (chave)
        DO UPDATE SET valor = ${valor as string}, updated_by = ${session.user.id}, updated_at = CURRENT_TIMESTAMP
      `;
    }

    // Log the action
    await sql`
      INSERT INTO logs_atividade (user_id, user_name, acao, entidade, detalhes)
      VALUES (${session.user.id}, ${session.user.name}, 'Atualização', 'Configurações', ${`Alterou: ${Object.keys(updates).join(', ')}`})
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
