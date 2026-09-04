import { getRuntime } from "../../../core/runtime";
import { activateLicense, heartbeatLicense } from "../../../core/api";
import type { MachineInfo } from "../../../core/types";

export const activationService = {
  async getMachineInfo(): Promise<MachineInfo> {
    const runtime = getRuntime();
    return await runtime.getMachineInfo();
  },

  async readLicense(): Promise<string | null> {
    const runtime = getRuntime();
    return (await runtime.readLicense?.()) || null;
  },

  async saveLicense(licenseKey: string): Promise<void> {
    const runtime = getRuntime();
    await runtime.saveLicense?.(licenseKey);
  },

  async activate(licenseKey: string, machine: MachineInfo) {
    return await activateLicense(licenseKey, machine.machineId);
  },

  async heartbeat(licenseKey: string, machine: MachineInfo) {
    return await heartbeatLicense(licenseKey, machine.machineId, machine.appVersion, machine.platform);
  },
};
