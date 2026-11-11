import { NextRequest, NextResponse } from 'next/server';
import { prisma, DashboardRole } from '@tortuga/database';
import { getPlatformSession, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden: Superadmin required' }, { status: 403 });
  }

  try {
    const users = await prisma.dashboardUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        linkedDiscordAccounts: {
          select: {
            id: true,
            username: true,
            discordId: true,
          },
        },
        guildAccesses: {
          select: {
            id: true,
            guildId: true,
            canManageAll: true,
            features: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden: Superadmin required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, name, password, role } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.dashboardUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 400 });
    }

    const user = await prisma.dashboardUser.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        role: (role as DashboardRole) || DashboardRole.MEMBER,
        passwordHash: hashPassword(password),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden: Superadmin required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, role, password, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const updateData: any = {};
    if (role) updateData.role = role as DashboardRole;
    if (password) updateData.passwordHash = hashPassword(password);
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.dashboardUser.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden: Superadmin required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
  }

  if (id === session.userId) {
    return NextResponse.json({ success: false, error: 'Cannot delete your own superadmin account' }, { status: 400 });
  }

  try {
    await prisma.dashboardUser.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
