import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()));
    const setorId = searchParams.get('setor_id');
    const categoriaId = searchParams.get('categoria_id');
    const search = searchParams.get('search');

    let query = `
      SELECT 
        io.id,
        io.codigo,
        io.nome,
        io.setor_id,
        s.nome as setor_nome,
        io.categoria_id,
        c.nome as categoria_nome,
        c.cor as categoria_cor,
        io.indicador_id,
        ind.nome as indicador_nome
      FROM itens_orcamento io
      LEFT JOIN setores s ON io.setor_id = s.id
      LEFT JOIN categorias_orcamento c ON io.categoria_id = c.id
      LEFT JOIN indicadores ind ON io.indicador_id = ind.id
      WHERE io.is_ativo = true AND io.ano = $1
    `;
    const params: any[] = [ano];
    let idx = 2;

    if (setorId) {
      query += ` AND io.setor_id = $${idx}`;
      params.push(parseInt(setorId));
      idx++;
    }
    if (categoriaId) {
      query += ` AND io.categoria_id = $${idx}`;
      params.push(parseInt(categoriaId));
      idx++;
    }
    if (search) {
      query += ` AND (LOWER(io.nome) LIKE LOWER($${idx}) OR LOWER(io.codigo) LIKE LOWER($${idx}))`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY s.nome, io.nome`;

    const itens = await sql(query, params);

    if (itens.length === 0) {
      return Response.json({ itens: [], totais: { planejado: 0, realizado: 0, meses: [] } });
    }

    const itemIds = itens.map((i: any) => i.id);

    // Build dynamic query for monthly values
    const placeholders = itemIds.map((_: any, i: number) => `$${i + 2}`).join(',');
    const valoresQuery = `
      SELECT 
        item_orcamento_id,
        mes,
        COALESCE(valor_planejado, 0) as valor_planejado,
        COALESCE(valor_realizado, 0) as valor_realizado
      FROM orcamento_valores
      WHERE ano = $1 AND item_orcamento_id IN (${placeholders})
      ORDER BY item_orcamento_id, mes
    `;

    const valores = await sql(valoresQuery, [ano, ...itemIds]);

    // Map values to items
    const valoresMap: Record<number, Record<number, { planejado: number; realizado: number }>> = {};
    for (const v of valores) {
      if (!valoresMap[v.item_orcamento_id]) valoresMap[v.item_orcamento_id] = {};
      valoresMap[v.item_orcamento_id][v.mes] = {
        planejado: parseFloat(v.valor_planejado) || 0,
        realizado: parseFloat(v.valor_realizado) || 0,
      };
    }

    // Build result with monthly data
    const result = itens.map((item: any) => {
      const meses: any[] = [];
      let totalPlanejado = 0;
      let totalRealizado = 0;

      for (let m = 1; m <= 12; m++) {
        const val = valoresMap[item.id]?.[m] || { planejado: 0, realizado: 0 };
        meses.push({
          mes: m,
          planejado: val.planejado,
          realizado: val.realizado,
        });
        totalPlanejado += val.planejado;
        totalRealizado += val.realizado;
      }

      return {
        ...item,
        meses,
        total_planejado: totalPlanejado,
        total_realizado: totalRealizado,
        execucao: totalPlanejado > 0 ? (totalRealizado / totalPlanejado) * 100 : 0,
      };
    });

    // Totals per month
    const totaisMeses = [];
    let grandTotalPlanejado = 0;
    let grandTotalRealizado = 0;
    for (let m = 1; m <= 12; m++) {
      let mesPlanj = 0;
      let mesReal = 0;
      for (const item of result) {
        const mesData = item.meses.find((x: any) => x.mes === m);
        mesPlanj += mesData?.planejado || 0;
        mesReal += mesData?.realizado || 0;
      }
      totaisMeses.push({ mes: m, planejado: mesPlanj, realizado: mesReal });
      grandTotalPlanejado += mesPlanj;
      grandTotalRealizado += mesReal;
    }

    return Response.json({
      itens: result,
      totais: {
        planejado: grandTotalPlanejado,
        realizado: grandTotalRealizado,
        execucao: grandTotalPlanejado > 0 ? (grandTotalRealizado / grandTotalPlanejado) * 100 : 0,
        meses: totaisMeses,
      },
    });
  } catch (error) {
    console.error('Budget panel error:', error);
    return Response.json({ error: 'Erro ao carregar painel' }, { status: 500 });
  }
}
