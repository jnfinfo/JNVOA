import { Clock3, ExternalLink, PlaneTakeoff, X } from 'lucide-react';
import { AVERAGE_PRICE_EXPLANATION, duration, money, tripDate } from '../lib/format';
import type { ManualSearchResult } from '../types';
import { GooglePriceInsightNotice } from './GooglePriceInsightNotice';

interface ManualResultsModalProps {
  result?: ManualSearchResult;
  onClose: () => void;
}

export function ManualResultsModal({ result, onClose }: ManualResultsModalProps) {
  if (!result) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal modal--results" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div>
            <span className="eyebrow"><PlaneTakeoff size={15} /> Consulta manual</span>
            <h2>{result.query.origin} → {result.query.destination}</h2>
            <p>{tripDate(result.query.outboundDate)} a {tripDate(result.query.returnDate)}</p>
            <p>{result.query.adults} adultos • {result.query.children} crianças</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </header>

        {result.quota && (
          <div className="quota-inline">
            <strong>{result.quota.remaining} consultas restantes</strong>
            <span>{result.quota.used} usadas de {result.quota.limit}</span>
          </div>
        )}

        <GooglePriceInsightNotice insight={result.priceInsight} />

        <div className="manual-results-list">
          {result.offers.length === 0 && <p className="empty-state">Nenhuma oferta encontrada para essas datas.</p>}
          {result.offers.map((offer, index) => {
            const hasAveragePrice = Number.isFinite(offer.pricePerPerson) && Number(offer.pricePerPerson) > 0;

            return (
              <article className="manual-offer" key={`${offer.externalId}-${index}`}>
              <div>
                <small>{index === 0 ? 'Melhor preço encontrado' : `Opção ${index + 1}`}</small>
                <strong>{offer.carrier}</strong>
                <span>{offer.flightNumbers.join(' • ') || 'Voo informado pelo Google Flights'}</span>
              </div>
              <div className="manual-offer__meta">
                <span><Clock3 size={14} /> {duration(offer.durationMinutes)}</span>
                <span>{offer.stops === 0 ? 'Direto' : `${offer.stops} escala${offer.stops > 1 ? 's' : ''}`}</span>
              </div>
              <div className="manual-offer__price">
                <small>Melhor oferta detalhada • total</small>
                <strong>{money(offer.priceTotal, offer.currency)}</strong>
                {hasAveragePrice && (
                  <span title={AVERAGE_PRICE_EXPLANATION}>
                    Média por passageiro: {money(Number(offer.pricePerPerson), offer.currency, 2)}
                  </span>
                )}
              </div>
              {offer.bookingUrl && (
                <a className="button button--ghost" href={offer.bookingUrl} target="_blank" rel="noreferrer">
                  Google Flights <ExternalLink size={15} />
                </a>
              )}
              </article>
            );
          })}
        </div>

        <p className="manual-results__average-note">{AVERAGE_PRICE_EXPLANATION}</p>
        <footer className="modal__actions">
          <button className="button button--primary" type="button" onClick={onClose}>Fechar</button>
        </footer>
      </section>
    </div>
  );
}
