import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useKeeperHub } from "../context.js";

export function useDeleteWorkflow() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (workflowId) => kh.workflows.delete(workflowId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}
