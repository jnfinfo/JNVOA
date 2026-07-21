import { ArrowDownRight, ArrowRight, ArrowUpRight, BriefcaseBusiness, Clock3, Plane, RefreshCw } from 'lucide-react';
import { duration, money, percent, relativeDate, tripDate } from '../lib/format';
import type { RouteMonitor } from '../types';

const signalLabel = {
  BUY: 'Boa hora para comprar',
  WATCH: 'Acompanhar',
  HIGH: 'Preço alto'
};

interface RouteCardProps {
  monitor: RouteMonitor;
  running?: boolean;
  onRun: (id: string) => void;
}

export function RouteCard({ monitor, running, onRun }: RouteCardProps) {
  const falling = monitor.change7d < 0;
  const ChangeIcon = falling ? ArrowDownRight : ArrowUpRight;

  return (
    <article className="route-card">
      <div className="route-card__head">
        <div>
          <small>{monitor.name}</small>
          <div className="route-card__route">
            <strong>{monitor.origin}</strong>
            <span><Plane size={15} /><span className="route-line" /></span>
            <strong>{monitor.destination}</strong>
          </div>
        </div>
        <span className={`signal signal--${monitor.signal.toLowerCase()}`}>{signalLabel[monitor.signal]}</span>
      </div>

      <div className="route-card__price">
        <div>
          <span>Total da família</span>
          <strong>{money(monitor.currentPrice, monitor.currency)}</strong>
        </div>
        <div className={`route-card__change ${falling ? 'is-good' : 'is-bad'}`}>
          <ChangeIcon size={17} />
          {percent(monitor.change7d)} em 7 dias
        </div>
      </div>

      <div className="route-card__progress">
        <div>
          <span>Meta {money(monitor.targetPrice)}</span>
          <span>Mínimo {money(monitor.historicalMin)}</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-value"
            style={{ width: `${Math.min(100, Math.max(8, (monitor.historicalMin / monitor.currentPrice) * 100))}%` }}
          />
        </div>
      </div>

      <div className="route-card__details">
        <span><ArrowRight size={15} /> {tripDate(monitor.outboundDate)} a {tripDate(monitor.returnDate)}</span>
        <span><Clock3 size={15} /> {duration(monitor.durationMinutes)}</span>
        <span><BriefcaseBusiness size={15} /> {monitor.baggageIncluded ? 'Bagagem incluída' : 'Sem bagagem'}</span>
        <span>{monitor.stops === 0 ? 'Voo direto' : `${monitor.stops} escala`}</span>
      </div>

      <footer className="route-card__footer">
        <div>
          <strong>{monitor.carrier}</strong>
          <span>Atualizado {relativeDate(monitor.lastCheckedAt)}</span>
        </div>
        <button className="icon-button" type="button" onClick={() => onRun(monitor.id)} disabled={running} title="Consultar agora">
          <RefreshCw size={17} className={running ? 'is-spinning' : ''} />
        </button>
      </footer>
    </article>
  );
}
