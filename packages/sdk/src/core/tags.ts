import type { CreateTagInput, Tag } from "../types/index.js";
import type { HttpClient } from "./client.js";

export class TagsModule {
  constructor(private readonly client: HttpClient) {}

  async list(): Promise<Tag[]> {
    return this.client.request<Tag[]>("GET", "/api/tags");
  }

  async create(input: CreateTagInput): Promise<Tag> {
    return this.client.request<Tag>("POST", "/api/tags", { body: input });
  }

  async update(tagId: string, input: Partial<CreateTagInput>): Promise<Tag> {
    return this.client.request<Tag>("PATCH", `/api/tags/${tagId}`, {
      body: input,
    });
  }

  async delete(tagId: string): Promise<void> {
    await this.client.request("DELETE", `/api/tags/${tagId}`);
  }
}
