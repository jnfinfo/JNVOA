import { useState } from 'react';
import { PlaneTakeoff, X } from 'lucide-react';
import type { ManualSearchInput } from '../types';

interface CreateMonitorModalProps {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (input: ManualSearchInput) => Promise<void>;
}

const initialForm: ManualSearchInput = {
  origin: 'CNF',
  destination: '',
  outboundDate: '',
  returnDate: '',
  adults: 2,
  children: 0,
  directOnly: false,
  baggageRequired: true
};

export function CreateMonitorModal({ open, saving, onClose, onSave }: CreateMonitorModalProps) {
  const [form, setForm] = useState<ManualSearchInput>(initialForm);

  if (!open) return null;

  const update = <K extends keyof ManualSearchInput>(key: K, value: ManualSearchInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave(form);
    setForm(initialForm);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div>
            <span className="eyebrow"><PlaneTakeoff size={15} /> Consulta manual</span>
            <h2>Qual viagem vamos consultar agora?</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </header>

        <form onSubmit={submit} className="monitor-form">
          <label className="field">
            <span>Origem</span>
            <input required maxLength={3} value={form.origin} onChange={(event) => update('origin', event.target.value.toUpperCase())} />
          </label>
          <label className="field">
            <span>Destino</span>
            <input required maxLength={3} value={form.destination} onChange={(event) => update('destination', event.target.value.toUpperCase())} placeholder="MCO" />
          </label>
          <label className="field">
            <span>Ida</span>
            <input required type="date" value={form.outboundDate} onChange={(event) => update('outboundDate', event.target.value)} />
          </label>
          <label className="field">
            <span>Volta</span>
            <input required type="date" value={form.returnDate} onChange={(event) => update('returnDate', event.target.value)} />
          </label>
          <label className="field">
            <span>Adultos</span>
            <input min={1} max={9} type="number" value={form.adults} onChange={(event) => update('adults', Number(event.target.value))} />
          </label>
          <label className="field">
            <span>Crianças</span>
            <input min={0} max={9} type="number" value={form.children} onChange={(event) => update('children', Number(event.target.value))} />
          </label>
          <label className="check-field">
            <input type="checkbox" checked={form.directOnly} onChange={(event) => update('directOnly', event.target.checked)} />
            <span>Somente voos diretos</span>
          </label>
          <label className="check-field">
            <input type="checkbox" checked={form.baggageRequired} onChange={(event) => update('baggageRequired', event.target.checked)} />
            <span>Exigir bagagem</span>
          </label>
          <footer className="modal__actions">
            <button className="button button--ghost" type="button" onClick={onClose}>Cancelar</button>
            <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Consultando...' : 'Consultar agora'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
