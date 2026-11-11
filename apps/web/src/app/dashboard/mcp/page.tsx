'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Copy,
  Check,
  Terminal,
  Server,
  BookOpen,
  Sparkles,
  Shield,
  FileText,
  ExternalLink,
  ChevronRight,
  Zap,
  Globe,
  ArrowLeft,
} from 'lucide-react';

const RAW_MARKDOWN_DOCS = `# 🐢 Tortuga Model Context Protocol (MCP) Server & Agent Harness

> Seamlessly connect AI Coding Assistants & Agent Harnesses (**Claude Code**, **OpenCode**, **Hermes Agent**, **Codex**, **OpenClaw**, **Claude Desktop**, **Cursor**) to your Discord Servers managed by Tortuga.

---

## 🌟 Overview
The **Tortuga MCP Server** implements the open Model Context Protocol (MCP) and OpenAI Function Calling standards. It equips AI models with real-time abilities to:
- 📊 Inspect Discord server structures, channels, roles, and live configurations.
- 🛡️ Execute moderation commands (warn, timeout, kick, ban) and log structured audit cases.
- 🤖 Configure AutoMod rules (anti-spam, anti-invite, drama detection, banned words).
- 📢 Draft, preview, and dispatch rich announcements with embedded Markdown.
- 🧹 Bulk delete spam messages from channels (up to 100 messages at once).
- 🧠 Search and ingest server documentation into Hermes AI Knowledge Base.
- 🎫 Inspect support ticket transcripts and automated workflows.

---

## 🤖 Harness Tools & Agent Support

### 1. Claude Code (\`.mcp.json\`)
Claude Code automatically discovers MCP servers configured in \`.mcp.json\` in the repo root:
\`\`\`json
{
  "mcpServers": {
    "tortuga": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@your-db-host:5432/dbname?schema=public"
      }
    },
    "tortuga-http": {
      "type": "http",
      "url": "https://api.yourdomain.com/api/mcp"
    }
  }
}
\`\`\`
Or connect via CLI:
\`\`\`bash
claude mcp add --transport http tortuga https://api.yourdomain.com/api/mcp
\`\`\`

---

### 2. OpenCode (\`.opencode/mcp.json\` or \`opencode.json\`)
Add this to \`.opencode/mcp.json\` in your workspace:
\`\`\`json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "tortuga": {
      "type": "local",
      "command": ["node", "packages/mcp/dist/index.js"],
      "environment": {
        "DATABASE_URL": "postgresql://user:password@your-db-host:5432/dbname?schema=public"
      }
    },
    "tortuga-remote": {
      "type": "remote",
      "url": "https://api.yourdomain.com/api/mcp"
    }
  }
}
\`\`\`

---

### 3. Hermes Agent (Nous Research / Function Calling)
Hermes Agent consumes standard OpenAI-compatible function calling schemas:
- **Tools Discovery**: \`GET http://<IP>:3000/api/mcp?format=openai\` or \`GET http://<IP>:3000/api/mcp/tools.json\`
- **Execute Tool Call**:
\`\`\`bash
curl -X POST https://api.yourdomain.com/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"name":"tortuga_list_guilds","arguments":{}}'
\`\`\`

---

### 4. Codex (OpenAI Tool Calling)
Easily inject Tortuga tools into Python or Node.js agent runners:
\`\`\`python
import json, urllib.request

# Fetch real-time tool definitions
tools_data = json.loads(urllib.request.urlopen("https://api.yourdomain.com/api/mcp/tools.json").read())
tools = tools_data["tools"]

# Pass directly to openai.chat.completions.create(model="gpt-4o", tools=tools, ...)
\`\`\`

---

### 5. OpenClaw (\`openclaw.yaml\`)
Add \`openclaw.yaml\` in your agent root:
\`\`\`yaml
version: "1.0"
name: "tortuga-discord-harness"
harness:
  protocol: "mcp"
  transport: "http"
  endpoint: "https://api.yourdomain.com/api/mcp"
  tools_url: "https://api.yourdomain.com/api/mcp/tools.json"
local_fallback:
  command: "node"
  args: ["packages/mcp/dist/index.js"]
\`\`\`

---

### 6. Claude Desktop & Cursor IDE
- Claude Desktop config: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- Cursor IDE config: \`.cursor/mcp.json\`
\`\`\`json
{
  "mcpServers": {
    "tortuga": {
      "command": "node",
      "args": ["/absolute/path/to/tortuga/packages/mcp/dist/index.js"],
      "env": {
        "DISCORD_BOT_TOKEN": "your_discord_bot_token",
        "DATABASE_URL": "postgresql://user:password@your-db-host:5432/dbname?schema=public"
      }
    }
  }
}
\`\`\`

---

## 🛠️ Available MCP Tools (19 Tools)
1. **tortuga_system_status**: Check health of Discord gateway, PostgreSQL, and Redis.
2. **tortuga_list_guilds**: List all Discord servers managed by Tortuga bot.
3. **tortuga_get_guild_config**: Retrieve complete guild configuration (prefix, automod, leveling, logging).
4. **tortuga_update_guild_settings**: Update command prefix, locale, or disabled commands.
5. **tortuga_list_channels**: List all channels in guild (text, voice, categories).
6. **tortuga_create_channel**: Create a new text, voice, or category channel.
7. **tortuga_delete_channel**: Delete a channel from a guild.
8. **tortuga_send_message**: Post text or rich embed announcements to a channel.
9. **tortuga_purge_messages**: Bulk purge up to 100 recent messages in a channel.
10. **tortuga_list_roles**: List all roles with hierarchy position and permissions.
11. **tortuga_manage_member_role**: Assign or remove a role to/from a guild member.
12. **tortuga_moderate_member**: Execute WARN, TIMEOUT, KICK, or BAN with case logging.
13. **tortuga_list_infractions**: Retrieve moderation infractions and case history.
14. **tortuga_get_audit_logs**: Query security and guild moderation weblog events.
15. **tortuga_get_automod_rules**: Inspect Anti-Spam, Anti-Invite, and banned words rules.
16. **tortuga_update_automod_rules**: Toggle anti-spam, anti-invite, or update banned words.
17. **tortuga_search_knowledge**: Search Hermes AI knowledge base docs and FAQs.
18. **tortuga_add_knowledge_doc**: Add or update an article in Hermes AI knowledge base.
19. **tortuga_list_tickets**: List open/closed support tickets for a guild.
`;

