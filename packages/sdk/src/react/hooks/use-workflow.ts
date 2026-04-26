import { useQuery } from "@tanstack/react-query";
import type { Workflow } from "../../types/index.js";
import { useKeeperHub } from "../context.js";

export function useWorkflow(workflowId: string | undefined) {
  const kh = useKeeperHub();
  return useQuery<Workflow>({
    queryKey: ["workflow", workflowId],
    queryFn: () => kh.workflows.get(workflowId!),
    enabled: !!workflowId,
  });
}
