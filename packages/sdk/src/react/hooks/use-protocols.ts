import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  Protocol,
  ProtocolAction,
  SearchProtocolActionsInput,
} from "../../types/index.js";
import { useKeeperHub } from "../context.js";

export function useProtocols() {
  const kh = useKeeperHub();
  return useQuery<Protocol[]>({
    queryKey: ["protocols"],
    queryFn: () => kh.protocols.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProtocol(slug: string | undefined) {
  const kh = useKeeperHub();
  return useQuery<Protocol>({
    queryKey: ["protocol", slug],
    queryFn: () => kh.protocols.get(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProtocolActions(input?: SearchProtocolActionsInput) {
  const kh = useKeeperHub();
  return useQuery<ProtocolAction[]>({
    queryKey: ["protocol-actions", input],
    queryFn: () => kh.protocols.search(input),
    staleTime: 5 * 60 * 1000,
  });
}

export function useExecuteProtocol() {
  const kh = useKeeperHub();
  return useMutation<
    { executionId?: string; result?: unknown; status: string },
    Error,
    { actionType: string; params: Record<string, unknown> }
  >({
    mutationFn: ({ actionType, params }) =>
      kh.protocols.execute(actionType, params),
  });
}
