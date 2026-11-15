// Theme and sidebar preferences live in localStorage and are applied as attributes on <html>
// (data-theme, data-sidebar) by an inline script BEFORE the first paint: no flash of the wrong theme
// and no sidebar jumping, while the app shell itself stays static (no cookies read on the server).

export type Theme = "light" | "dark";

export const THEME_KEY = "dt-theme";
export const SIDEBAR_KEY = "dt-sidebar";

/** Runs in <head> before the body renders. Falls back to the OS colour scheme. */
export const preferencesScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.dataset.theme=t;if(localStorage.getItem("${SIDEBAR_KEY}")==="collapsed"){d.dataset.sidebar="collapsed"}}catch(e){}})();`;

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode / storage disabled: the preference just won't persist.
  }
}

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  store(THEME_KEY, theme);
}

export function readSidebarCollapsed(): boolean {
  return document.documentElement.dataset.sidebar === "collapsed";
}

export const SIDEBAR_EVENT = "dt:sidebar";

export function applySidebarCollapsed(collapsed: boolean) {
  if (collapsed) document.documentElement.dataset.sidebar = "collapsed";
  else delete document.documentElement.dataset.sidebar;
  store(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}
