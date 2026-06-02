import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const setorId = searchParams.get('setor_id');
    const categoriaId = searchParams.get('categoria_id');
    const ano = searchParams.get('ano');
    const indicadorId = searchParams.get('indicador_id');

    let query = `
      SELECT 
        io.id,
        io.setor_id,
        io.categoria_id,
        io.indicador_id,
        io.codigo,
        io.nome,
        io.descricao,
        io.ano,
        io.tipo_unidade,
        io.is_ativo,
        s.nome as setor_nome,
        c.nome as categoria_nome,
        c.cor as categoria_cor,
        i.nome as indicador_nome,
        (
          SELECT COALESCE(SUM(valor_planejado), 0)
          FROM orcamento_valores ov
          WHERE ov.item_orcamento_id = io.id
        ) as total_planejado,
        (
          SELECT COALESCE(SUM(valor_realizado), 0)
          FROM orcamento_valores ov
          WHERE ov.item_orcamento_id = io.id
        ) as total_realizado
      FROM itens_orcamento io
      LEFT JOIN setores s ON io.setor_id = s.id
      LEFT JOIN categorias_orcamento c ON io.categoria_id = c.id
      LEFT JOIN indicadores i ON io.indicador_id = i.id
      WHERE io.is_ativo = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (setorId) {
      query += ` AND io.setor_id = $${paramIndex}`;
      params.push(parseInt(setorId));
      paramIndex++;
    }

    if (categoriaId) {
      query += ` AND io.categoria_id = $${paramIndex}`;
      params.push(parseInt(categoriaId));
      paramIndex++;
    }

    if (ano) {
      query += ` AND io.ano = $${paramIndex}`;
      params.push(parseInt(ano));
      paramIndex++;
    }

    if (indicadorId) {
      query += ` AND io.indicador_id = $${paramIndex}`;
      params.push(parseInt(indicadorId));
      paramIndex++;
    }

    query += ` ORDER BY io.ano DESC, s.nome, io.nome`;

    const itens = await sql(query, params);

    return Response.json({ itens });
  } catch (error) {
    console.error('Error fetching budget items:', error);
    return Response.json({ error: 'Failed to fetch budget items' }, { status: 500 });
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
    const {
      setor_id,
      categoria_id,
      indicador_id,
      nome,
      descricao,
      ano,
      tipo_unidade,
      valores_mensais,
    } = body;

    if (!nome || !ano || !setor_id) {
      return Response.json(
        {
          error: 'Nome, ano and setor_id are required',
        },
        { status: 400 }
      );
    }

    // Auto-generate sequential code like ORC-001, ORC-002, etc.
    const lastCode = await sql`
      SELECT codigo FROM itens_orcamento 
      WHERE codigo LIKE 'ORC-%' AND ano = ${ano}
      ORDER BY codigo DESC 
      LIMIT 1
    `;
    let nextNumber = 1;
    if (lastCode.length > 0 && lastCode[0].codigo) {
      const match = lastCode[0].codigo.match(/ORC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const codigo = `ORC-${String(nextNumber).padStart(3, '0')}`;

    const result = await sql`
      INSERT INTO itens_orcamento (
        setor_id, 
        categoria_id, 
        indicador_id,
        codigo, 
        nome, 
        descricao, 
        ano,
        tipo_unidade
      )
      VALUES (
        ${setor_id}, 
        ${categoria_id || null}, 
        ${indicador_id || null},
        ${codigo}, 
        ${nome}, 
        ${descricao || null}, 
        ${ano},
        ${tipo_unidade || 'dinheiro'}
      )
      RETURNING *
    `;

    const itemId = result[0].id;

    // Insert monthly values if provided
    if (valores_mensais && Array.isArray(valores_mensais)) {
      for (const valor of valores_mensais) {
        await sql`
          INSERT INTO orcamento_valores (
            item_orcamento_id, 
            ano, 
            mes, 
            valor_planejado,
            valor_realizado
          )
          VALUES (
            ${itemId}, 
            ${ano}, 
            ${valor.mes}, 
            ${valor.valor_planejado || 0},
            ${valor.valor_realizado || 0}
          )
          ON CONFLICT (item_orcamento_id, ano, mes) 
          DO UPDATE SET 
            valor_planejado = EXCLUDED.valor_planejado,
            valor_realizado = EXCLUDED.valor_realizado,
            updated_at = CURRENT_TIMESTAMP
        `;
      }
    }

    return Response.json({ item: result[0] });
  } catch (error) {
    console.error('Error creating budget item:', error);
    return Response.json({ error: 'Failed to create budget item' }, { status: 500 });
  }
}
