"use client";
/**
 * ThemeScript.tsx
 * Drop this inside the <head> of your root layout.
 * It runs before React hydrates so there is zero flash of the wrong theme.
 *
 * Usage in layout.tsx:
 *   import ThemeScript from "@/components/ThemeScript";
 *   ...
 *   <head>
 *     <ThemeScript />
 *   </head>
 */
export default function ThemeScript() {
  const script = `
    (function () {
      try {
        var theme = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", theme);
      } catch (e) {}
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
