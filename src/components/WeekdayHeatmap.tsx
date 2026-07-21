import { money } from '../lib/format';

interface DayPrice {
  day: string;
  price: number;
  score: number;
}

export function WeekdayHeatmap({ data }: { data: DayPrice[] }) {
  return (
    <div className="weekday-grid">
      {data.map((item) => (
        <div
          className="weekday-cell"
          key={item.day}
          style={{ '--heat': `${Math.max(0.12, item.score / 100)}` } as React.CSSProperties}
        >
          <span>{item.day}</span>
          <strong>{money(item.price)}</strong>
          <small>{item.score >= 80 ? 'ótimo' : item.score >= 55 ? 'bom' : 'alto'}</small>
        </div>
      ))}
    </div>
  );
}
