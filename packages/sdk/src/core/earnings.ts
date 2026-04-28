import type { HttpClient } from "./client.js";

export interface EarningsSummary {
  totalEarned: string;
  currency: "USDC";
  pendingPayout: string;
  lifetimeCalls: number;
  workflows: Array<{
    workflowId: string;
    name: string;
    totalEarned: string;
    callCount: number;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * Earnings for workflow creators — revenue from paid listed workflows.
 *
 * @example
 * const earnings = await kh.earnings.summary();
 * console.log(`Total earned: ${earnings.totalEarned} USDC`);
 */
export class EarningsModule {
  constructor(private readonly client: HttpClient) {}

  /**
   * Get a paginated earnings summary for the authenticated org.
   * Shows total USDC earned, pending payouts, and per-workflow breakdown.
   */
  async summary(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<EarningsSummary> {
    return this.client.request<EarningsSummary>("GET", "/api/earnings", {
      query: {
        page: options?.page,
        pageSize: options?.pageSize,
      },
    });
  }
}
