import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLenis } from "../../hooks/useLenis";
import { useMotion } from "../../context/MotionContext";

const NAV_ITEMS = [
  "work",
  "archive",
  "experience",
  "skills",
  "contact",
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

const SECTION_ID: Record<NavItem, string> = {
  work: "projects",
  archive: "archive",
  experience: "work",
  skills: "skills",
  contact: "contact",
};

export function Header() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const { scrollTo } = useLenis();
  const { entranceDone } = useMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    entranceDone
      .then(() => {
        if (!cancelled) setVisible(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entranceDone]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollTo(`#${id}`, { duration: 1.2 });
  };

  const toggleLanguage = (): void => {
    const next = i18n.language === "en" ? "pt" : "en";
    i18n.changeLanguage(next);
  };

  return (
    <header
      className={`nav${scrolled ? " is-scrolled" : ""}${visible ? " is-visible" : ""}`}
    >
      <div className="nav-inner">
        <a href="#top" className="nav-brand" onClick={go("top")}>
          <span className="nav-mark">ks</span>
          {/* <span className="nav-brand-text">kevin shibuya</span> */}
        </a>

        <nav className="nav-links">
          {NAV_ITEMS.map((key) => (
            <a
              key={key}
              href={`#${SECTION_ID[key]}`}
              onClick={go(SECTION_ID[key])}
              className="nav-link"
            >
              {t(`nav.${key}`)}
            </a>
          ))}
        </nav>

        <div className="nav-right">
          <span className="nav-avail">
            <span className="nav-avail-dot" aria-hidden="true" />
            <span>{t("nav.available")}</span>
          </span>
          <button className="nav-lang" onClick={toggleLanguage}>
            {t("lang")}
          </button>
        </div>
      </div>
    </header>
  );
}
