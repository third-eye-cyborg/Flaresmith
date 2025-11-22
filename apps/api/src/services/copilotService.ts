/**
 * T101: Copilot CLI wrapper service for chat
 * NOTE: In this scaffold, we simulate streaming tokens.
 */
export class CopilotService {
  constructor() {}

  async *streamResponse(prompt: string, context: string[]): AsyncGenerator<string> {
    const synthetic = `Considering context: ${context.join(", ")}.\n${prompt}\n\nProposed changes:\n- ...`;
    const tokens = synthetic.split(/(\s+)/).filter(Boolean);
    for (const t of tokens) {
      // Simulate token delay
      await new Promise((r) => setTimeout(r, 5));
      yield t;
    }
  }
}
