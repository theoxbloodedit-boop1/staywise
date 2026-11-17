import test from "node:test";
import assert from "node:assert/strict";
test("Control Center renders an honest protected entry, not customer data or fabricated dashboard", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ControlCenterPage } =
    await import("../src/pages/ControlCenterPage.js");
  const html = renderToStaticMarkup(
    React.createElement(ControlCenterPage, { onNavigate: () => {} }),
  );
  assert.match(html, /Internal personnel only/);
  assert.match(html, /Validating administrative session/);
  assert.doesNotMatch(html, /SECRET-DOOR-CODE|Collected revenue: \$/);
});
