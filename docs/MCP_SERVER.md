# 🐢 Tortuga Model Context Protocol (MCP) Server

> **Seamlessly connect AI Coding Assistants (Claude Desktop, Cursor, Antigravity, Windsurf, Cline) to your Discord Servers managed by Tortuga.**

---

## 🌟 Overview

The **Tortuga MCP Server** implements the open [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) specification. It equips AI models with real-time abilities to:
- 📊 Inspect Discord server structures, channels, roles, and live configurations.
- 🛡️ Execute moderation commands (warn, timeout, kick, ban) and log structured audit cases.
- 🤖 Configure AutoMod rules (anti-spam, anti-invite, drama detection, banned words).
- 📢 Draft, preview, and dispatch rich announcements with embedded Markdown.
- 🧹 Bulk delete spam messages from channels (up to 100 messages at once).
- 🧠 Search and ingest server documentation into Hermes AI Knowledge Base.
- 🎫 Inspect support ticket transcripts and automated workflow flows.

---

## 🚀 Quick Setup & Harness Tool Configurations

You can connect your AI assistant using **Standard MCP (STDIO or HTTP JSON-RPC)** or **OpenAI Function Calling (REST)**.

### 1. Claude Code (\`.mcp.json\`)
Claude Code automatically discovers MCP servers configured in \`.mcp.json\` in the repo root:
```json
{
  "mcpServers": {
    "tortuga": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://tortuga:tortugapassword@localhost:5434/tortugadb?schema=public"
      }
    },
    "tortuga-http": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```
Or via CLI command:
```bash
claude mcp add --transport http tortuga http://localhost:3000/api/mcp
```

---

### 2. OpenCode (\`.opencode/mcp.json\` / \`opencode.json\`)
Add to `.opencode/mcp.json` in your repository:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "tortuga": {
      "type": "local",
      "command": ["node", "packages/mcp/dist/index.js"],
      "environment": {
        "DATABASE_URL": "postgresql://tortuga:tortugapassword@localhost:5434/tortugadb?schema=public"
      }
    },
    "tortuga-remote": {
      "type": "remote",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

---

### 3. Hermes Agent (Nous Research / OpenAI Function Calling)
Hermes Agent consumes tools formatted in standard OpenAI JSON schemas:
- **Discover Tools**: `GET http://localhost:3000/api/mcp?format=openai` or `GET http://localhost:3000/api/mcp/tools.json`
- **Direct Tool Execution**:
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"name": "tortuga_list_guilds", "arguments": {}}'
```

---

### 4. Codex (OpenAI Tool Calling Agents)
Load tools directly in Python or Node agent runners:
```python
import json, urllib.request

tools_url = "http://localhost:3000/api/mcp/tools.json"
tools = json.loads(urllib.request.urlopen(tools_url).read())["tools"]

# Pass directly to OpenAI client
# response = client.chat.completions.create(model="gpt-4o", tools=tools, messages=[...])
```

---

### 5. OpenClaw (\`openclaw.yaml\`)
Add `openclaw.yaml` in your project root:
```yaml
version: "1.0"
name: "tortuga-discord-harness"
harness:
  protocol: "mcp"
  transport: "http"
  endpoint: "http://localhost:3000/api/mcp"
  tools_url: "http://localhost:3000/api/mcp/tools.json"
local_fallback:
  command: "node"
  args: ["packages/mcp/dist/index.js"]
```

---

### 6. Claude Desktop
Add this to your Claude Desktop configuration file (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "tortuga": {
      "command": "node",
      "args": [
        "/absolute/path/to/tortuga/packages/mcp/dist/index.js"
      ],
      "env": {
        "DISCORD_BOT_TOKEN": "your_discord_bot_token",
        "DATABASE_URL": "postgresql://tortuga:tortugapassword@localhost:5434/tortugadb?schema=public"
      }
    }
  }
}
```

> **Remote Server (via SSH):**
```json
{
  "mcpServers": {
    "tortuga-remote": {
      "command": "ssh",
      "args": [
        "your-remote-host",
        "docker compose --project-directory /opt/tortucord exec -T bot node /app/packages/mcp/dist/index.js"
      ]
    }
  }
}
```

---

