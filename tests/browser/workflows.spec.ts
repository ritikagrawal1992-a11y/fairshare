import { test, expect } from "@playwright/test";
test("Fairshare adds an expense and updates settlement balances", async ({
  page,
}) => {
  await page.goto("/#expenses");
  await page
    .getByLabel("What was paid for?", { exact: true })
    .fill("Weekend tickets");
  await page.getByLabel("Paid by", { exact: true }).fill("Jordan");
  await page.getByLabel("Amount (USD)", { exact: true }).fill("30.01");
  await page
    .getByLabel("Participants", { exact: false })
    .fill("Alex, Sam, Jordan");
  await page.getByRole("button", { name: "Split expense" }).click();
  await expect(
    page.getByText("Weekend tickets", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/fairshare.png",
    fullPage: true,
  });
});
