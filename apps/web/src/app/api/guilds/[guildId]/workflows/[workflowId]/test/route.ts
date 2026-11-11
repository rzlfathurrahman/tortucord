import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { isSafeOutboundUrl } from '@/lib/security';
import { checkFeatureAccess } from '@/lib/auth';
import { sendChannelMessage } from '@/lib/discord';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; workflowId: string }> }
) {
  try {
    const { guildId, workflowId } = await params;
    const access = await checkFeatureAccess(guildId, 'workflows');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const workflow = await prisma.actionWorkflow.findFirst({
      where: { id: workflowId, guildId },
    });

    if (!workflow) {
      return NextResponse.json({ success: false, error: 'Workflow not found' }, { status: 404 });
    }

    const actionConfig = (workflow.actionConfig as any) || {};
    let executionResult = 'Executed successfully';
    let status = 'SUCCESS';

    try {
      if (workflow.actionType === 'SEND_CHANNEL_MESSAGE' && actionConfig.targetChannelId) {
        const payload: any = {};
        if (actionConfig.messageContent) {
          payload.content = `[Automation Flow: ${workflow.name}] ${actionConfig.messageContent}`;
        }
        if (actionConfig.embedJson) {
          payload.embeds = [actionConfig.embedJson];
        } else if (!actionConfig.messageContent) {
          payload.embeds = [
            {
              title: `⚡ Workflow Triggered: ${workflow.name}`,
              description: `Trigger: \`${workflow.triggerType}\` • Action: \`${workflow.actionType}\``,
              color: 0x10b981,
              timestamp: new Date().toISOString(),
              footer: { text: 'Tortuga Visual Automation Flow' },
            },
          ];
        }

        const res = await sendChannelMessage(actionConfig.targetChannelId, payload);
        if (!res.success) {
          status = 'FAILED';
          executionResult = res.error || 'Discord API error dispatching channel message';
        } else {
          executionResult = `Message dispatched to channel <#${actionConfig.targetChannelId}>`;
        }
      } else if (workflow.actionType === 'FORWARD_WEBHOOK' && actionConfig.webhookUrl) {
        if (!isSafeOutboundUrl(actionConfig.webhookUrl)) {
          status = 'FAILED';
          executionResult = 'Disallowed webhook destination: Target URL rejected by anti-SSRF security policy (Private/Internal host).';
        } else {
          const fetchRes = await fetch(actionConfig.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'WORKFLOW_TEST',
              workflowId: workflow.id,
              workflowName: workflow.name,
              timestamp: new Date().toISOString(),
            }),
          });
          if (!fetchRes.ok) {
            status = 'FAILED';
            executionResult = `Outbound webhook returned status ${fetchRes.status}`;
          } else {
            executionResult = `Payload forwarded to external webhook endpoint`;
          }
        }
      } else {
        executionResult = `Simulated action \`${workflow.actionType}\` verified successfully (Dry run).`;
      }
    } catch (actErr: any) {
      status = 'FAILED';
      executionResult = actErr.message || 'Execution error';
    }

    // Record workflow log and update metrics
    await prisma.$transaction([
      prisma.workflowLog.create({
        data: {
          workflowId: workflow.id,
          status,
          triggerEvent: `MANUAL_TEST (${workflow.triggerType})`,
          details: executionResult,
        },
      }),
      prisma.actionWorkflow.update({
        where: { id: workflow.id },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: status === 'SUCCESS',
      status,
      details: executionResult,
    });
  } catch (err: any) {
    console.error('[WorkflowTestAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
