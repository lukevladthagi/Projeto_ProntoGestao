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
    const ano = searchParams.get('ano');

    let query = `
      SELECT 
        io.id,
        io.codigo,
        io.nome,
        io.descricao,
        io.ano,
        s.nome as setor,
        c.nome as categoria,
        i.nome as indicador
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

    if (ano) {
      query += ` AND io.ano = $${paramIndex}`;
      params.push(parseInt(ano));
      paramIndex++;
    }

    query += ` ORDER BY io.ano DESC, s.nome, io.nome`;

    const itens = await sql(query, params);

    // Get monthly values for each item
    const csvData = [];

    for (const item of itens) {
      const valores = await sql`
        SELECT mes, valor_planejado, valor_realizado
        FROM orcamento_valores
        WHERE item_orcamento_id = ${item.id}
        ORDER BY mes
      `;

      const row: any = {
        codigo: item.codigo || '',
        nome: item.nome,
        descricao: item.descricao || '',
        setor: item.setor || '',
        categoria: item.categoria || '',
        indicador: item.indicador || '',
        ano: item.ano,
      };

      // Add monthly values
      for (let mes = 1; mes <= 12; mes++) {
        const valor = valores.find((v: any) => v.mes === mes);
        row[`planejado_${mes}`] = valor?.valor_planejado || 0;
        row[`realizado_${mes}`] = valor?.valor_realizado || 0;
      }

      csvData.push(row);
    }

    return Response.json({ data: csvData });
  } catch (error) {
    console.error('Error exporting budget:', error);
    return Response.json({ error: 'Failed to export budget' }, { status: 500 });
  }
}
