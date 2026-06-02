import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const items = await sql`
      SELECT 
        io.*,
        s.nome as setor_nome,
        c.nome as categoria_nome,
        c.cor as categoria_cor,
        i.nome as indicador_nome
      FROM itens_orcamento io
      LEFT JOIN setores s ON io.setor_id = s.id
      LEFT JOIN categorias_orcamento c ON io.categoria_id = c.id
      LEFT JOIN indicadores i ON io.indicador_id = i.id
      WHERE io.id = ${id}
    `;

    if (items.length === 0) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    const valores = await sql`
      SELECT 
        ano, 
        mes, 
        valor_planejado, 
        valor_realizado, 
        observacao
      FROM orcamento_valores
      WHERE item_orcamento_id = ${id}
      ORDER BY ano, mes
    `;

    return Response.json({
      item: items[0],
      valores,
    });
  } catch (error) {
    console.error('Error fetching budget item:', error);
    return Response.json({ error: 'Failed to fetch budget item' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      setor_id,
      categoria_id,
      indicador_id,
      codigo,
      nome,
      descricao,
      ano,
      tipo_unidade,
      valores_mensais,
    } = body;

    let queryParts = [];
    let values = [];
    let paramIndex = 1;

    if (setor_id !== undefined) {
      queryParts.push(`setor_id = $${paramIndex}`);
      values.push(setor_id);
      paramIndex++;
    }
    if (categoria_id !== undefined) {
      queryParts.push(`categoria_id = $${paramIndex}`);
      values.push(categoria_id);
      paramIndex++;
    }
    if (indicador_id !== undefined) {
      queryParts.push(`indicador_id = $${paramIndex}`);
      values.push(indicador_id);
      paramIndex++;
    }
    if (codigo !== undefined) {
      queryParts.push(`codigo = $${paramIndex}`);
      values.push(codigo);
      paramIndex++;
    }
    if (nome !== undefined) {
      queryParts.push(`nome = $${paramIndex}`);
      values.push(nome);
      paramIndex++;
    }
    if (descricao !== undefined) {
      queryParts.push(`descricao = $${paramIndex}`);
      values.push(descricao);
      paramIndex++;
    }
    if (ano !== undefined) {
      queryParts.push(`ano = $${paramIndex}`);
      values.push(ano);
      paramIndex++;
    }
    if (tipo_unidade !== undefined) {
      queryParts.push(`tipo_unidade = $${paramIndex}`);
      values.push(tipo_unidade);
      paramIndex++;
    }

    if (queryParts.length > 0) {
      queryParts.push('updated_at = CURRENT_TIMESTAMP');
      const setClause = queryParts.join(', ');
      values.push(id);

      const query = `UPDATE itens_orcamento SET ${setClause} WHERE id = $${paramIndex} RETURNING *`;
      await sql(query, values);
    }

    // Update monthly values if provided
    if (valores_mensais && Array.isArray(valores_mensais)) {
      // Get current item data including indicador_id
      const itemData = await sql`
        SELECT ano, setor_id, indicador_id 
        FROM itens_orcamento 
        WHERE id = ${id}
      `;

      const currentItem = itemData[0];
      const itemAno = currentItem?.ano;
      const itemSetorId = currentItem?.setor_id;
      const itemIndicadorId = currentItem?.indicador_id;

      for (const valor of valores_mensais) {
        const valorAno = valor.ano || itemAno;

        // Check if record exists
        const existing = await sql`
          SELECT valor_planejado, valor_realizado 
          FROM orcamento_valores 
          WHERE item_orcamento_id = ${id} AND ano = ${valorAno} AND mes = ${valor.mes}
        `;

        if (existing.length > 0) {
          // Update existing record, preserving planejado if not provided
          await sql`
            UPDATE orcamento_valores
            SET 
              valor_planejado = ${valor.valor_planejado !== undefined ? valor.valor_planejado : existing[0].valor_planejado},
              valor_realizado = ${valor.valor_realizado !== undefined ? valor.valor_realizado : existing[0].valor_realizado},
              observacao = ${valor.observacao !== undefined ? valor.observacao : null},
              updated_at = CURRENT_TIMESTAMP
            WHERE item_orcamento_id = ${id} AND ano = ${valorAno} AND mes = ${valor.mes}
          `;
        } else {
          // Insert new record
          await sql`
            INSERT INTO orcamento_valores (
              item_orcamento_id, 
              ano, 
              mes, 
              valor_planejado,
              valor_realizado,
              observacao
            )
            VALUES (
              ${id}, 
              ${valorAno}, 
              ${valor.mes}, 
              ${valor.valor_planejado || 0},
              ${valor.valor_realizado || 0},
              ${valor.observacao || null}
            )
          `;
        }

        // SYNC TO INDICADORES: If this budget item is linked to an indicator, sync the result
        if (itemIndicadorId && valor.valor_realizado !== undefined) {
          // Build competencia_date from ano and mes
          const competenciaDate = `${valorAno}-${String(valor.mes).padStart(2, '0')}-01`;

          // Get indicator meta
          const indicadorData = await sql`
            SELECT meta FROM indicadores WHERE id = ${itemIndicadorId}
          `;
          const metaPadrao = indicadorData[0]?.meta || null;

          // Check if resultado already exists for this indicator + competencia
          const existingResultado = await sql`
            SELECT id, valor_realizado, meta_periodo
            FROM resultados
            WHERE indicador_id = ${itemIndicadorId} 
              AND competencia_date = ${competenciaDate}
          `;

          if (existingResultado.length > 0) {
            // Update existing resultado
            await sql`
              UPDATE resultados
              SET 
                valor_realizado = ${valor.valor_realizado},
                meta_periodo = ${metaPadrao},
                observacao = ${valor.observacao || null},
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ${existingResultado[0].id}
            `;
          } else {
            // Create new resultado
            await sql`
              INSERT INTO resultados (
                indicador_id,
                setor_id,
                competencia_date,
                valor_realizado,
                meta_periodo,
                observacao
              )
              VALUES (
                ${itemIndicadorId},
                ${itemSetorId},
                ${competenciaDate},
                ${valor.valor_realizado},
                ${metaPadrao},
                ${valor.observacao || null}
              )
            `;
          }
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating budget item:', error);
    return Response.json({ error: 'Failed to update budget item' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    await sql`
      UPDATE itens_orcamento 
      SET is_ativo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget item:', error);
    return Response.json({ error: 'Failed to delete budget item' }, { status: 500 });
  }
}
