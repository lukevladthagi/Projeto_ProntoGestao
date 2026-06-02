import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const stats = await sql`
      SELECT 
        status, 
        COUNT(*) as count 
      FROM resultados 
      WHERE competencia_date BETWEEN ${startDate || '1970-01-01'} AND ${endDate || '9999-12-31'}
      GROUP BY status
    `;

    const planStats = await sql`
      SELECT 
        status, 
        COUNT(*) as count 
      FROM planos_acao 
      GROUP BY status
    `;

    const sectorStats = await sql`
      SELECT 
        s.nome as setor, 
        COUNT(CASE WHEN r.status = 'Fora da meta' THEN 1 END) as fora_meta,
        COUNT(CASE WHEN r.status = 'Dentro da meta' THEN 1 END) as dentro_meta,
        COUNT(CASE WHEN r.status = 'Atenção' THEN 1 END) as atencao
      FROM setores s
      LEFT JOIN resultados r ON s.id = r.setor_id
      GROUP BY s.id, s.nome
    `;

    return Response.json({ stats, planStats, sectorStats });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
