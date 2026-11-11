import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const access = await checkFeatureAccess(guildId, 'knowledge');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { question } = await req.json();
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    const [docs, config] = await Promise.all([
      prisma.knowledgeDoc.findMany({
        where: { guildId, isActive: true },
      }),
      prisma.knowledgeConfig.findUnique({
        where: { guildId },
      }),
    ]);

    if (docs.length === 0) {
      return NextResponse.json({
        success: true,
        answer:
          'Hermes Agent does not have any ingested knowledge base documents for this server yet. Please add FAQs or rules first in the Knowledge Base tab.',
        citations: [],
        confidence: 0,
      });
    }

    // Keyword & Semantic Relevance Scoring
    const tokens = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scoredDocs = docs.map((doc) => {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      const catLower = doc.category.toLowerCase();
      const tagsLower = doc.tags.map((t) => t.toLowerCase());

      tokens.forEach((token) => {
        // Title match: 4 points
        if (titleLower.includes(token)) score += 4;
        // Tags match: 3 points
        if (tagsLower.some((t) => t.includes(token))) score += 3;
        // Category match: 2 points
        if (catLower.includes(token)) score += 2;
        // Content occurrence: 1 point per match (up to 5)
        const regex = new RegExp(token, 'gi');
        const matches = contentLower.match(regex);
        if (matches) {
          score += Math.min(matches.length, 5);
        }
      });

      return { doc, score };
    });

    // Sort by relevance score
    scoredDocs.sort((a, b) => b.score - a.score);
    const topScored = scoredDocs.filter((s) => s.score > 0);

    const citations: { id: string; title: string; category: string; excerpt: string }[] = [];
    let answer = '';
    let confidence = 0;

    if (topScored.length === 0) {
      answer = `Hermes Agent could not find any direct information regarding "${question}" in the ingested server documents. Please contact server staff or check #rules.`;
      confidence = 15;
    } else {
      const best = topScored[0];
      const maxPossibleScore = Math.max(tokens.length * 4, 1);
      confidence = Math.min(Math.round((best.score / (maxPossibleScore + 4)) * 100), 98);
      if (confidence < 30) confidence = 45;

      topScored.slice(0, 3).forEach((item) => {
        const sentences = item.doc.content.split('\n').filter((l) => l.trim().length > 0);
        const relevantSnippet =
          sentences.find((s) =>
            tokens.some((t) => s.toLowerCase().includes(t))
          ) || sentences[0] || item.doc.content.slice(0, 150);

        citations.push({
          id: item.doc.id,
          title: item.doc.title,
          category: item.doc.category,
          excerpt: relevantSnippet.trim().slice(0, 200),
        });
      });

      // Construct synthesized Hermes answer
      const primaryDoc = best.doc;
      answer = `Berdasarkan dokumentasi **[${primaryDoc.title}]** (${primaryDoc.category}):\n\n${primaryDoc.content.slice(0, 450)}${
        primaryDoc.content.length > 450 ? '...' : ''
      }\n\n💡 *Jika ada kendala lebih lanjut, silakan buka tiket bantuan atau hubungi staf server.*`;
    }

    return NextResponse.json({
      success: true,
      question,
      answer,
      citations,
      confidence,
      systemPersona: config?.systemPrompt || 'Hermes AI Assistant',
    });
  } catch (err: any) {
    console.error('[KnowledgeAskAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
