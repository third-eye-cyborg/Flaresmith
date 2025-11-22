import { CloudMakeClient } from "../client";
import {
  ApplySpecRequestSchema,
  ApplySpecResponseSchema,
  type ApplySpecRequest,
  type ApplySpecResponse,
} from "@cloudmake/types";

export class SpecsResource {
  constructor(private client: CloudMakeClient) {}

  async apply(request: ApplySpecRequest): Promise<ApplySpecResponse> {
    return this.client.post("/specs/apply", ApplySpecResponseSchema, request);
  }
}
