'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Zap,
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Sliders,
  Webhook,
  UserPlus,
  Bot,
  MessageSquare,
  Shield,
  Layers,
  Send,
} from 'lucide-react';

interface WorkflowLog {
  id: string;
  status: string;
  triggerEvent: string;
  details: string | null;
  executedAt: string;
}

interface ActionWorkflow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  triggerConfig: any;
  conditionType: string;
  conditionConfig: any;
  actionType: string;
  actionConfig: any;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
  logs: WorkflowLog[];
}

interface ChannelOption {
  id: string;
  name: string;
}

interface RoleOption {
  id: string;
  name: string;
  color: number;
}

const TRIGGER_PRESETS = [
  {
    type: 'MEMBER_JOIN',
    label: 'New Member Joins',
    icon: UserPlus,
    description: 'Triggered whenever a member joins the Discord server',
  },
  {
    type: 'INBOUND_WEBHOOK',
    label: 'Inbound Webhook Received',
    icon: Webhook,
    description: 'Triggered when GitHub, Stripe, or custom payload arrives',
  },
  {
    type: 'HERMES_ALERT',
    label: 'Hermes Agent Incident',
    icon: Bot,
    description: 'Triggered when Hermes bot fails heartbeat or reports incident',
  },
  {
    type: 'TICKET_CREATED',
    label: 'Support Ticket Created',
    icon: MessageSquare,
    description: 'Triggered whenever a user opens a new ticket thread',
  },
  {
    type: 'MESSAGE_KEYWORD',
    label: 'Message Contains Keyword',
    icon: Zap,
    description: 'Triggered when a message contains a specific trigger phrase',
  },
];

const ACTION_TYPES = [
  {
    type: 'SEND_CHANNEL_MESSAGE',
    label: 'Send Channel Message / Embed',
    icon: Send,
    description: 'Dispatches a formatted message or embed to a specific channel',
  },
  {
    type: 'SEND_DM',
    label: 'Send Direct Message to User',
    icon: MessageSquare,
    description: 'Sends a private direct message to the triggering member',
  },
  {
    type: 'ADD_ROLE',
    label: 'Grant Discord Role',
    icon: Shield,
    description: 'Assigns a configured role to the member',
  },
  {
    type: 'FORWARD_WEBHOOK',
    label: 'Forward to Outbound Webhook',
    icon: Webhook,
    description: 'Relays the event payload to an external HTTP webhook URL',
  },
];

