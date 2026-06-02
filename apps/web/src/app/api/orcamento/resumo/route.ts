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
    const ano = searchParams.get('ano') || new Date().getFullYear().toString();

    // Total planejado vs realizado por setor
    const porSetor = await sql`
      SELECT 
        s.id,
        s.nome as setor,
        COALESCE(SUM(ov.valor_planejado), 0) as total_planejado,
        COALESCE(SUM(ov.valor_realizado), 0) as total_realizado,
        COUNT(DISTINCT io.id) as total_itens
      FROM setores s
      LEFT JOIN itens_orcamento io ON s.id = io.setor_id AND io.ano = ${parseInt(ano)} AND io.is_ativo = true
      LEFT JOIN orcamento_valores ov ON io.id = ov.item_orcamento_id AND ov.ano = ${parseInt(ano)}
      WHERE s.is_ativo = true
      GROUP BY s.id, s.nome
      ORDER BY total_planejado DESC
    `;

    // Total planejado vs realizado por categoria
    const porCategoria = await sql`
      SELECT 
        c.id,
        c.nome as categoria,
        c.cor,
        COALESCE(SUM(ov.valor_planejado), 0) as total_planejado,
        COALESCE(SUM(ov.valor_realizado), 0) as total_realizado,
        COUNT(DISTINCT io.id) as total_itens
      FROM categorias_orcamento c
      LEFT JOIN itens_orcamento io ON c.id = io.categoria_id AND io.ano = ${parseInt(ano)} AND io.is_ativo = true
      LEFT JOIN orcamento_valores ov ON io.id = ov.item_orcamento_id AND ov.ano = ${parseInt(ano)}
      WHERE c.is_ativo = true
      GROUP BY c.id, c.nome, c.cor
      ORDER BY total_planejado DESC
    `;

    // Evolução mensal (planejado vs realizado)
    const evolucaoMensal = await sql`
      SELECT 
        ov.mes,
        COALESCE(SUM(ov.valor_planejado), 0) as total_planejado,
        COALESCE(SUM(ov.valor_realizado), 0) as total_realizado
      FROM orcamento_valores ov
      INNER JOIN itens_orcamento io ON ov.item_orcamento_id = io.id
      WHERE ov.ano = ${parseInt(ano)} AND io.is_ativo = true
      GROUP BY ov.mes
      ORDER BY ov.mes
    `;

    // Totais gerais
    const totaisResult = await sql`
      SELECT 
        COALESCE(SUM(ov.valor_planejado), 0) as total_planejado,
        COALESCE(SUM(ov.valor_realizado), 0) as total_realizado
      FROM orcamento_valores ov
      INNER JOIN itens_orcamento io ON ov.item_orcamento_id = io.id
      WHERE ov.ano = ${parseInt(ano)} AND io.is_ativo = true
    `;

    const totais = totaisResult[0] || { total_planejado: 0, total_realizado: 0 };

    return Response.json({
      totais,
      porSetor,
      porCategoria,
      evolucaoMensal,
    });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    return Response.json({ error: 'Failed to fetch budget summary' }, { status: 500 });
  }
}
