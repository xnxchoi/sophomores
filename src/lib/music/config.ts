export interface AppleMusicConfig {
  developerToken?: string;
  teamId?: string;
  keyId?: string;
  privateKey?: string;
  userToken?: string;
  storefront: string;
}

export function getAppleMusicConfig(): AppleMusicConfig {
  // Support raw PEM or base64 encoded PEM if passed in environment
  let privateKey = process.env.APPLE_PRIVATE_KEY;
  if (privateKey && !privateKey.startsWith("-----")) {
    try {
      privateKey = Buffer.from(privateKey, "base64").toString("utf-8");
    } catch {
      // Keep as-is if base64 decoding fails
    }
  }

  // Normalize line breaks if passed with escaped \n
  if (privateKey && privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return {
    developerToken: process.env.APPLE_DEVELOPER_TOKEN,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey,
    userToken: process.env.APPLE_MUSIC_USER_TOKEN,
    storefront: process.env.APPLE_MUSIC_STOREFRONT || "us"
  };
}

/**
 * Checks whether we have the credentials needed to query the Apple Music catalog
 * and initialize MusicKit JS (either a pre-signed developerToken or private key pair).
 */
export function isAppleMusicConfigured(): boolean {
  const config = getAppleMusicConfig();
  if (config.developerToken) return true;
  return Boolean(config.teamId && config.keyId && config.privateKey);
}

/**
 * Checks whether we can sync tracks to the owner's personal Apple Music library playlist.
 * Requires developer token capability PLUS the owner's Music-User-Token (obtained via MusicKit JS authorize()).
 */
export function isAppleMusicSyncConfigured(): boolean {
  const config = getAppleMusicConfig();
  const hasDevToken = Boolean(config.developerToken || (config.teamId && config.keyId && config.privateKey));
  return Boolean(hasDevToken && config.userToken);
}
