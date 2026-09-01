import test from "node:test";
import assert from "node:assert/strict";
import { THEME_OPTIONS, DEFAULT_THEME, type ThemeColor } from "./theme";

test("THEME_OPTIONS includes all requested colors", () => {
  const ids = THEME_OPTIONS.map((t) => t.id);
  assert.ok(ids.includes("cyan"), "Includes Cyan theme");
  assert.ok(ids.includes("purple"), "Includes Purple theme");
  assert.ok(ids.includes("blue"), "Includes Blue theme");
  assert.ok(ids.includes("emerald"), "Includes Green/Emerald theme");
  assert.ok(ids.includes("amber"), "Includes Orange/Amber theme");
  assert.ok(ids.includes("crimson"), "Includes Red/Crimson theme");
  assert.ok(ids.includes("rose"), "Includes Pink/Rose theme");
  assert.equal(DEFAULT_THEME, "purple");
});

test("each theme has valid preview and accent colors", () => {
  for (const theme of THEME_OPTIONS) {
    assert.ok(
      theme.previewColor.startsWith("oklch("),
      `${theme.name} previewColor should be oklch`,
    );
    assert.ok(theme.accentColor.startsWith("oklch("), `${theme.name} accentColor should be oklch`);
    assert.ok(theme.label.length > 0, `${theme.name} should have a label`);
  }
});
