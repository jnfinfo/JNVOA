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
import { PriceTrendChart } from './components/PriceTrendChart';
import { RouteCard } from './components/RouteCard';
import { StatCard } from './components/StatCard';
import { WeekdayHeatmap } from './components/WeekdayHeatmap';
import { createMonitor, getDashboard, runMonitor } from './lib/api';
import { money, percent, relativeDate } from './lib/format';
import type { CreateMonitorInput, DashboardData } from './types';

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
  const [runningId, setRunningId] = useState<string>();
  const [notice, setNotice] = useState<string>();

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

  const saveMonitor = async (input: CreateMonitorInput) => {
    setSaving(true);
    try {
      await createMonitor(input);
      setModalOpen(false);
      await load();
      setNotice('Monitoramento criado com sucesso.');
    } catch {
      setNotice('O modo demonstração não grava dados. A estrutura da API já está pronta.');
      setModalOpen(false);
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(undefined), 3600);
    }
  };

  const runNow = async (id: string) => {
    setRunningId(id);
    try {
      await runMonitor(id);
      await load();
      setNotice('Consulta concluída.');
    } catch {
      setNotice('Consulta simulada concluída. Configure a API Amadeus para preços reais.');
    } finally {
      setRunningId(undefined);
      window.setTimeout(() => setNotice(undefined), 3400);
    }
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
            <span>Próxima rodada em até 6h</span>
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
            <button className="button button--primary" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> Nova viagem</button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <section className="hero-strip">
              <div>
                <span className="eyebrow"><Sparkles size={15} /> Oportunidade detectada</span>
                <h2>{bestMonitor?.origin} → {bestMonitor?.destination} está no melhor momento das últimas semanas</h2>
                <p>O radar compara o preço atual com o histórico observado, sua meta e a média da rota.</p>
              </div>
              <div className="hero-strip__price">
                <span>Total da família</span>
                <strong>{money(bestMonitor?.currentPrice ?? 0)}</strong>
                <small><TrendingDown size={15} /> {percent(bestMonitor?.change7d ?? 0)} em 7 dias</small>
              </div>
              <button className="button button--light" type="button" onClick={() => bestMonitor && runNow(bestMonitor.id)}>Conferir agora</button>
            </section>

            <section className="stats-grid">
              <StatCard label="Rotas monitoradas" value={String(data.summary.activeMonitors)} hint="Todas atualizadas hoje" icon={Route} />
              <StatCard label="Melhor preço atual" value={money(data.summary.bestCurrentPrice)} hint="Total do grupo familiar" icon={CircleDollarSign} tone="positive" />
              <StatCard label="Economia potencial" value={money(data.summary.familySavings)} hint="Contra a média histórica" icon={TrendingDown} tone="positive" />
              <StatCard label="Consultas em 24h" value={String(data.summary.checksLast24h)} hint={`${data.provider} • ${percent(data.summary.averageChange7d)} média`} icon={Radar} />
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
                <PriceTrendChart data={data.priceHistory} />
              </article>

              <article className="panel">
                <header className="panel__header">
                  <div>
                    <span className="eyebrow"><PlaneTakeoff size={15} /> Comparativo</span>
                    <h3>Companhias</h3>
                    <p>Menores totais encontrados.</p>
                  </div>
                </header>
                <AirlineChart data={data.airlineComparison} />
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
                <RouteCard key={monitor.id} monitor={monitor} running={runningId === monitor.id} onRun={runNow} />
              ))}
            </section>

            <section className="dashboard-grid dashboard-grid--bottom">
              <article className="panel panel--wide">
                <header className="panel__header">
                  <div>
                    <span className="eyebrow"><CalendarDays size={15} /> Flexibilidade</span>
                    <h3>Dias mais baratos</h3>
                    <p>Estimativa baseada nas últimas capturas da rota em destaque.</p>
                  </div>
                </header>
                <WeekdayHeatmap data={data.weekdayPrices} />
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
              <button className="button button--primary" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> Nova viagem</button>
            </div>
            <div className="routes-grid routes-grid--all">
              {data.monitors.map((monitor) => (
                <RouteCard key={monitor.id} monitor={monitor} running={runningId === monitor.id} onRun={runNow} />
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
            <p>O projeto está preparado para Cloudflare Workers, D1, Cron Triggers e API Amadeus.</p>
            <div className="settings-grid">
              <div><strong>Fonte atual</strong><span>{data.provider}</span></div>
              <div><strong>Periodicidade</strong><span>A cada 6 horas</span></div>
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
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
