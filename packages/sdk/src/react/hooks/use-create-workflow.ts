import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateWorkflowInput, Workflow } from "../../types/index.js";
import { useKeeperHub } from "../context.js";

export function useCreateWorkflow() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<Workflow, Error, CreateWorkflowInput>({
    mutationFn: (input) => kh.workflows.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}
