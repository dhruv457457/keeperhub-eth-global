import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
  Execution,
  ExecutionStatus,
  WaitForCompletionOptions,
} from "../../types/index.js";
import { useKeeperHub } from "../context.js";

const TERMINAL: ExecutionStatus[] = [
  "completed",
  "failed",
  "error",
  "cancelled",
];

export function useExecuteWorkflow(
  workflowId: string,
  options?: WaitForCompletionOptions
) {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  const [executionId, setExecutionId] = useState<string | undefined>();

  // Auto-poll status while execution is running
  const statusQuery = useQuery({
    queryKey: ["execution", "status", executionId],
    queryFn: () => kh.executions.getStatus(executionId!),
    enabled: !!executionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status as ExecutionStatus | undefined;
      if (!status || TERMINAL.includes(status)) return false;
      return options?.pollInterval ?? 2000;
    },
  });

  const mutation = useMutation<
    void,
    Error,
    Record<string, unknown> | undefined
  >({
    mutationFn: async (input) => {
      const handle = await kh.workflows.execute(workflowId, input);
      setExecutionId(handle.id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["executions", workflowId] });
    },
  });

  const result = useQuery<Execution>({
    queryKey: ["execution", executionId],
    queryFn: () => kh.executions.get(executionId!),
    enabled:
      !!executionId &&
      TERMINAL.includes(statusQuery.data?.status as ExecutionStatus),
  });

  return {
    execute: (input?: Record<string, unknown>) => mutation.mutate(input),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    executionId,
    status: statusQuery.data,
    isRunning:
      !!executionId &&
      !TERMINAL.includes(statusQuery.data?.status as ExecutionStatus),
    result: result.data,
  };
}
