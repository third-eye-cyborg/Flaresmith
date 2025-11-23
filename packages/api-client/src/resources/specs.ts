import { CloudMakeClient } from "../client";
import {
  ApplySpecResponseSchema,
  type ApplySpecRequest,
  type ApplySpecResponse,
} from "@flaresmith/types";

export class SpecsResource {
  constructor(private client: CloudMakeClient) {}

  async apply(request: ApplySpecRequest): Promise<ApplySpecResponse> {
    return this.client.post("/specs/apply", ApplySpecResponseSchema, request);
  }
}
