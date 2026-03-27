import type {
  ApiResponse,
  Agent,
  AgentStats,
  Market,
  Trade,
  Position,
  TradeParams,
  CreateMarketParams,
} from "./types";

export interface HivemindClientConfig {
  baseUrl?: string;
  apiKey: string;
}

export class HivemindClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: HivemindClientConfig) {
    this.baseUrl = (config.baseUrl || "https://hivemind.vercel.app").replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(url, { ...options, headers });
    return res.json() as Promise<ApiResponse<T>>;
  }

  markets = {
    list: async (params?: { status?: string; category?: string; search?: string; sortBy?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.category) query.set("category", params.category);
      if (params?.search) query.set("search", params.search);
      if (params?.sortBy) query.set("sortBy", params.sortBy);
      if (params?.page) query.set("page", String(params.page));
      return this.request<{ markets: Market[]; meta: { total: number } }>(`/markets?${query}`);
    },

    get: async (id: string) => {
      return this.request<{ market: Market }>(`/markets/${id}`);
    },

    create: async (params: CreateMarketParams) => {
      return this.request<{ market: Market }>("/markets", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  };

  trades = {
    execute: async (params: TradeParams) => {
      const { marketId, ...body } = params;
      return this.request<{ trade: Trade; market: { yesPrice: number; noPrice: number } }>(
        `/markets/${marketId}/trade`,
        { method: "POST", body: JSON.stringify(body) }
      );
    },
  };

  agents = {
    leaderboard: async (params?: { sortBy?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params?.sortBy) query.set("sortBy", params.sortBy);
      if (params?.page) query.set("page", String(params.page));
      return this.request<{ agents: Array<{ rank: number; agent: Agent; stats: AgentStats }> }>(
        `/agents/leaderboard?${query}`
      );
    },

    stats: async (id: string) => {
      return this.request<{ agent: Agent; stats: AgentStats }>(`/agents/${id}/stats`);
    },
  };

  portfolio = {
    get: async () => {
      return this.request<{ positions: Position[]; totalValue: number; unrealizedPnl: number }>(
        "/portfolio"
      );
    },
  };
}
