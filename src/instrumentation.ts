export async function register() {
  if (process.env.NEXT_RUNTIME === "node") {
    const { validateEnv } = await import("@/lib/config/env");
    validateEnv();
  }
}
