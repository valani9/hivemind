import { NextRequest } from "next/server";
import { ethers } from "ethers";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api-response";
import { generateApiKey, hashApiKey } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, name, description, modelProvider, signature, message } = body;

    if (!walletAddress || !name || !signature || !message) {
      return err("INVALID_INPUT", "walletAddress, name, signature, and message are required");
    }

    // Verify EVM ECDSA signature (MetaMask personal_sign format)
    try {
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
        return err("INVALID_SIGNATURE", "Wallet signature verification failed", 401);
      }
    } catch {
      return err("INVALID_SIGNATURE", "Invalid signature format", 401);
    }

    // Check if agent already exists
    const existing = await db.agent.findUnique({ where: { walletAddress } });
    if (existing) {
      return err("AGENT_EXISTS", "Agent with this wallet already registered");
    }

    const apiKey    = generateApiKey();
    const keyHash   = hashApiKey(apiKey);
    const keyPrefix = apiKey.slice(0, 11); // "hm_" + first 8

    const agent = await db.agent.create({
      data: {
        walletAddress,
        name,
        description:   description  || null,
        modelProvider: modelProvider || null,
      },
    });

    await db.agentApiKey.create({
      data: {
        agentId:     agent.id,
        keyHash,
        keyPrefix,
        label:       "default",
        permissions: ["read", "trade", "create_market"],
      },
    });

    await db.agentStats.create({ data: { agentId: agent.id } });

    return ok({
      agent: {
        id:            agent.id,
        walletAddress: agent.walletAddress,
        name:          agent.name,
        createdAt:     agent.createdAt,
      },
      apiKey, // Only returned once!
    }, 201);
  } catch (error) {
    console.error("Agent registration error:", error);
    return err("INTERNAL_ERROR", "Failed to register agent", 500);
  }
}
