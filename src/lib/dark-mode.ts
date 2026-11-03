import { useSyncExternalStore } from "react";

const KEY = "nosso-casamento-tema";
const listeners = new Set<() => void>();

function readDark() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/** Applies the saved choice (or the device preference) once on the client. */
export function initDarkMode() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem(KEY);
  const dark = saved ? saved === "escuro" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", Boolean(dark));
}

export function setDarkMode(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  window.localStorage.setItem(KEY, dark ? "escuro" : "claro");
  listeners.forEach(listener => listener());
}

export function useIsDark() {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => listeners.delete(listener); },
    readDark,
    () => false,
  );
}

/** Inline script for <head> so the page opens already in the right mode. */
export const darkModeBootScript = `try{var t=localStorage.getItem("${KEY}");var d=t?t==="escuro":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}`;
