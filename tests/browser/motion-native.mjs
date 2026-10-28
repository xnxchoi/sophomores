// Run with an existing Playwright page against the local app. No submission,
// provider call, database write, or external browser destination is required.
export async function runMotionChecks(page, baseURL = "http://127.0.0.1:3000") {
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const selected = (number) => button(`Read story ${number}`);
  const progress = () => page.locator('[data-story-card="0"] [data-story-progress] i')
    .first().evaluate((element) => getComputedStyle(element).transform);
  const errors = [];
  const captureError = (error) => errors.push(error.message);
  page.on("pageerror", captureError);
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(baseURL);
    await page.locator("#origin").waitFor();
    await page.evaluate(() => window.scrollTo(0, document.getElementById("origin").offsetTop));
    await selected(1).click();
    await page.waitForTimeout(600);
    await button("Pause stories").click();
    const paused = await progress();
    await page.waitForTimeout(700);
    check(await progress() === paused, "Pause must retain exact reading progress.");

    await button("Play stories").click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Read story 2"]')?.getAttribute("aria-pressed") === "true", null, { timeout: 8000 });
    await selected(4).click();
    await button("Replay stories").waitFor({ timeout: 8000 });
    await button("Replay stories").click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Read story 1"]')?.getAttribute("aria-pressed") === "true");
    await button("Pause stories").click();

    // Manual reverse navigation must retarget immediately, not visit queued cards.
    await selected(3).click();
    await selected(1).click();
    await page.waitForTimeout(400);
    check(await selected(1).getAttribute("aria-pressed") === "true", "Reverse navigation must return to story one.");

    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of ["origin", "how", "strategy", "people", "contacts"]) {
      await page.evaluate((id) => window.scrollTo(0, document.getElementById(id).offsetTop), id);
      await page.waitForTimeout(250);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id} must not overflow the mobile viewport.`);
    }
    check(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
    return { pause: true, autoplay: true, replay: true, reverse: true, mobileOverflow: false, errors };
  } finally {
    page.off("pageerror", captureError);
  }
}
