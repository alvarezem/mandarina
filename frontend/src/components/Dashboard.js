import { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import supabase from '../lib/supabaseClient'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
)

const fmt = (n, currency = 'ARS') =>
  new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)

const PALETTE = ['#4b5563', '#9ca3af', '#d1d5db', '#6b7280', '#e5e7eb', '#374151', '#a3a3a3']

export default function Dashboard({ summaryId }) {
  const [analysis, setAnalysis] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!summaryId) {
      setAnalysis(null)
      setTransactions([])
      return
    }
    let active = true
    setLoading(true)
    setError(null)

    const load = async () => {
      const [{ data: a }, { data: t }] = await Promise.all([
        supabase.from('consumption_analyses').select('result').eq('summary_id', summaryId).maybeSingle(),
        supabase.from('transactions').select('*').eq('summary_id', summaryId).order('date', { ascending: false }),
      ])
      if (!active) return
      setAnalysis(a?.result ?? null)
      setTransactions(t ?? [])
      setLoading(false)
    }
    load()

    return () => {
      active = false
    }
  }, [summaryId])

  if (!summaryId) {
    return <div className="empty-state">Seleccioná un resumen en la barra lateral.</div>
  }
  if (loading) return <div className="empty-state">Cargando…</div>
  if (error) return <p>{error}</p>
  if (!analysis) {
    return (
      <div className="empty-state">
        Este resumen todavía no tiene análisis disponibles.
      </div>
    )
  }

  const { totals, maxExpense, maxCredit, byCategory, byMerchant, balanceTrend, usd } = analysis

  const balanceData = {
    labels: balanceTrend.map((d) => d.date),
    datasets: [
      {
        label: 'Balance acumulado',
        data: balanceTrend.map((d) => d.runningBalance),
        borderColor: '#4b5563',
        backgroundColor: 'rgba(75,85,99,0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  }

  const categoryData = {
    labels: byCategory.map((c) => c.category),
    datasets: [
      {
        data: byCategory.map((c) => c.total),
        backgroundColor: PALETTE,
        borderWidth: 0,
      },
    ],
  }

  const merchantData = {
    labels: byMerchant
      .filter((m) => m.total < 0)
      .slice(0, 8)
      .map((m) => m.merchant),
    datasets: [
      {
        label: 'Gasto por comercio',
        data: byMerchant
          .filter((m) => m.total < 0)
          .slice(0, 8)
          .map((m) => m.total),
        backgroundColor: '#9ca3af',
        borderRadius: 4,
      },
    ],
  }

  return (
    <div className="dashboard">
      <div className="cards">
        <div className="card">
          <span className="card-label">Créditos</span>
          <span className="card-value positive">{fmt(totals.credits)}</span>
        </div>
        <div className="card">
          <span className="card-label">Débitos</span>
          <span className="card-value negative">{fmt(totals.debits)}</span>
        </div>
        <div className="card">
          <span className="card-label">Neto</span>
          <span className="card-value">{fmt(totals.net)}</span>
        </div>
        <div className="card">
          <span className="card-label">Movimientos</span>
          <span className="card-value">{totals.txCount}</span>
        </div>
        <div className="card">
          <span className="card-label">Mayor gasto</span>
          <span className="card-value negative">{fmt(maxExpense.amount)}</span>
          <span className="card-sub">{maxExpense.merchant}</span>
        </div>
        <div className="card">
          <span className="card-label">Mayor ingreso</span>
          <span className="card-value positive">{fmt(maxCredit.amount)}</span>
          <span className="card-sub">{maxCredit.merchant}</span>
        </div>
        {usd && (
          <div className="card">
            <span className="card-label">Gastos USD</span>
            <span className="card-value negative">
              {fmt(usd.totals.debits, 'USD')}
            </span>
            <span className="card-sub">{usd.totals.txCount} movimientos</span>
          </div>
        )}
      </div>

      <div className="charts">
        <div className="chart">
          <h3>Balance acumulado</h3>
          <Line data={balanceData} />
        </div>
        <div className="chart">
          <h3>Gasto por categoría</h3>
          <Doughnut data={categoryData} />
        </div>
      </div>

      <div className="chart wide">
        <h3>Top comercios con mayor gasto</h3>
        <Bar
          data={merchantData}
          options={{
            indexAxis: 'y',
            plugins: { legend: { display: false } },
          }}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Moneda</th>
              <th className="num">Monto</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.merchant}</td>
                <td>{t.category ?? '—'}</td>
                <td>
                  <span className={`badge currency ${t.currency === 'USD' ? 'usd' : ''}`}>
                    {t.currency}
                  </span>
                </td>
                <td className={`num ${t.amount < 0 ? 'negative' : 'positive'}`}>
                  {fmt(t.amount, t.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}