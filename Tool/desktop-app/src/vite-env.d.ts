/// <reference types="vite/client" />

import type { DesktopRuntime } from "./core/types";

declare global {
  interface Window {
    jacsRuntime?: DesktopRuntime;
  }
}

export {};
