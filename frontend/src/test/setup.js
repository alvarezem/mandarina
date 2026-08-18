import { vi } from 'vitest'

// Mock compartido de supabase (1 sola definición — Fase 6).
// `from(table)` devuelve una cadena cacheada por tabla: sus métodos (select/eq/
// order/insert/update/…) devuelven la misma cadena y `await` resuelve `{ data, error }`
// según la config que el test setea con `mockTable`:
//   - select→eq→order  (sin mutación):  `{ data: rows, error }`
//   - insert()…single(): `{ data: insert, error: insertError }`
//   - update()/delete()/upsert():       `{ error: <*Error> }`

function makeChain(tables, table, chains) {
  let mode = null

  const config = () => {
    const c = tables.get(table) ?? {}
    if (mode === 'insert') return { data: c.insert ?? null, error: c.insertError ?? null }
    if (mode) return { data: null, error: c[`${mode}Error`] ?? null }
    return c.error ? { data: null, error: c.error } : { data: c.rows ?? [], error: null }
  }

  const terminal = (resolve, reject) => {
    const out = config()
    mode = null
    return Promise.resolve(out).then(resolve, reject)
  }

  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    order: vi.fn(() => self),
    single: vi.fn(() => self),
    limit: vi.fn(() => self),
    range: vi.fn(() => self),
    insert: vi.fn(() => {
      mode = 'insert'
      return self
    }),
    update: vi.fn(() => {
      mode = 'update'
      return self
    }),
    upsert: vi.fn(() => {
      mode = 'upsert'
      return self
    }),
    delete: vi.fn(() => {
      mode = 'delete'
      return self
    }),
    then: terminal,
  }
  chains.set(table, self)
  return self
}

export function createSupabaseMock() {
  const tables = new Map()
  const chains = new Map()

  const client = {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        remove: vi.fn(() => Promise.resolve({ error: null })),
        download: vi.fn(() => Promise.resolve({ data: new Blob(), error: null })),
        createSignedUrl: vi.fn(() =>
          Promise.resolve({ data: { signedUrl: 'http://example.invalid/x' }, error: null }),
        ),
        list: vi.fn(() => Promise.resolve({ data: [], error: null })),
        update: vi.fn(() => Promise.resolve({ error: null })),
      })),
    },
    functions: { invoke: vi.fn() },
    from: vi.fn((table) => chains.get(table) ?? makeChain(tables, table, chains)),
    __tables: tables,
    __chains: chains,
  }

  client.mockTable = (table, configOrRows, error = null) => {
    tables.set(
      table,
      Array.isArray(configOrRows) || configOrRows == null
        ? { rows: configOrRows ?? [], error }
        : configOrRows,
    )
    chains.get(table) ?? makeChain(tables, table, chains)
  }
  client.tableChain = (table) => chains.get(table)
  client.reset = () => {
    Object.values(client.auth).forEach((f) => f.mockReset())
    client.from.mockReset()
    client.from.mockImplementation((table) => chains.get(table) ?? makeChain(tables, table, chains))
    client.storage.from.mockReset()
    client.storage.from.mockImplementation(() => ({
      upload: vi.fn(() => Promise.resolve({ error: null })),
      remove: vi.fn(() => Promise.resolve({ error: null })),
      download: vi.fn(() => Promise.resolve({ data: new Blob(), error: null })),
      createSignedUrl: vi.fn(() =>
        Promise.resolve({ data: { signedUrl: 'http://example.invalid/x' }, error: null }),
      ),
      list: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ error: null })),
    }))
    client.functions.invoke.mockReset()
    tables.clear()
    chains.clear()
  }

  return client
}

// Factories de datos de muestra.
export function wrap(rows) {
  return { data: rows, error: null }
}

export function tx(overrides = {}) {
  return {
    id: 't1',
    date: '2026-07-01',
    merchant: 'MERCADO LIBRE',
    category: 'Compras',
    currency: 'ARS',
    amount: -1000,
    summary_id: 's1',
    file_name: 'visa.csv',
    ...overrides,
  }
}

export function summary(overrides = {}) {
  return {
    id: 's1',
    file_name: 'visa-julio.pdf',
    status: 'done',
    error: null,
    file_path: 'u1/visa-julio.pdf',
    created_at: '2026-07-05T10:00:00Z',
    summary_type: 'VISA',
    period_month: 7,
    period_year: 2026,
    ...overrides,
  }
}

export function planItem(overrides = {}) {
  return {
    id: 'p1',
    symbol: 'VIST',
    name: 'VIST',
    asset_type: 'accion',
    currency: 'ARS',
    target_weight: 20,
    quantity: 8,
    sort_order: 0,
    ...overrides,
  }
}
