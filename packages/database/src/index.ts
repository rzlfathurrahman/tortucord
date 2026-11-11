import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

globalForPrisma.prisma = prisma;

export * from "@prisma/client";

/**
 * Helper to get or create a guild entry with standard defaults.
 */
export async function getOrCreateGuild(guildId: string, defaultPrefix = "!") {
  return await prisma.guild.upsert({
    where: { id: guildId },
    update: {},
    create: {
      id: guildId,
      prefix: defaultPrefix,
    },
    include: {
      levelingConfig: true,
      automodConfig: true,
      starboardConfig: true,
      loggingConfig: true,
    },
  });
}

/**
 * Helper to get the next incremental case ID for guild moderation infractions.
 */
export async function getNextInfractionCaseId(guildId: string): Promise<number> {
  const latest = await prisma.infraction.findFirst({
    where: { guildId },
    orderBy: { caseId: "desc" },
    select: { caseId: true },
  });
  return (latest?.caseId ?? 0) + 1;
}

/**
 * Helper to get the next suggestion sequence number for a guild.
 */
export async function getNextSuggestionNumber(guildId: string): Promise<number> {
  const latest = await prisma.suggestion.findFirst({
    where: { guildId },
    orderBy: { suggestionNumber: "desc" },
    select: { suggestionNumber: true },
  });
  return (latest?.suggestionNumber ?? 0) + 1;
}
