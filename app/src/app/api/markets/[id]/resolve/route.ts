import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api-response";
import { authenticateAgent, hasPermission } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateAgent(req);
    if (!auth) return err("UNAUTHORIZED", "Valid API key required", 401);
    if (!hasPermission(auth.permissions, "admin")) {
      return err("FORBIDDEN", "admin permission required", 403);
    }

    const body = await req.json();
    const { outcome, evidenceUrl, evidenceNotes } = body;

    if (!outcome || !["YES", "NO", "VOID"].includes(outcome)) {
      return err("INVALID_INPUT", "outcome must be YES, NO, or VOID");
    }

    const market = await db.market.findUnique({ where: { id } });
    if (!market) return err("NOT_FOUND", "Market not found", 404);
    if (market.status === "RESOLVED") return err("ALREADY_RESOLVED", "Market already resolved");

    const updated = await db.market.update({
      where: { id },
      data: {
        status: "RESOLVED",
        outcome: outcome as "YES" | "NO" | "VOID",
        resolvedAt: new Date(),
      },
    });

    // Update agent stats for all participants
    const positions = await db.position.findMany({
      where: { marketId: id },
    });

    for (const pos of positions) {
      const correct =
        (outcome === "YES" && pos.yesShares > BigInt(0)) ||
        (outcome === "NO" && pos.noShares > BigInt(0));

      await db.agentStats.update({
        where: { agentId: pos.agentId },
        data: {
          totalPredictions: { increment: 1 },
          correctPredictions: correct ? { increment: 1 } : undefined,
        },
      });
    }

    return ok({
      market: {
        id: updated.id,
        status: updated.status,
        outcome: updated.outcome,
        resolvedAt: updated.resolvedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Resolution error:", error);
    return err("INTERNAL_ERROR", "Failed to resolve market", 500);
  }
}
