import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; docId: string }> }
) {
  try {
    const { guildId, docId } = await params;
    const access = await checkFeatureAccess(guildId, 'knowledge');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { title, category, content, tags, isActive } = body;

    const existing = await prisma.knowledgeDoc.findFirst({
      where: { id: docId, guildId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const updated = await prisma.knowledgeDoc.update({
      where: { id: docId },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(content !== undefined && { content }),
        ...(tags !== undefined && { tags }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, doc: updated });
  } catch (err: any) {
    console.error('[KnowledgeDocAPI] PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; docId: string }> }
) {
  try {
    const { guildId, docId } = await params;
    const access = await checkFeatureAccess(guildId, 'knowledge');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await prisma.knowledgeDoc.deleteMany({
      where: { id: docId, guildId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[KnowledgeDocAPI] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
