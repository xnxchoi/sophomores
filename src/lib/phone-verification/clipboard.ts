export async function copyVerificationValue(
  value: string,
  clipboard: Pick<Clipboard, "writeText"> | undefined
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
