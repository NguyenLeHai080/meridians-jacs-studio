import { licenseService } from "../../licenses/services/licenseService";
import type { CreateClientInput, EditClientInput } from "../types";

export const clientService = {
  async createClient(input: CreateClientInput): Promise<void> {
    // Generate valid desktop HWID format: JACS-WIN-[32 hex chars]
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("").toUpperCase();
    const generatedHwid = `JACS-WIN-${randomHex}`;

    await licenseService.create({
      customer_name: input.name.trim(),
      customer_contact: input.contact.trim(),
      hwid: generatedHwid,
      days_valid: 365,
      max_jobs_per_day: input.tier === "enterprise" ? 500 : input.tier === "pro" ? 200 : 50,
      premium_ai: input.tier !== "standard",
      notes: `Hồ sơ khách hàng tạo từ Admin Portal. Gói: ${input.tier.toUpperCase()}`,
    });
  },

  async updateClient(input: EditClientInput): Promise<void> {
    const { client, newName, newContact } = input;
    const promises = client.licenseIds.map((licId) =>
      licenseService.update(licId, {
        customer_name: newName.trim(),
        customer_contact: newContact.trim(),
        max_jobs_per_day: input.tier === "enterprise" ? 500 : input.tier === "pro" ? 200 : 50,
        premium_ai: input.tier !== "standard",
      })
    );
    await Promise.all(promises);
  },

  async deleteClient(licenseIds: string[]): Promise<void> {
    const promises = licenseIds.map((licId) => licenseService.delete(licId));
    await Promise.all(promises);
  },
};
