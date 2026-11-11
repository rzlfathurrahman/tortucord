import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const access = await checkFeatureAccess(guildId, 'knowledge');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Ensure guild exists in database
    await prisma.guild.upsert({
      where: { id: guildId },
      create: { id: guildId },
      update: {},
    });

    const [docs, config] = await Promise.all([
      prisma.knowledgeDoc.findMany({
        where: { guildId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.knowledgeConfig.findUnique({
        where: { guildId },
      }),
    ]);

    const totalCharacters = docs.reduce((acc, d) => acc + d.content.length, 0);
    const categories = Array.from(new Set(docs.map((d) => d.category)));

    return NextResponse.json({
      success: true,
      docs,
      config: config || {
        guildId,
        enabled: true,
        autoRespondTickets: true,
        qaChannelId: null,
        systemPrompt:
          'You are Hermes, the intelligent AI assistant and community guardian of this Discord server. Answer questions accurately based strictly on the ingested knowledge base.',
        matchThreshold: 0.5,
      },
      metrics: {
        totalDocs: docs.length,
        categoriesCount: categories.length,
        totalCharacters,
        categories,
      },
    });
  } catch (err: any) {
    console.error('[KnowledgeAPI] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const access = await checkFeatureAccess(guildId, 'knowledge');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();

    // If updating config
    if (body.type === 'UPDATE_CONFIG') {
      const { enabled, autoRespondTickets, qaChannelId, systemPrompt, matchThreshold } = body;
      const updatedConfig = await prisma.knowledgeConfig.upsert({
        where: { guildId },
        create: {
          guildId,
          enabled: enabled ?? true,
          autoRespondTickets: autoRespondTickets ?? true,
          qaChannelId: qaChannelId || null,
          systemPrompt: systemPrompt || null,
          matchThreshold: matchThreshold ?? 0.5,
        },
        update: {
          ...(enabled !== undefined && { enabled }),
          ...(autoRespondTickets !== undefined && { autoRespondTickets }),
          ...(qaChannelId !== undefined && { qaChannelId: qaChannelId || null }),
          ...(systemPrompt !== undefined && { systemPrompt: systemPrompt || null }),
          ...(matchThreshold !== undefined && { matchThreshold }),
        },
      });
      return NextResponse.json({ success: true, config: updatedConfig });
    }

    // Otherwise, creating a new document
    const { title, category = 'General', content, tags = [] } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const doc = await prisma.knowledgeDoc.create({
      data: {
        guildId,
        title,
        category,
        content,
        tags: Array.isArray(tags) ? tags : [],
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, doc });
  } catch (err: any) {
    console.error('[KnowledgeAPI] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
