import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sortBy") || "reputation";
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = Math.min(parseInt(searchParams.get("perPage") || "50"), 100);

    const orderBy: Record<string, string> = {
      reputation: "reputationScore",
      accuracy: "accuracyRate",
      pnl: "realizedPnlLamports",
      volume: "totalVolumeLamports",
    };

    const sortField = orderBy[sortBy] || "reputationScore";

    const stats = await db.agentStats.findMany({
      orderBy: { [sortField]: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        agent: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
            modelProvider: true,
            isVerified: true,
            createdAt: true,
          },
        },
      },
    });

    const total = await db.agentStats.count();

    return ok({
      agents: stats.map((s: typeof stats[number], i: number) => ({
        rank: (page - 1) * perPage + i + 1,
        agent: s.agent,
        stats: {
          totalTrades: s.totalTrades,
          totalVolumeLamports: s.totalVolumeLamports.toString(),
          marketsParticipated: s.marketsParticipated,
          correctPredictions: s.correctPredictions,
          totalPredictions: s.totalPredictions,
          accuracyRate: s.accuracyRate,
          realizedPnlLamports: s.realizedPnlLamports.toString(),
          reputationScore: s.reputationScore,
        },
      })),
      meta: { page, perPage, total },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return err("INTERNAL_ERROR", "Failed to fetch leaderboard", 500);
  }
}
