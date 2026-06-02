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
    const entidade = searchParams.get('entidade');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query;
    if (entidade && entidade !== 'todos') {
      query = sql`
        SELECT 
          l.*,
          u.name as user_display_name
        FROM logs_atividade l
        LEFT JOIN "user" u ON l.user_id = u.id
        WHERE l.entidade = ${entidade}
        ORDER BY l.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      query = sql`
        SELECT 
          l.*,
          u.name as user_display_name
        FROM logs_atividade l
        LEFT JOIN "user" u ON l.user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT ${limit}
      `;
    }

    const logs = await query;

    return Response.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return Response.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
