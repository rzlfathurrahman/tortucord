import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';

export const dynamic = 'force-dynamic';

const DISCORD_API = 'https://discord.com/api/v10';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const webhook = await prisma.inboundWebhook.findUnique({
      where: { token },
      include: { guild: true },
    });

    if (!webhook || !webhook.isActive) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found or inactive' },
        { status: 404 }
      );
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { success: false, error: 'Bot token not configured' },
        { status: 500 }
      );
    }

    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      rawBody = { raw: await request.text() };
    }

    const githubEvent = request.headers.get('x-github-event');
    let messagePayload: any = null;

    // TRANSFORMERS
    if (webhook.provider === 'github' || githubEvent) {
      if (githubEvent === 'push' || rawBody.commits) {
        const repo = rawBody.repository?.full_name || 'Repository';
        const branch = (rawBody.ref || '').replace('refs/heads/', '');
        const pusher = rawBody.pusher?.name || rawBody.sender?.login || 'User';
        const commits = (rawBody.commits || []).slice(0, 5);

        messagePayload = {
          embeds: [
            {
              title: `🔨 [${repo}:${branch}] ${commits.length} new commit(s)`,
              url: rawBody.compare || rawBody.repository?.html_url,
              color: 0x238636, // GitHub Green
              author: {
                name: pusher,
                icon_url: rawBody.sender?.avatar_url,
                url: rawBody.sender?.html_url,
              },
              description: commits
                .map(
                  (c: any) =>
                    `[\`${c.id.slice(0, 7)}\`](${c.url}) ${c.message.split('\n')[0]} - *${c.author?.name || pusher}*`
                )
                .join('\n'),
              footer: {
                text: `GitHub Push • ${repo}`,
                icon_url: 'https://github.githubassets.com/favicons/favicon.png',
              },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      } else if (githubEvent === 'pull_request') {
        const pr = rawBody.pull_request;
        const repo = rawBody.repository?.full_name || 'Repository';
        const action = rawBody.action || 'opened';

        messagePayload = {
          embeds: [
            {
              title: `🔀 [${repo}] Pull Request #${pr?.number || '?'}: ${pr?.title || 'PR'} (${action})`,
              url: pr?.html_url,
              color: action === 'closed' ? (pr?.merged ? 0x8957e5 : 0xda3633) : 0x238636,
              author: {
                name: pr?.user?.login || 'GitHub',
                icon_url: pr?.user?.avatar_url,
              },
              description: pr?.body ? pr.body.slice(0, 300) + '...' : 'No description provided.',
              fields: [
                { name: 'Base', value: `\`${pr?.base?.ref}\``, inline: true },
                { name: 'Head', value: `\`${pr?.head?.ref}\``, inline: true },
              ],
              footer: { text: `GitHub Pull Request • ${repo}` },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      } else {
        // Other GitHub event
        messagePayload = {
          embeds: [
            {
              title: `🔔 GitHub Event: ${githubEvent || 'Notification'}`,
              color: 0x5865f2,
              description: `Received event from **${rawBody.repository?.full_name || 'GitHub'}**.`,
              footer: { text: 'GitHub Integration' },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
    } else if (webhook.provider === 'uptimekuma') {
      const isUp = rawBody.heartbeat?.status === 1 || rawBody.status === 'up' || rawBody.heartbeat?.status === 'up';
      const monitorName = rawBody.monitor?.name || rawBody.name || 'Service Monitor';
      const monitorUrl = rawBody.monitor?.url || rawBody.url || '';
      const ping = rawBody.heartbeat?.ping ?? rawBody.ping ?? 0;
      const msg = rawBody.msg || rawBody.heartbeat?.msg || (isUp ? 'Service is operational' : 'Service is DOWN');

      const fields: any[] = [];
      if (ping) fields.push({ name: 'Ping', value: `${ping}ms`, inline: true });
      if (monitorUrl) fields.push({ name: 'Target URL', value: `\`${monitorUrl}\``, inline: true });
      fields.push({ name: 'Time', value: new Date().toLocaleTimeString(), inline: true });

      messagePayload = {
        embeds: [
          {
            title: `${isUp ? '🟢 [UP]' : '🔴 [DOWN]'} ${monitorName}`,
            url: monitorUrl || undefined,
            description: `**Status:** ${msg}`,
            color: isUp ? 0x10b981 : 0xef4444,
            fields,
            footer: { text: 'Uptime Kuma • Homelab Monitoring' },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else if (webhook.provider === 'grafana') {
      // Support Grafana 9+ Unified Alerting format
      if (rawBody.alerts && Array.isArray(rawBody.alerts) && rawBody.alerts.length > 0) {
        const isFiring = rawBody.status === 'firing';
        const alertCount = rawBody.alerts.length;
        const mainAlert = rawBody.alerts[0];
        const title = rawBody.title || mainAlert.labels?.alertname || 'Grafana Alert';
        const severity = (mainAlert.labels?.severity || 'warning').toLowerCase();

        let color = 0x10b981; // Green for resolved
        if (isFiring) {
          color = severity === 'critical' ? 0xef4444 : 0xf59e0b; // Red or Orange
        }

        const fields: any[] = [];
        if (mainAlert.labels?.pod) {
          fields.push({ name: 'Pod', value: `\`${mainAlert.labels.pod}\``, inline: true });
        }
        if (mainAlert.labels?.namespace) {
          fields.push({ name: 'Namespace', value: `\`${mainAlert.labels.namespace}\``, inline: true });
        }
        if (mainAlert.labels?.severity) {
          fields.push({ name: 'Severity', value: `\`${severity.toUpperCase()}\``, inline: true });
        }

        const desc =
          mainAlert.annotations?.description ||
          mainAlert.annotations?.summary ||
          rawBody.message ||
          'Metric threshold breached.';

        messagePayload = {
          embeds: [
            {
              title: `${isFiring ? '🚨 [FIRING]' : '✅ [RESOLVED]'} ${title}${alertCount > 1 ? ` (${alertCount} instances)` : ''}`,
              url: mainAlert.dashboardURL || mainAlert.panelURL || undefined,
              description: desc,
              color,
              fields: fields.length > 0 ? fields : undefined,
              footer: { text: 'Grafana Telemetry • ThinkPad Cluster' },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      } else {
        // Grafana legacy format fallback
        const title = rawBody.title || rawBody.ruleName || 'Grafana Alert';
        const state = (rawBody.state || 'alerting').toLowerCase();
        const isAlerting = state === 'alerting';

        messagePayload = {
          embeds: [
            {
              title: `${isAlerting ? '⚠️ [ALERT]' : '✅ [RESOLVED]'} ${title}`,
              description: rawBody.message || 'Grafana metric threshold breached.',
              color: isAlerting ? 0xf59e0b : 0x10b981,
              footer: { text: 'Grafana Telemetry • ThinkPad Cluster' },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
    } else if (webhook.provider === 'radar' || rawBody.source === 'radar') {
      // Skyhook Radar (Kubernetes AI investigation & anomalies)
      const title = rawBody.title || rawBody.summary || 'Radar Investigation Finding';
      const severity = (rawBody.severity || 'warning').toLowerCase();
      const status = rawBody.status || 'Active';
      const isCritical = severity === 'critical' || severity === 'error';

      messagePayload = {
        embeds: [
          {
            title: `📡 [RADAR] ${title}`,
            url: rawBody.url || 'http://127.0.0.1:9280',
            description: rawBody.description || rawBody.message || 'Cluster anomaly or investigation insight detected.',
            color: isCritical ? 0xef4444 : 0x06b6d4, // Cyan or Red
            fields: [
              { name: 'Target Resource', value: `\`${rawBody.resource || rawBody.target || 'Cluster'}\``, inline: true },
              { name: 'Status', value: status, inline: true },
              { name: 'Severity', value: severity.toUpperCase(), inline: true },
            ],
            footer: { text: 'Skyhook Radar • Kubernetes Intelligence' },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else {
      // Generic Webhook
      if (rawBody.content || rawBody.embeds) {
        // Direct Discord-compatible webhook payload
        messagePayload = rawBody;
      } else if (rawBody.title || rawBody.message || rawBody.text || rawBody.description) {
        // Smart generic formatter (e.g. Beszel, custom alerts, HTTP webhooks)
        const isErr = rawBody.status === 'down' || rawBody.status === 'error' || rawBody.level === 'error';
        const isOk = rawBody.status === 'up' || rawBody.status === 'ok' || rawBody.status === 'success';

        messagePayload = {
          embeds: [
            {
              title: `🔔 ${rawBody.title || webhook.name}`,
              description: rawBody.description || rawBody.message || rawBody.text || 'Received webhook notification.',
              color: isErr ? 0xef4444 : (isOk ? 0x10b981 : 0x5865f2),
              fields: Object.entries(rawBody)
                .filter(([k, v]) => !['title', 'description', 'message', 'text', 'color', 'embeds', 'status'].includes(k) && typeof v !== 'object')
                .slice(0, 6)
                .map(([name, value]) => ({ name, value: String(value), inline: true })),
              footer: { text: `Tortuga Webhook Hub • ${webhook.provider}` },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      } else {
        // Prettify generic JSON into embed codeblock
        messagePayload = {
          embeds: [
            {
              title: `📨 Inbound Webhook: ${webhook.name}`,
              color: 0x5865f2,
              description: '```json\n' + JSON.stringify(rawBody, null, 2).slice(0, 1900) + '\n```',
              footer: { text: 'Tortuga Webhook Hub' },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
    }

    // Dispatch to Discord
    const discordRes = await fetch(
      `${DISCORD_API}/channels/${webhook.targetChannelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const status = discordRes.ok ? 200 : discordRes.status;
    let errDetail: string | null = null;
    if (!discordRes.ok) {
      const errJson = await discordRes.json().catch(() => ({}));
      errDetail = errJson.message || discordRes.statusText;
    }

    // Save Log
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        status,
        payloadJson: rawBody,
        error: errDetail,
      },
    });

    if (!discordRes.ok) {
      return NextResponse.json(
        { success: false, error: errDetail || 'Failed to dispatch to Discord channel' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, delivered: true });
  } catch (err: any) {
    console.error('[WebhookReceiver] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
