import type {
  ConditionConfig,
  CreateWorkflowInput,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowTriggerDefinition,
} from "../types/index.js";
import type { ConditionDefinition } from "./conditions.js";
import type { ExecutionHandle } from "./executions.js";

class WorkflowBuilderError extends Error {
  constructor(message: string) {
    super(`[WorkflowBuilder] ${message}`);
    this.name = "WorkflowBuilderError";
  }
}

type ActionStepInput = {
  id: string;
  label: string;
  actionType: string;
  config?: Record<string, unknown>;
  description?: string;
};

type TriggerNodeInput = {
  label?: string;
  description?: string;
};

export type WorkflowBuilderInput = Pick<
  CreateWorkflowInput,
  "name" | "description" | "projectId" | "tagId"
>;

/**
 * Minimal interface required by WorkflowBuilder for .save() and .run().
 * Passed in by KeeperHub.workflowBuilder() — not needed if you only use .build().
 * @internal
 */
export interface WorkflowPersistence {
  create(input: CreateWorkflowInput): Promise<Workflow>;
  execute(
    workflowId: string,
    input?: Record<string, unknown>
  ): Promise<ExecutionHandle>;
}

/**
 * Internal interface used by WorkflowBranchBuilder to call back into
 * WorkflowBuilder without exposing internal methods on the public API.
 * @internal
 */
interface BranchBuilderContext {
  addBranchStep(
    sourceIds: string[],
    handle: "true" | "false",
    input: ActionStepInput,
    branchIndex: number,
    branchSide: "true" | "false"
  ): string;
  mergeBranches(nodeIds: string[]): WorkflowBuilder;
  getMaxX(): number;
}

const X_SPACING = 250;
const Y_SPACING = 180;
const START_X = 100;
const START_Y = 200;

function edgeId(
  source: string,
  target: string,
  handle?: WorkflowEdge["sourceHandle"]
) {
  return handle
    ? `edge_${source}_${handle}_${target}`
    : `edge_${source}_${target}`;
}

export const triggers = {
  manual(): WorkflowTriggerDefinition {
    return { triggerType: "Manual" };
  },
  schedule(
    cron: string,
    options?: { timezone?: string }
  ): WorkflowTriggerDefinition {
    return {
      triggerType: "Schedule",
      scheduleCron: cron,
      scheduleTimezone: options?.timezone,
    };
  },
  webhook(options?: {
    schema?: string;
    mockRequest?: string;
  }): WorkflowTriggerDefinition {
    return {
      triggerType: "Webhook",
      webhookSchema: options?.schema,
      webhookMockRequest: options?.mockRequest,
    };
  },
  event(input: {
    network: string | number;
    contractAddress: string;
    contractABI: string;
    eventName: string;
  }): WorkflowTriggerDefinition {
    return {
      triggerType: "Event",
      network: String(input.network),
      contractAddress: input.contractAddress,
      contractABI: input.contractABI,
      eventName: input.eventName,
    };
  },
  block(input: {
    network: string | number;
    blockInterval: string | number;
  }): WorkflowTriggerDefinition {
    return {
      triggerType: "Block",
      network: String(input.network),
      blockInterval: String(input.blockInterval),
    };
  },
};

export class WorkflowBuilder {
  private readonly nodes: WorkflowNode[] = [];
  private readonly edges: WorkflowEdge[] = [];
  private currentNodeIds: string[] = [];
  private maxX = START_X;
  private nextRow = 0;
  private hasTrigger = false;
  private readonly nodeIds = new Set<string>();

  constructor(
    private readonly input: WorkflowBuilderInput,
    private readonly persistence?: WorkflowPersistence
  ) {
    if (!input.name?.trim()) {
      throw new WorkflowBuilderError("Workflow name is required.");
    }
  }

