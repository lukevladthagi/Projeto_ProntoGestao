import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'Items array is required' }, { status: 400 });
    }

    const importedItems = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Validate required fields
        if (!item.nome || !item.ano || !item.setor_id) {
          errors.push({
            row: i + 1,
            error: 'Nome, ano e setor_id são obrigatórios',
            item,
          });
          continue;
        }

        // Insert item
        const result = await sql`
          INSERT INTO itens_orcamento (
            setor_id, 
            categoria_id, 
            indicador_id,
            codigo, 
            nome, 
            descricao, 
            ano
          )
          VALUES (
            ${item.setor_id}, 
            ${item.categoria_id || null}, 
            ${item.indicador_id || null},
            ${item.codigo || null}, 
            ${item.nome}, 
            ${item.descricao || null}, 
            ${parseInt(item.ano)}
          )
          RETURNING *
        `;

        const itemId = result[0].id;

        // Insert monthly values if provided
        for (let mes = 1; mes <= 12; mes++) {
          const valorPlanejado = item[`planejado_${mes}`] || item[`mes_${mes}`] || 0;
          const valorRealizado = item[`realizado_${mes}`] || 0;

          if (valorPlanejado > 0 || valorRealizado > 0) {
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
                ${parseInt(item.ano)}, 
                ${mes}, 
                ${parseFloat(valorPlanejado) || 0},
                ${parseFloat(valorRealizado) || 0}
              )
              ON CONFLICT (item_orcamento_id, ano, mes) 
              DO UPDATE SET 
                valor_planejado = EXCLUDED.valor_planejado,
                valor_realizado = EXCLUDED.valor_realizado,
                updated_at = CURRENT_TIMESTAMP
            `;
          }
        }

        importedItems.push(result[0]);
      } catch (error: any) {
        errors.push({
          row: i + 1,
          error: error.message,
          item,
        });
      }
    }

    return Response.json({
      success: true,
      imported: importedItems.length,
      errors: errors.length,
      details: { importedItems, errors },
    });
  } catch (error) {
    console.error('Error importing budget:', error);
    return Response.json({ error: 'Failed to import budget' }, { status: 500 });
  }
}
