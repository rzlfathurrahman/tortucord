import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';
import { getGuildChannels, getGuildRoles } from '@/lib/discord';

export const dynamic = 'force-dynamic';

const DISCORD_API = 'https://discord.com/api/v10';
const VIEW_CHANNEL_BIT = BigInt(0x400); // 1024

function getWibDateInfo(d = new Date()) {
  const dateStr = d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
  const isoDate = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  return { dateStr, isoDate };
}

const DEFAULT_TEMPLATE =
  `Nama: <Nama Lengkap>\n` +
  `Tanggal: <DD/MM/YYYY>\n` +
  `Done (Kemarin): <Pekerjaan/materi yang telah diselesaikan>\n` +
  `To-Do (Hari ini): <Tugas/rencana kerja hari ini>\n` +
  `Blocker: <Kendala teknis / kebutuhan bantuan, atau '-' jika tidak ada>`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    await getOrCreateGuild(guildId);

    const [rawConfig, allChannels, allRoles] = await Promise.all([
      prisma.standupConfig.findUnique({ where: { guildId } }),
      getGuildChannels(guildId),
      getGuildRoles(guildId),
    ]);

    const config = rawConfig || {
      guildId,
      enabled: true,
      time: '08:30',
      days: [1, 2, 3, 4, 5],
      categoryId: null,
      mentorRoleIds: [],
      standupTemplate: DEFAULT_TEMPLATE,
      deadlineTime: '10:00',
      lastRunDate: null,
    };

    const categories = allChannels.filter((c) => c.type === 'category');
    const activeMagangCategories = categories.filter(
      (c) =>
        (c.name.toLowerCase().includes('magang') || c.name.includes('🎓')) &&
        !c.name.toLowerCase().includes('arsip') &&
        !c.name.toLowerCase().includes('archive')
    );

    const autoDetectedCategory = activeMagangCategories[0] || null;
    const targetCategoryIds = config.categoryId
      ? [config.categoryId]
      : activeMagangCategories.map((c) => c.id);

    // Filter batch channels under target categories
    const batchChannels = targetCategoryIds.length > 0
      ? allChannels.filter(
          (c) =>
            c.type === 'text' &&
            c.parentId &&
            targetCategoryIds.includes(c.parentId) &&
            !c.name.includes('info') &&
            !c.name.includes('tanya') &&
            !c.name.includes('obrolan') &&
            !c.name.includes('onboarding') &&
            !c.name.includes('rule') &&
            !c.name.includes('panduan') &&
            (c.name.startsWith('🔒') ||
              c.name.startsWith('lock-') ||
              /[a-z0-9]+-\d{4}-[a-z0-9]+/i.test(c.name))
        )
      : [];

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        standupTemplate: config.standupTemplate || DEFAULT_TEMPLATE,
      },
      categories,
      autoDetectedCategory,
      batchChannels,
      roles: allRoles,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'schedules');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    await getOrCreateGuild(guildId);
    const body = await request.json();

    const {
      enabled,
      time,
      days,
      categoryId,
      mentorRoleIds,
      standupTemplate,
      deadlineTime,
    } = body;

    const updated = await prisma.standupConfig.upsert({
      where: { guildId },
      create: {
        guildId,
        enabled: enabled ?? true,
        time: time || '08:30',
        days: Array.isArray(days) ? days : [1, 2, 3, 4, 5],
        categoryId: categoryId || null,
        mentorRoleIds: Array.isArray(mentorRoleIds) ? mentorRoleIds : [],
        standupTemplate: standupTemplate || DEFAULT_TEMPLATE,
        deadlineTime: deadlineTime || '10:00',
      },
      update: {
        enabled: enabled ?? true,
        time: time || '08:30',
        days: Array.isArray(days) ? days : [1, 2, 3, 4, 5],
        categoryId: categoryId || null,
        mentorRoleIds: Array.isArray(mentorRoleIds) ? mentorRoleIds : [],
        standupTemplate: standupTemplate || DEFAULT_TEMPLATE,
        deadlineTime: deadlineTime || '10:00',
      },
    });

    return NextResponse.json({ success: true, config: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'schedules');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const { action, force = false, targetChannelId } = body;

  if (action !== 'trigger') {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ success: false, error: 'DISCORD_BOT_TOKEN missing' }, { status: 500 });
  }

  try {
    const [rawConfig, allChannels] = await Promise.all([
      prisma.standupConfig.findUnique({ where: { guildId } }),
      getGuildChannels(guildId),
    ]);

    const config = rawConfig || {
      guildId,
      enabled: true,
      time: '08:30',
      days: [1, 2, 3, 4, 5],
      categoryId: null,
      mentorRoleIds: [],
      standupTemplate: DEFAULT_TEMPLATE,
      deadlineTime: '10:00',
      lastRunDate: null,
    };

    let targetChannels = [];

    if (targetChannelId) {
      const ch = allChannels.find((c) => c.id === targetChannelId);
      if (ch) targetChannels.push(ch);
    } else {
      const categories = allChannels.filter((c) => c.type === 'category');
      const activeMagangCategories = categories.filter(
        (c) =>
          (c.name.toLowerCase().includes('magang') || c.name.includes('🎓')) &&
          !c.name.toLowerCase().includes('arsip') &&
          !c.name.toLowerCase().includes('archive')
      );

      const targetCategoryIds = config.categoryId
        ? [config.categoryId]
        : activeMagangCategories.map((c) => c.id);

      if (targetCategoryIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Kategori Magang aktif tidak ditemukan di server ini.' },
          { status: 400 }
        );
      }

      targetChannels = allChannels.filter(
        (c) =>
          c.type === 'text' &&
          c.parentId &&
          targetCategoryIds.includes(c.parentId) &&
          !c.name.includes('info') &&
          !c.name.includes('tanya') &&
          !c.name.includes('obrolan') &&
          !c.name.includes('onboarding') &&
          !c.name.includes('rule') &&
          !c.name.includes('panduan') &&
          (c.name.startsWith('🔒') ||
            c.name.startsWith('lock-') ||
            /[a-z0-9]+-\d{4}-[a-z0-9]+/i.test(c.name))
      );
    }

    if (targetChannels.length === 0) {
      return NextResponse.json({
        success: true,
        createdCount: 0,
        channels: [],
        message: 'Tidak ada kanal batch magang yang memenuhi syarat untuk dibuka thread standup.',
      });
    }

    const { dateStr, isoDate } = getWibDateInfo();
    const createdChannels: string[] = [];

    for (const ch of targetChannels) {
      try {
        // 1. Check if standup thread already exists for today
        if (!force) {
          const activeThreadsRes = await fetch(`${DISCORD_API}/channels/${ch.id}/threads/active`, {
            headers: { Authorization: `Bot ${token}` },
            cache: 'no-store',
          });

          if (activeThreadsRes.ok) {
            const threadData = await activeThreadsRes.json();
            const threads: any[] = threadData.threads || [];
            const exists = threads.some(
              (t) => t.name.includes(dateStr) && t.name.toLowerCase().includes('standup')
            );
            if (exists) continue;
          }
        }

        // 2. Create thread
        const threadName = `Daily Standup • ${dateStr}`.slice(0, 100);
        const threadRes = await fetch(`${DISCORD_API}/channels/${ch.id}/threads`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: threadName,
            auto_archive_duration: 1440,
            type: 11, // GUILD_PUBLIC_THREAD
            reason: `Daily Standup Magang - ${dateStr}`,
          }),
        });

        if (!threadRes.ok) {
          const errData = await threadRes.json().catch(() => ({}));
          console.warn(`[StandupAPI] Failed to create thread in #${ch.name}:`, errData);
          continue;
        }

        const threadObj = await threadRes.json();
        const threadId = threadObj.id;

        // 3. Mentions
        const rolesToTag: string[] = [];
        const membersToTag: string[] = [];

        if (ch.permissionOverwrites && Array.isArray(ch.permissionOverwrites)) {
          for (const ow of ch.permissionOverwrites) {
            if (ow.id === guildId) continue;
            const allowBig = BigInt(ow.allow || '0');
            if ((allowBig & VIEW_CHANNEL_BIT) === VIEW_CHANNEL_BIT) {
              if (ow.type === 0) {
                rolesToTag.push(`<@&${ow.id}>`);
              } else if (ow.type === 1) {
                membersToTag.push(`<@${ow.id}>`);
              }
            }
          }
        }

        // Add additional mentor roles from config
        if (config.mentorRoleIds && Array.isArray(config.mentorRoleIds)) {
          for (const rid of config.mentorRoleIds) {
            const rTag = `<@&${rid}>`;
            if (!rolesToTag.includes(rTag)) {
              rolesToTag.push(rTag);
            }
          }
        }

        const mentionText = [...rolesToTag, ...membersToTag].join(' ').trim() || '@here';
        const templateContent = (config.standupTemplate || DEFAULT_TEMPLATE).replace(
          '<DD/MM/YYYY>',
          dateStr
        );
        const deadline = config.deadlineTime || '10:00 WIB';

        const embed = {
          color: 0x06b6d4,
          title: `Daily Standup Magang • ${dateStr}`,
          description:
            `Selamat pagi rekan-rekan magang.\n\n` +
            `Thread ini dibuka otomatis untuk laporan **Daily Standup** hari ini. ` +
            `Semua anggota tim yang berada di kanal ini diwajibkan mengirimkan progres harian menggunakan format di bawah ini:`,
          fields: [
            {
              name: 'Format Laporan Harian',
              value: '```yaml\n' + templateContent + '\n```',
            },
            {
              name: 'Batas Pengisian',
              value: `Maksimal pukul **${deadline}**.`,
              inline: true,
            },
            {
              name: 'Review Mentor',
              value: 'Mentor akan memantau dan berdiskusi langsung di thread ini.',
              inline: true,
            },
          ],
          footer: { text: 'Warga Cazh • Internship Daily Routine' },
          timestamp: new Date().toISOString(),
        };

        await fetch(`${DISCORD_API}/channels/${threadId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `${mentionText}\nWaktunya Daily Standup Pagi (${dateStr})`,
            embeds: [embed],
            allowed_mentions: { parse: ['roles', 'users', 'everyone'] },
          }),
        });

        createdChannels.push(ch.name);
      } catch (subErr) {
        console.error(`[StandupAPI] Error processing #${ch.name}:`, subErr);
      }
    }

    if (createdChannels.length > 0) {
      await prisma.standupConfig.upsert({
        where: { guildId },
        create: { guildId, lastRunDate: isoDate },
        update: { lastRunDate: isoDate },
      });
    }

    return NextResponse.json({
      success: true,
      createdCount: createdChannels.length,
      channels: createdChannels,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
