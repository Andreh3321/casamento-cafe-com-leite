import { Moon, Sun } from "lucide-react";
import { setDarkMode, useIsDark } from "@/lib/dark-mode";

export function ThemeToggle() {
  const dark = useIsDark();
  const label = dark ? "Usar modo claro" : "Usar modo escuro";
  return (
    <button type="button" className="icon-button" title={label} aria-label={label} onClick={() => setDarkMode(!dark)}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