### 7. Cursor IDE
Add this to `.cursor/mcp.json` in your workspace or global settings:
```json
{
  "mcpServers": {
    "tortuga": {
      "command": "node",
      "args": [
        "${workspaceFolder}/packages/mcp/dist/index.js"
      ],
      "env": {
        "DISCORD_BOT_TOKEN": "your_discord_bot_token",
        "DATABASE_URL": "postgresql://tortuga:tortugapassword@localhost:5434/tortugadb?schema=public"
      }
    }
  }
}
```

---

### 8. HTTP / Remote Web API Endpoint

The Tortuga Web Dashboard exposes a full JSON-RPC 2.0 MCP endpoint:

```http
POST /api/mcp HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tortuga_list_guilds",
    "arguments": {}
  }
}
```

To view all capabilities, send a GET request:
```bash
curl http://localhost:3000/api/mcp
```

---

## 🛠️ Available MCP Tools

| Tool Name | Description | Key Parameters |
| :--- | :--- | :--- |
| `tortuga_system_status` | Check real-time status of bot, PostgreSQL, and Redis | *None* |
| `tortuga_list_guilds` | List all Discord servers managed by Tortuga bot | *None* |
| `tortuga_get_guild_config` | Retrieve full configuration (prefix, automod, XP, logging) | `guildId` |
| `tortuga_update_guild_settings` | Update command prefix, locale, or disabled commands | `guildId`, `prefix`, `locale`, `mutedRoleId` |
| `tortuga_list_channels` | List all channels in guild (text, voice, categories) | `guildId` |
| `tortuga_create_channel` | Create a new text, voice, or category channel | `guildId`, `name`, `type`, `parentId`, `topic` |
| `tortuga_delete_channel` | Delete a channel from a guild | `channelId`, `reason` |
| `tortuga_send_message` | Post text or rich embed announcements to a channel | `channelId`, `content`, `embedTitle`, `embedDescription` |
| `tortuga_purge_messages` | Bulk purge up to 100 recent messages in a channel | `channelId`, `amount`, `authorId` |
| `tortuga_list_roles` | List all roles with hierarchy position and permissions | `guildId` |
| `tortuga_manage_member_role` | Assign or remove a role to/from a guild member | `guildId`, `userId`, `roleId`, `action` ('add'\|'remove') |
| `tortuga_moderate_member` | Execute WARN, TIMEOUT, KICK, or BAN with case logging | `guildId`, `userId`, `action`, `reason`, `durationMinutes` |
| `tortuga_list_infractions` | Retrieve moderation infractions and case history | `guildId`, `userId`, `limit` |
| `tortuga_get_audit_logs` | Query security and guild moderation weblog events | `guildId`, `limit` |
| `tortuga_get_automod_rules` | Inspect Anti-Spam, Anti-Invite, and banned words rules | `guildId` |
| `tortuga_update_automod_rules` | Toggle anti-spam, anti-invite, or update banned words | `guildId`, `antiSpam`, `antiInvite`, `bannedWords` |
| `tortuga_search_knowledge` | Search Hermes AI knowledge base docs and FAQs | `guildId`, `query` |
| `tortuga_add_knowledge_doc` | Add or update an article in Hermes AI knowledge base | `guildId`, `title`, `content`, `tags` |
| `tortuga_list_tickets` | List open/closed support tickets for a guild | `guildId`, `status` ('OPEN'\|'CLOSED') |

---

## 📦 MCP Resources

- **`tortuga://guilds`**: Real-time JSON summary of all guilds.
- **`tortuga://system/health`**: Health diagnostics of Discord Gateway and Database.

---

## 💬 MCP Prompts

- **`tortuga_server_audit`**: Guides the AI to systematically scan a server for permission leaks, dangerous role permissions, and AutoMod vulnerabilities.
- **`tortuga_draft_announcement`**: Prepares a formatted Discord announcement embed with matching emojis and Markdown.
- **`tortuga_incident_analysis`**: Analyzes recent user moderation cases and recommends mitigation actions.

---

## 💻 Example AI Commands

Here is what you can ask your AI assistant once connected:
- *"Audit the permissions of guild `1527129771623055441` and tell me if any non-admin roles have Administrator rights."*
- *"Purge the last 15 spam messages from channel `1234567890`."*
- *"Draft an announcement about our scheduled maintenance and send it to `#announcements`."*
- *"Put user `987654321` in timeout for 60 minutes for spamming invite links."*
- *"Show me the recent moderation cases in this server."*
