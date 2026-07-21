import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  Menu,
  PlaneTakeoff,
  Plus,
  Radar,
  RefreshCw,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  X
} from 'lucide-react';
import { AirlineChart } from './components/AirlineChart';
import { CreateMonitorModal } from './components/CreateMonitorModal';
import { DateCombinationMatrix } from './components/DateCombinationMatrix';
import { PriceTrendChart } from './components/PriceTrendChart';
import { ManualResultsModal } from './components/ManualResultsModal';
import { RouteCard } from './components/RouteCard';
import { StatCard } from './components/StatCard';
import { getDashboard, manualSearch, runMonitor } from './lib/api';
import { money, percent, relativeDate } from './lib/format';
import type { DashboardData, DateCombination, ManualSearchInput, ManualSearchResult } from './types';

const navItems = [
  { id: 'dashboard', label: 'Visão geral', icon: Gauge },
  { id: 'routes', label: 'Monitoramentos', icon: Route },
  { id: 'alerts', label: 'Alertas', icon: BellRing },
  { id: 'settings', label: 'Configurações', icon: Settings2 }
] as const;

type TabId = typeof navItems[number]['id'];

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [runningKey, setRunningKey] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [manualResult, setManualResult] = useState<ManualSearchResult>();

  const load = async () => {
    const dashboard = await getDashboard();
    setData(dashboard);
  };

  useEffect(() => {
    void load();
  }, []);

  const bestMonitor = useMemo(() => data?.monitors.find((monitor) => monitor.signal === 'BUY') ?? data?.monitors[0], [data]);

  const refreshAll = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    setNotice('Painel atualizado.');
    window.setTimeout(() => setNotice(undefined), 2600);
  };

  const saveMonitor = async (input: ManualSearchInput) => {
    setSaving(true);
    try {
      const result = await manualSearch(input);
      setModalOpen(false);
      setManualResult(result);
      await load();
      setNotice('Consulta manual concluída.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível consultar agora.');
      setModalOpen(false);
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(undefined), 4200);
    }
  };

  const runNow = async (
    id: string,
    dates?: { outboundDate: string; returnDate: string },
    key = id
  ) => {
    setRunningKey(key);
    try {
      const result = await runMonitor(id, dates);
      await load();
      setNotice(result.outboundDate && result.returnDate
        ? `Consulta ${result.outboundDate} → ${result.returnDate} concluída.`
        : 'Consulta concluída.');
    } catch (error) {
      setNotice(error instanceof Error
        ? error.message
        : 'Não foi possível concluir a consulta. Verifique a franquia e a chave SerpApi.');
    } finally {
      setRunningKey(undefined);
      window.setTimeout(() => setNotice(undefined), 4200);
    }
  };

  const runCombination = async (combination: DateCombination) => {
    if (!bestMonitor) return;
    await runNow(
      bestMonitor.id,
      { outboundDate: combination.outboundDate, returnDate: combination.returnDate },
      combination.key
    );
  };

  if (!data) {
    return (
      <main className="loading-screen">
        <div className="brand-mark"><PlaneTakeoff size={28} /></div>
        <strong>Preparando seu radar de passagens...</strong>
        <div className="loading-bar"><span /></div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`}>
        <div className="sidebar__brand">
          <div className="brand-mark"><PlaneTakeoff size={24} /></div>
          <div>
            <strong>JN Voa</strong>
            <span>Radar da família</span>
          </div>
          <button className="icon-button sidebar__close" type="button" onClick={() => setMobileMenu(false)}><X size={18} /></button>
        </div>

        <nav className="sidebar__nav" aria-label="Navegação principal">
          <span className="sidebar__section-label">PAINEL</span>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              className={activeTab === id ? 'is-active' : ''}
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setMobileMenu(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'alerts' && <em>{data.alerts.length}</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar__status">
          <div className="status-pulse" />
          <div>
            <strong>Monitor ativo</strong>
            <span>Rodadas às 06h e 18h</span>
          </div>
        </div>

        <div className="sidebar__profile">
          <div className="avatar">DS</div>
          <div>
            <strong>Família Safadi</strong>
            <span>Administrador</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </aside>

      {mobileMenu && <button className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-button mobile-menu" type="button" onClick={() => setMobileMenu(true)}><Menu size={20} /></button>
            <div>
              <span className="eyebrow"><Radar size={15} /> Inteligência de preços</span>
              <h1>{activeTab === 'dashboard' ? 'Visão geral' : navItems.find((item) => item.id === activeTab)?.label}</h1>
            </div>
          </div>
          <div className="topbar__actions">
            <label className="search-field">
              <Search size={17} />
              <input placeholder="Buscar destino..." aria-label="Buscar destino" />
            </label>
            <button className="icon-button notification-button" type="button"><BellRing size={18} /><span /></button>
            <button className="button button--primary" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> Consulta manual</button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <section className="hero-strip">
              <div>
                <span className="eyebrow"><Sparkles size={15} /> Oportunidade detectada</span>
                <h2>{bestMonitor ? `${bestMonitor.origin} → ${bestMonitor.destination}: radar do Réveillon` : 'Radar aguardando configuração'}</h2>
                <p>{bestMonitor?.bestOutboundDate && bestMonitor.bestReturnDate
                  ? `Melhor combinação atual: ${bestMonitor.bestOutboundDate} → ${bestMonitor.bestReturnDate}.`
                  : 'O radar preencherá as 12 combinações de ida e volta.'}</p>
              </div>
              <div className="hero-strip__price">
                <span>Total da família</span>
                <strong>{bestMonitor?.currentPrice ? money(bestMonitor.currentPrice) : 'Aguardando'}</strong>
                <small><TrendingDown size={15} /> {bestMonitor?.currentPrice
                  ? `${percent(bestMonitor.change7d)} vs. captura anterior da mesma data`
                  : 'Aguardando primeira captura'}</small>
              </div>
              <button className="button button--light" type="button" onClick={() => bestMonitor && runNow(bestMonitor.id, undefined, bestMonitor.id)}>Consultar próxima</button>
            </section>

            <section className="stats-grid">
              <StatCard label="Rotas monitoradas" value={String(data.summary.activeMonitors)} hint="CNF → REC" icon={Route} />
              <StatCard label="Melhor preço atual" value={money(data.summary.bestCurrentPrice)} hint="Melhor combinação já consultada" icon={CircleDollarSign} tone="positive" />
              <StatCard
                label="Datas pesquisadas"
                value={`${data.summary.combinationsQueried ?? 0}/${data.summary.combinationsTotal ?? 12}`}
                hint="Cobertura das 12 combinações"
                icon={CalendarDays}
                tone="positive"
              />
              <StatCard
                label={data.quota ? 'Saldo de consultas' : 'Consultas em 24h'}
                value={data.quota ? String(data.quota.remaining) : String(data.summary.checksLast24h)}
                hint={data.quota
                  ? `${data.quota.used} usadas de ${data.quota.limit} • ${data.provider}`
                  : `${data.provider} • ${percent(data.summary.averageChange7d)} média`}
                icon={Radar}
              />
            </section>

            <section className="dashboard-grid dashboard-grid--top">
              <article className="panel panel--wide">
                <header className="panel__header">
                  <div>
                    <span className="eyebrow"><TrendingDown size={15} /> Tendência principal</span>
                    <h3>Evolução do melhor preço</h3>
                    <p>Histórico consolidado da rota em destaque.</p>
                  </div>
                  <button className="button button--ghost" type="button" onClick={refreshAll} disabled={refreshing}>
                    <RefreshCw size={16} className={refreshing ? 'is-spinning' : ''} /> Atualizar
                  </button>
                </header>
                {data.priceHistory.length ? <PriceTrendChart data={data.priceHistory} /> : <div className="empty-chart">O histórico real começa após a primeira consulta SerpApi.</div>}
              </article>

              <article className="panel">
                <header className="panel__header">
                  <div>
                    <span className="eyebrow"><PlaneTakeoff size={15} /> Comparativo</span>
                    <h3>Companhias</h3>
                    <p>Menores totais encontrados.</p>
                  </div>
                </header>
                {data.airlineComparison.length ? <AirlineChart data={data.airlineComparison} /> : <div className="empty-chart empty-chart--compact">Companhias aparecerão após a primeira captura.</div>}
                <div className="panel-note"><ShieldCheck size={16} /> Preços são reconfirmados antes do alerta.</div>
              </article>
            </section>

            <section className="section-heading">
              <div>
                <span className="eyebrow"><Route size={15} /> Suas viagens</span>
                <h2>Monitoramentos ativos</h2>
              </div>
              <button className="text-button" type="button" onClick={() => setActiveTab('routes')}>Ver todos</button>
            </section>

            <section className="routes-grid">
              {data.monitors.slice(0, 3).map((monitor) => (
                <RouteCard key={monitor.id} monitor={monitor} running={runningKey === monitor.id} onRun={(id) => void runNow(id, undefined, id)} />
              ))}
            </section>

            <section className="dashboard-grid dashboard-grid--bottom">
              <article className="panel panel--wide combinations-panel">
                <header className="panel__header">
                  <div>
                    <span className="eyebrow"><CalendarDays size={15} /> Matriz de datas</span>
                    <h3>As 12 combinações do Réveillon</h3>
                    <p>Cada tendência compara exatamente a mesma ida e volta.</p>
                  </div>
                </header>
                <DateCombinationMatrix
                  combinations={data.dateCombinations ?? []}
                  runningKey={runningKey}
                  onRun={(combination) => void runCombination(combination)}
                />
              </article>

              <article className="panel alerts-panel">
                <header className="panel__header">
                  <div>
                    <span className="eyebrow"><BellRing size={15} /> Alertas recentes</span>
                    <h3>O que mudou</h3>
                  </div>
                </header>
                <div className="alerts-list">
                  {data.alerts.map((alert) => (
                    <div className={`alert-item alert-item--${alert.severity}`} key={alert.id}>
                      <span className="alert-item__dot" />
                      <div>
                        <strong>{alert.title}</strong>
                        <p>{alert.description}</p>
                        <small>{relativeDate(alert.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}

        {activeTab === 'routes' && (
          <section>
            <div className="section-heading section-heading--page">
              <div>
                <span className="eyebrow"><Route size={15} /> Carteira de viagens</span>
                <h2>Todos os monitoramentos</h2>
                <p>Compare sinais, metas e movimentos recentes em uma única tela.</p>
              </div>
              <button className="button button--primary" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> Consulta manual</button>
            </div>
            <div className="routes-grid routes-grid--all">
              {data.monitors.map((monitor) => (
                <RouteCard key={monitor.id} monitor={monitor} running={runningKey === monitor.id} onRun={(id) => void runNow(id, undefined, id)} />
              ))}
            </div>
          </section>
        )}

        {activeTab === 'alerts' && (
          <section className="page-panel">
            <div className="section-heading section-heading--page">
              <div>
                <span className="eyebrow"><BellRing size={15} /> Central de alertas</span>
                <h2>Movimentos importantes</h2>
                <p>Quedas, altas e metas atingidas pelo radar.</p>
              </div>
            </div>
            <div className="alerts-list alerts-list--large">
              {data.alerts.map((alert) => (
                <div className={`alert-item alert-item--${alert.severity}`} key={alert.id}>
                  <span className="alert-item__dot" />
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.description}</p>
                    <small>{relativeDate(alert.createdAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="page-panel settings-page">
            <span className="eyebrow"><Settings2 size={15} /> Ambiente</span>
            <h2>Configuração do radar</h2>
            <p>O radar usa Cloudflare Workers, D1, Cron Triggers e Google Flights por meio da SerpApi.</p>
            <div className="settings-grid">
              <div><strong>Fonte atual</strong><span>{data.provider}</span></div>
              <div><strong>Ambiente do provider</strong><span>{data.providerEnvironment ?? 'não informado'}</span></div>
              {data.quota && <div><strong>Franquia mensal</strong><span>{data.quota.remaining} restantes de {data.quota.limit}</span></div>}
              <div><strong>Cobertura da janela</strong><span>{data.summary.combinationsQueried ?? 0} de {data.summary.combinationsTotal ?? 12} combinações</span></div>
              <div><strong>Periodicidade</strong><span>Todos os dias às 06h e 18h</span></div>
              <div><strong>Reserva automática</strong><span>Pausa ao chegar em 20 créditos</span></div>
              <div><strong>Moeda padrão</strong><span>BRL</span></div>
              <div><strong>Proteção sugerida</strong><span>Cloudflare Access</span></div>
            </div>
          </section>
        )}

        <footer className="app-footer">
          <span>JN Voa • preços são indicativos e devem ser confirmados no fornecedor</span>
          <span>Atualizado {relativeDate(data.generatedAt)}</span>
        </footer>
      </main>

      <CreateMonitorModal open={modalOpen} saving={saving} onClose={() => setModalOpen(false)} onSave={saveMonitor} />
      <ManualResultsModal result={manualResult} onClose={() => setManualResult(undefined)} />
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
