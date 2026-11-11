import { NextRequest, NextResponse } from 'next/server';
import { createTortugaMcpServer, toInputJsonSchema } from '@tortuga/mcp';

export const dynamic = 'force-dynamic';

let mcpServerInstance: ReturnType<typeof createTortugaMcpServer> | null = null;

function getMcpServer() {
  if (!mcpServerInstance) {
    mcpServerInstance = createTortugaMcpServer();
  }
  return mcpServerInstance;
}

export async function GET(request: NextRequest) {
  const server = getMcpServer();
  const toolsMap = (server as any)._registeredTools || {};

  const tools = Object.entries(toolsMap).map(([name, t]: [string, any]) => ({
    type: 'function',
    function: {
      name,
      description: t.description,
      parameters: toInputJsonSchema(t.inputSchema),
    },
  }));

  return NextResponse.json({
    format: 'openai-function-calling',
    count: tools.length,
    tools,
  });
}
