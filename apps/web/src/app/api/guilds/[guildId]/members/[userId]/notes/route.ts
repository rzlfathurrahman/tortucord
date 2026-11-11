import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; userId: string }> }
) {
  try {
    const { guildId, userId } = await params;
    const access = await checkFeatureAccess(guildId, 'members');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { note } = await req.json();
    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Note content is required' }, { status: 400 });
    }

    const createdNote = await prisma.memberNote.create({
      data: {
        guildId,
        userId,
        authorId: access.platformUser?.name || 'Staff Member',
        note: note.trim(),
      },
    });

    return NextResponse.json({ success: true, note: createdNote });
  } catch (err: any) {
    console.error('[MemberNotesAPI] POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; userId: string }> }
) {
  try {
    const { guildId, userId } = await params;
    const access = await checkFeatureAccess(guildId, 'members');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');
    if (!noteId) {
      return NextResponse.json({ success: false, error: 'noteId is required' }, { status: 400 });
    }

    await prisma.memberNote.deleteMany({
      where: { id: noteId, guildId, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[MemberNotesAPI] DELETE Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
