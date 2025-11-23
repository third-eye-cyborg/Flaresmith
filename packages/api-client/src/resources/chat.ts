import { CloudMakeClient } from "../client";
import {
  ApplyDiffResponseSchema,
  type ApplyDiffRequest,
  type ApplyDiffResponse,
} from "@flaresmith/types";

export class ChatResource {
  constructor(private client: CloudMakeClient) {}

  async applyDiff(request: ApplyDiffRequest): Promise<ApplyDiffResponse> {
    return this.client.post("/chat/apply-diff", ApplyDiffResponseSchema, request);
  }
}
