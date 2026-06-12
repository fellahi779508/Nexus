/**
 * selectStyles.ts
 * Pass this to any react-select <Select styles={selectStyles} />
 * It reads from your CSS variables so it works with both light and dark themes.
 */
"use client";

function cssVar(name: string) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    borderRadius: 10,
    borderColor: state.isFocused ? cssVar("--accent") : cssVar("--border"),
    borderWidth: 1.5,
    boxShadow: state.isFocused ? `0 0 0 3px ${cssVar("--accent")}1f` : "none",
    background: cssVar("--background"),
    fontSize: 13.5,
    padding: "1px 4px",
    color: cssVar("--foreground"),
    "&:hover": { borderColor: cssVar("--accent") },
    flexGrow: 1,
    width: "300px",
  }),
  singleValue: (base: any) => ({
    ...base,
    color: cssVar("--foreground"),
  }),
  input: (base: any) => ({
    ...base,
    color: cssVar("--foreground"),
  }),
  placeholder: (base: any) => ({
    ...base,
    color: cssVar("--foreground-muted"),
    fontSize: 13.5,
    opacity: 0.7,
  }),
  menu: (base: any) => ({
    ...base,
    background: cssVar("--surface"),
    border: `1px solid ${cssVar("--border")}`,
    borderRadius: 10,
    boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
  }),
  menuList: (base: any) => ({
    ...base,
    padding: 4,
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: 13.5,
    borderRadius: 7,
    background: state.isSelected
      ? cssVar("--accent")
      : state.isFocused
        ? cssVar("--surface-hover")
        : "transparent",
    color: state.isSelected
      ? cssVar("--accent-foreground")
      : cssVar("--foreground"),
    cursor: "pointer",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: cssVar("--foreground-muted"),
  }),
  clearIndicator: (base: any) => ({
    ...base,
    color: cssVar("--foreground-muted"),
  }),
};
