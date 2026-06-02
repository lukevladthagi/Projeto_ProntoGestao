import sql from '@/app/api/utils/sql';

export function calculateIndicatorStatus(valor: number, meta: number, sentido: string) {
  const tolerance = 0.05; // 5%

  if (sentido === 'Quanto maior melhor') {
    if (valor >= meta) return 'Dentro da meta';
    if (valor >= meta * (1 - tolerance)) return 'Atenção';
    return 'Fora da meta';
  }

  if (sentido === 'Quanto menor melhor') {
    if (valor <= meta) return 'Dentro da meta';
    if (valor <= meta * (1 + tolerance)) return 'Atenção';
    return 'Fora da meta';
  }

  if (sentido === 'Igual à meta') {
    const diff = Math.abs(valor - meta);
    if (diff <= meta * tolerance) return 'Dentro da meta';
    return 'Fora da meta';
  }

  return 'Indefinido';
}

export async function updateParentIndicator(parentId: number, competenciaDate: string) {
  // Logic to aggregate child values and update parent result
  // Simplified version: trigger a recount
  const children = await sql`SELECT id FROM indicadores WHERE indicador_pai_id = ${parentId}`;
  if (children.length === 0) return;

  const [parent] = await sql`SELECT * FROM indicadores WHERE id = ${parentId}`;
  if (!parent) return;

  const childIds = children.map((c) => c.id);
  const results = await sql`
    SELECT valor_realizado FROM resultados 
    WHERE indicador_id = ANY(${childIds}) 
    AND competencia_date = ${competenciaDate}
  `;

  if (results.length === 0) return;

  let aggregatedValue = 0;
  const values = results.map((r) => r.valor_realizado);

  switch (parent.tipo_calculo) {
    case 'Soma':
      aggregatedValue = values.reduce((a, b) => a + b, 0);
      break;
    case 'Média':
      aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
      break;
    case 'Mínimo':
      aggregatedValue = Math.min(...values);
      break;
    case 'Máximo':
      aggregatedValue = Math.max(...values);
      break;
    case 'Contagem':
      aggregatedValue = values.length;
      break;
  }

  const status = calculateIndicatorStatus(aggregatedValue, parent.meta, parent.sentido);

  await sql`
    INSERT INTO resultados (indicador_id, setor_id, competencia_date, valor_realizado, meta_periodo, status)
    VALUES (${parent.id}, ${parent.setor_id}, ${competenciaDate}, ${aggregatedValue}, ${parent.meta}, ${status})
    ON CONFLICT (indicador_id, competencia_date) DO UPDATE SET
      valor_realizado = EXCLUDED.valor_realizado,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP
  `;
}
