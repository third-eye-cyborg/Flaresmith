/**
 * T102: Spec-first context injection for chat prompts
 * This scaffold assembles a minimal context array. In production, pull from spec files and project metadata.
 */
export class ChatContextService {
  async buildPromptContext(projectId: string): Promise<string[]> {
    // TODO: Load spec highlights, OpenAPI, and types for the project.
    return [
      `project:${projectId}`,
      "principles:spec-first,Hono@Workers,Drizzle+Neon,Next.js14",
      "envs:dev/staging/prod + previews",
    ];
  }
}
