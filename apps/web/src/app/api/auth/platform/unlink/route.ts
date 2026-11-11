import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { getPlatformSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 });
  }

  try {
    const account = await prisma.linkedDiscordAccount.findUnique({
      where: { id },
    });

    if (!account || account.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'Account not found or not owned by you' },
        { status: 404 }
      );
    }

    await prisma.linkedDiscordAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
