import { Line, Doughnut, Bar } from 'react-chartjs-2'
import '../lib/chartjs'
import { fmt, fmtCompact } from '../lib/format'
import { BRAND_HEX, BRAND_HEX_STRONG, brandRgba, PALETTE } from '../lib/constants'
import { useLang } from './LangProvider'
import { t } from '../lib/i18n'

function lineData(series, isIncome, lang) {
  const gradient = (context) => {
    const { ctx, chartArea } = context.chart
    if (!chartArea) return brandRgba(0.15)
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
    g.addColorStop(0, brandRgba(0.02))
    g.addColorStop(1, brandRgba(0.18))
    return g
  }
  return {
    labels: series.map((d) => d.date),
    datasets: [
      {
        label: t(lang, isIncome ? 'charts.line.income' : 'charts.line.expense'),
        data: series.map((d) => d.accumulated),
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

function barData(byMerchant, isIncome, lang) {
  const top = byMerchant.filter((m) => (isIncome ? m.total > 0 : m.total < 0)).slice(0, 8)
  return {
    labels: top.map((m) => m.merchant),
    datasets: [
      {
        label: t(lang, isIncome ? 'charts.bar.income' : 'charts.bar.expense'),
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

function lineOptions(dark, onPoint, isIncome, lang) {
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
        callbacks: {
          label: (ctx) =>
            ` ${t(lang, isIncome ? 'charts.tooltip.income' : 'charts.tooltip.expense')}: ${fmt(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: dark ? '#64748b' : '#94a3b8', font: { size: 11 } },
      },
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
        labels: {
          color: dark ? '#cbd5e1' : '#475569',
          boxWidth: 10,
          boxHeight: 10,
          font: { size: 11 },
        },
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
      y: {
        grid: { display: false },
        ticks: { color: dark ? '#cbd5e1' : '#475569', font: { size: 11 } },
      },
    },
  }
}

export default function SpendingCharts({
  analysis,
  dark,
  onPoint,
  onSlice,
  onBar,
  variant = 'egresos',
}) {
  const { lang } = useLang()
  const isIncome = variant === 'ingresos'
  const trend = isIncome ? analysis.incomeTrend : analysis.expenseTrend
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div
        className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        style={{ animationDelay: '160ms' }}
      >
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t(lang, isIncome ? 'charts.line.income' : 'charts.line.expense')}
        </h3>
        <div className="h-64">
          <Line
            data={lineData(trend, isIncome, lang)}
            options={lineOptions(dark, onPoint, isIncome, lang)}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          {t(lang, 'charts.hint.point')}
        </p>
      </div>
      <div
        className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        style={{ animationDelay: '460ms' }}
      >
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t(lang, isIncome ? 'charts.doughnut.income' : 'charts.doughnut.expense')}
        </h3>
        <div className="h-64">
          <Doughnut
            data={doughnutData(analysis.byCategory)}
            options={doughnutOptions(dark, onSlice)}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          {t(lang, 'charts.hint.slice')}
        </p>
      </div>
      <div
        className="animate-fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2"
        style={{ animationDelay: '360ms' }}
      >
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t(lang, isIncome ? 'charts.barTitle.income' : 'charts.barTitle.expense')}
        </h3>
        <div className="h-72">
          <Bar
            data={barData(analysis.byMerchant, isIncome, lang)}
            options={barOptions(dark, onBar)}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          {t(lang, 'charts.hint.bar')}
        </p>
      </div>
    </div>
  )
}
