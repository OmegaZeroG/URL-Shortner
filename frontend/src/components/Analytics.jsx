import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { getLinkAnalytics } from '../api';
import { styles } from '../styles';

const COLORS = { line: '#6366f1', bar: '#818cf8' };

function BreakdownChart({ title, data, dataKey, nameKey }) {
  if (!data || data.length === 0) {
    return (
      <div style={styles.breakdownCard}>
        <h3 style={styles.breakdownTitle}>{title}</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No data yet</p>
      </div>
    );
  }
  return (
    <div style={styles.breakdownCard}>
      <h3 style={styles.breakdownTitle}>{title}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={90}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
          <Bar dataKey={dataKey} fill={COLORS.bar} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Analytics({ token, code, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getLinkAnalytics(token, code)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token, code]);

  const totalClicks = data?.clicksByDay?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  const clicksByDayFormatted =
    data?.clicksByDay?.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    })) ?? [];

  return (
    <div style={styles.wideCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ ...styles.heading, marginBottom: 0 }}>Analytics: {code}</h1>
        <button style={styles.linkButton} onClick={onBack}>
          ← Back to My Links
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {!data && !error && <p style={{ color: '#94a3b8' }}>Loading...</p>}

      {data && (
        <>
          <p style={{ color: '#f1f5f9', fontSize: '2rem', fontWeight: 700, margin: '1rem 0' }}>
            {totalClicks} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>total clicks</span>
          </p>

          <div style={styles.breakdownCard}>
            <h3 style={styles.breakdownTitle}>Clicks over time</h3>
            {clicksByDayFormatted.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No clicks yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={clicksByDayFormatted}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                  <Line type="monotone" dataKey="count" stroke={COLORS.line} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={styles.breakdownGrid}>
            <BreakdownChart title="Device" data={data.byDevice} dataKey="count" nameKey="device" />
            <BreakdownChart title="Browser" data={data.byBrowser} dataKey="count" nameKey="browser" />
            <BreakdownChart title="Country" data={data.byCountry} dataKey="count" nameKey="country" />
            <BreakdownChart title="Referrer" data={data.byReferrer} dataKey="count" nameKey="referrer" />
          </div>
        </>
      )}
    </div>
  );
}
