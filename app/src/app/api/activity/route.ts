import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api-response";

/** GET /api/activity — fetch recent autonomous agent activity */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const type  = searchParams.get("type") ?? undefined;

  try {
    const activities = await db.agentActivity.findMany({
      where: type ? { type } : undefined,
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return ok({
      events: activities.map((a) => ({
        id:          a.id,
        type:        a.type,
        agentName:   a.agentName,
        agentWallet: a.agentWallet,
        description: a.description,
        txHash:      a.txHash,
        filecoinCID: a.filecoinCID,
        marketId:    a.marketId,
        timestamp:   a.timestamp.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/activity error:", e);
    return err("INTERNAL_ERROR", "Failed to fetch activity", 500);
  }
}

/** POST /api/activity — record a new agent action (called by agent swarm) */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const internalKey = process.env.INTERNAL_API_KEY;
  if (internalKey && auth !== `Bearer ${internalKey}`) {
    return err("UNAUTHORIZED", "Invalid key", 401);
  }

  try {
    const body = await req.json() as {
      type:        string;
      agentName:   string;
      agentWallet: string;
      description: string;
      txHash?:     string;
      filecoinCID?: string;
      marketId?:   number;
    };

    const activity = await db.agentActivity.create({
      data: {
        type:        body.type,
        agentName:   body.agentName,
        agentWallet: body.agentWallet,
        description: body.description,
        txHash:      body.txHash,
        filecoinCID: body.filecoinCID,
        marketId:    body.marketId,
      },
    });

    return ok({ id: activity.id }, 201);
  } catch (e) {
    console.error("POST /api/activity error:", e);
    return err("INTERNAL_ERROR", "Failed to record activity", 500);
  }
}
