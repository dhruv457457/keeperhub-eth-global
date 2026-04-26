import { useQuery } from "@tanstack/react-query";
import type {
  Execution,
  ExecutionLog,
  ExecutionStatus,
  ExecutionStatusResponse,
} from "../../types/index.js";
import { useKeeperHub } from "../context.js";

const TERMINAL: ExecutionStatus[] = [
  "completed",
  "failed",
  "error",
  "cancelled",
];

/** Auto-polls execution status until complete */
export function useExecution(executionId: string | undefined) {
  const kh = useKeeperHub();
  return useQuery<Execution>({
    queryKey: ["execution", executionId],
    queryFn: () => kh.executions.get(executionId!),
    enabled: !!executionId,
    refetchInterval: (query) => {
      const status = (query.state.data as Execution | undefined)?.status;
      if (!status || TERMINAL.includes(status)) return false;
      return 2000;
    },
  });
}

/** Auto-polls execution status (lightweight, just status + progress) */
export function useExecutionStatus(executionId: string | undefined) {
  const kh = useKeeperHub();
  return useQuery<ExecutionStatusResponse>({
    queryKey: ["execution", "status", executionId],
    queryFn: () => kh.executions.getStatus(executionId!),
    enabled: !!executionId,
    refetchInterval: (query) => {
      const status = (query.state.data as ExecutionStatusResponse | undefined)
        ?.status;
      if (!status || TERMINAL.includes(status as ExecutionStatus)) return false;
      return 2000;
    },
  });
}

/** Get step-by-step logs for an execution */
export function useExecutionLogs(executionId: string | undefined) {
  const kh = useKeeperHub();
  return useQuery<ExecutionLog[]>({
    queryKey: ["execution", "logs", executionId],
    queryFn: () => kh.executions.getLogs(executionId!),
    enabled: !!executionId,
  });
}

/** List executions for a workflow */
export function useExecutions(workflowId: string | undefined) {
  const kh = useKeeperHub();
  return useQuery<Execution[]>({
    queryKey: ["executions", workflowId],
    queryFn: () => kh.executions.list(workflowId!),
    enabled: !!workflowId,
  });
}
