import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    await getOrCreateGuild(guildId);
    let cfg = await prisma.onboardingConfig.findUnique({
      where: { guildId },
    });

    if (!cfg) {
      cfg = await prisma.onboardingConfig.create({
        data: {
          guildId,
          welcomeEnabled: true,
          welcomeMessage: 'Hey {user.mention}, welcome to **{server.name}**! 🎉 Glad to have you here! You are member #{memberCount}.',
          sendDmWelcome: false,
          dmWelcomeMessage: 'Welcome to **{server.name}**! Please check out the channels and enjoy your stay.',
          goodbyeEnabled: false,
          goodbyeMessage: '**{user.name}** has left the server. Farewell! ⛵',
          autoroleIds: [],
          botAutoroleIds: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        welcomeEnabled: cfg.welcomeEnabled,
        welcomeChannelId: cfg.welcomeChannelId || '',
        welcomeMessage: cfg.welcomeMessage || '',
        sendDmWelcome: cfg.sendDmWelcome,
        dmWelcomeMessage: cfg.dmWelcomeMessage || '',
        goodbyeEnabled: cfg.goodbyeEnabled,
        goodbyeChannelId: cfg.goodbyeChannelId || '',
        goodbyeMessage: cfg.goodbyeMessage || '',
        autoroleIds: cfg.autoroleIds || [],
        botAutoroleIds: cfg.botAutoroleIds || [],
      },
    });
  } catch (err) {
    console.error('[OnboardingAPI] Error fetching config:', err);
    return NextResponse.json({
      success: true,
      config: {
        welcomeEnabled: true,
        welcomeChannelId: '',
        welcomeMessage: 'Hey {user.mention}, welcome to **{server.name}**! 🎉',
        sendDmWelcome: false,
        dmWelcomeMessage: 'Welcome to **{server.name}**!',
        goodbyeEnabled: false,
        goodbyeChannelId: '',
        goodbyeMessage: '**{user.name}** has left the server. Farewell! ⛵',
        autoroleIds: [],
        botAutoroleIds: [],
      },
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'onboarding');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();

  try {
    await getOrCreateGuild(guildId);
    
    // Update onboarding config
    const updated = await prisma.onboardingConfig.upsert({
      where: { guildId },
      update: {
        welcomeEnabled: body.welcomeEnabled !== undefined ? body.welcomeEnabled : undefined,
        welcomeChannelId: body.welcomeChannelId || null,
        welcomeMessage: body.welcomeMessage !== undefined ? body.welcomeMessage : undefined,
        sendDmWelcome: body.sendDmWelcome !== undefined ? body.sendDmWelcome : undefined,
        dmWelcomeMessage: body.dmWelcomeMessage !== undefined ? body.dmWelcomeMessage : undefined,
        goodbyeEnabled: body.goodbyeEnabled !== undefined ? body.goodbyeEnabled : undefined,
        goodbyeChannelId: body.goodbyeChannelId || null,
        goodbyeMessage: body.goodbyeMessage !== undefined ? body.goodbyeMessage : undefined,
        autoroleIds: body.autoroleIds !== undefined ? body.autoroleIds : undefined,
        botAutoroleIds: body.botAutoroleIds !== undefined ? body.botAutoroleIds : undefined,
      },
      create: {
        guildId,
        welcomeEnabled: body.welcomeEnabled ?? true,
        welcomeChannelId: body.welcomeChannelId || null,
        welcomeMessage: body.welcomeMessage || 'Hey {user.mention}, welcome to **{server.name}**! 🎉',
        sendDmWelcome: body.sendDmWelcome ?? false,
        dmWelcomeMessage: body.dmWelcomeMessage || 'Welcome to **{server.name}**!',
        goodbyeEnabled: body.goodbyeEnabled ?? false,
        goodbyeChannelId: body.goodbyeChannelId || null,
        goodbyeMessage: body.goodbyeMessage || '**{user.name}** has left the server.',
        autoroleIds: body.autoroleIds || [],
        botAutoroleIds: body.botAutoroleIds || [],
      },
    });

    // Also sync autoroleIds with Guild table
    if (body.autoroleIds !== undefined || body.botAutoroleIds !== undefined) {
      await prisma.guild.update({
        where: { id: guildId },
        data: {
          autoroleIds: body.autoroleIds !== undefined ? body.autoroleIds : undefined,
          botAutoroleIds: body.botAutoroleIds !== undefined ? body.botAutoroleIds : undefined,
        },
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      config: updated,
    });
  } catch (err) {
    console.error('[OnboardingAPI] Error saving config:', err);
    return NextResponse.json({ success: false, error: 'Failed to save onboarding settings' }, { status: 500 });
  }
}
