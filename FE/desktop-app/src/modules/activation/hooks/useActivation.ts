import { useState, useEffect } from "react";
import type { MachineInfo } from "../../../core/types";
import { activationService } from "../services/activationService";

export function useActivation() {
  const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    activationService.getMachineInfo().then(setMachineInfo).catch(() => {});
    activationService.readLicense().then((k) => k && setLicenseKey(k)).catch(() => {});
  }, []);

  return { machineInfo, licenseKey, setLicenseKey, loading, setLoading };
}
