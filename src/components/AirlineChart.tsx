import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '../lib/format';

interface Item {
  carrier: string;
  price: number;
  stops: number;
}

export function AirlineChart({ data }: { data: Item[] }) {
  return (
    <div className="chart-shell chart-shell--compact">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 10, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, .10)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="carrier"
            axisLine={false}
            tickLine={false}
            width={70}
            tick={{ fill: '#a9b5c8', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, .06)' }}
            contentStyle={{
              background: '#0d1b2d',
              border: '1px solid rgba(148, 163, 184, .18)',
              borderRadius: 12
            }}
            formatter={(value) => [money(Number(value)), 'Preço total']}
          />
          <Bar dataKey="price" fill="#6f7bf7" radius={[0, 7, 7, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
