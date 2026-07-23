import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
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
  const [onLight, setOnLight] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;

    const arm = (el: Element): boolean => {
      if (io) return true;
      io = new IntersectionObserver(
        (entries) => setOnLight(entries.some((e) => e.isIntersecting)),
        // A 1% band (not a zero-height line) at the very top, where the fixed nav
        // sits: on-light while #projects crosses the nav, dark above and below.
        { rootMargin: "-8% 0px -91% 0px", threshold: 0 },
      );
      io.observe(el);
      return true;
    };

    const existing = document.getElementById("projects");
    if (existing) {
      arm(existing);
    } else {
      // #projects mounts later (lazy chunk). Arm on first appearance, then stop watching.
      mo = new MutationObserver(() => {
        const el = document.getElementById("projects");
        if (el && arm(el)) {
          mo?.disconnect();
          mo = null;
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      io?.disconnect();
      mo?.disconnect();
    };
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
    if (location.pathname === "/") {
      scrollTo(`#${id}`, { duration: 1.2 });
    } else {
      // Off-home (e.g. /projects/:slug): the target section isn't in the DOM,
      // so route home and hand the target to Home via location.state.
      navigate("/", { state: { scrollToId: id } });
    }
  };

  const toggleLanguage = (): void => {
    const next = i18n.language === "en" ? "pt" : "en";
    i18n.changeLanguage(next);
  };

  return (
    <header
      className={`nav${scrolled ? " is-scrolled" : ""}${visible ? " is-visible" : ""}${onLight ? " nav--on-light" : ""}`}
    >
      <div className="nav-inner">
        <a
          href="/"
          className="nav-brand"
          onClick={(e) => {
            e.preventDefault();
            if (location.pathname === "/") {
              scrollTo("#top", { duration: 1.2 });
            } else {
              // Off-home (e.g. /projects/:slug): route home. ProjectDetail's
              // useLayoutEffect resets scroll to 0, so the user lands on the hero.
              navigate("/");
            }
          }}
        >
          <span className="nav-mark">ks<span className="nav-mark__dot" aria-hidden="true" /></span>
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
          <button className="nav-lang" onClick={toggleLanguage}>
            {t("lang")}
          </button>
        </div>
      </div>
    </header>
  );
}
