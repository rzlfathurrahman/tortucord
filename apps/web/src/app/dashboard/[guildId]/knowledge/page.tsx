'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  BrainCircuit,
  Plus,
  Search,
  BookOpen,
  Sparkles,
  Bot,
  Send,
  Trash2,
  Edit2,
  CheckCircle2,
  FileText,
  Sliders,
  ExternalLink,
  RefreshCw,
  Tag,
  FolderOpen,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeConfig {
  guildId: string;
  enabled: boolean;
  autoRespondTickets: boolean;
  qaChannelId: string | null;
  systemPrompt: string | null;
  matchThreshold: number;
}

interface ChannelOption {
  id: string;
  name: string;
}

export default function KnowledgePage() {
  const { guildId } = useParams() as { guildId: string };
  const [activeTab, setActiveTab] = useState<'docs' | 'playground' | 'settings'>('docs');
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [config, setConfig] = useState<KnowledgeConfig | null>(null);
  const [metrics, setMetrics] = useState({
    totalDocs: 0,
    categoriesCount: 0,
    totalCharacters: 0,
    categories: [] as string[],
  });
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('FAQ');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  // Playground State
  const [testQuestion, setTestQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiResponse, setAiResponse] = useState<{
    answer: string;
    citations: { id: string; title: string; category: string; excerpt: string }[];
    confidence: number;
  } | null>(null);

  // Settings State
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/knowledge`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.docs || []);
        if (data.config) setConfig(data.config);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels`);
      if (res.ok) {
        const data = await res.json();
        const textChannels = (data.channels || [])
          .filter((c: any) => c.type === 0 || c.type === 5)
          .map((c: any) => ({ id: c.id, name: c.name }));
        setChannels(textChannels);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchKnowledge(), fetchChannels()]).finally(() => setLoading(false));
  }, [guildId]);

  const handleOpenNew = () => {
    setEditingDocId(null);
    setFormTitle('');
    setFormCategory('FAQ');
    setFormContent('');
    setFormTags('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: KnowledgeDoc) => {
    setEditingDocId(doc.id);
    setFormTitle(doc.title);
    setFormCategory(doc.category);
    setFormContent(doc.content);
    setFormTags(doc.tags.join(', '));
    setIsModalOpen(true);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formContent) return;
    setSavingDoc(true);

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      if (editingDocId) {
        const res = await fetch(`/api/guilds/${guildId}/knowledge/${editingDocId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle,
            category: formCategory,
            content: formContent,
            tags: tagsArray,
          }),
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchKnowledge();
        }
      } else {
        const res = await fetch(`/api/guilds/${guildId}/knowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle,
            category: formCategory,
            content: formContent,
            tags: tagsArray,
          }),
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchKnowledge();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to remove this document from the knowledge base?')) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/knowledge/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchKnowledge();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAskPlayground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuestion.trim()) return;
    setAsking(true);
    setAiResponse(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/knowledge/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: testQuestion }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse({
          answer: data.answer,
          citations: data.citations || [],
          confidence: data.confidence || 0,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAsking(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UPDATE_CONFIG',
          enabled: config.enabled,
          autoRespondTickets: config.autoRespondTickets,
          qaChannelId: config.qaChannelId,
          systemPrompt: config.systemPrompt,
        }),
      });
      if (res.ok) {
        setConfigSavedToast(true);
        setTimeout(() => setConfigSavedToast(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredDocs = docs.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || d.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Hermes AI Knowledge Base & RAG</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Ingest FAQs, rules, and server documentation. Hermes uses this knowledge base to auto-answer member inquiries and draft solutions in Support Tickets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchKnowledge()}
            className="p-2 text-zinc-400 hover:text-white rounded-lg bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] transition-all"
            title="Refresh Knowledge Base"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Article
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Ingested Articles</span>
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.totalDocs}</span>
            <span className="text-xs text-zinc-500">docs</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Categories</span>
            <span className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
              <FolderOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {metrics.categoriesCount || 1}
            </span>
            <span className="text-xs text-zinc-500">taxonomies</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Knowledge Volume</span>
            <span className="p-1.5 rounded-md bg-purple-500/10 text-purple-400">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {(metrics.totalCharacters / 1000).toFixed(1)}k
            </span>
            <span className="text-xs text-zinc-500">characters indexed</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Hermes Auto-RAG</span>
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-emerald-400">
              {config?.enabled ? 'Active & Ready' : 'Paused'}
            </span>
            <span className="text-[10px] text-zinc-500">RAG pipeline</span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'docs'
              ? 'bg-white/[0.08] text-white border border-white/[0.1]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Knowledge Documents ({docs.length})
        </button>

        <button
          onClick={() => setActiveTab('playground')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'playground'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          Hermes AI Playground (Test RAG)
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-white/[0.08] text-white border border-white/[0.1]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Agent Settings & Channels
        </button>
      </div>

      {/* Tab 1: Documents Management */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search articles or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0a0a0c] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-2.5 py-1 text-[11px] rounded-md transition-all cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                    : 'bg-white/[0.02] text-zinc-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                All
              </button>
              {['FAQ', 'Rules', 'SOP', 'Guides', 'Troubleshooting'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] rounded-md transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                      : 'bg-white/[0.02] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Documents Grid */}
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Loading knowledge base...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-16 text-center rounded-xl bg-[#0a0a0c] border border-white/[0.08] space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">No Articles Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No knowledge base documents match your criteria. Add rules, FAQs, or guidelines so Hermes can assist members.
              </p>
              <button
                onClick={handleOpenNew}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-all cursor-pointer"
              >
                Create Article
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08] hover:border-emerald-500/30 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.04] border border-white/[0.08] text-emerald-400">
                          {doc.category}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5">{doc.title}</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-all cursor-pointer"
                          title="Edit Document"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed font-mono text-[11px] bg-black/40 p-2.5 rounded-lg border border-white/[0.04]">
                      {doc.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-zinc-500">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag className="w-3 h-3 text-zinc-500" />
                      {doc.tags.length > 0 ? (
                        doc.tags.map((t) => (
                          <span key={t} className="text-[10px] text-zinc-400">
                            #{t}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-600">No tags</span>
                      )}
                    </div>
                    <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Hermes AI Playground */}
      {activeTab === 'playground' && (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/20 via-[#0a0a0c] to-[#0a0a0c] border border-emerald-500/20 flex items-center gap-3">
            <Bot className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-white">Hermes RAG Simulation Console</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Simulate member inquiries in real time. Watch Hermes search the knowledge base, compute confidence, and cite server articles.
              </p>
            </div>
          </div>

          <form onSubmit={handleAskPlayground} className="flex gap-2">
            <input
              type="text"
              required
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              placeholder="Ask a question (e.g. 'Gimana aturan main di server ini?' or 'How to get VIP role?')..."
              className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-[#0a0a0c] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={asking}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {asking ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Ask Hermes
            </button>
          </form>

          {/* AI Response Card */}
          {aiResponse && (
            <div className="p-5 rounded-xl bg-[#0a0a0c] border border-emerald-500/20 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <span className="text-xs font-bold text-white">Hermes AI Synthesis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">Confidence:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      aiResponse.confidence > 70
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : aiResponse.confidence > 40
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {aiResponse.confidence}% Match
                  </span>
                </div>
              </div>

              <div className="text-xs text-zinc-200 whitespace-pre-line leading-relaxed">
                {aiResponse.answer}
              </div>

              {aiResponse.citations.length > 0 && (
                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <span className="text-[11px] font-semibold text-zinc-400">Cited Knowledge Documents:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiResponse.citations.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04] text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-400">{c.title}</span>
                          <span className="text-[10px] text-zinc-500">{c.category}</span>
                        </div>
                        <p className="text-zinc-400 line-clamp-2 italic">"{c.excerpt}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Agent Settings */}
      {activeTab === 'settings' && config && (
        <div className="p-6 rounded-xl bg-[#0a0a0c] border border-white/[0.08] max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Knowledge Base & RAG Settings</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure auto-reply behaviors and link dedicated Q&A channels for Hermes bot.
              </p>
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {configSavedToast && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Settings updated successfully.
            </div>
          )}

          <div className="space-y-4">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div>
                <span className="text-xs font-semibold text-white">Enable Knowledge Base Ingestion</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Allows Hermes AI agent to access and search server documentation.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500"
              />
            </div>

            {/* Auto-Draft in Tickets */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div>
                <span className="text-xs font-semibold text-white">Auto-Draft Ticket Solutions</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  When a new Support Ticket is opened, Hermes automatically suggests solutions in the executive summary banner.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.autoRespondTickets}
                onChange={(e) => setConfig({ ...config, autoRespondTickets: e.target.checked })}
                className="w-4 h-4 accent-emerald-500"
              />
            </div>

            {/* Dedicated QA Channel */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Dedicated Q&A Channel</label>
              <p className="text-[11px] text-zinc-400">
                Hermes will actively answer questions posted by server members in this channel using the knowledge base.
              </p>
              <select
                value={config.qaChannelId || ''}
                onChange={(e) => setConfig({ ...config, qaChannelId: e.target.value || null })}
                className="w-full px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">None (Disabled in public chat)</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom System Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Hermes Persona / System Instructions</label>
              <textarea
                rows={4}
                value={config.systemPrompt || ''}
                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                placeholder="You are Hermes, the AI guardian of this server..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Article Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0d0e12] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingDocId ? 'Edit Knowledge Article' : 'New Knowledge Article'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-400 font-medium">Article Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Server Rules & Moderation Guidelines"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/50 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/50 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FAQ">FAQ</option>
                    <option value="Rules">Rules</option>
                    <option value="SOP">SOP</option>
                    <option value="Guides">Guides</option>
                    <option value="Troubleshooting">Troubleshooting</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. rules, moderation, spam, invite"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-lg bg-black/50 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">Document Content (Markdown)</label>
                <textarea
                  rows={8}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write documentation, policies, or FAQs here..."
                  className="w-full mt-1 px-3 py-2 text-xs font-mono rounded-lg bg-black/50 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg bg-white/[0.02] border border-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingDoc ? 'Saving...' : editingDocId ? 'Update Article' : 'Ingest Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
