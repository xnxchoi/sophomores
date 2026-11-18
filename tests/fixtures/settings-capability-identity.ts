let signedIn = false;

export function setSettingsFixtureIdentity(value: boolean) {
  signedIn = value;
}

export async function currentUser() {
  return signedIn ? { id: "fixture-settings-user" } : null;
}
