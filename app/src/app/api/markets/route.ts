import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api-response";
import { authenticateAgent, hasPermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = Math.min(parseInt(searchParams.get("perPage") || "20"), 100);

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }
    if (category) {
      where.category = category;
    }
    if (search) {
      where.question = { contains: search, mode: "insensitive" };
    }

    const orderBy: Record<string, unknown> = {
      newest: { createdAt: "desc" },
      volume: { totalVolumeLamports: "desc" },
      closing_soon: { closesAt: "asc" },
    };

    const markets = await db.market.findMany({
      where,
      orderBy: orderBy[sortBy] as Record<string, string>,
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        creator: { select: { id: true, name: true, walletAddress: true } },
        _count: { select: { trades: true } },
      },
    });

    const total = await db.market.count({ where });

    return ok({
      markets: markets.map((m: any) => ({
        id: m.id,
        onChainId: m.onChainId,
        question: m.question,
        category: m.category,
        status: m.status,
        outcome: m.outcome,
        yesPrice: m.yesPrice,
        noPrice: m.noPrice,
        totalVolumeLamports: m.totalVolumeLamports.toString(),
        numTraders: m.numTraders,
        tradeCount: m._count.trades,
        closesAt: m.closesAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
        creator: m.creator,
      })),
      meta: { page, perPage, total },
    });
  } catch (error) {
    console.error("Markets list error:", error);
    return err("INTERNAL_ERROR", "Failed to fetch markets", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAgent(req);
    if (!auth) return err("UNAUTHORIZED", "Valid API key required", 401);
    if (!hasPermission(auth.permissions, "create_market")) {
      return err("FORBIDDEN", "create_market permission required", 403);
    }

    const body = await req.json();
    const { question, description, category, tags, closesAt, resolutionCriteria, liquidityLamports } = body;

    if (!question || !closesAt || !liquidityLamports) {
      return err("INVALID_INPUT", "question, closesAt, and liquidityLamports are required");
    }

    // TODO: Build and send Solana transaction to create market on-chain
    // For now, create in DB as a placeholder
    const market = await db.market.create({
      data: {
        onChainId: Math.floor(Math.random() * 1000000), // Placeholder
        onChainAddress: "placeholder_" + Date.now(),
        question,
        description: description || null,
        category: category || "other",
        tags: tags || [],
        creatorId: auth.agent.id,
        resolutionCriteria: resolutionCriteria || null,
        liquidityParam: BigInt(liquidityLamports),
        closesAt: new Date(closesAt),
        resolvesAt: new Date(closesAt),
      },
    });

    return ok({
      market: {
        id: market.id,
        onChainId: market.onChainId,
        question: market.question,
        status: market.status,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        closesAt: market.closesAt.toISOString(),
      },
    }, 201);
  } catch (error) {
    console.error("Market creation error:", error);
    return err("INTERNAL_ERROR", "Failed to create market", 500);
  }
}
