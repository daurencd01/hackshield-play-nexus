import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Check if there is already a language saved from i18next-browser-languagedetector
    // Usually it saves to "i18nextLng"
    const savedLang = localStorage.getItem("i18nextLng") || "en";
    if (['en', 'ru', 'kk'].includes(savedLang)) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
  };

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2 py-1 select-none">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1 text-xs font-mono">
        <button
          onClick={() => handleLanguageChange("en")}
          className={`px-1.5 py-0.5 rounded transition-colors ${
            i18n.language?.startsWith("en") ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => handleLanguageChange("ru")}
          className={`px-1.5 py-0.5 rounded transition-colors ${
            i18n.language?.startsWith("ru") ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          RU
        </button>
        <button
          onClick={() => handleLanguageChange("kk")}
          className={`px-1.5 py-0.5 rounded transition-colors ${
            i18n.language?.startsWith("kk") ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          KK
        </button>
      </div>
    </div>
  );
}
