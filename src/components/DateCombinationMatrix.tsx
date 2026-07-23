import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import {
  AVERAGE_PRICE_EXPLANATION,
  averagePerPassenger,
  money,
  percent,
  relativeDate,
  tripDate
} from '../lib/format';
import type { DateCombination } from '../types';
import { GooglePriceInsightNotice } from './GooglePriceInsightNotice';

interface DateCombinationMatrixProps {
  combinations: DateCombination[];
  adults: number;
  children: number;
  runningKey?: string;
  onRun: (combination: DateCombination) => void;
}

function shortDate(value: string): string {
  return tripDate(value).slice(0, 5);
}

export function DateCombinationMatrix({
  combinations,
  adults,
  children,
  runningKey,
  onRun
}: DateCombinationMatrixProps) {
  const outboundDates = [...new Set(combinations.map((item) => item.outboundDate))];
  const returnDates = [...new Set(combinations.map((item) => item.returnDate))];
  const queried = combinations.filter((item) => item.queryCount > 0).length;
  const coverage = combinations.length ? Math.round((queried / combinations.length) * 100) : 0;
  const best = combinations.find((item) => item.isBest);
  const next = combinations.find((item) => item.isNext);
  const passengers = adults + children;

  return (
    <div className="combination-matrix">
      {passengers > 0 && (
        <p className="combination-matrix__passengers">
          Valores para {passengers} passageiros: {adults} adultos • {children} crianças
        </p>
      )}
      <div className="combination-matrix__summary">
        <div>
          <span>Cobertura da janela</span>
          <strong>{queried} de {combinations.length} combinações</strong>
          <div className="coverage-track"><span style={{ width: `${coverage}%` }} /></div>
        </div>
        {best && (
          <div>
            <span>Melhor combinação encontrada</span>
            <strong>{shortDate(best.outboundDate)} → {shortDate(best.returnDate)} · {money(best.latestPrice)}</strong>
          </div>
        )}
        {next && (
          <div>
            <span>Próxima rodada automática</span>
            <strong>{shortDate(next.outboundDate)} → {shortDate(next.returnDate)}</strong>
          </div>
        )}
      </div>

      <div className="combination-matrix__scroll">
        <div
          className="combination-grid"
          style={{ gridTemplateColumns: `92px repeat(${returnDates.length}, minmax(190px, 1fr))` }}
        >
          <div className="combination-grid__corner">Ida ↓ / Volta →</div>
          {returnDates.map((date) => (
            <div className="combination-grid__header" key={date}>{shortDate(date)}</div>
          ))}

          {outboundDates.flatMap((outboundDate) => {
            const row = [
              <div className="combination-grid__row-label" key={`label-${outboundDate}`}>{shortDate(outboundDate)}</div>
            ];

            for (const returnDate of returnDates) {
              const combination = combinations.find((item) =>
                item.outboundDate === outboundDate && item.returnDate === returnDate
              );

              if (!combination) {
                row.push(<div className="combination-cell combination-cell--disabled" key={`${outboundDate}-${returnDate}`}>—</div>);
                continue;
              }

              const falling = combination.changePct < 0;
              const TrendIcon = falling ? ArrowDownRight : ArrowUpRight;
              const running = runningKey === combination.key;
              const averagePrice = averagePerPassenger(combination.latestPrice, adults, children);

              row.push(
                <article
                  className={`combination-cell ${combination.isBest ? 'is-best' : ''} ${combination.isNext ? 'is-next' : ''}`}
                  key={combination.key}
                >
                  <div className="combination-cell__badges">
                    {combination.isBest && <span className="combination-badge combination-badge--best"><Sparkles size={11} /> Melhor</span>}
                    {combination.isNext && <span className="combination-badge">Próxima</span>}
                  </div>

                  {combination.latestPrice > 0 ? (
                    <>
                      <span className="combination-cell__detail-label">Melhor oferta detalhada</span>
                      <strong>{money(combination.latestPrice)}</strong>
                      {averagePrice !== undefined && (
                        <span className="combination-cell__average" title={AVERAGE_PRICE_EXPLANATION}>
                          Média: {money(averagePrice, 'BRL', 2)} por passageiro
                        </span>
                      )}
                      <GooglePriceInsightNotice insight={combination.priceInsight} compact />
                      <span className="combination-cell__carrier">{combination.carrier ?? 'Google Flights'}</span>
                      <div className={`combination-cell__trend ${falling ? 'is-good' : combination.changePct > 0 ? 'is-bad' : ''}`}>
                        {combination.queryCount > 1 ? (
                          <><TrendIcon size={13} /> {percent(combination.changePct)} vs. consulta anterior</>
                        ) : (
                          <><CheckCircle2 size={13} /> Primeira captura</>
                        )}
                      </div>
                      <small><Clock3 size={12} /> {combination.lastCheckedAt ? relativeDate(combination.lastCheckedAt) : 'agora'}</small>
                    </>
                  ) : (
                    <>
                      <strong className="combination-cell__pending">Aguardando</strong>
                      <span className="combination-cell__carrier">Ainda não consultada</span>
                      <small>1 crédito para pesquisar</small>
                    </>
                  )}

                  <div className="combination-cell__actions">
                    {combination.bookingUrl && (
                      <a href={combination.bookingUrl} target="_blank" rel="noreferrer">Abrir</a>
                    )}
                    <button
                      type="button"
                      onClick={() => onRun(combination)}
                      disabled={running}
                      title={`Consultar ${shortDate(outboundDate)} a ${shortDate(returnDate)}`}
                    >
                      <RefreshCw size={14} className={running ? 'is-spinning' : ''} />
                      {combination.latestPrice > 0 ? 'Atualizar' : 'Consultar'}
                    </button>
                  </div>
                </article>
              );
            }

            return row;
          })}
        </div>
      </div>

      <p className="combination-matrix__note">
        Cada célula usa uma pesquisa exata do Google Flights. Assim, a tendência compara sempre a mesma ida e volta, sem misturar datas diferentes.
      </p>
      {passengers > 0 && (
        <>
          <p className="combination-matrix__passenger-note">
            Todos os valores desta matriz são para {passengers} passageiros: {adults} adultos e {children} crianças.
          </p>
          <p className="combination-matrix__average-note">{AVERAGE_PRICE_EXPLANATION}</p>
        </>
      )}
    </div>
  );
}
