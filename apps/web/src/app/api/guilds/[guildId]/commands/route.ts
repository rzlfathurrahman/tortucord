import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  try {
    const commands = await prisma.customCommand.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, commands });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'commands');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const { action } = body;

  try {
    if (action === 'create') {
      const { name, response, description, isSlash, allowedRoles, cooldownSec } = body;
      if (!name || !response) {
        return NextResponse.json(
          { success: false, error: 'Command name and response are required' },
          { status: 400 }
        );
      }

      const cleanName = name.toLowerCase().replace(/^\/|^!/, '').trim();

      const cmd = await prisma.customCommand.create({
        data: {
          guildId,
          name: cleanName,
          response,
          description: description || `Custom command /${cleanName}`,
          isSlash: isSlash ?? true,
          allowedRoles: allowedRoles || [],
          cooldownSec: cooldownSec || 0,
        },
      });

      return NextResponse.json({ success: true, command: cmd });
    }

    if (action === 'update') {
      const { id, response, description, isSlash, allowedRoles, cooldownSec } = body;
      const cmd = await prisma.customCommand.update({
        where: { id },
        data: {
          response,
          description,
          isSlash,
          allowedRoles,
          cooldownSec,
        },
      });
      return NextResponse.json({ success: true, command: cmd });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'commands');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Command id required' }, { status: 400 });
  }

  try {
    await prisma.customCommand.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
