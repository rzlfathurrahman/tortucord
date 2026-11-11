import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { getPlatformSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden: Superadmin required' }, { status: 403 });
  }

  try {
    const guilds = await prisma.guild.findMany({
      select: {
        id: true,
        premium: true,
        premiumTier: true,
        premiumExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            reactionRoleGroups: true,
            stickyMessages: true,
            infractions: true,
            weblogEntries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, guilds });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden: Superadmin required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { guildId, premium, premiumTier, premiumExpiresAt } = body;

    if (!guildId) {
      return NextResponse.json({ success: false, error: 'guildId is required' }, { status: 400 });
    }

    const updated = await prisma.guild.update({
      where: { id: guildId },
      data: {
        premium: premium ?? undefined,
        premiumTier: typeof premiumTier === 'number' ? premiumTier : undefined,
        premiumExpiresAt: premiumExpiresAt ? new Date(premiumExpiresAt) : null,
      },
    });

    return NextResponse.json({ success: true, guild: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
