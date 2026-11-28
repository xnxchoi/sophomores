# Offline carried-state verifier

No live collector, activation writer, or deployment command is included in
this slice. The comparator reads only two normalized JSON snapshots and
prints `offline-comparison-only` on a match. That result cannot satisfy any
operator gate. Synthetic fixture values are not live network records.

## Input contract for the next slice

- The separately approved reference digest must bind the old admitted
  manifest, exact post-n3 token and started-marker hashes, generation-0001
  pin inventory, original v4 hash/device/inode, and all three full bridge
  IDs, labels, options and memberships. The current notes are not enough to
  reconstruct these bytes. Build the reference from approved evidence or
  seek a separately scoped read-only capture. Do not derive expected values
  from the same observation being checked.
- The collector must enumerate the directories and Docker objects rather than
  assume absent items. Normalize names, network memberships, service
  attachments and routes deterministically. Record all labels/options, not a
  subset. Independently prove v4 is serving the exact old app on the pinned
  origin, nginx and review-pg identity, pg mounts, and the shared-vhost
  evidence. An unobserved or failed field is not an empty field.
- Bind the new manifest independently of the observation. The destination
  starts with no active tokens, activation marker, or carried intent. The
  old prefix is checked as evidence only. The comparator copies no tokens
  and performs no network or route change.
- Identical JSON can be replayed. A future trusted collector must take a
  fresh snapshot under both actual locks, bound to this transition attempt,
  then immediately recheck at the publication boundary. Quiesce the old
  shells and units separately. In particular, a JSON assertion that no unit
  is running does not fence a stale shell or an already queued command.

Only the separately reviewed transition may publish a durable import receipt
after proving these conditions and the stale-operator fence. That
implementation, the Linux interruption proof and all VPS steps remain on hold.
