export interface ClientItem {
  id: string; // composite key
  name: string;
  contact: string;
  keysCount: number;
  activeKeysCount: number;
  totalSpent: number;
  lastSeenAt?: string | null;
  lastPlatform?: string | null;
  logoUrl?: string | null;
  licenseIds: string[];
}

export interface ClientMetrics {
  totalClients: number;
  activeClients: number;
  onlineDevices: number;
  totalSpent: number;
}

export interface CreateClientInput {
  name: string;
  contact: string;
  tier: "standard" | "pro" | "enterprise";
  credits_balance: number;
  amount: number;
  plan_type: string;
  payment_method: string;
}

export interface EditClientInput {
  client: ClientItem;
  newName: string;
  newContact: string;
  tier?: "standard" | "pro" | "enterprise";
}
