import { describe, expect, it } from "vitest";

import { KeeperHub, ref, triggers, when } from "./index.js";

describe("workflow builder", () => {
  it("builds a schedule workflow with conditional branches", () => {
    const kh = new KeeperHub({ apiKey: "test-key" });

    const workflow = kh
      .workflowBuilder({
        name: "Auto buy ETH",
        description: "Buy when the observed price drops below target",
      })
      .trigger(triggers.schedule("0 */6 * * *", { timezone: "UTC" }))
      .step({
        id: "fetch-price",
        label: "Fetch Price",
        actionType: "HTTP Request",
        config: {
          endpoint: "https://api.example.com/price",
          httpMethod: "GET",
        },
      })
      .if(
        "price-check",
        when.lt(ref("fetch-price", "Fetch Price", "data.price"), 1800),
        { label: "Price Below Threshold" }
      )
      .thenStep({
        id: "buy-eth",
        label: "Buy ETH",
        actionType: "Execute Swap",
        config: {
          network: "8453",
          amount: "100",
        },
      })
      .elseStep({
        id: "notify",
        label: "Notify Discord",
        actionType: "Discord: Send Message",
        config: {
          message: "Price is still above the threshold",
        },
      })
      .endIf()
      .build();

    expect(workflow.nodes).toHaveLength(5);
    expect(workflow.edges).toHaveLength(4);
    expect(workflow.nodes?.[0]?.data.config).toEqual({
      triggerType: "Schedule",
      scheduleCron: "0 */6 * * *",
      scheduleTimezone: "UTC",
    });

    const conditionNode = workflow.nodes?.find(
      (node) => node.id === "price-check"
    );
    expect(conditionNode?.data.config).toMatchObject({
      actionType: "Condition",
      condition: "{{@fetch-price:Fetch Price.data.price}} < 1800",
    });

    expect(workflow.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "price-check",
          target: "buy-eth",
          sourceHandle: "true",
        }),
        expect.objectContaining({
          source: "price-check",
          target: "notify",
          sourceHandle: "false",
        }),
      ])
    );
  });

  it("creates nested condition expressions with config metadata", () => {
    const condition = when.and(
      when.gt(ref("vault", "Vault Health", "healthFactor"), 150),
      when.or(
        when.eq(ref("price", "ETH Price", "data.symbol"), "ETH"),
        when.lte(ref("price", "ETH Price", "data.price"), 1800)
      )
    );

    expect(condition.toExpression()).toBe(
      '{{@vault:Vault Health.healthFactor}} > 150 AND ({{@price:ETH Price.data.symbol}} === "ETH" OR {{@price:ETH Price.data.price}} <= 1800)'
    );
    expect(condition.config.group.logic).toBe("AND");
    expect(condition.config.group.rules).toHaveLength(2);
  });
});
