import type {
  ConditionConfig,
  ConditionGroup,
  ConditionOperator,
  ConditionRule,
} from "../types/index.js";

type ConditionOperand = string | number | boolean | null;

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeOperand(value: ConditionOperand | NodeReference): string {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  return String(value);
}

function quoteIfNeeded(value: ConditionOperand | NodeReference): string {
  if (value instanceof NodeReference) return value.toString();
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  return String(value);
}

function serializeOperand(value: string): string {
  if (value.startsWith("{{@")) return value;
  if (value === "true" || value === "false" || value === "null") return value;
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  return JSON.stringify(value);
}

function isUnaryOperator(operator: ConditionOperator): boolean {
  return (
    operator === "isEmpty" ||
    operator === "isNotEmpty" ||
    operator === "exists" ||
    operator === "doesNotExist"
  );
}

function ruleToExpression(rule: ConditionRule): string {
  const left = rule.leftOperand;
  if (isUnaryOperator(rule.operator)) {
    return `${left} ${rule.operator}`;
  }
  return `${left} ${rule.operator} ${serializeOperand(rule.rightOperand ?? "")}`;
}

function groupToExpression(group: ConditionGroup): string {
  const parts = group.rules.map((rule) => {
    if ("logic" in rule) {
      const nested = groupToExpression(rule);
      return rule.rules.length > 1 ? `(${nested})` : nested;
    }
    return ruleToExpression(rule);
  });

  return parts.join(` ${group.logic} `);
}

export class NodeReference {
  constructor(
    readonly nodeId: string,
    readonly label: string,
    readonly field: string
  ) {}

  toString(): string {
    return `{{@${this.nodeId}:${this.label}.${this.field}}}`;
  }
}

export class ConditionDefinition {
  constructor(readonly config: ConditionConfig) {}

  toExpression(): string {
    return groupToExpression(this.config.group);
  }
}

function createRule(
  leftOperand: ConditionOperand | NodeReference,
  operator: ConditionOperator,
  rightOperand?: ConditionOperand | NodeReference
): ConditionDefinition {
  const rule: ConditionRule = {
    id: randomId("rule"),
    leftOperand: normalizeOperand(leftOperand),
    operator,
  };

  if (!isUnaryOperator(operator) && rightOperand !== undefined) {
    rule.rightOperand = normalizeOperand(rightOperand);
  }

  return new ConditionDefinition({
    group: {
      id: randomId("group"),
      logic: "AND",
      rules: [rule],
    },
  });
}

function combineConditions(
  logic: "AND" | "OR",
  conditions: ConditionDefinition[]
): ConditionDefinition {
  return new ConditionDefinition({
    group: {
      id: randomId("group"),
      logic,
      rules: conditions.map((condition) => condition.config.group),
    },
  });
}

export function ref(
  nodeId: string,
  label: string,
  field: string
): NodeReference {
  return new NodeReference(nodeId, label, field);
}

export const when = {
  raw(expression: string): ConditionDefinition {
    return new ConditionDefinition({
      group: {
        id: randomId("group"),
        logic: "AND",
        rules: [
          {
            id: randomId("rule"),
            leftOperand: expression,
            operator: "exists",
          },
        ],
      },
    });
  },
  eq(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "===", rightOperand);
  },
  notEq(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "!==", rightOperand);
  },
  gt(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, ">", rightOperand);
  },
  gte(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, ">=", rightOperand);
  },
  lt(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "<", rightOperand);
  },
  lte(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "<=", rightOperand);
  },
  contains(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "contains", rightOperand);
  },
  startsWith(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "startsWith", rightOperand);
  },
  endsWith(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "endsWith", rightOperand);
  },
  matchesRegex(
    leftOperand: ConditionOperand | NodeReference,
    rightOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "matchesRegex", rightOperand);
  },
  isEmpty(leftOperand: ConditionOperand | NodeReference): ConditionDefinition {
    return createRule(leftOperand, "isEmpty");
  },
  isNotEmpty(
    leftOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "isNotEmpty");
  },
  exists(leftOperand: ConditionOperand | NodeReference): ConditionDefinition {
    return createRule(leftOperand, "exists");
  },
  doesNotExist(
    leftOperand: ConditionOperand | NodeReference
  ): ConditionDefinition {
    return createRule(leftOperand, "doesNotExist");
  },
  and(...conditions: ConditionDefinition[]): ConditionDefinition {
    return combineConditions("AND", conditions);
  },
  or(...conditions: ConditionDefinition[]): ConditionDefinition {
    return combineConditions("OR", conditions);
  },
};
