import { NextRequest, NextResponse } from 'next/server';
import { createTortugaMcpServer, toInputJsonSchema } from '@tortuga/mcp';

export const dynamic = 'force-dynamic';

// Singleton MCP server instance for web API
let mcpServerInstance: ReturnType<typeof createTortugaMcpServer> | null = null;

function getMcpServer() {
  if (!mcpServerInstance) {
    mcpServerInstance = createTortugaMcpServer();
  }
  return mcpServerInstance;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  const server = getMcpServer();
  const toolsMap = (server as any)._registeredTools || {};
  const resourcesMap = (server as any)._registeredResources || {};
  const promptsMap = (server as any)._registeredPrompts || {};

  const tools = Object.entries(toolsMap).map(([name, t]: [string, any]) => ({
    name,
    description: t.description,
    inputSchema: toInputJsonSchema(t.inputSchema),
  }));

  // Hermes Agent, Codex, and OpenAI Function Calling format support
  if (format === 'openai' || format === 'hermes' || format === 'codex' || format === 'tools') {
    const openaiTools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    return NextResponse.json({
      format: 'openai-function-calling',
      count: openaiTools.length,
      tools: openaiTools,
    });
  }

  const resources = Object.entries(resourcesMap).map(([uri, r]: [string, any]) => ({
    uri,
    name: r.name,
    description: r.description,
  }));

  const prompts = Object.entries(promptsMap).map(([name, p]: [string, any]) => ({
    name,
    description: p.description,
  }));

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
  const endpointUrl = `${proto}://${host}/api/mcp`;

  return NextResponse.json({
    service: 'Tortuga Discord Model Context Protocol (MCP) Server',
    version: '1.0.0',
    protocolVersion: '2024-11-05',
    endpoint: endpointUrl,
    supportedHarnesses: ['claude-code', 'opencode', 'hermes-agent', 'codex', 'openclaw', 'cursor', 'windsurf'],
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false },
      prompts: { listChanged: false },
    },
    toolsCount: tools.length,
    tools,
    resources,
    prompts,
    openAiToolsUrl: `${endpointUrl}?format=openai`,
    documentation: `${proto}://${host}/dashboard/mcp`,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const server = getMcpServer();
    const toolsMap = (server as any)._registeredTools || {};
    const resourcesMap = (server as any)._registeredResources || {};
    const promptsMap = (server as any)._registeredPrompts || {};

    // 0. Support Direct REST Execution (Hermes Agent, Codex, OpenClaw, curl)
    const directToolName = body.name || body.tool || body.function?.name;
    if (!body.method && directToolName) {
      let directArgs = body.arguments ?? body.input ?? body.parameters ?? body.function?.arguments ?? {};
      if (typeof directArgs === 'string') {
        try {
          directArgs = JSON.parse(directArgs);
        } catch {
          // ignore
        }
      }

      const tool = toolsMap[directToolName];
      if (!tool) {
        return NextResponse.json(
          {
            error: `Unknown tool: ${directToolName}`,
            availableTools: Object.keys(toolsMap),
          },
          { status: 404 }
        );
      }

      const result = await tool.handler(directArgs);
      return NextResponse.json({
        success: true,
        tool: directToolName,
        result,
      });
    }

    const { jsonrpc = '2.0', id = 1, method, params = {} } = body;

    // 1. Initialize
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc,
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: 'tortuga-discord-mcp',
            version: '1.0.0',
          },
        },
      });
    }

    // 2. Tools List
    if (method === 'tools/list') {
      const tools = Object.entries(toolsMap).map(([name, t]: [string, any]) => ({
        name,
        description: t.description,
        inputSchema: toInputJsonSchema(t.inputSchema),
      }));

      return NextResponse.json({
        jsonrpc,
        id,
        result: { tools },
      });
    }

    // 3. Tools Call
    if (method === 'tools/call') {
      const toolName = params.name || params.tool;
      let args = params.arguments ?? params.input ?? params.parameters ?? {};
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch {
          // ignore
        }
      }

      const tool = toolsMap[toolName];
      if (!tool) {
        return NextResponse.json({
          jsonrpc,
          id,
          error: {
            code: -32601,
            message: `Unknown tool: ${toolName}`,
          },
        });
      }

      const result = await tool.handler(args);
      return NextResponse.json({
        jsonrpc,
        id,
        result,
      });
    }

    // 4. Resources List
    if (method === 'resources/list') {
      const resources = Object.entries(resourcesMap).map(([uri, r]: [string, any]) => ({
        uri,
        name: r.name,
        description: r.description,
      }));

      return NextResponse.json({
        jsonrpc,
        id,
        result: { resources },
      });
    }

    // 5. Prompts List
    if (method === 'prompts/list') {
      const prompts = Object.entries(promptsMap).map(([name, p]: [string, any]) => ({
        name,
        description: p.description,
      }));

      return NextResponse.json({
        jsonrpc,
        id,
        result: { prompts },
      });
    }

    // 6. Prompts Get
    if (method === 'prompts/get') {
      const { name, arguments: args = {} } = params;
      const prompt = promptsMap[name];

      if (!prompt) {
        return NextResponse.json({
          jsonrpc,
          id,
          error: {
            code: -32601,
            message: `Unknown prompt: ${name}`,
          },
        });
      }

      const result = await prompt.handler(args);
      return NextResponse.json({
        jsonrpc,
        id,
        result,
      });
    }

    return NextResponse.json({
      jsonrpc,
      id,
      error: {
        code: -32601,
        message: `Method not implemented: ${method}`,
      },
    });
  } catch (err: any) {
    console.error('[MCP Route] Error handling request:', err);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: err.message || 'Internal error',
        },
      },
      { status: 500 }
    );
  }
}
