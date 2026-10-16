type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
type Device = Navigator & { deviceMemory?: number; connection?: Connection };

/** Keep decorative 3D optional; explicit world entry still works on these devices. */
export function prefersLightweightExperience(): boolean {
  if (typeof navigator === "undefined" || typeof matchMedia === "undefined") return true;
  const device = navigator as Device;
  return Boolean(device.connection?.saveData || /(^|-)2g$/.test(device.connection?.effectiveType ?? "") ||
    (device.deviceMemory !== undefined && device.deviceMemory <= 4) ||
    (device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 4) ||
    matchMedia("(pointer: coarse)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export function watchDeviceBudget(onChange: () => void): () => void {
  const queries = [matchMedia("(pointer: coarse)"), matchMedia("(prefers-reduced-motion: reduce)")];
  const connection = (navigator as Device).connection;
  queries.forEach(query => query.addEventListener("change", onChange));
  connection?.addEventListener("change", onChange);
  return () => {
    queries.forEach(query => query.removeEventListener("change", onChange));
    connection?.removeEventListener("change", onChange);
  };
}
