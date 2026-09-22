// Headless software test of synthetic fixtures. Never connects to a user's browser or HA.
import { pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
await mkdir(new URL("../.local/", import.meta.url), { recursive: true });
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:8791");
    if (width > 700)
      await page.getByText("Desktop width", { exact: true }).click();
    await page
      .getByText("Capacity for a steady day", { exact: true })
      .waitFor();
    await page
      .getByText("Update the home server", { exact: true })
      .first()
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "No horizontal overflow",
    );
    const brief = page.locator("personal-day-brief");
    const timeline = page.locator("personal-day-timeline");
    const actions = page.locator("personal-suggested-actions");
    await timeline
      .getByText("Your schedule, weather events, and open time", {
        exact: true,
      })
      .waitFor();
    assert.equal(await timeline.locator(".head small").count(), 0);
    await timeline
      .getByText("How this timeline works", { exact: true })
      .click();
    await timeline
      .getByText("Suggested activities and tasks are only recommendations.", {
        exact: false,
      })
      .waitFor();
    await timeline
      .getByText("How this timeline works", { exact: true })
      .click();
    await actions
      .getByRole("button", {
        name: "Dismiss Update the home server",
        exact: true,
      })
      .click();
    assert.equal(
      await actions
        .getByText("Update the home server", { exact: true })
        .count(),
      0,
    );
    assert.equal(
      await timeline
        .getByText("Update the home server", { exact: true })
        .count(),
      0,
    );
    await actions
      .getByText("Review tomorrow's checklist", { exact: true })
      .waitFor();
    await actions.getByRole("button", { name: "Undo last dismissal" }).click();
    await actions
      .getByText("Update the home server", { exact: true })
      .waitFor();
    await brief.getByRole("button", { name: "Refresh dashboard" }).click();
    await brief
      .getByText(
        "Data was just checked. Wait 10 seconds before checking again.",
      )
      .waitFor();
    await page
      .locator("personal-navigation")
      .getByRole("button", { name: "Recovery", exact: true })
      .click();
    const recovery = page.getByRole("dialog").filter({ visible: true });
    assert.ok(!(await recovery.innerText()).includes("samples end"));
    assert.ok(!(await recovery.innerText()).includes("fetched"));
    await recovery
      .getByText("Within Garmin's balanced range", { exact: false })
      .waitFor();
    await recovery.getByRole("button", { name: "Close details" }).click();
    const timeTokens = await brief
      .locator(".clocktime")
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          text: n.textContent,
          wrap: getComputedStyle(n).whiteSpace,
        })),
      );
    assert.ok(timeTokens.length > 0);
    assert.ok(
      timeTokens.every(
        (n) => /\d:\d\d(?:am|pm)/.test(n.text) && n.wrap === "nowrap",
      ),
    );
    await page.screenshot({
      path: new URL(
        `../.local/preview-${width}.png`,
        import.meta.url,
      ).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
      fullPage: true,
    });
    await page
      .locator("personal-navigation")
      .getByRole("button", { name: "Nutrition", exact: true })
      .click();
    await page.getByRole("dialog").filter({ visible: true }).waitFor();
    await page
      .getByRole("button", { name: "Close details" })
      .filter({ visible: true })
      .click();
    await page.getByText("Toggle source failure", { exact: true }).click();
    await page
      .getByText("Calendar unavailable. Free time is not assumed.")
      .waitFor();
    await actions
      .getByText("Could not load Todoist tasks.", { exact: false })
      .waitFor();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `PASS ${width}px render, navigation, source failure and overflow`,
    );
  }
} finally {
  await browser.close();
}
