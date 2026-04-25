import type {
  SafeRunOptions,
  SearchTemplatesInput,
  UpdateWorkflowInput,
  Workflow,
  WorkflowRunResult,
  WorkflowTemplate,
} from "../types/index.js";
import type { HttpClient } from "./client.js";
import type { WorkflowsModule } from "./workflows.js";

// ─── TemplateDeploymentBuilder ────────────────────────────────────────────────

/**
 * Fluent builder returned by kh.templates.use(templateId).
 *
 * @example
 * const result = await kh.templates
 *   .use("template_abc")
 *   .with({ name: "My Strategy", inputs: { asset: "USDC", amount: "100" } })
 *   .override(wf => ({ ...wf, description: "Custom strategy" }))
 *   .run({ wait: true })
 */
export class TemplateDeploymentBuilder {
  private deploymentName?: string;
  private runtimeInputs?: Record<string, unknown>;
  private overrideFn?: (wf: Workflow) => Partial<UpdateWorkflowInput>;

  constructor(
    private readonly templates: TemplatesModule,
    private readonly workflows: WorkflowsModule,
    private readonly templateId: string
  ) {}

  /**
   * Configure the deployed workflow.
   * @param input.name — Name for the cloned workflow (optional)
   * @param input.inputs — Runtime key-value pairs passed to execution
   */
  with(input: { name?: string; inputs?: Record<string, unknown> }): this {
    if (input.name !== undefined) this.deploymentName = input.name;
    if (input.inputs !== undefined)
      this.runtimeInputs = { ...this.runtimeInputs, ...input.inputs };
    return this;
  }

  /**
   * Transform the workflow after cloning, before execution.
   * Receive the full Workflow and return a patch.
   *
   * @example
   * .override(wf => ({
   *   nodes: tweakNodes(wf.nodes),
   *   description: "Patched by my app",
   * }))
   */
  override(fn: (wf: Workflow) => Partial<UpdateWorkflowInput>): this {
    this.overrideFn = fn;
    return this;
  }

  /** Clone the template (and apply any override patch) without executing it. */
  async deploy(): Promise<Workflow> {
    const wf = await this.templates.deploy(this.templateId, {
      name: this.deploymentName,
    });
    if (this.overrideFn) {
      const patch = this.overrideFn(wf);
      return this.workflows.update(wf.id, patch);
    }
    return wf;
  }

  /**
   * Clone, optionally patch, then execute the workflow.
   * Merges `.with({ inputs })` into the execution input.
   */
  async run(options?: SafeRunOptions): Promise<WorkflowRunResult> {
    const wf = await this.deploy();
    return this.workflows.run(wf.id, {
      ...options,
      input: { ...(this.runtimeInputs ?? {}), ...(options?.input ?? {}) },
    });
  }
}

// ─── TemplatesModule ──────────────────────────────────────────────────────────

export class TemplatesModule {
  constructor(
    private readonly client: HttpClient,
    private readonly workflows: WorkflowsModule
  ) {}

  /** Search public workflow templates */
  async search(input?: SearchTemplatesInput): Promise<WorkflowTemplate[]> {
    return this.client.request<WorkflowTemplate[]>(
      "GET",
      "/api/workflows/public",
      {
        query: {
          q: input?.query,
          category: input?.category,
        },
      }
    );
  }

  /** Get a single template */
  async get(templateId: string): Promise<WorkflowTemplate> {
    return this.client.request<WorkflowTemplate>(
      "GET",
      `/api/workflows/${templateId}`
    );
  }

  /** Clone a template into your org as a new workflow */
  async deploy(
    templateId: string,
    options?: { name?: string }
  ): Promise<Workflow> {
    return this.client.request<Workflow>(
      "POST",
      `/api/workflows/${templateId}/claim`,
      { body: options }
    );
  }

  /**
   * Start a fluent deployment chain.
   *
   * @example
   * // Just deploy
   * const wf = await kh.templates.use("aave-compound").deploy()
   *
   * // Deploy + runtime inputs + execute
   * const result = await kh.templates
   *   .use("aave-compound")
   *   .with({ inputs: { asset: "USDC", frequency: "weekly" } })
   *   .override(wf => ({ name: `USDC Compounder ${Date.now()}` }))
   *   .run()
   */
  use(templateId: string): TemplateDeploymentBuilder {
    return new TemplateDeploymentBuilder(this, this.workflows, templateId);
  }
}