export default function McpDocsPage() {
  const [activeTab, setActiveTab] = useState<'setup' | 'tools' | 'markdown'>('setup');
  const [harnessFilter, setHarnessFilter] = useState<'all' | 'claude-code' | 'opencode' | 'hermes' | 'codex' | 'openclaw' | 'desktop'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState('http://localhost:3000');
  const [toolsList, setToolsList] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    // Fetch live tools from /api/mcp
    fetch('/api/mcp')
      .then((r) => r.json())
      .then((data) => {
        if (data.tools) {
          setToolsList(data.tools);
        }
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const claudeCodeConfig = JSON.stringify(
    {
      mcpServers: {
        tortuga: {
          command: 'node',
          args: ['packages/mcp/dist/index.js'],
          env: {
            DATABASE_URL: 'postgresql://user:password@your-db-host:5432/dbname?schema=public',
          },
        },
        'tortuga-http': {
          type: 'http',
          url: `${origin}/api/mcp`,
        },
      },
    },
    null,
    2
  );

  const openCodeConfig = JSON.stringify(
    {
      $schema: 'https://opencode.ai/config.json',
      mcp: {
        tortuga: {
          type: 'local',
          command: ['node', 'packages/mcp/dist/index.js'],
          environment: {
            DATABASE_URL: 'postgresql://user:password@your-db-host:5432/dbname?schema=public',
          },
        },
        'tortuga-remote': {
          type: 'remote',
          url: `${origin}/api/mcp`,
        },
      },
    },
    null,
    2
  );

  const hermesCurl = `curl -X POST ${origin}/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"name":"tortuga_list_guilds","arguments":{}}'`;

  const codexPython = `import json, urllib.request

# Load Tortuga tools in standard OpenAI Function Calling schema
tools_url = "${origin}/api/mcp/tools.json"
tools = json.loads(urllib.request.urlopen(tools_url).read())["tools"]

# Pass tools to OpenAI completion or agent runner
# response = openai.chat.completions.create(model="gpt-4o", tools=tools, messages=messages)`;

  const openClawYaml = `version: "1.0"
name: "tortuga-discord-harness"
harness:
  protocol: "mcp"
  transport: "http"
  endpoint: "${origin}/api/mcp"
  tools_url: "${origin}/api/mcp/tools.json"
local_fallback:
  command: "node"
  args: ["packages/mcp/dist/index.js"]`;

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        tortuga: {
          command: 'node',
          args: ['/path/to/tortuga/packages/mcp/dist/index.js'],
          env: {
            DISCORD_BOT_TOKEN: 'your_discord_bot_token_here',
            DATABASE_URL: 'postgresql://user:password@your-db-host:5432/dbname?schema=public',
          },
        },
      },
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        tortuga: {
          command: 'node',
          args: ['${workspaceFolder}/packages/mcp/dist/index.js'],
          env: {
            DISCORD_BOT_TOKEN: 'your_discord_bot_token_here',
            DATABASE_URL: 'postgresql://user:password@your-db-host:5432/dbname?schema=public',
          },
        },
      },
    },
    null,
    2
  );

  const sshRemoteConfig = JSON.stringify(
    {
      mcpServers: {
        'tortuga-dev': {
          command: 'ssh',
          args: [
            'remote-server',
            'docker compose --project-directory /opt/tortucord exec -T bot node /app/packages/mcp/dist/index.js',
          ],
        },
      },
    },
    null,
    2
  );

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 flex flex-col">
      {/* Top Breadcrumb & Actions */}
      <header className="border-b border-white/[0.08] bg-[#0d0f17]/80 backdrop-blur-md sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-white">
                  Model Context Protocol (MCP) Server
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live & Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'setup'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Setup & Clients
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'tools'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Tools Reference</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300">
              {toolsList.length || 19}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'markdown'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw Docs (md)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Intro Hero Card */}
        <div className="relative rounded-2xl border border-white/[0.05] bg-gradient-to-br from-[#0e111a] to-[#0a0a0c] p-6 md:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tortuga AI Integration Engine</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Connect Any AI Assistant & Harness Directly
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Full native support for <strong className="text-zinc-200">Claude Code</strong>,{' '}
              <strong className="text-zinc-200">OpenCode</strong>,{' '}
              <strong className="text-zinc-200">Hermes Agent</strong>,{' '}
              <strong className="text-zinc-200">Codex</strong>,{' '}
              <strong className="text-zinc-200">OpenClaw</strong>, and{' '}
              <strong className="text-zinc-200">Claude Desktop / Cursor</strong>.
              Audit servers, execute moderation, manage roles, purge spam, and draft announcements.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>JSON-RPC: </span>
                <code className="px-2 py-0.5 rounded bg-black/40 text-emerald-300 font-mono border border-white/[0.05]">
                  {origin}/api/mcp
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>OpenAI Tools: </span>
                <code className="px-2 py-0.5 rounded bg-black/40 text-amber-300 font-mono border border-white/[0.05]">
                  {origin}/api/mcp/tools.json
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>Package: </span>
                <code className="px-2 py-0.5 rounded bg-black/40 text-sky-300 font-mono border border-white/[0.05]">
                  @tortuga/mcp
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: SETUP & CLIENTS */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <span>Harness & Client Configurations</span>
              </h3>

              {/* Subfilters */}
              <div className="flex flex-wrap items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.05] text-xs">
                {(
                  [
                    { id: 'all', label: 'All Harnesses' },
                    { id: 'claude-code', label: 'Claude Code' },
                    { id: 'opencode', label: 'OpenCode' },
                    { id: 'hermes', label: 'Hermes Agent' },
                    { id: 'codex', label: 'Codex' },
                    { id: 'openclaw', label: 'OpenClaw' },
                    { id: 'desktop', label: 'Desktop & SSH' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setHarnessFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      harnessFilter === f.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Claude Code */}
              {(harnessFilter === 'all' || harnessFilter === 'claude-code') && (
                <div className="rounded-2xl border border-white/[0.05] bg-[#0e111a] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
                        CC
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Claude Code</h4>
                        <p className="text-[11px] text-zinc-400">.mcp.json in repository root</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(claudeCodeConfig, 'claude-code')}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs"
                    >
                      {copiedKey === 'claude-code' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'claude-code' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#08090d] border border-white/[0.04] text-xs font-mono text-zinc-300 overflow-x-auto">
                    {claudeCodeConfig}
                  </pre>
                  <p className="text-[11px] text-zinc-400">
                    Run CLI command:{' '}
                    <code className="text-emerald-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                      claude mcp add --transport http tortuga {origin}/api/mcp
                    </code>
                  </p>
                </div>
              )}

              {/* 2. OpenCode */}
              {(harnessFilter === 'all' || harnessFilter === 'opencode') && (
                <div className="rounded-2xl border border-white/[0.05] bg-[#0e111a] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        OC
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">OpenCode</h4>
                        <p className="text-[11px] text-zinc-400">.opencode/mcp.json or opencode.json</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(openCodeConfig, 'opencode')}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs"
                    >
                      {copiedKey === 'opencode' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'opencode' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#08090d] border border-white/[0.04] text-xs font-mono text-zinc-300 overflow-x-auto">
                    {openCodeConfig}
                  </pre>
                  <p className="text-[11px] text-zinc-400">
                    Works automatically when launching <code className="text-emerald-400">opencode</code> in repo.
                  </p>
                </div>
              )}

              {/* 3. Hermes Agent */}
              {(harnessFilter === 'all' || harnessFilter === 'hermes') && (
                <div className="rounded-2xl border border-white/[0.05] bg-[#0e111a] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                        HA
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Hermes Agent</h4>
                        <p className="text-[11px] text-zinc-400">OpenAI Functions Schema & Direct REST</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(hermesCurl, 'hermes')}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs"
                    >
                      {copiedKey === 'hermes' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'hermes' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#08090d] border border-white/[0.04] text-xs font-mono text-zinc-300 overflow-x-auto">
                    {hermesCurl}
                  </pre>
                  <p className="text-[11px] text-zinc-400">
                    Discovery URL:{' '}
                    <code className="text-purple-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                      {origin}/api/mcp?format=openai
                    </code>
                  </p>
                </div>
              )}

              {/* 4. Codex */}
              {(harnessFilter === 'all' || harnessFilter === 'codex') && (
                <div className="rounded-2xl border border-white/[0.05] bg-[#0e111a] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        CX
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Codex / OpenAI Tools</h4>
                        <p className="text-[11px] text-zinc-400">OpenAI Tool Calling standard format</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(codexPython, 'codex')}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs"
                    >
                      {copiedKey === 'codex' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'codex' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#08090d] border border-white/[0.04] text-xs font-mono text-zinc-300 overflow-x-auto">
                    {codexPython}
                  </pre>
                  <p className="text-[11px] text-zinc-400">
                    Endpoint: <code className="text-blue-400">{origin}/api/mcp/tools.json</code>
                  </p>
                </div>
              )}

              {/* 5. OpenClaw */}
              {(harnessFilter === 'all' || harnessFilter === 'openclaw') && (
                <div className="rounded-2xl border border-white/[0.05] bg-[#0e111a] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                        OCL
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">OpenClaw</h4>
                        <p className="text-[11px] text-zinc-400">openclaw.yaml configuration</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(openClawYaml, 'openclaw')}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs"
                    >
                      {copiedKey === 'openclaw' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'openclaw' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#08090d] border border-white/[0.04] text-xs font-mono text-zinc-300 overflow-x-auto">
                    {openClawYaml}
                  </pre>
                  <p className="text-[11px] text-zinc-400">
                    Pre-configured in repo root: <code className="text-red-400">openclaw.yaml</code>
                  </p>
                </div>
              )}

              {/* 6. Claude Desktop */}
              {(harnessFilter === 'all' || harnessFilter === 'desktop') && (
                <div className="rounded-2xl border border-white/[0.05] bg-[#0e111a] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
                        C
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Claude Desktop</h4>
                        <p className="text-[11px] text-zinc-400">claude_desktop_config.json</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(claudeConfig, 'claude')}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs"
                    >
                      {copiedKey === 'claude' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'claude' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#08090d] border border-white/[0.04] text-xs font-mono text-zinc-300 overflow-x-auto">
                    {claudeConfig}
                  </pre>
                </div>
              )}

              {/* 7. Cursor IDE */}
              {(harnessFilter === 'all' || harnessFilter === 'desktop') && (
                <div className="rounded-2xl border border-white/[0.05] bg-[#0e111a] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                        ⚡
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Cursor IDE</h4>
                        <p className="text-[11px] text-zinc-400">.cursor/mcp.json</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(cursorConfig, 'cursor')}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs"
                    >
                      {copiedKey === 'cursor' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'cursor' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#08090d] border border-white/[0.04] text-xs font-mono text-zinc-300 overflow-x-auto">
                    {cursorConfig}
                  </pre>
                </div>
              )}

              {/* 8. Remote SSH (Thinkpad Dev Server) */}
              {(harnessFilter === 'all' || harnessFilter === 'desktop') && (
                <div className="rounded-2xl border border-white/[0.05] bg-[#0e111a] p-5 space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        SSH
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          Remote Thinkpad Dev Server via SSH Transport
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          Executes directly inside Thinkpad bot container from your laptop
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(sshRemoteConfig, 'ssh')}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs"
                    >
                      {copiedKey === 'ssh' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'ssh' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#08090d] border border-white/[0.04] text-xs font-mono text-zinc-300 overflow-x-auto">
                    {sshRemoteConfig}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TOOLS REFERENCE */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Available MCP Tools</span>
              </h3>
              <span className="text-xs text-zinc-400">
                Total: <strong className="text-white">{toolsList.length || 19}</strong> tools
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(toolsList.length > 0
                ? toolsList
                : [
                    {
                      name: 'tortuga_system_status',
                      description: 'Get operational health of bot gateway, PostgreSQL, and Redis',
                    },
                    {
                      name: 'tortuga_list_guilds',
                      description: 'List all Discord servers managed by Tortuga bot with member count',
                    },
                    {
                      name: 'tortuga_get_guild_config',
                      description: 'Retrieve full configuration (prefix, automod, leveling, logging)',
                    },
                    {
                      name: 'tortuga_update_guild_settings',
                      description: 'Update command prefix, locale, or disabled commands',
                    },
                    {
                      name: 'tortuga_list_channels',
                      description: 'List all channels in guild (text, voice, categories)',
                    },
                    {
                      name: 'tortuga_create_channel',
                      description: 'Create a new text, voice, or category channel',
                    },
                    {
                      name: 'tortuga_delete_channel',
                      description: 'Delete a channel from a guild',
                    },
                    {
                      name: 'tortuga_send_message',
                      description: 'Post text or rich embed announcements to a channel',
                    },
                    {
                      name: 'tortuga_purge_messages',
                      description: 'Bulk purge up to 100 recent messages in a channel',
                    },
                    {
                      name: 'tortuga_list_roles',
                      description: 'List all roles with hierarchy position and permissions',
                    },
                    {
                      name: 'tortuga_manage_member_role',
                      description: 'Assign or remove a role to/from a guild member',
                    },
                    {
                      name: 'tortuga_moderate_member',
                      description: 'Execute WARN, TIMEOUT, KICK, or BAN with case logging',
                    },
                    {
                      name: 'tortuga_list_infractions',
                      description: 'Retrieve moderation infractions and case history',
                    },
                    {
                      name: 'tortuga_get_audit_logs',
                      description: 'Query security and guild moderation weblog events',
                    },
                    {
                      name: 'tortuga_get_automod_rules',
                      description: 'Inspect Anti-Spam, Anti-Invite, and banned words rules',
                    },
                    {
                      name: 'tortuga_update_automod_rules',
                      description: 'Toggle anti-spam, anti-invite, or update banned words',
                    },
                    {
                      name: 'tortuga_search_knowledge',
                      description: 'Search Hermes AI knowledge base docs and FAQs',
                    },
                    {
                      name: 'tortuga_add_knowledge_doc',
                      description: 'Add or update an article in Hermes AI knowledge base',
                    },
                    {
                      name: 'tortuga_list_tickets',
                      description: 'List open/closed support tickets for a guild',
                    },
                  ]
              ).map((t, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.05] bg-[#0e111a] p-4 space-y-2 hover:border-emerald-500/30 transition"
                >
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {t.name}
                    </code>
                    <span className="text-[10px] text-zinc-500 font-mono">Tool #{i + 1}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RAW MARKDOWN DOCUMENTATION */}
        {activeTab === 'markdown' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span>Markdown Documentation</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Ready to copy and paste into any AI system prompt or documentation repo
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(RAW_MARKDOWN_DOCS, 'full_md')}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {copiedKey === 'full_md' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedKey === 'full_md' ? 'Markdown Copied!' : 'Copy Full Markdown'}</span>
              </button>
            </div>

            <div className="rounded-2xl border border-white/[0.05] bg-[#0e111a] p-6 shadow-2xl">
              <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto selection:bg-emerald-500/30">
                {RAW_MARKDOWN_DOCS}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
