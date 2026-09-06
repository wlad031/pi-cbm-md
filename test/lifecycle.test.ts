import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CbmServices } from "../src/pi-tools/definitions.js";

afterEach(() => {
  vi.resetModules();
});

describe("lifecycle", () => {
  it("adds markdown guidance and does not auto-index cbm", async () => {
    const { registerLifecycle } = await import("../src/extension/lifecycle.js");
    const handlers = new Map<string, (event: any, context?: unknown) => unknown>();
    const pi = {
      on(event: string, handler: (event: unknown, context?: unknown) => unknown) {
        handlers.set(event, handler as any);
      },
    } as unknown as ExtensionAPI;
    const indexCurrentRepo = vi.fn();
    const services = { projects: { indexCurrentRepo } } as unknown as CbmServices;

    registerLifecycle(pi, services);

    const result = await handlers.get("before_agent_start")?.({ systemPrompt: "base" });
    handlers.get("session_start")?.({}, { cwd: "/repo" });

    expect(result).toMatchObject({ systemPrompt: expect.stringContaining("pi-cbm-md guidance") });
    expect(indexCurrentRepo).not.toHaveBeenCalled();
  });
});
