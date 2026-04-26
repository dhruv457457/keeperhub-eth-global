import { useEffect, useRef, useState } from "react";
import type { ExecutionStream } from "../../core/executions.js";
import type { ExecutionLog, ExecutionStatus } from "../../types/index.js";
import { useKeeperHub } from "../context.js";

interface StreamState {
  logs: ExecutionLog[];
  status: ExecutionStatus | null;
  isConnected: boolean;
}

/**
 * Live WebSocket stream for a running execution.
 * Updates in real-time as steps execute — no polling needed.
 */
export function useExecutionStream(
  executionId: string | undefined
): StreamState {
  const kh = useKeeperHub();
  const streamRef = useRef<ExecutionStream | null>(null);
  const [state, setState] = useState<StreamState>({
    logs: [],
    status: null,
    isConnected: false,
  });

  useEffect(() => {
    if (!executionId) return;

    const handle = kh.executions.handle(executionId);
    const stream = handle.stream();
    streamRef.current = stream;

    setState({ logs: [], status: null, isConnected: true });

    stream.on("step", (data) => {
      const log = data as ExecutionLog;
      setState((prev) => ({ ...prev, logs: [...prev.logs, log] }));
    });

    stream.on("complete", (data) => {
      const event = data as { status: ExecutionStatus };
      setState((prev) => ({
        ...prev,
        status: event.status,
        isConnected: false,
      }));
    });

    stream.on("error", () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    stream.on("close", () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    return () => {
      stream.close();
      streamRef.current = null;
    };
  }, [executionId, kh]);

  return state;
}
