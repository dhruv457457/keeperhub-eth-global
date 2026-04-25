import type { CreateProjectInput, Project } from "../types/index.js";
import type { HttpClient } from "./client.js";

export class ProjectsModule {
  constructor(private readonly client: HttpClient) {}

  async list(): Promise<Project[]> {
    return this.client.request<Project[]>("GET", "/api/projects");
  }

  async get(projectId: string): Promise<Project> {
    return this.client.request<Project>("GET", `/api/projects/${projectId}`);
  }

  async create(input: CreateProjectInput): Promise<Project> {
    return this.client.request<Project>("POST", "/api/projects", {
      body: input,
    });
  }

  async update(
    projectId: string,
    input: Partial<CreateProjectInput>
  ): Promise<Project> {
    return this.client.request<Project>("PATCH", `/api/projects/${projectId}`, {
      body: input,
    });
  }

  async delete(projectId: string): Promise<void> {
    await this.client.request("DELETE", `/api/projects/${projectId}`);
  }
}
