import { CloudMakeClient } from "../client";
import {
  CreateProjectRequestSchema,
  CreateProjectResponseSchema,
  GetProjectResponseSchema,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type GetProjectResponse,
} from "@cloudmake/types";

export class ProjectsResource {
  constructor(private client: CloudMakeClient) {}

  async create(request: CreateProjectRequest): Promise<CreateProjectResponse> {
    return this.client.post("/projects", CreateProjectResponseSchema, request);
  }

  async get(id: string): Promise<GetProjectResponse> {
    return this.client.get(`/projects/${id}`, GetProjectResponseSchema);
  }
}
