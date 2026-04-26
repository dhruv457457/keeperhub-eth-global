import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  CheckAndExecuteParams,
  ContractCallParams,
  ContractReadParams,
  DirectExecution,
  GasEstimate,
  TransferParams,
} from "../../types/index.js";
import { useKeeperHub } from "../context.js";

/** Read a contract view function (auto-cached) */
export function useContractRead(
  params: ContractReadParams | undefined,
  options?: { refetchInterval?: number }
) {
  const kh = useKeeperHub();
  return useQuery<unknown>({
    queryKey: ["contract-read", params],
    queryFn: () => kh.web3.read(params!),
    enabled: !!params,
    refetchInterval: options?.refetchInterval,
  });
}

/** Write to a contract */
export function useContractCall() {
  const kh = useKeeperHub();
  return useMutation<DirectExecution, Error, ContractCallParams>({
    mutationFn: (params) => kh.web3.write(params),
  });
}

/** Transfer native token or ERC-20 */
export function useTransfer() {
  const kh = useKeeperHub();
  return useMutation<DirectExecution, Error, TransferParams>({
    mutationFn: (params) => kh.web3.transfer(params),
  });
}

/** Conditional onchain execution */
export function useCheckAndExecute() {
  const kh = useKeeperHub();
  return useMutation<DirectExecution, Error, CheckAndExecuteParams>({
    mutationFn: (params) => kh.web3.checkAndExecute(params),
  });
}

/** Estimate gas for a transaction (auto-cached 30s) */
export function useGasEstimate(
  params: ContractCallParams | ContractReadParams | undefined
) {
  const kh = useKeeperHub();
  return useQuery<GasEstimate>({
    queryKey: ["gas-estimate", params],
    queryFn: () => kh.web3.estimateGas(params!),
    enabled: !!params,
    staleTime: 30_000,
  });
}

/** Fetch ABI for a verified contract (cached 1h) */
export function useAbi(
  contractAddress: string | undefined,
  chainId: number | undefined
) {
  const kh = useKeeperHub();
  return useQuery<unknown[]>({
    queryKey: ["abi", contractAddress, chainId],
    queryFn: () => kh.web3.getAbi(contractAddress!, chainId!),
    enabled: !!contractAddress && !!chainId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
