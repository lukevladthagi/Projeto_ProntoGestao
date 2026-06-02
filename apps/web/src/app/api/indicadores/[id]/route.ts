import sql from '@/app/api/utils/sql';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [indicator] = await sql`
      SELECT i.*, s.nome as setor_nome, u.name as responsavel_nome
      FROM indicadores i
      LEFT JOIN setores s ON i.setor_id = s.id
      LEFT JOIN "user" u ON i.responsavel_id = u.id
      WHERE i.id = ${id}
    `;

    if (!indicator) {
      return Response.json({ error: 'Indicator not found' }, { status: 404 });
    }

    return Response.json(indicator);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch indicator' }, { status: 500 });
  }
}
