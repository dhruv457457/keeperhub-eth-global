import type { AddressBookEntry, CreateAddressInput } from "../types/index.js";
import type { HttpClient } from "./client.js";

export class AddressBookModule {
  constructor(private readonly client: HttpClient) {}

  async list(): Promise<AddressBookEntry[]> {
    return this.client.request<AddressBookEntry[]>("GET", "/api/address-book");
  }

  async add(input: CreateAddressInput): Promise<AddressBookEntry> {
    return this.client.request<AddressBookEntry>("POST", "/api/address-book", {
      body: input,
    });
  }

  async update(
    entryId: string,
    input: Partial<CreateAddressInput>
  ): Promise<AddressBookEntry> {
    return this.client.request<AddressBookEntry>(
      "PATCH",
      `/api/address-book/${entryId}`,
      { body: input }
    );
  }

  async remove(entryId: string): Promise<void> {
    await this.client.request("DELETE", `/api/address-book/${entryId}`);
  }
}
