import { Line, Doughnut, Bar } from 'react-chartjs-2'
import '../lib/chartjs'
import { fmt, fmtCompact } from '../lib/format'
import { BRAND_HEX, BRAND_HEX_STRONG, brandRgba, PALETTE } from '../lib/constants'

function lineData(expenseTrend) {
  const gradient = (context) => {
    const { ctx, chartArea } = context.chart
    if (!chartArea) return brandRgba(0.15)
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
    g.addColorStop(0, brandRgba(0.02))
    g.addColorStop(1, brandRgba(0.18))
    return g
  }
  return {
    labels: expenseTrend.map((d) => d.date),
    datasets: [
      {
        label: 'Gastos acumulados',
        data: expenseTrend.map((d) => d.accumulated),
        borderColor: BRAND_HEX,
        backgroundColor: gradient,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  }
}

function doughnutData(byCategory) {
  return {
    labels: byCategory.map((c) => c.category),
    datasets: [
      {
        data: byCategory.map((c) => Math.abs(c.total)),
        backgroundColor: [BRAND_HEX, ...PALETTE],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }
}

function barData(byMerchant) {
  const top = byMerchant.filter((m) => m.total < 0).slice(0, 8)
  return {
    labels: top.map((m) => m.merchant),
    datasets: [
      {
        label: 'Gasto por comercio',
        data: top.map((m) => m.total),
        backgroundColor: BRAND_HEX,
        hoverBackgroundColor: BRAND_HEX_STRONG,
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  }
}

function axisTicks(dark, currency = 'ARS') {
  return {
    color: dark ? '#64748b' : '#94a3b8',
    font: { size: 11 },
    callback: (value) => fmtCompact(value, currency),
  }
}

function lineOptions(dark, onPoint) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements, chart) => {
      const [el] = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false)
      if (el) onPoint(chart.data.labels[el.index])
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` Gasto acumulado: ${fmt(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: dark ? '#64748b' : '#94a3b8', font: { size: 11 } } },
      y: { suggestedMin: 0, grid: { color: dark ? '#1e293b' : '#f1f5f9' }, ticks: axisTicks(dark) },
    },
  }
}

function doughnutOptions(dark, onSlice) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    onClick: (event, elements, chart) => {
      const [el] = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false)
      if (el) onSlice(chart.data.labels[el.index])
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: dark ? '#cbd5e1' : '#475569', boxWidth: 10, boxHeight: 10, font: { size: 11 } },
      },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed)}` },
      },
    },
  }
}

function barOptions(dark, onBar) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    onClick: (event, elements, chart) => {
      const [el] = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false)
      if (el) onBar(chart.data.labels[el.index])
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.x)}` },
      },
    },
    scales: {
      x: { grid: { color: dark ? '#1e293b' : '#f1f5f9' }, ticks: axisTicks(dark) },
      y: { grid: { display: false }, ticks: { color: dark ? '#cbd5e1' : '#475569', font: { size: 11 } } },
    },
  }
}

export default function SpendingCharts({ analysis, dark, onPoint, onSlice, onBar }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div
        className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        style={{ animationDelay: '160ms' }}
      >
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Gastos acumulados</h3>
        <div className="h-64">
          <Line data={lineData(analysis.expenseTrend)} options={lineOptions(dark, onPoint)} />
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Clic en un punto filtra el detalle de ese día.
        </p>
      </div>
      <div
        className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        style={{ animationDelay: '460ms' }}
      >
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Gasto por categoría</h3>
        <div className="h-64">
          <Doughnut data={doughnutData(analysis.byCategory)} options={doughnutOptions(dark, onSlice)} />
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Clic en un segmento filtra el detalle por categoría.
        </p>
      </div>
      <div
        className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        style={{ animationDelay: '360ms' }}
      >
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Top comercios con mayor gasto
        </h3>
        <div className="h-72">
          <Bar data={barData(analysis.byMerchant)} options={barOptions(dark, onBar)} />
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Clic en una barra filtra el detalle por comercio.
        </p>
      </div>
    </div>
  )
}
