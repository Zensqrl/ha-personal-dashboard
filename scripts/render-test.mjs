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
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `PASS ${width}px render, navigation, source failure and overflow`,
    );
  }
} finally {
  await browser.close();
}