  trigger(
    definition: WorkflowTriggerDefinition,
    options?: TriggerNodeInput
  ): this {
    if (this.hasTrigger) {
      throw new WorkflowBuilderError(
        "A workflow can only have one trigger. Call .trigger() once before adding steps."
      );
    }
    const node = this.createNode({
      id: "trigger",
      label: options?.label ?? definition.triggerType,
      nodeType: "trigger",
      kind: "trigger",
      config: definition,
      description: options?.description,
      position: { x: START_X, y: START_Y },
    });

    this.nodes.push(node);
    this.nodeIds.add(node.id);
    this.currentNodeIds = [node.id];
    this.maxX = START_X;
    this.hasTrigger = true;
    return this;
  }

  step(input: ActionStepInput): this {
    if (!this.hasTrigger) {
      throw new WorkflowBuilderError("Call .trigger() before adding steps.");
    }
    if (this.nodeIds.has(input.id)) {
      throw new WorkflowBuilderError(
        `Duplicate node ID "${input.id}". Every step must have a unique ID.`
      );
    }
    const node = this.createActionNode(input, this.maxX + X_SPACING, START_Y);
    this.nodes.push(node);
    this.nodeIds.add(node.id);
    this.connectCurrentTo(node.id);
    this.currentNodeIds = [node.id];
    this.maxX = node.position.x;
    return this;
  }

  if(
    id: string,
    condition: ConditionDefinition | string,
    options?: { label?: string; description?: string }
  ): WorkflowBranchBuilder {
    const node = this.createActionNode(
      {
        id,
        label: options?.label ?? "Condition",
        actionType: "Condition",
        description: options?.description,
        config:
          typeof condition === "string"
            ? { condition }
            : {
                condition: condition.toExpression(),
                conditionConfig: condition.config satisfies ConditionConfig,
              },
      },
      this.maxX + X_SPACING,
      START_Y
    );

    this.nodes.push(node);
    this.connectCurrentTo(node.id);
    this.maxX = node.position.x;

    const ctx: BranchBuilderContext = {
      addBranchStep: this._addBranchStep.bind(this),
      mergeBranches: this._mergeBranches.bind(this),
      getMaxX: () => this.maxX,
    };

    return new WorkflowBranchBuilder(ctx, node.id);
  }

  /** Assemble the final workflow spec. Does NOT save to KeeperHub. */
  build(): CreateWorkflowInput {
    if (!this.hasTrigger) {
      throw new WorkflowBuilderError(
        "Cannot build a workflow without a trigger. Call .trigger() first."
      );
    }
    if (this.nodes.length < 2) {
      throw new WorkflowBuilderError(
        "Workflow must have at least one trigger and one step. Add a .step() before calling .build()."
      );
    }
    return {
      ...this.input,
      nodes: [...this.nodes],
      edges: [...this.edges],
    };
  }

  /**
   * Build and save the workflow to KeeperHub. Returns the persisted Workflow
   * with a real ID you can use for execution.
   *
   * Requires the builder to be created via `kh.workflowBuilder()`.
   *
   * @example
   * const wf = await kh.workflowBuilder({ name: "My workflow" })
   *   .trigger(triggers.schedule("0 9 * * 1"))
   *   .step({ id: "s1", label: "Send alert", actionType: "SendEmail", config: { ... } })
   *   .save();
   *
   * await kh.pipeline().workflow(wf.id).wait();
   */
  async save(): Promise<Workflow> {
    if (!this.persistence) {
      throw new WorkflowBuilderError(
        ".save() requires the builder to be created via kh.workflowBuilder(). " +
          "Standalone WorkflowBuilder instances do not have access to the KeeperHub API."
      );
    }
    return this.persistence.create(this.build());
  }

