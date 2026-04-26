import { useQuery } from "@tanstack/react-query";
import type { ListWorkflowsInput, Workflow } from "../../types/index.js";
import { useKeeperHub } from "../context.js";

export function useWorkflows(filters?: ListWorkflowsInput) {
  const kh = useKeeperHub();
  return useQuery<Workflow[]>({
    queryKey: ["workflows", filters],
    queryFn: () => kh.workflows.list(filters),
  });
}
