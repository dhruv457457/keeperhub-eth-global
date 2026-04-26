import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GenerateWorkflowInput, Workflow } from "../../types/index.js";
import { useKeeperHub } from "../context.js";

export function useGenerateWorkflow() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<Workflow, Error, GenerateWorkflowInput>({
    mutationFn: (input) => kh.workflows.generateAndCreate(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}
