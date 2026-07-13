const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("ugc-theme");
    var theme = stored === "light" || stored === "dark" ? stored : null;
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (_) {}
})();
`;

/** Sets data-theme before hydration so there's no light/dark flash on load. */
export function ThemeScript() {
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
