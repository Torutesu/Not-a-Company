import { Languages, Moon, Sun } from "lucide-react";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { cn } from "../lib/utils";

export function GlobalPreferences() {
  const { locale, setLocale, t } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div className="fixed right-3 top-3 z-[90] flex items-center gap-2 rounded-md border border-border bg-background/90 px-2 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors",
            locale === "en"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label={t("global.language.en")}
          title={t("global.language.en")}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLocale("ja")}
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors",
            locale === "ja"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label={t("global.language.ja")}
          title={t("global.language.ja")}
        >
          日本語
        </button>
      </div>

      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:text-foreground"
        onClick={toggleTheme}
        aria-label={nextTheme === "light" ? t("global.theme.switchToLight") : t("global.theme.switchToDark")}
        title={nextTheme === "light" ? t("global.theme.switchToLight") : t("global.theme.switchToDark")}
      >
        {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>

      <Languages className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}
