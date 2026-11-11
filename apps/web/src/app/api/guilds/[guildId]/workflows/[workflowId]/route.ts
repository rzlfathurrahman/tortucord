import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; workflowId: string }> }
) {
  try {
    const { guildId, workflowId } = await params;
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
      conditionType,
      conditionConfig,
      actionType,
      actionConfig,
      isActive,
    } = body;

    const existing = await prisma.actionWorkflow.findFirst({
      where: { id: workflowId, guildId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Workflow not found' }, { status: 404 });
    }

    const updated = await prisma.actionWorkflow.update({
      where: { id: workflowId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(triggerType !== undefined && { triggerType }),
        ...(triggerConfig !== undefined && { triggerConfig }),
        ...(conditionType !== undefined && { conditionType }),
        ...(conditionConfig !== undefined && { conditionConfig }),
        ...(actionType !== undefined && { actionType }),
        ...(actionConfig !== undefined && { actionConfig }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, workflow: updated });
  } catch (err: any) {
    console.error('[WorkflowsAPI] PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; workflowId: string }> }
) {
  try {
    const { guildId, workflowId } = await params;
    const access = await checkFeatureAccess(guildId, 'workflows');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await prisma.actionWorkflow.deleteMany({
      where: { id: workflowId, guildId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[WorkflowsAPI] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
