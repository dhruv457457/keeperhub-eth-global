import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KeeperHub } from "./index.js";

describe("config resolution", () => {
  const originalEnv = process.env.KEEPERHUB_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.KEEPERHUB_API_KEY;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.KEEPERHUB_API_KEY;
    } else {
      process.env.KEEPERHUB_API_KEY = originalEnv;
    }
  });

  it("loads the api key from KEEPERHUB_API_KEY when none is passed", () => {
    process.env.KEEPERHUB_API_KEY = "kh_env_key";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const kh = new KeeperHub({});

    expect(kh._http.getAuthHeaders()).toEqual({
      Authorization: "Bearer kh_env_key",
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("throws a helpful error when no api key is available", () => {
    expect(() => new KeeperHub({})).toThrowError(/npx keeperhub login/);
  });
});
