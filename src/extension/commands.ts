import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { CbmServices } from "../pi-tools/definitions.js";

export function registerCommands(pi: ExtensionAPI, _services: CbmServices) {
  pi.registerCommand("cbm-md", {
    description: "Show pi-cbm-md status. Usage: /cbm-md [status]",
    handler: async (args, ctx) => {
      const action = args.trim() || "status";
      if (action === "status") {
        ctx.ui.notify("pi-cbm-md status\n  markdown tools: enabled\n  cbm auto-index: disabled\n  pi-cbm coexistence: safe", "info");
        return;
      }
      ctx.ui.notify(`Unknown /cbm-md action: ${action}. Use status.`, "warning");
    },
  });
}
