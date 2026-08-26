/// <reference types="webmcp-types" />

/**
 * webmcp-types@0.1.5 follows document.modelContext but omits executeTool.
 * The 19 August 2026 spec includes it: https://webmachinelearning.github.io/webmcp/
 */
declare namespace WebMCP {
  interface ModelContextExecuteToolOptions {
    signal?: AbortSignal;
  }

  interface ModelContext {
    executeTool(
      tool: RegisteredTool,
      inputObject?: object,
      options?: ModelContextExecuteToolOptions
    ): Promise<string>;
  }
}
