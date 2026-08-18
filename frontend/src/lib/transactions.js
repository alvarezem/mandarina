// Fetch de transacciones paginado por chunks. PostgREST hosted corta por
// defecto en `max_rows` (config.toml:1000): un solo `.select()` devuelve a lo
// sumo ese tope y el dashboard quedaría incompleto sin aviso. Este helper itera
// `.range(start, end)` con pageSize = tope y corta cuando un batch devuelve
// menos filas que el tope (página corta = fin de los datos).

export const FETCH_PAGE_SIZE = 1000

export async function fetchAllTransactions(builder, pageSize = FETCH_PAGE_SIZE) {
  const all = []
  let start = 0
  for (;;) {
    const { data, error } = await builder.range(start, start + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    start += pageSize
  }
  return all
}
