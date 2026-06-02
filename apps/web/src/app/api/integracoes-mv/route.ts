import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS integracoes_mv (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT,
      tipo TEXT NOT NULL DEFAULT 'api',
      url_base TEXT,
      token TEXT,
      usuario_mv TEXT,
      senha_mv TEXT,
      is_ativo BOOLEAN DEFAULT false,
      ultima_sincronizacao TIMESTAMP,
      intervalo_minutos INTEGER DEFAULT 60,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS mapeamentos_mv (
      id SERIAL PRIMARY KEY,
      integracao_id INTEGER REFERENCES integracoes_mv(id) ON DELETE CASCADE,
      indicador_id INTEGER REFERENCES indicadores(id) ON DELETE CASCADE,
      codigo_mv TEXT NOT NULL,
      query_mv TEXT,
      campo_valor TEXT DEFAULT 'valor',
      campo_data TEXT DEFAULT 'data',
      transformacao TEXT,
      is_ativo BOOLEAN DEFAULT true,
      ultima_execucao TIMESTAMP,
      ultimo_valor REAL,
      ultimo_erro TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(integracao_id, indicador_id)
    )
  `;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureTables();

    const integracoes = await sql`SELECT * FROM integracoes_mv ORDER BY id ASC`;
    const mapeamentos = await sql`
      SELECT m.*, i.nome as indicador_nome, i.unidade_medida
      FROM mapeamentos_mv m
      LEFT JOIN indicadores i ON m.indicador_id = i.id
      ORDER BY m.id ASC
    `;

    return Response.json({ integracoes, mapeamentos });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureTables();
    const body = await request.json();
    const { action } = body;

    if (action === 'save_integracao') {
      const {
        id,
        nome,
        descricao,
        tipo,
        url_base,
        token,
        usuario_mv,
        senha_mv,
        is_ativo,
        intervalo_minutos,
      } = body;

      if (id) {
        const [updated] = await sql`
          UPDATE integracoes_mv SET
            nome = ${nome},
            descricao = ${descricao || null},
            tipo = ${tipo || 'api'},
            url_base = ${url_base || null},
            token = ${token || null},
            usuario_mv = ${usuario_mv || null},
            senha_mv = ${senha_mv || null},
            is_ativo = ${is_ativo ?? false},
            intervalo_minutos = ${intervalo_minutos || 60},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING *
        `;
        return Response.json(updated);
      } else {
        const [created] = await sql`
          INSERT INTO integracoes_mv (nome, descricao, tipo, url_base, token, usuario_mv, senha_mv, is_ativo, intervalo_minutos)
          VALUES (${nome}, ${descricao || null}, ${tipo || 'api'}, ${url_base || null}, ${token || null}, ${usuario_mv || null}, ${senha_mv || null}, ${is_ativo ?? false}, ${intervalo_minutos || 60})
          RETURNING *
        `;
        return Response.json(created);
      }
    }

    if (action === 'save_mapeamento') {
      const {
        id,
        integracao_id,
        indicador_id,
        codigo_mv,
        query_mv,
        campo_valor,
        campo_data,
        transformacao,
        is_ativo,
      } = body;

      if (id) {
        const [updated] = await sql`
          UPDATE mapeamentos_mv SET
            integracao_id = ${integracao_id},
            indicador_id = ${indicador_id},
            codigo_mv = ${codigo_mv},
            query_mv = ${query_mv || null},
            campo_valor = ${campo_valor || 'valor'},
            campo_data = ${campo_data || 'data'},
            transformacao = ${transformacao || null},
            is_ativo = ${is_ativo ?? true},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING *
        `;
        return Response.json(updated);
      } else {
        const [created] = await sql`
          INSERT INTO mapeamentos_mv (integracao_id, indicador_id, codigo_mv, query_mv, campo_valor, campo_data, transformacao, is_ativo)
          VALUES (${integracao_id}, ${indicador_id}, ${codigo_mv}, ${query_mv || null}, ${campo_valor || 'valor'}, ${campo_data || 'data'}, ${transformacao || null}, ${is_ativo ?? true})
          RETURNING *
        `;
        return Response.json(created);
      }
    }

    if (action === 'delete_mapeamento') {
      await sql`DELETE FROM mapeamentos_mv WHERE id = ${body.id}`;
      return Response.json({ success: true });
    }

    if (action === 'delete_integracao') {
      await sql`DELETE FROM integracoes_mv WHERE id = ${body.id}`;
      return Response.json({ success: true });
    }

    if (action === 'testar_conexao') {
      // Simulate connection test to MV
      const { url_base, token, usuario_mv } = body;
      if (!url_base) {
        return Response.json({ success: false, message: 'URL base não configurada' });
      }

      try {
        const testUrl = `${url_base}/api/health`;
        const testHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) testHeaders['Authorization'] = `Bearer ${token}`;

        const response = await fetch(testUrl, {
          method: 'GET',
          headers: testHeaders,
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          return Response.json({ success: true, message: 'Conexão estabelecida com sucesso!' });
        } else {
          return Response.json({
            success: false,
            message: `Erro HTTP ${response.status}: ${response.statusText}`,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        return Response.json({ success: false, message: `Falha na conexão: ${errorMessage}` });
      }
    }

    return Response.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to process integration request' }, { status: 500 });
  }
}
