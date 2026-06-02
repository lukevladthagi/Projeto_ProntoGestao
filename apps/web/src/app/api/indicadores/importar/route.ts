import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface IndicadorRow {
  nome: string;
  descricao?: string;
  setor: string;
  responsavel?: string;
  tipo?: string;
  frequencia?: string;
  meta?: string;
  sentido?: string;
  unidade_medida?: string;
  nivel_gestao?: string;
  tipo_acumulado?: string;
  tags?: string;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const rows: IndicadorRow[] = body.rows;

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Nenhum dado para importar' }, { status: 400 });
    }

    // Validate required fields
    const errors: string[] = [];
    rows.forEach((row, i) => {
      if (!row.nome || !row.nome.trim()) {
        errors.push(`Linha ${i + 2}: Campo "nome" é obrigatório`);
      }
      if (!row.setor || !row.setor.trim()) {
        errors.push(`Linha ${i + 2}: Campo "setor" é obrigatório`);
      }
    });

    if (errors.length > 0) {
      return Response.json({ error: 'Erros de validação', details: errors }, { status: 400 });
    }

    // 1. Get existing sectors
    const existingSectors = await sql`SELECT id, nome FROM setores WHERE is_ativo = true`;
    const sectorMap = new Map<string, number>();
    existingSectors.forEach((s: any) => sectorMap.set(s.nome.toLowerCase().trim(), s.id));

    // 2. Get existing users (for responsavel matching)
    const existingUsers = await sql`SELECT id, name, email FROM "user"`;
    const userMap = new Map<string, string>();
    existingUsers.forEach((u: any) => {
      userMap.set(u.name.toLowerCase().trim(), u.id);
      userMap.set(u.email.toLowerCase().trim(), u.id);
    });

    // 3. Create missing sectors
    const uniqueSectors = [...new Set(rows.map((r) => r.setor.trim()))];
    for (const sectorName of uniqueSectors) {
      if (!sectorMap.has(sectorName.toLowerCase().trim())) {
        const [newSector] = await sql`
          INSERT INTO setores (nome, is_ativo)
          VALUES (${sectorName.trim()}, true)
          RETURNING id, nome
        `;
        sectorMap.set(newSector.nome.toLowerCase().trim(), newSector.id);
      }
    }

    // 4. Insert indicators
    let imported = 0;
    let skipped = 0;
    const importDetails: string[] = [];

    for (const row of rows) {
      const sectorId = sectorMap.get(row.setor.toLowerCase().trim());
      if (!sectorId) {
        skipped++;
        importDetails.push(`"${row.nome}": Setor "${row.setor}" não encontrado`);
        continue;
      }

      // Check if indicator already exists in same sector
      const existing = await sql(
        'SELECT id FROM indicadores WHERE LOWER(nome) = LOWER($1) AND setor_id = $2 AND is_ativo = true',
        [row.nome.trim(), sectorId]
      );

      if (existing.length > 0) {
        skipped++;
        importDetails.push(`"${row.nome}": Já existe no setor "${row.setor}"`);
        continue;
      }

      // Match responsavel to user
      let responsavelId: string | null = null;
      if (row.responsavel && row.responsavel.trim()) {
        responsavelId = userMap.get(row.responsavel.toLowerCase().trim()) || null;
      }

      const metaValue = row.meta ? parseFloat(row.meta.replace(',', '.')) : null;
      const tagsArray = row.tags
        ? row.tags
            .split(';')
            .map((t) => t.trim())
            .filter(Boolean)
        : null;

      await sql`
        INSERT INTO indicadores (
          setor_id, nome, descricao, tipo, frequencia, meta, sentido,
          unidade_medida, nivel_gestao, responsavel_id, tipo_acumulado, tags, is_ativo
        )
        VALUES (
          ${sectorId},
          ${row.nome.trim()},
          ${row.descricao?.trim() || null},
          ${row.tipo?.trim() || 'Quantitativo'},
          ${row.frequencia?.trim() || 'Mensal'},
          ${metaValue},
          ${row.sentido?.trim() || 'Quanto maior melhor'},
          ${row.unidade_medida?.trim() || '%'},
          ${row.nivel_gestao?.trim() || 'Operacional'},
          ${responsavelId},
          ${row.tipo_acumulado?.trim() || null},
          ${tagsArray},
          true
        )
      `;
      imported++;
    }

    // Gather created sectors info
    const newSectorsCreated = uniqueSectors.filter(
      (s) =>
        !existingSectors.some((es: any) => es.nome.toLowerCase().trim() === s.toLowerCase().trim())
    );

    return Response.json({
      success: true,
      imported,
      skipped,
      total: rows.length,
      newSectors: newSectorsCreated,
      details: importDetails,
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: 'Erro ao importar indicadores' }, { status: 500 });
  }
}
