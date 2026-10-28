"use client";

import { useEffect, useState } from "react";
import {
  Fingerprint,
  Laptop,
  Plus,
  ShieldCheck,
  Trash2,
  Smartphone,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/payload/payload-types";
import { authClient } from "@/lib/auth/client";
import { SubRouteHeader } from "@/components/settings/SubRouteHeader";
import {
  Panel,
  PanelBento,
  PanelGrid,
  PanelHeader,
  PanelControls,
} from "@/components/settings/Panel";
import { ActionField, ActionButton } from "@/components/settings/ActionField";
import { cn } from "@/lib/utils";

interface SessionItem {
  id: string;
  userAgent?: string | null;
  createdAt: string | Date;
  ipAddress?: string | null;
}

interface AccountItem {
  id: string;
  providerId: string;
  accountId?: string;
  createdAt?: string | Date;
}

interface PasskeyItem {
  id: string;
  name?: string;
  createdAt?: string | Date;
}

interface SecuritySectionClientProps {
  user: User;
  initialSessions: SessionItem[];
  initialAccounts: AccountItem[];
}

export default function SecuritySectionClient({
  user,
  initialSessions,
  initialAccounts,
}: SecuritySectionClientProps) {
  const router = useRouter();
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [addingPasskey, setAddingPasskey] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionItem[]>(initialSessions);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Fetch Passkeys
  const fetchPasskeys = async () => {
    try {
      setLoadingPasskeys(true);
      const res = await authClient.passkey.listUserPasskeys();
      if (res?.data) {
        setPasskeys(res.data as PasskeyItem[]);
      }
    } catch {
      // Passkey plugin might return empty if no passkeys registered yet
      setPasskeys([]);
    } finally {
      setLoadingPasskeys(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const handleAddPasskey = async () => {
    setAddingPasskey(true);
    setPasskeyNotice(null);
    try {
      const name = `Key ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      const res = await authClient.passkey.addPasskey({ name });
      if (res?.error) {
        setPasskeyNotice(res.error.message || "Failed to register passkey.");
      } else {
        setPasskeyNotice("Passkey added successfully.");
        await fetchPasskeys();
      }
    } catch (err: unknown) {
      setPasskeyNotice(err instanceof Error ? err.message : "Error registering passkey.");
    } finally {
      setAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      await authClient.passkey.deletePasskey({ id });
      await fetchPasskeys();
    } catch (err: unknown) {
      setPasskeyNotice(err instanceof Error ? err.message : "Failed to remove passkey.");
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingOthers(true);
    setSessionNotice(null);
    try {
      await authClient.revokeOtherSessions();
      setSessionNotice("Other device sessions have been revoked.");
      router.refresh();
    } catch (err: unknown) {
      setSessionNotice(err instanceof Error ? err.message : "Failed to revoke sessions.");
    } finally {
      setRevokingOthers(false);
    }
  };

  const googleLinked = initialAccounts.some((a) => a.providerId === "google");

  return (
    <div className="flex w-full flex-col gap-8">
      <SubRouteHeader
        title="Security"
        blurb="Passkeys, multi-session management, and attendee credential controls."
      />

      <PanelBento>
        {/* Passkeys Panel */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow="Passkeys"
              blurb="Hardware-backed authentication using Touch ID, Face ID, or Windows Hello."
              meta={
                <span className="font-mono text-xs text-neutral-400">
                  {passkeys.length} {passkeys.length === 1 ? "key" : "keys"}
                </span>
              }
            />
            <PanelControls>
              {passkeys.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {passkeys.map((pk) => (
                    <div
                      key={pk.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                          <Fingerprint size={16} />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {pk.name || "Passkey"}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            Added {pk.createdAt ? new Date(pk.createdAt).toLocaleDateString() : "recently"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePasskey(pk.id)}
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label={`Remove passkey ${pk.name || pk.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-xs text-neutral-400">
                  {loadingPasskeys ? "Checking passkeys…" : "No passkeys registered yet. Add one for biometric 1-tap sign-in."}
                </div>
              )}

              {passkeyNotice ? (
                <p className="text-xs text-neutral-300 font-mono">{passkeyNotice}</p>
              ) : null}

              <ActionField
                label="Register New Passkey"
                description="Prompt your device to generate a new cryptographic passkey."
              >
                <ActionButton
                  onClick={handleAddPasskey}
                  loading={addingPasskey}
                  icon={<Plus size={13} />}
                >
                  Add Passkey
                </ActionButton>
              </ActionField>
            </PanelControls>
          </PanelGrid>
        </Panel>

        {/* Active Sessions Panel */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow="Active Sessions"
              blurb="Devices currently signed in with your Sophomores registration."
              meta={
                <span className="font-mono text-xs text-neutral-400">
                  {sessions.length} active
                </span>
              }
            />
            <PanelControls>
              <div className="flex flex-col gap-2">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                        {sess.userAgent?.includes("Mobile") ? (
                          <Smartphone size={16} />
                        ) : (
                          <Laptop size={16} />
                        )}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-white truncate max-w-[200px]">
                          {sess.userAgent || "Current Device"}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {sess.ipAddress || "Active"} · {new Date(sess.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono uppercase text-white/90">
                      Active
                    </span>
                  </div>
                ))}
              </div>

              {sessionNotice ? (
                <p className="text-xs text-neutral-300 font-mono">{sessionNotice}</p>
              ) : null}

              <ActionField
                label="Sign Out Elsewhere"
                description="Immediately revoke authentication tokens for all other sessions."
              >
                <ActionButton
                  onClick={handleRevokeOthers}
                  loading={revokingOthers}
                >
                  Sign Out Other Devices
                </ActionButton>
              </ActionField>
            </PanelControls>
          </PanelGrid>
        </Panel>

        {/* Connected Authentication Providers */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow="Authentication Methods"
              blurb="Linked identity providers and credential mechanisms for your account."
            />
            <PanelControls>
              <div className="flex flex-col gap-2">
                {/* Email OTP */}
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                      <Globe size={16} />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">Email OTP & Magic Link</span>
                      <span className="text-xs text-neutral-400">Passwordless verification codes via {user.email}</span>
                    </div>
                  </div>
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-neutral-300">
                    Active
                  </span>
                </div>

                {/* Google OAuth */}
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                      <ShieldCheck size={16} />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">Google Account</span>
                      <span className="text-xs text-neutral-400">Single sign-on via Google Identity</span>
                    </div>
                  </div>
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-neutral-300">
                    {googleLinked ? "Linked" : "Available"}
                  </span>
                </div>
              </div>
            </PanelControls>
          </PanelGrid>
        </Panel>
      </PanelBento>
    </div>
  );
}
