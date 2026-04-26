import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddressBookEntry,
  AgentRegistryResponse,
  ApiKey,
  Chain,
  CreateAddressInput,
  CreatedApiKey,
  CreateIntegrationInput,
  CreateProjectInput,
  CreateTagInput,
  Integration,
  Project,
  SearchTemplatesInput,
  Tag,
  Wallet,
  WalletBalance,
  WorkflowTemplate,
} from "../../types/index.js";
import { useKeeperHub } from "../context.js";

// ─── Chains ──────────────────────────────────────────────────────────────────

export function useChains() {
  const kh = useKeeperHub();
  return useQuery<Chain[]>({
    queryKey: ["chains"],
    queryFn: () => kh.chains.list(),
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export function useIntegrations() {
  const kh = useKeeperHub();
  return useQuery<Integration[]>({
    queryKey: ["integrations"],
    queryFn: () => kh.integrations.list(),
  });
}

export function useCreateIntegration() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<Integration, Error, CreateIntegrationInput>({
    mutationFn: (input) => kh.integrations.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function useProjects() {
  const kh = useKeeperHub();
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => kh.projects.list(),
  });
}

export function useCreateProject() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<Project, Error, CreateProjectInput>({
    mutationFn: (input) => kh.projects.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export function useTags() {
  const kh = useKeeperHub();
  return useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => kh.tags.list(),
  });
}

export function useCreateTag() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<Tag, Error, CreateTagInput>({
    mutationFn: (input) => kh.tags.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

// ─── Address Book ─────────────────────────────────────────────────────────────

export function useAddressBook() {
  const kh = useKeeperHub();
  return useQuery<AddressBookEntry[]>({
    queryKey: ["address-book"],
    queryFn: () => kh.addressBook.list(),
  });
}

export function useAddAddress() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<AddressBookEntry, Error, CreateAddressInput>({
    mutationFn: (input) => kh.addressBook.add(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["address-book"] }),
  });
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export function useApiKeys() {
  const kh = useKeeperHub();
  return useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: () => kh.apiKeys.list(),
  });
}

export function useCreateApiKey() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<CreatedApiKey, Error, { name?: string } | undefined>({
    mutationFn: (input) => kh.apiKeys.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}

export function useRevokeApiKey() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (keyId) => kh.apiKeys.revoke(keyId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export function useWallet() {
  const kh = useKeeperHub();
  return useQuery<Wallet>({
    queryKey: ["wallet"],
    queryFn: () => kh.wallet.get(),
  });
}

export function useWalletBalances() {
  const kh = useKeeperHub();
  return useQuery<WalletBalance[]>({
    queryKey: ["wallet-balances"],
    queryFn: () => kh.wallet.balances(),
    staleTime: 30_000,
  });
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function useTemplates(input?: SearchTemplatesInput) {
  const kh = useKeeperHub();
  return useQuery<WorkflowTemplate[]>({
    queryKey: ["templates", input],
    queryFn: () => kh.templates.search(input),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeployTemplate() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<
    import("../../types/index.js").Workflow,
    Error,
    { templateId: string; name?: string }
  >({
    mutationFn: ({ templateId, name }) =>
      kh.templates.deploy(templateId, { name }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["workflows"] }),
  });
}

// ─── Agent Registry ───────────────────────────────────────────────────────────

export function useAgentRegistry() {
  const kh = useKeeperHub();
  return useQuery<AgentRegistryResponse>({
    queryKey: ["agent-registry"],
    queryFn: () => kh.agent.getRegistry(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegisterAgent() {
  const kh = useKeeperHub();
  const qc = useQueryClient();
  return useMutation<
    import("../../types/index.js").AgentRegistration,
    Error,
    {
      name?: string;
      description?: string;
      capabilities?: string[];
      workflowId?: string;
    }
  >({
    mutationFn: (input) => kh.agent.register(input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["agent-registry"] }),
  });
}