export default function WorkflowsPage() {
  const { guildId } = useParams() as { guildId: string };
  const [workflows, setWorkflows] = useState<ActionWorkflow[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, active: 0, totalExecutions: 0 });
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; text: string } | null>(null);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLogsWorkflow, setSelectedLogsWorkflow] = useState<ActionWorkflow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTrigger, setFormTrigger] = useState('MEMBER_JOIN');
  const [formCondition, setFormCondition] = useState('ALWAYS');
  const [formAction, setFormAction] = useState('SEND_CHANNEL_MESSAGE');
  const [formTargetChannel, setFormTargetChannel] = useState('');
  const [formTargetRole, setFormTargetRole] = useState('');
  const [formMsgContent, setFormMsgContent] = useState('');
  const [formWebhookUrl, setFormWebhookUrl] = useState('');

  const fetchWorkflows = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/workflows`);
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (e) {
      console.error('Failed to fetch workflows:', e);
    }
  };

  const fetchChannelsAndRoles = async () => {
    try {
      const [cRes, rRes] = await fetchParallel([
        fetch(`/api/guilds/${guildId}/channels`),
        fetch(`/api/guilds/${guildId}/roles`),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        const textChannels = (cData.channels || [])
          .filter((c: any) => c.type === 0 || c.type === 5)
          .map((c: any) => ({ id: c.id, name: c.name }));
        setChannels(textChannels);
        if (textChannels.length > 0 && !formTargetChannel) {
          setFormTargetChannel(textChannels[0].id);
        }
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRoles((rData.roles || []).map((r: any) => ({ id: r.id, name: r.name, color: r.color })));
      }
    } catch (e) {
      console.error('Failed to load channels/roles:', e);
    }
  };

  const fetchParallel = (promises: Promise<any>[]) => Promise.all(promises);

  useEffect(() => {
    Promise.all([fetchWorkflows(), fetchChannelsAndRoles()]).finally(() => setLoading(false));
  }, [guildId]);

  const handleToggleActive = async (workflow: ActionWorkflow) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !workflow.isActive }),
      });
      if (res.ok) {
        fetchWorkflows();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation flow?')) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchWorkflows();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestRun = async (workflow: ActionWorkflow) => {
    setTestingId(workflow.id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/workflows/${workflow.id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult({
        id: workflow.id,
        success: data.success,
        text: data.details || (data.success ? 'Execution succeeded' : 'Execution failed'),
      });
      fetchWorkflows();
    } catch (err: any) {
      setTestResult({ id: workflow.id, success: false, text: err.message });
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;
    setSaving(true);

    const actionConfig: any = {};
    if (formAction === 'SEND_CHANNEL_MESSAGE') {
      actionConfig.targetChannelId = formTargetChannel;
      actionConfig.messageContent = formMsgContent || 'Automated announcement dispatched by Tortuga.';
    } else if (formAction === 'SEND_DM') {
      actionConfig.messageContent = formMsgContent || 'Welcome to the server! Need help? Open a ticket.';
    } else if (formAction === 'ADD_ROLE') {
      actionConfig.roleId = formTargetRole;
    } else if (formAction === 'FORWARD_WEBHOOK') {
      actionConfig.webhookUrl = formWebhookUrl;
    }

    try {
      const res = await fetch(`/api/guilds/${guildId}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          triggerType: formTrigger,
          triggerConfig: {},
          conditionType: formCondition,
          conditionConfig: {},
          actionType: formAction,
          actionConfig,
          isActive: true,
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setFormName('');
        setFormDesc('');
        setFormMsgContent('');
        fetchWorkflows();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (presetKey: string) => {
    setIsCreateOpen(true);
    if (presetKey === 'welcome') {
      setFormName('Welcome DM & Community Guide');
      setFormDesc('Automatically greet new members in their DMs upon joining the server');
      setFormTrigger('MEMBER_JOIN');
      setFormCondition('ALWAYS');
      setFormAction('SEND_DM');
      setFormMsgContent('Welcome aboard! Please make sure to read #rules and introduce yourself in #general.');
    } else if (presetKey === 'incident') {
      setFormName('Hermes AI Incident Broadcast');
      setFormDesc('Broadcast an emergency announcement if Hermes Agent experiences heartbeat downtime');
      setFormTrigger('HERMES_ALERT');
      setFormCondition('ALWAYS');
      setFormAction('SEND_CHANNEL_MESSAGE');
      setFormMsgContent('⚠️ Warning: Hermes Bot Agent is currently undergoing maintenance. Tickets are queued.');
    } else if (presetKey === 'ticket') {
      setFormName('Ticket Webhook Forwarder');
      setFormDesc('Forward incoming support tickets to an external admin dashboard or Slack webhook');
      setFormTrigger('TICKET_CREATED');
      setFormCondition('ALWAYS');
      setFormAction('FORWARD_WEBHOOK');
      setFormWebhookUrl('https://api.external-crm.com/webhooks/discord');
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Visual Automation Flows</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Build custom Trigger ➔ Condition ➔ Action workflows to automate server events, webhooks, and Hermes bot operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchWorkflows()}
            className="p-2 text-zinc-400 hover:text-white rounded-lg bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] transition-all"
            title="Refresh Flows"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Active Flows</span>
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.active}</span>
            <span className="text-xs text-zinc-500">/ {metrics.total} total</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Total Dispatched</span>
            <span className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
              <Play className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.totalExecutions}</span>
            <span className="text-xs text-zinc-500">lifetime runs</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Engine Status</span>
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-emerald-400">Reactive & Online</span>
            <span className="text-[10px] text-zinc-500">0ms latency queue</span>
          </div>
        </div>
      </div>

      {/* Quick Templates Bar */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/20 via-[#0a0a0c] to-[#0a0a0c] border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white">Recommended Flow Presets</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => handleApplyPreset('welcome')}
            className="p-3 text-left rounded-lg bg-black/40 border border-white/[0.06] hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all cursor-pointer group"
          >
            <div className="text-xs font-medium text-white group-hover:text-emerald-400">
              👋 Member Onboarding DM
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Member Join ➔ Send welcome DM with server guidelines & roles
            </p>
          </button>

          <button
            onClick={() => handleApplyPreset('incident')}
            className="p-3 text-left rounded-lg bg-black/40 border border-white/[0.06] hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all cursor-pointer group"
          >
            <div className="text-xs font-medium text-white group-hover:text-emerald-400">
              🤖 Hermes Heartbeat Failover
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Hermes Alert ➔ Auto-post notice in announcement channel
            </p>
          </button>

          <button
            onClick={() => handleApplyPreset('ticket')}
            className="p-3 text-left rounded-lg bg-black/40 border border-white/[0.06] hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all cursor-pointer group"
          >
            <div className="text-xs font-medium text-white group-hover:text-emerald-400">
              🎫 Outbound Ticket Webhook
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Ticket Created ➔ Relay JSON payload to external CRM/Slack
            </p>
          </button>
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Active Automation Pipelines
          </span>
          <span className="text-xs text-zinc-500">{workflows.length} configured</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Loading automation flows...</div>
        ) : workflows.length === 0 ? (
          <div className="py-16 text-center rounded-xl bg-[#0a0a0c] border border-white/[0.08] space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">No Automation Flows Yet</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Create your first flow or choose a preset above to automate member welcomes, bot alerts, or outbound webhooks.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-all cursor-pointer"
            >
              Create Flow
            </button>
          </div>
        ) : (
          workflows.map((flow) => (
            <div
              key={flow.id}
              className={`p-4 rounded-xl bg-[#0a0a0c] border transition-all ${
                flow.isActive
                  ? 'border-white/[0.08] hover:border-emerald-500/30'
                  : 'border-white/[0.04] opacity-70'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        flow.isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-zinc-600'
                      }`}
                    />
                    <h4 className="text-sm font-semibold text-white">{flow.name}</h4>
                    {flow.description && (
                      <span className="text-xs text-zinc-400 hidden sm:inline">• {flow.description}</span>
                    )}
                  </div>

                  {/* Visual Node Chain */}
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    {/* Trigger Node */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-zinc-300">
                      <span className="text-emerald-400 font-semibold text-[10px]">TRIGGER:</span>
                      <span>{flow.triggerType}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />

                    {/* Condition Node */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-zinc-300">
                      <span className="text-cyan-400 font-semibold text-[10px]">IF:</span>
                      <span>{flow.conditionType}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />

                    {/* Action Node */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300">
                      <span className="text-emerald-400 font-semibold text-[10px]">ACTION:</span>
                      <span>{flow.actionType}</span>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 self-end lg:self-center">
                  <div className="text-right text-[11px] text-zinc-500 mr-2 hidden sm:block">
                    <div>{flow.executionCount} runs</div>
                    {flow.lastExecutedAt ? (
                      <div>Last: {new Date(flow.lastExecutedAt).toLocaleDateString()}</div>
                    ) : (
                      <div>Never executed</div>
                    )}
                  </div>

                  <button
                    onClick={() => handleTestRun(flow)}
                    disabled={testingId === flow.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-200 transition-all cursor-pointer disabled:opacity-50"
                    title="Simulate / Run Test Execution"
                  >
                    {testingId === flow.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Test</span>
                  </button>

                  <button
                    onClick={() => setSelectedLogsWorkflow(flow)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] transition-all cursor-pointer"
                    title="View Logs"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(flow)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      flow.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {flow.isActive ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => handleDelete(flow.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                    title="Delete Workflow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Test Output Toast Banner */}
              {testResult && testResult.id === flow.id && (
                <div
                  className={`mt-3 p-2.5 rounded-lg text-xs flex items-center justify-between ${
                    testResult.success
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/10 border border-red-500/20 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{testResult.text}</span>
                  </div>
                  <button
                    onClick={() => setTestResult(null)}
                    className="text-zinc-400 hover:text-white font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Workflow Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0d0e12] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Create Automation Pipeline</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="p-5 space-y-4 overflow-y-auto">
              {/* Flow Meta */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Flow Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. VIP Member Onboarding DM"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/50 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Description (Optional)</label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Brief description of what this pipeline does"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/50 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Step 1: Trigger */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Step 1 • When this happens (Trigger)
                </span>
                <select
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                >
                  {TRIGGER_PRESETS.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label} ({t.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Condition */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  Step 2 • Only if condition is met (Condition)
                </span>
                <select
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALWAYS">Always execute (No condition)</option>
                  <option value="HAS_ROLE">User has specific role</option>
                  <option value="DOES_NOT_HAVE_ROLE">User does NOT have role</option>
                  <option value="CHANNEL_EQUALS">Only in specific channel</option>
                  <option value="USER_LEVEL_GTE">User Level &gt;= X</option>
                </select>
              </div>

              {/* Step 3: Action */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Step 3 • Do this action (Action)
                </span>
                <select
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                >
                  {ACTION_TYPES.map((a) => (
                    <option key={a.type} value={a.type}>
                      {a.label}
                    </option>
                  ))}
                </select>

                {/* Dynamic Action Fields */}
                {formAction === 'SEND_CHANNEL_MESSAGE' && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="text-[11px] text-zinc-400">Target Discord Channel</label>
                      <select
                        value={formTargetChannel}
                        onChange={(e) => setFormTargetChannel(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                      >
                        {channels.map((c) => (
                          <option key={c.id} value={c.id}>
                            #{c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400">Message Content</label>
                      <textarea
                        rows={2}
                        value={formMsgContent}
                        onChange={(e) => setFormMsgContent(e.target.value)}
                        placeholder="Message dispatched to the channel..."
                        className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {formAction === 'SEND_DM' && (
                  <div className="pt-1">
                    <label className="text-[11px] text-zinc-400">Direct Message Content</label>
                    <textarea
                      rows={3}
                      value={formMsgContent}
                      onChange={(e) => setFormMsgContent(e.target.value)}
                      placeholder="Message sent directly to user's Discord DM inbox..."
                      className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {formAction === 'ADD_ROLE' && (
                  <div className="pt-1">
                    <label className="text-[11px] text-zinc-400">Role to Assign</label>
                    <select
                      value={formTargetRole}
                      onChange={(e) => setFormTargetRole(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select a role...</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          @{r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formAction === 'FORWARD_WEBHOOK' && (
                  <div className="pt-1">
                    <label className="text-[11px] text-zinc-400">Outbound Webhook URL</label>
                    <input
                      type="url"
                      required
                      value={formWebhookUrl}
                      onChange={(e) => setFormWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/... or custom API endpoint"
                      className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg bg-white/[0.02] border border-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Deploy Flow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Execution Logs Drawer Modal */}
      {selectedLogsWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#0d0e12] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Execution History: {selectedLogsWorkflow.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogsWorkflow(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2">
              {selectedLogsWorkflow.logs.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No execution logs recorded yet for this workflow.
                </div>
              ) : (
                selectedLogsWorkflow.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className="text-zinc-300 font-mono text-[11px]">{log.triggerEvent}</span>
                      </div>
                      {log.details && <p className="text-zinc-400 text-[11px]">{log.details}</p>}
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {new Date(log.executedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
