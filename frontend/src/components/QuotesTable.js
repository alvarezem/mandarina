import { Fragment } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { fmt, fmtPct } from '../lib/format'
import { ASSET_TYPES, QUOTE_PALETTE } from '../lib/constants'
import SortableTh from './SortableTh'
import PriceChart from './PriceChart'

export default function QuotesTable({
  items,
  sort,
  onSort,
  quotes,
  display,
  chart,
  onOpenInline,
  onOpenModal,
  onRangeChange,
  chartPoints,
  chartData,
  chartQuote,
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0)

  const doughnutData = {
    labels: items.map((i) => i.symbol),
    datasets: [
      {
        data: items.map((i) => Math.max(0, i.value)),
        backgroundColor: items.map((_, i) => QUOTE_PALETTE[i % QUOTE_PALETTE.length]),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.label}: ${fmt(ctx.raw, display)} (${fmtPct(total > 0 ? (ctx.raw / total) * 100 : 0)})`,
        },
      },
    },
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Asignación
        </h2>
        <div className="relative h-44">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
          Mismo orden que tu plan · se cambia desde Plan de inversión
        </p>
        <div className="mt-2 flex flex-col gap-1 pr-1">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: QUOTE_PALETTE[i % QUOTE_PALETTE.length] }}
                />
                <span className="truncate font-medium">{item.symbol}</span>
              </span>
              <span className="shrink-0 text-slate-500 dark:text-slate-400">
                {fmtPct(item.actualPct)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <SortableTh label="Activo" sortKey="symbol" sort={sort} onSort={onSort} />
                <SortableTh
                  label="Precio"
                  sortKey="price"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                  className="hidden sm:table-cell"
                />
                <SortableTh
                  label="Var. diaria"
                  sortKey="changePct"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                  className="hidden sm:table-cell"
                />
                <SortableTh
                  label="Cantidad"
                  sortKey="quantity"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                  className="hidden md:table-cell"
                />
                <SortableTh
                  label="Valor"
                  sortKey="value"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                />
                <SortableTh
                  label="% cartera"
                  sortKey="actualPct"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                />
                <th className="px-3 py-2 text-right">
                  <span className="sr-only">Ver gráfico</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => {
                const changePct = quotes[item.symbol]?.changePct ?? null
                const open = chart?.symbol === item.symbol
                return (
                  <Fragment key={item.id}>
                    <tr className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onOpenInline(item.symbol)}
                          aria-expanded={open}
                          title="Ver gráfico del precio"
                          className="flex w-full items-center gap-2 text-left"
                        >
                          <svg
                            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                          </svg>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {item.symbol}
                          </span>
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {ASSET_TYPES[item.asset_type] ?? item.asset_type}
                          </span>
                        </button>
                        {item.name && item.name !== item.symbol && (
                          <p className="truncate pl-5 text-xs text-slate-400 dark:text-slate-500">
                            {item.name}
                          </p>
                        )}
                        <div className="ml-5 mt-1.5 h-1 w-full max-w-24 rounded bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-1 rounded bg-brand-500"
                            style={{ width: `${Math.min(100, item.actualPct)}%` }}
                          />
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-right sm:table-cell">
                        {item.price != null ? (
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {fmt(item.price, display)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            sin precio
                          </span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 text-right sm:table-cell">
                        {changePct != null ? (
                          <span
                            className={`font-medium ${
                              changePct >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 text-right text-slate-600 dark:text-slate-300 md:table-cell">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {item.price != null ? fmt(item.value, display) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                        {fmtPct(item.actualPct)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenModal(item.symbol)}
                          title="Ver gráfico en otra ventana"
                          aria-label={`Abrir gráfico de ${item.symbol}`}
                          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-t-0">
                        <td
                          colSpan={7}
                          className="border-t border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/40"
                        >
                          <PriceChart
                            symbol={item.symbol}
                            range={chart.range}
                            points={chartPoints}
                            loading={chartData.loading}
                            error={chartData.error}
                            onRange={(r) => onRangeChange(r, 'inline')}
                            compact
                            quote={chartQuote}
                            display={display}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
