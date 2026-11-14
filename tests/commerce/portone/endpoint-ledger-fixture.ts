import { randomUUID } from 'node:crypto'
import type { PayloadRequest } from 'payload'

/** Endpoint tests exercise admission itself against the business fixture's native adapter. */
export function installEndpointLedger(req: PayloadRequest) {
  const rows = new Map<string, { id: string; scope: string; state: unknown }>()
  const payload = req.payload
  const find = payload.find, create = payload.create, update = payload.update
  payload.find = (async (args: Parameters<typeof find>[0]) => {
    if (args.collection !== 'commerce-reconciliations') return find(args)
    const where = args.where as { scope: { equals: string } }
    const docs = [...rows.values()].filter(row => row.scope === where.scope.equals).map(row => structuredClone(row))
    return { docs, totalDocs: docs.length }
  }) as typeof find
  payload.create = (async (args: Parameters<typeof create>[0]) => {
    if (args.collection !== 'commerce-reconciliations') return create(args)
    const row = { id: randomUUID(), ...structuredClone(args.data) } as { id: string; scope: string; state: unknown }
    rows.set(row.id, row); return row
  }) as typeof create
  payload.update = (async (args: Parameters<typeof update>[0]) => {
    if (args.collection !== 'commerce-reconciliations') return update(args)
    const id = String('id' in args && args.id ? args.id : ((args as unknown as { where: { and: { id: { equals: string } }[] } }).where).and[0].id.equals)
    const row = { ...rows.get(id)!, ...structuredClone(args.data as { state: unknown }) }
    rows.set(id, row); return 'id' in args && args.id ? row : { docs: [row] }
  }) as typeof update
  const updateOne = payload.db.updateOne
  payload.db.updateOne = (async (args: Parameters<typeof updateOne>[0]) => {
    if (args.collection !== 'commerce-reconciliations') return updateOne(args)
    const where = args.where as { and: { id: { equals: string } }[] }
    const id = where.and[0].id.equals
    const row = { ...rows.get(id)!, ...structuredClone(args.data) }
    rows.set(id, row); return row
  }) as typeof updateOne
  return rows
}
