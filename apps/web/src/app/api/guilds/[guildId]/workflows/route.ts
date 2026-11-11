import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const access = await checkFeatureAccess(guildId, 'workflows');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const workflows = await prisma.actionWorkflow.findMany({
      where: { guildId },
      include: {
        logs: {
          take: 10,
          orderBy: { executedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalExecutions = workflows.reduce((acc, w) => acc + w.executionCount, 0);
    const activeFlows = workflows.filter((w) => w.isActive).length;

    return NextResponse.json({
      success: true,
      workflows,
      metrics: {
        total: workflows.length,
        active: activeFlows,
        totalExecutions,
      },
    });
  } catch (err: any) {
    console.error('[WorkflowsAPI] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const access = await checkFeatureAccess(guildId, 'workflows');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const {
      name,
      description,
      triggerType,
      triggerConfig,
      conditionType = 'ALWAYS',
      conditionConfig = {},
      actionType,
      actionConfig,
      isActive = true,
    } = body;

    if (!name || !triggerType || !actionType) {
      return NextResponse.json(
        { success: false, error: 'Name, triggerType, and actionType are required' },
        { status: 400 }
      );
    }

    // Ensure guild exists in database
    await prisma.guild.upsert({
      where: { id: guildId },
      create: { id: guildId },
      update: {},
    });

    const workflow = await prisma.actionWorkflow.create({
      data: {
        guildId,
        name,
        description: description || null,
        isActive,
        triggerType,
        triggerConfig: triggerConfig || {},
        conditionType,
        conditionConfig: conditionConfig || {},
        actionType,
        actionConfig: actionConfig || {},
      },
    });

    return NextResponse.json({ success: true, workflow });
  } catch (err: any) {
    console.error('[WorkflowsAPI] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
