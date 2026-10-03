import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  CircleHelp,
  History,
  LayoutDashboard,
  Loader2,
  Mail,
  Megaphone,
  Menu,
  MessageSquarePlus,
  Plus,
  ShieldCheck,
  Upload,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AppCloseDialog } from './AppCloseDialog';

const navigation = [
  {
    to: '/',
    label: 'Overview',
    hint: 'Your campaigns at a glance',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/import',
    label: 'Contact lists',
    hint: 'Import and check recipients',
    icon: Upload,
  },
  {
    to: '/campaigns',
    label: 'Campaigns',
    hint: 'Edit, reuse, and send',
    icon: Megaphone,
    end: true,
  },
  {
    to: '/scheduled',
    label: 'Sending & schedule',
    hint: 'Track and control delivery',
    icon: CalendarClock,
  },
  {
    to: '/history',
    label: 'Results & history',
    hint: 'Reports and past campaigns',
    icon: History,
  },
];
const steps = [
  {
    to: '/import',
    title: 'Add your contacts',
    description:
      'Upload a CSV, Excel, or Markdown list. Check the phone numbers, then save the list.',
  },
  {
    to: '/campaigns/new',
    title: 'Create a campaign',
    description:
      'Choose a contact list and add your messages in order. Save your draft.',
  },
  {
    to: '/campaigns',
    title: 'Choose when to send',
    description:
      'Open Send on a draft to send now or schedule a time. Connect WhatsApp in Settings first.',
  },
  {
    to: '/scheduled',
    title: 'Follow your progress',
    description:
      'Watch the queue, pause a campaign, or change its schedule. Keep the app open while sending.',
  },
  {
    to: '/history',
    title: 'Review your results',
    description:
      'View reports, export results, or retry failed messages. History covers the last 90 days.',
  },
];

export function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof window.appAPI.getWhatsAppStatus>
  > | null>(null);
  const guide = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const current =
    location.pathname === '/campaigns/new'
      ? 'New campaign'
      : location.pathname === '/settings'
        ? 'Settings'
        : (navigation.find((item) => item.to === location.pathname)?.label ??
          'Overview');
  useEffect(() => {
    let active = true;
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const result = await window.appAPI.getWhatsAppStatus();
        if (active) setStatus(result);
      } catch {
        if (active)
          setStatus({
            state: 'error',
            message: 'Open Settings to reconnect.',
            browserName: null,
          });
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    setMobileOpen(false);
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  const connected = status?.state === 'connected';
  const busy = !status || status.state === 'opening';
  const connectionLabel = connected
    ? 'Ready to send'
    : status?.state === 'waiting_for_qr'
      ? 'Scan the QR code'
      : busy
        ? 'Checking connection'
        : 'Connect WhatsApp';
  const ConnectionIcon = busy ? Loader2 : connected ? Wifi : WifiOff;
  return (
    <div className="app-shell">
      <AppCloseDialog />
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        id="app-navigation"
        className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`}
      >
        <Link to="/" className="app-brand">
          <span className="brand-mark">
            <MessageSquarePlus size={23} />
          </span>
          <span>
            <strong>Outreach</strong>
            <small>WhatsApp campaign manager</small>
          </span>
        </Link>
        <Link
          to="/campaigns/new"
          className="button button-primary sidebar-create"
        >
          <Plus size={17} />
          New campaign
          <ArrowRight size={16} />
        </Link>
        <p className="nav-caption">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation" className="sidebar-nav">
          {navigation.map(({ to, label, hint, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'is-active' : ''}`
              }
            >
              <Icon size={19} />
              <span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
              <ChevronRight size={14} className="nav-arrow" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-help"
            onClick={() => guide.current?.showModal()}
          >
            <CircleHelp size={18} />
            <span>
              New here?<small>See how it works</small>
            </span>
            <ArrowRight size={16} />
          </button>
          <Link
            to="/settings"
            className={`connection-card ${connected ? 'is-connected' : ''}`}
          >
            <ConnectionIcon size={18} className={busy ? 'animate-spin' : ''} />
            <span>
              <strong>{connectionLabel}</strong>
              <small>
                {connected
                  ? 'WhatsApp is connected'
                  : 'Manage connection in Settings'}
              </small>
            </span>
            <ChevronRight size={15} />
          </Link>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `nav-item settings-link ${isActive ? 'is-active' : ''}`
            }
          >
            <ShieldCheck size={18} />
            <strong>Settings</strong>
          </NavLink>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar">
          <button
            type="button"
            className="button button-icon mobile-menu"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            aria-controls="app-navigation"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <span className="local-badge">
              <ShieldCheck size={14} />
              Stored on this computer
            </span>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => guide.current?.showModal()}
            >
              <CircleHelp size={17} />
              Quick guide
            </button>
          </div>
        </header>
        <main
          id="main-content"
          ref={main}
          tabIndex={-1}
          className="app-content"
        >
          <div className="route-content" key={location.pathname}>
            <Outlet />
          </div>
        </main>
        <footer className="app-footer">
          <span>Outreach · Created by Chamath Sachintha</span>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=chamathsachintha2002@gmail.com"
            target="_blank"
            rel="noreferrer"
          >
            <Mail size={14} />
            Help & feedback
          </a>
        </footer>
      </div>
      <dialog
        ref={guide}
        className="guide-dialog"
        aria-labelledby="guide-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) guide.current?.close();
        }}
      >
        <div className="guide-heading">
          <div>
            <p className="eyebrow">A SIMPLE START</p>
            <h2 id="guide-title">From contact list to conversation.</h2>
            <p>Five steps to your next campaign.</p>
          </div>
          <button
            type="button"
            className="button button-icon"
            aria-label="Close quick guide"
            onClick={() => guide.current?.close()}
          >
            <X size={20} />
            <span className="action-label">Close</span>
          </button>
        </div>
        <ol className="guide-steps">
          {steps.map((step, index) => (
            <li key={step.to}>
              <span className="step-number">{index + 1}</span>
              <div>
                <Link to={step.to} onClick={() => guide.current?.close()}>
                  {step.title}
                  <ArrowRight size={15} />
                </Link>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="guide-note">
          <ShieldCheck size={19} />
          <p>
            Saving a draft does not send messages. Choose <strong>Send</strong>{' '}
            when you’re ready. Your lists and campaign data stay on this
            computer.
          </p>
        </div>
      </dialog>
    </div>
  );
}
