import { db } from "./db";
import { createHash } from "crypto";
import { NextRequest } from "next/server";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "hm_";
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export async function authenticateAgent(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7);
  const keyHash = hashApiKey(apiKey);

  const apiKeyRecord = await db.agentApiKey.findUnique({
    where: { keyHash },
    include: { agent: true },
  });

  if (!apiKeyRecord || apiKeyRecord.isRevoked) return null;
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) return null;

  // Update last used
  await db.agentApiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    agent: apiKeyRecord.agent,
    permissions: apiKeyRecord.permissions,
  };
}

export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required) || permissions.includes("admin");
}
