import type {
  CheckAndExecuteParams,
  ContractCallParams,
  ContractReadParams,
  DirectExecution,
  GasEstimate,
  TransferParams,
} from "../types/index.js";
import type { HttpClient } from "./client.js";

export class Web3Module {
  constructor(private readonly client: HttpClient) {}

  /**
   * Transfer native token or ERC-20 to a recipient.
   * Returns execution ID — poll with getDirectExecutionStatus().
   */
  async transfer(params: TransferParams): Promise<DirectExecution> {
    return this.client.request<DirectExecution>(
      "POST",
      "/api/execute/transfer",
      {
        body: {
          network: params.network,
          recipientAddress: params.to,
          amount: params.amount,
          tokenAddress: params.token,
        },
      }
    );
  }

  /**
   * Read a contract (view/pure function). Returns the result immediately.
   */
  async read(params: ContractReadParams): Promise<unknown> {
    const res = await this.client.request<
      { result: unknown } | DirectExecution
    >("POST", "/api/execute/contract-call", {
      body: {
        contractAddress: params.contract,
        network: params.network,
        functionName: params.function,
        functionArgs: params.args ? JSON.stringify(params.args) : undefined,
        abi: params.abi,
      },
    });
    // read calls return { result } directly
    return "result" in res ? res.result : res;
  }

  /**
   * Write to a contract (non-view function).
   * Returns execution ID — poll with getDirectExecutionStatus().
   */
  async write(params: ContractCallParams): Promise<DirectExecution> {
    return this.client.request<DirectExecution>(
      "POST",
      "/api/execute/contract-call",
      {
        body: {
          contractAddress: params.contract,
          network: params.network,
          functionName: params.function,
          functionArgs: params.args ? JSON.stringify(params.args) : undefined,
          abi: params.abi,
          value: params.value,
          gasLimitMultiplier: params.gasLimitMultiplier,
        },
      }
    );
  }

  /**
   * Read a value, evaluate a condition, and execute an action if true.
   * "If ETH price < $1800, sell 1 ETH"
   */
  async checkAndExecute(
    params: CheckAndExecuteParams
  ): Promise<DirectExecution> {
    return this.client.request<DirectExecution>(
      "POST",
      "/api/execute/check-and-execute",
      {
        body: {
          contractAddress: params.check.contract,
          network: params.network,
          functionName: params.check.function,
          functionArgs: params.check.args
            ? JSON.stringify(params.check.args)
            : undefined,
          abi: params.check.abi,
          condition: params.check.condition,
          action: {
            contractAddress: params.action.contract,
            functionName: params.action.function,
            functionArgs: params.action.args
              ? JSON.stringify(params.action.args)
              : undefined,
            abi: params.action.abi,
            gasLimitMultiplier: params.action.gasLimitMultiplier,
          },
        },
      }
    );
  }

  /**
   * Poll a direct execution (transfer / contract call) for status.
   */
  async getStatus(executionId: string): Promise<DirectExecution> {
    return this.client.request<DirectExecution>(
      "GET",
      `/api/execute/${executionId}/status`
    );
  }

  /**
   * Estimate gas for a contract call before sending.
   */
  async estimateGas(
    params: ContractCallParams | ContractReadParams
  ): Promise<GasEstimate> {
    return this.client.request<GasEstimate>("POST", "/api/gas/estimate", {
      body: {
        actionSlug: "write-contract",
        contractAddress: params.contract,
        abiFunction: params.function,
        functionArgs: params.args ? JSON.stringify(params.args) : undefined,
      },
    });
  }

  /**
   * Fetch the ABI for a verified contract from the block explorer.
   */
  async getAbi(contractAddress: string, chainId: number): Promise<unknown[]> {
    const res = await this.client.request<{ abi: unknown[] }>(
      "GET",
      `/api/chains/${chainId}/abi`,
      { query: { address: contractAddress } }
    );
    return res.abi;
  }

  /**
   * Swap tokens via the configured DEX aggregator.
   */
  /**
   * @deprecated Token swaps via the KeeperHub API are not yet available (endpoint returns 501).
   * Use a KeeperHub workflow with a swap step instead:
   * `await kh.pipeline().generate("Swap ${params.amount} ETH for USDC on Base").wait()`
   */
  async swap(params: {
    network: string;
    tokenIn: string;
    tokenOut: string;
    amount: string;
    slippage?: number;
  }): Promise<DirectExecution> {
    throw new Error(
      "kh.web3.swap() is not yet available — the KeeperHub swap endpoint is coming soon. " +
      "Use kh.pipeline().generate('Swap X for Y on network') to execute swaps via AI-generated workflows."
    );
  }

  /**
   * Unified contract call — specify type explicitly so agents don't have to
   * know whether a function is read (view/pure) or write (state-changing).
   *
   * @param type "read" for view/pure functions; "write" for state-changing ones
   *
   * @example
   * // Read: get balance
   * const balance = await kh.web3.call("read", {
   *   network: "1", contract: "0xUSDC", function: "balanceOf", args: ["0xWallet"]
   * });
   *
   * // Write: approve tokens
   * const exec = await kh.web3.call("write", {
   *   network: "1", contract: "0xUSDC", function: "approve", args: ["0xSpender", "1000000"]
   * });
   */
  async call(
    type: "read" | "write",
    params: ContractCallParams | ContractReadParams
  ): Promise<unknown> {
    if (type === "read") {
      return this.read(params);
    }
    return this.write(params as ContractCallParams);
  }
}
