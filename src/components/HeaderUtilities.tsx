import { useEffect, useRef, useState } from "react";

type Utility = "language" | "settings" | "search" | "help";
function UtilityIcon({ name }: { name: Utility | "user" }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "user" ? <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="9" r="3" /><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></> : name === "language" ? <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18" /></> : name === "settings" ? <><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z" /><circle cx="12" cy="12" r="3" /></> : name === "search" ? <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></> : <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2.5M12 17h.01" /></>}
  </svg>;
}

export function HeaderUtilities({ saved, signedIn, accountOpen, locale, theme, search, grid, onAccount, onDismissAccount, onLocale, onTheme, onSearch, onGrid, onBot }: {
  saved: boolean; signedIn: boolean; accountOpen: boolean; locale: string; theme: string; search: string; grid: boolean;
  onAccount: () => void; onDismissAccount: () => void; onLocale: (value: string) => void; onTheme: (value: string) => void; onSearch: (value: string) => void; onGrid: (value: boolean) => void; onBot: () => void;
}) {
  const [panel, setPanel] = useState<Utility | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (panel === "search") searchInput.current?.focus(); }, [panel]);
  const toggle = (utility: Utility) => { onDismissAccount(); setPanel((current) => current === utility ? null : utility); };
  return <>
    <div className="header-utilities" role="group" aria-label="Account and application menu">
      <span className={`header-saved ${saved ? "saved" : "dirty"}`}>{saved ? "Saved locally" : "Unsaved local changes"}</span>
      <button type="button" className="utility-icon account-button" title={signedIn ? "Account" : "Sign In"} aria-label={signedIn ? "Account, signed in" : "Sign in, guest"} aria-expanded={accountOpen} data-login-status={signedIn ? "signed-in" : "guest"} onClick={() => { setPanel(null); onAccount(); }}><span className="profile-status-icon"><UtilityIcon name="user" /><span className={`login-status-dot ${signedIn ? "signed-in" : "guest"}`} aria-hidden="true" /></span></button>
      {(["language", "settings", "search", "help"] as const).map((utility) => <button key={utility} type="button" className="utility-icon" title={utility === "language" ? `Language: ${locale.toUpperCase()}` : utility[0].toUpperCase() + utility.slice(1)} aria-label={utility === "language" ? `Language: ${locale.toUpperCase()}` : utility[0].toUpperCase() + utility.slice(1)} aria-expanded={panel === utility} aria-controls={panel === utility ? "header-utility-panel" : undefined} onClick={() => toggle(utility)}><UtilityIcon name={utility} /></button>)}
    </div>
    {panel && <section id="header-utility-panel" className="header-utility-panel" aria-label={`${panel} controls`}>
      {panel === "language" && <label>Interface language<select value={locale} onChange={(event) => onLocale(event.target.value)}><option value="en">English · EN</option><option value="de">Deutsch · DE</option></select></label>}
      {panel === "settings" && <><label>Theme<select value={theme} onChange={(event) => onTheme(event.target.value)}><option value="dark">Dark</option><option value="light">Light</option></select></label><label className="header-grid-setting"><input type="checkbox" checked={grid} onChange={(event) => onGrid(event.target.checked)} />Show schematic grid</label></>}
      {panel === "search" && <><label>Search components from header<input ref={searchInput} type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search the component library" /></label><button type="button" onClick={() => onSearch("")}>Clear search</button></>}
      {panel === "help" && <><p>Select components in the drawing, inspect their properties, and use Wiring to connect compatible terminals.</p><a href="https://github.com/HephzibahBehulahHQ/AdigunElectroCAD/blob/main/docs/HELP.md" target="_blank" rel="noreferrer">Read the guide</a><button type="button" onClick={() => { setPanel(null); onBot(); }}>Open Adigun Bot</button></>}
      <button type="button" onClick={() => setPanel(null)}>Close header panel</button>
    </section>}
  </>;
}
