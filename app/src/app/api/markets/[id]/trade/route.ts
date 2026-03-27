import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api-response";
import { authenticateAgent, hasPermission } from "@/lib/auth";
import { costToBuyYes, costToBuyNo, lmsrPriceYes, lmsrPriceNo } from "@/lib/lmsr";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateAgent(req);
    if (!auth) return err("UNAUTHORIZED", "Valid API key required", 401);
    if (!hasPermission(auth.permissions, "trade")) {
      return err("FORBIDDEN", "trade permission required", 403);
    }

    const body = await req.json();
    const { side, direction, amountLamports, sharesAmount } = body;

    if (!side || !direction) {
      return err("INVALID_INPUT", "side (YES/NO) and direction (BUY/SELL) are required");
    }

    const market = await db.market.findUnique({ where: { id } });
    if (!market) return err("NOT_FOUND", "Market not found", 404);
    if (market.status !== "OPEN") return err("MARKET_CLOSED", "Market is not open for trading");
    if (new Date() >= market.closesAt) return err("MARKET_CLOSED", "Trading period has ended");

    // Calculate trade using LMSR
    // For hackathon: simulate trade in DB (real Solana tx would be built here)
    const qYes = Number(market.totalVolumeLamports) / 2; // Simplified
    const qNo = Number(market.totalVolumeLamports) / 2;
    const b = Number(market.liquidityParam);

    const shares = sharesAmount || amountLamports || 100_000_000; // Default 0.1 SOL
    const cost = side === "YES"
      ? costToBuyYes(qYes, qNo, b, shares)
      : costToBuyNo(qYes, qNo, b, shares);

    const fee = Math.floor(cost * 0.005); // 0.5% fee
    const pricePerShare = side === "YES"
      ? lmsrPriceYes(qYes, qNo, b)
      : lmsrPriceNo(qYes, qNo, b);

    // Record trade
    const trade = await db.trade.create({
      data: {
        marketId: market.id,
        agentId: auth.agent.id,
        side: side.toUpperCase(),
        direction: direction.toUpperCase(),
        sharesAmount: BigInt(shares),
        costLamports: BigInt(Math.floor(cost)),
        pricePerShare,
        feeLamports: BigInt(fee),
        txSignature: `sim_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        slot: BigInt(0),
      },
    });

    // Update market prices
    const newYesPrice = side === "YES"
      ? lmsrPriceYes(qYes + shares, qNo, b)
      : lmsrPriceYes(qYes, qNo + shares, b);

    await db.market.update({
      where: { id: market.id },
      data: {
        yesPrice: newYesPrice,
        noPrice: 1 - newYesPrice,
        totalVolumeLamports: { increment: BigInt(Math.floor(cost)) },
      },
    });

    // Upsert position
    await db.position.upsert({
      where: {
        marketId_agentId: { marketId: market.id, agentId: auth.agent.id },
      },
      create: {
        marketId: market.id,
        agentId: auth.agent.id,
        yesShares: side === "YES" ? BigInt(shares) : BigInt(0),
        noShares: side === "NO" ? BigInt(shares) : BigInt(0),
        totalCostBasis: BigInt(Math.floor(cost)),
      },
      update: {
        yesShares: side === "YES" ? { increment: BigInt(shares) } : undefined,
        noShares: side === "NO" ? { increment: BigInt(shares) } : undefined,
        totalCostBasis: { increment: BigInt(Math.floor(cost)) },
      },
    });

    return ok({
      trade: {
        id: trade.id,
        side: trade.side,
        direction: trade.direction,
        sharesAmount: trade.sharesAmount.toString(),
        costLamports: trade.costLamports.toString(),
        pricePerShare: trade.pricePerShare,
        feeLamports: trade.feeLamports.toString(),
        txSignature: trade.txSignature,
      },
      market: {
        yesPrice: newYesPrice,
        noPrice: 1 - newYesPrice,
      },
    });
  } catch (error) {
    console.error("Trade error:", error);
    return err("INTERNAL_ERROR", "Failed to execute trade", 500);
  }
}
