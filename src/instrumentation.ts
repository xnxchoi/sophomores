export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertOwnedPreviewSocketAdmission } = await import("./lib/phone-verification/server/config");
  try {
    assertOwnedPreviewSocketAdmission(process.env);
  } catch (error) {
    // Standalone Next logs rejected background preparation without necessarily exiting.
    console.error(error instanceof Error ? error.message : "Owned preview socket admission failed.");
    process.exit(1);
  }
}
