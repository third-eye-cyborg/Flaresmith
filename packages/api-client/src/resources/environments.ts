import { CloudMakeClient } from "../client";
import {
  GetEnvironmentsResponseSchema,
  type GetEnvironmentsResponse,
} from "@cloudmake/types";

export class EnvironmentsResource {
  constructor(private client: CloudMakeClient) {}

  async list(projectId: string): Promise<GetEnvironmentsResponse> {
    return this.client.get(`/projects/${projectId}/environments`, GetEnvironmentsResponseSchema);
  }
}
