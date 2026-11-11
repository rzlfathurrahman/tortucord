import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { getGuildDetails, getGuildChannels, getGuildRoles, updateRolePermissions } from '@/lib/discord';
import { checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface AuditFinding {
  id: string;
  title: string;
  description: string;
  category: 'SECURITY' | 'PERMISSIONS' | 'ENGAGEMENT' | 'AUTOMOD';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  passed: boolean;
  fixable: boolean;
  fixAction?: string;
  details?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const [guild, channels, roles, dbGuild] = await Promise.all([
      getGuildDetails(guildId),
      getGuildChannels(guildId),
      getGuildRoles(guildId),
      prisma.guild.findUnique({
        where: { id: guildId },
        include: { automodConfig: true, onboardingConfig: true, loggingConfig: true },
      }),
    ]);

    const findings: AuditFinding[] = [];
    let score = 100;

    // 1. Check @everyone dangerous permissions
    const everyoneRole = roles.find((r) => r.id === guildId || r.name === '@everyone');
    if (everyoneRole) {
      const perms = BigInt(everyoneRole.permissions || '0');
      const ADMIN = 0x8n;
      const MANAGE_GUILD = 0x20n;
      const MANAGE_CHANNELS = 0x10n;
      const MENTION_EVERYONE = 0x20000n;

      const hasAdmin = (perms & ADMIN) === ADMIN;
      const hasManageGuild = (perms & MANAGE_GUILD) === MANAGE_GUILD;
      const hasManageChannels = (perms & MANAGE_CHANNELS) === MANAGE_CHANNELS;
      const hasMentionEveryone = (perms & MENTION_EVERYONE) === MENTION_EVERYONE;

      if (hasAdmin || hasManageGuild) {
        findings.push({
          id: 'everyone_admin',
          title: 'Critical: @everyone has Administrative Rights',
          description: '@everyone role has Administrator or Manage Server permissions. Any new member can modify server settings.',
          category: 'PERMISSIONS',
          severity: 'CRITICAL',
          passed: false,
          fixable: true,
          fixAction: 'fix_everyone_perms',
          details: 'Revoke Administrator and Manage Server from @everyone',
        });
        score -= 30;
      } else {
        findings.push({
          id: 'everyone_admin_clean',
          title: '@everyone Administrative Rights Protected',
          description: '@everyone role does not hold dangerous administrator access.',
          category: 'PERMISSIONS',
          severity: 'LOW',
          passed: true,
          fixable: false,
        });
      }

      if (hasMentionEveryone) {
        findings.push({
          id: 'everyone_mention_all',
          title: 'Unrestricted @everyone Mentions',
          description: 'Regular members can ping @everyone and @here, leading to notification spam and raid vulnerabilities.',
          category: 'PERMISSIONS',
          severity: 'HIGH',
          passed: false,
          fixable: true,
          fixAction: 'fix_everyone_perms',
          details: 'Disable Mention Everyone for the @everyone role',
        });
        score -= 15;
      } else {
        findings.push({
          id: 'everyone_mention_all_clean',
          title: '@everyone Ping Broadcasts Restricted',
          description: 'Mention @everyone permission is properly restricted.',
          category: 'PERMISSIONS',
          severity: 'LOW',
          passed: true,
          fixable: false,
        });
      }

      if (hasManageChannels) {
        findings.push({
          id: 'everyone_manage_channels',
          title: '@everyone Can Manage Channels',
          description: 'Members have permission to create, edit, or delete server channels.',
          category: 'PERMISSIONS',
          severity: 'HIGH',
          passed: false,
          fixable: true,
          fixAction: 'fix_everyone_perms',
          details: 'Revoke Manage Channels from @everyone',
        });
        score -= 15;
      }
    }

    // 2. Check AutoMod Protection
    const automod = dbGuild?.automodConfig;
    const isAutomodActive = Boolean(automod && (automod.antiSpam || automod.antiInvite || automod.antiLink));
    if (!isAutomodActive) {
      findings.push({
        id: 'automod_disabled',
        title: 'AutoMod Protection Inactive',
        description: 'Automated anti-spam, malicious link filters, and drama watchers are currently disabled.',
        category: 'AUTOMOD',
        severity: 'HIGH',
        passed: false,
        fixable: true,
        fixAction: 'enable_automod',
        details: 'Enable AutoMod and activate baseline anti-spam rules',
      });
      score -= 15;
    } else {
      findings.push({
        id: 'automod_enabled',
        title: 'AutoMod Active & Guarding',
        description: 'Server has active automated moderation and filter rules.',
        category: 'AUTOMOD',
        severity: 'LOW',
        passed: true,
        fixable: false,
      });

      if (!automod?.antiInvite) {
        findings.push({
          id: 'automod_invites',
          title: 'Discord Invite Blocker Inactive',
          description: 'Members can post external Discord invite links freely without filtering.',
          category: 'AUTOMOD',
          severity: 'MEDIUM',
          passed: false,
          fixable: true,
          fixAction: 'enable_anti_invites',
        });
        score -= 10;
      }
    }

    // 3. Check Channel Organization & Uncategorized Channels
    const uncategorized = channels.filter(
      (c) => (c.type === 'text' || c.type === 'voice') && !c.parentId
    );

    if (uncategorized.length > 4) {
      findings.push({
        id: 'uncategorized_channels',
        title: 'Unorganized Channels Detected',
        description: `${uncategorized.length} channels are not organized under any category, leading to chaotic layout and inconsistent role permissions.`,
        category: 'ENGAGEMENT',
        severity: 'LOW',
        passed: false,
        fixable: false,
        details: `Channels: ${uncategorized.slice(0, 3).map((c) => '#' + c.name).join(', ')}...`,
      });
      score -= 5;
    } else {
      findings.push({
        id: 'channel_org_clean',
        title: 'Category Hierarchy Organized',
        description: 'Server channels are cleanly structured inside categories.',
        category: 'ENGAGEMENT',
        severity: 'LOW',
        passed: true,
        fixable: false,
      });
    }

    // 4. Check Welcome Onboarding
    const onboarding = dbGuild?.onboardingConfig;
    if (!onboarding || !onboarding.welcomeEnabled) {
      findings.push({
        id: 'onboarding_disabled',
        title: 'Member Onboarding Inactive',
        description: 'No automated welcome broadcast or role assignment is configured for new members joining the server.',
        category: 'ENGAGEMENT',
        severity: 'MEDIUM',
        passed: false,
        fixable: false,
        details: 'Configure welcome messages in Onboarding & Welcome',
      });
      score -= 10;
    } else {
      findings.push({
        id: 'onboarding_active',
        title: 'Member Onboarding Configured',
        description: 'Automated greeting message active for incoming users.',
        category: 'ENGAGEMENT',
        severity: 'LOW',
        passed: true,
        fixable: false,
      });
    }

    // 5. Check Audit Weblogs
    const logging = dbGuild?.loggingConfig;
    if (!logging || !logging.modLogChannelId) {
      findings.push({
        id: 'modlog_missing',
        title: 'Moderation Audit Log Unset',
        description: 'Infractions, kicks, and bans are not mirrored to a dedicated staff log channel.',
        category: 'SECURITY',
        severity: 'MEDIUM',
        passed: false,
        fixable: false,
      });
      score -= 10;
    }

    // Clamp score
    score = Math.max(10, Math.min(100, score));

    const grade =
      score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'F';

    return NextResponse.json({
      success: true,
      score,
      grade,
      metrics: {
        totalChecks: findings.length,
        passedChecks: findings.filter((f) => f.passed).length,
        failedChecks: findings.filter((f) => !f.passed).length,
        criticalIssues: findings.filter((f) => !f.passed && f.severity === 'CRITICAL').length,
      },
      findings,
    });
  } catch (err: any) {
    console.error('[AuditAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'audit');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'fix_everyone_perms') {
      const roles = await getGuildRoles(guildId);
      const everyoneRole = roles.find((r) => r.id === guildId || r.name === '@everyone');

      if (!everyoneRole) {
        return NextResponse.json({ success: false, error: '@everyone role not found' }, { status: 404 });
      }

      // Bitmask to strip: ADMIN (0x8), MANAGE_GUILD (0x20), MANAGE_CHANNELS (0x10), MENTION_EVERYONE (0x20000)
      let perms = BigInt(everyoneRole.permissions || '0');
      perms &= ~0x8n;
      perms &= ~0x20n;
      perms &= ~0x10n;
      perms &= ~0x20000n;

      const result = await updateRolePermissions(guildId, everyoneRole.id, perms.toString());
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully revoked dangerous permissions from @everyone role!',
      });
    }

    if (action === 'enable_automod') {
      await prisma.automodConfig.upsert({
        where: { guildId },
        update: {
          antiSpam: true,
          antiInvite: true,
          antiLink: true,
        },
        create: {
          guildId,
          antiSpam: true,
          antiInvite: true,
          antiLink: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'AutoMod baseline security enabled successfully!',
      });
    }

    if (action === 'enable_anti_invites') {
      await prisma.automodConfig.upsert({
        where: { guildId },
        update: { antiInvite: true },
        create: { guildId, antiInvite: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Anti-Invite link filter enabled!',
      });
    }

    if (action === 'fix_all') {
      // 1. Fix everyone perms
      const roles = await getGuildRoles(guildId);
      const everyoneRole = roles.find((r) => r.id === guildId || r.name === '@everyone');
      if (everyoneRole) {
        let perms = BigInt(everyoneRole.permissions || '0');
        perms &= ~0x8n;
        perms &= ~0x20n;
        perms &= ~0x10n;
        perms &= ~0x20000n;
        await updateRolePermissions(guildId, everyoneRole.id, perms.toString());
      }

      // 2. Enable automod
      await prisma.automodConfig.upsert({
        where: { guildId },
        update: {
          antiSpam: true,
          antiInvite: true,
          antiLink: true,
        },
        create: {
          guildId,
          antiSpam: true,
          antiInvite: true,
          antiLink: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'All automated security fixes successfully applied!',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[AuditAPI] Fix Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