  /**
   * Build, save, and execute the workflow in one call.
   * Returns an ExecutionHandle — call .waitForCompletion() to block until done.
   *
   * Requires the builder to be created via `kh.workflowBuilder()`.
   *
   * @example
   * const handle = await kh.workflowBuilder({ name: "My workflow" })
   *   .trigger(triggers.schedule("0 9 * * 1"))
   *   .step({ id: "s1", label: "Compound USDC", actionType: "AaveSupply", config: { ... } })
   *   .run();
   *
   * const result = await handle.waitForCompletion();
   */
  async run(input?: Record<string, unknown>): Promise<ExecutionHandle> {
    if (!this.persistence) {
      throw new WorkflowBuilderError(
        ".run() requires the builder to be created via kh.workflowBuilder(). " +
          "Standalone WorkflowBuilder instances do not have access to the KeeperHub API."
      );
    }
    const wf = await this.save();
    return this.persistence.execute(wf.id, input);
  }

  private createActionNode(
    input: ActionStepInput,
    x: number,
    y: number
  ): WorkflowNode {
    return this.createNode({
      id: input.id,
      label: input.label,
      description: input.description,
      nodeType: "action",
      kind: input.actionType,
      config: {
        actionType: input.actionType,
        ...(input.config ?? {}),
      },
      position: { x, y },
    });
  }

  private createNode(input: {
    id: string;
    label: string;
    nodeType: "trigger" | "action";
    kind: string;
    config: Record<string, unknown>;
    description?: string;
    position: { x: number; y: number };
  }): WorkflowNode {
    return {
      id: input.id,
      type: input.nodeType,
      position: input.position,
      data: {
        label: input.label,
        description: input.description,
        type: input.nodeType,
        config: input.config,
        status: "idle",
      },
    };
  }

  private connectCurrentTo(target: string): void {
    for (const source of this.currentNodeIds) {
      this.edges.push({
        id: edgeId(source, target),
        source,
        target,
        type: "default",
      });
    }
  }

  /** @internal — used only by WorkflowBranchBuilder via BranchBuilderContext */
  private _addBranchStep(
    sourceIds: string[],
    handle: "true" | "false",
    input: ActionStepInput,
    branchIndex: number,
    branchSide: "true" | "false"
  ): string {
    const y =
      START_Y +
      (branchSide === "true" ? -1 : 1) * Y_SPACING * Math.max(branchIndex, 1);
    const node = this.createActionNode(input, this.maxX + X_SPACING, y);
    this.nodes.push(node);

    for (const source of sourceIds) {
      this.edges.push({
        id: edgeId(source, node.id, handle),
        source,
        target: node.id,
        sourceHandle: handle,
        type: "default",
      });
    }

    this.maxX = Math.max(this.maxX, node.position.x);
    return node.id;
  }

  /** @internal — used only by WorkflowBranchBuilder via BranchBuilderContext */
  private _mergeBranches(nodeIds: string[]): WorkflowBuilder {
    this.currentNodeIds = nodeIds;
    this.nextRow += 1;
    return this;
  }
}

export class WorkflowBranchBuilder {
  private trueLeafIds: string[];
  private falseLeafIds: string[];
  private trueDepth = 0;
  private falseDepth = 0;

  constructor(
    private readonly ctx: BranchBuilderContext,
    conditionNodeId: string
  ) {
    this.trueLeafIds = [conditionNodeId];
    this.falseLeafIds = [conditionNodeId];
  }

  thenStep(input: ActionStepInput): this {
    this.trueDepth += 1;
    this.trueLeafIds = [
      this.ctx.addBranchStep(
        this.trueLeafIds,
        "true",
        input,
        this.trueDepth,
        "true"
      ),
    ];
    return this;
  }

  elseStep(input: ActionStepInput): this {
    this.falseDepth += 1;
    this.falseLeafIds = [
      this.ctx.addBranchStep(
        this.falseLeafIds,
        "false",
        input,
        this.falseDepth,
        "false"
      ),
    ];
    return this;
  }

  endIf(): WorkflowBuilder {
    return this.ctx.mergeBranches([...this.trueLeafIds, ...this.falseLeafIds]);
  }
}
