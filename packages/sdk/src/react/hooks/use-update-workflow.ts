import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateWorkflowInput, Workflow } from "../../types/index.js";
import { useKeeperHub } from "../context.js";

export function useUpdateWorkflow(workflowId: string) {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<Workflow, Error, UpdateWorkflowInput>({
    mutationFn: (input) => kh.workflows.update(workflowId, input),
    onSuccess: (updated) => {
      qc.setQueryData(["workflow", workflowId], updated);
      void qc.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}
