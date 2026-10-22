// Execute in cua_repl with the local study tab: await runModalChecks(otpTab).
// No real phone number, external request, authentication, or composer action.
export async function runModalChecks(tab) {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const button = (name) => tab.playwright.getByRole("button", { name, exact: true });
  const snapshot = () => tab.getAXState({ emit: false });
  const initialUrl = await tab.url();
  await button("English").click();
  await snapshot();
  await button("Close verification").click();
  await snapshot();
  check(await tab.playwright.evaluate(() => document.activeElement?.textContent === "Verify your phone"), "close must restore trigger focus");
  await button("Verify your phone").click();
  await snapshot();
  await button("Next").click();
  await snapshot();
  check(await tab.playwright.getByRole("textbox", {name: "Phone number", exact: true}).getAttribute("aria-invalid") === "true", "invalid number must be identified");
  check(await tab.playwright.evaluate(() => document.activeElement?.tagName === "INPUT"), "invalid submit must focus input");
  await button("한국어").click();
  await snapshot();
  check(await tab.playwright.evaluate(() => /[가-힣]/.test(document.getElementById("pv-error")?.textContent ?? "")), "existing error must translate");
  await button("English").click();
  await snapshot();
  await tab.playwright.getByRole("textbox", {name: "Phone number", exact: true}).fill("+82 10 1234 5678");
  await button("Next").click();
  await snapshot();
  check(!(await button("Open Messages").isEnabled()), "composer must stay disabled");
  await button("Preview waiting screen").click();
  await snapshot();
  const before = await tab.playwright.evaluate(() => document.querySelector(".pv-timer")?.getAttribute("aria-label")?.match(/\d+/)?.[0]);
  await button("Check verification status").click();
  await button("한국어").click();
  await snapshot();
  const after = await tab.playwright.evaluate(() => document.querySelector(".pv-timer")?.getAttribute("aria-label")?.match(/\d+/)?.[0]);
  check(before && after && Number(after) <= Number(before), "locale switch must not reset expiry");
  check(await tab.playwright.evaluate(() => /[가-힣]/.test(document.querySelector('[role="status"]')?.textContent ?? "")), "existing notice must translate");
  await button("English").click();
  await button("Back to message instructions").click();
  await snapshot();
  await button("Edit number").click();
  await snapshot();
  // Browser snapshots redact populated telephone inputs; assert retention, not raw PII.
  check(await tab.playwright.evaluate(() => Boolean(document.querySelector('input[type="tel"]')?.value)), "editing must retain input");
  for (let index = 0; index < 9; index += 1) {
    await tab.pressKey(null, "Tab");
    check(await tab.playwright.evaluate(() => Boolean(document.querySelector('[role="dialog"]')?.contains(document.activeElement))), "Tab must remain in dialog");
  }
  await snapshot();
  await tab.pressKey(null, "Escape");
  await snapshot();
  check(await tab.playwright.getByRole("dialog").count() === 0, "Escape must dismiss");
  check(await tab.playwright.evaluate(() => document.activeElement?.textContent === "Verify your phone"), "Escape must restore focus");
  await button("Verify your phone").click();
  await snapshot();
  check(await tab.playwright.evaluate(() => document.querySelector('input[type="tel"]')?.value === ""), "dismissal must clear private input");
  check(await tab.url() === initialUrl, "flow must not navigate");
  return { passed: true, url: initialUrl, checks: "validation, EN/KO continuity, preview boundary, back, focus trap, Escape, reset, unchanged URL" };
}
