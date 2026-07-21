import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { PricePoint } from '../types';
import { money } from '../lib/format';

export function PriceTrendChart({ data }: { data: PricePoint[] }) {
  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3dd6c6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#3dd6c6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, .13)" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#8290a7', fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={58}
            tick={{ fill: '#8290a7', fontSize: 11 }}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip
            contentStyle={{
              background: '#0d1b2d',
              border: '1px solid rgba(148, 163, 184, .18)',
              borderRadius: 12,
              boxShadow: '0 16px 40px rgba(0,0,0,.35)'
            }}
            formatter={(value, name) => [money(Number(value)), name === 'price' ? 'Melhor preço' : 'Média']}
          />
          <Legend
            formatter={(value) => value === 'price' ? 'Melhor preço' : 'Média observada'}
            wrapperStyle={{ color: '#b8c3d6', fontSize: 12 }}
          />
          <Area type="monotone" dataKey="average" stroke="#72809a" fill="transparent" strokeDasharray="6 5" strokeWidth={2} />
          <Area type="monotone" dataKey="price" stroke="#3dd6c6" fill="url(#priceGradient)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
