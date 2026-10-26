import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const environment = Object.fromEntries(
  readFileSync(new URL("../../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [
      l.slice(0, l.indexOf("=")),
      l.slice(l.indexOf("=") + 1).replace(/^['"]|['"]$/g, ""),
    ]),
);
async function login(page, username) {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(environment.SEED_PASSWORD);
  await page.getByRole("button", { name: "登录", exact: false }).click();
  await expect(
    page.getByRole("navigation", { name: "工作空间" }),
  ).toBeVisible();
}

test("teacher configures an agent, inspects tools and material chunks", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "teacher_a");
  await page.getByRole("button", { name: "教学配置", exact: true }).click();
  await expect(page.getByRole("heading", { name: "教学配置" })).toBeVisible();
  await page.getByRole("button", { name: "数学助手", exact: false }).click();
  await expect(page.getByLabel("名称", { exact: true })).toHaveValue(
    "数学助手",
  );
  await page.getByRole("button", { name: "保存智能体", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("智能体已保存");
  await page.screenshot({ path: new URL("../test-results/teacher-agents.png", import.meta.url).pathname });
  await page.getByRole("tab", { name: "技能", exact: true }).click();
  await page
    .getByRole("button", { name: "数学解题引导", exact: false })
    .click();
  await expect(page.getByLabel("技能内容")).toContainText(
    "formula_hint@campus-tools",
  );
  await page.getByRole("button", { name: "保存技能", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("技能已保存");
  await page.getByRole("tab", { name: "工具服务", exact: true }).click();
  await page
    .getByRole("button", { name: "campus-tools", exact: false })
    .click();
  await page.getByRole("button", { name: "查看工具清单" }).click();
  await expect(
    page.getByRole("heading", { name: "formula_hint@campus-tools" }),
  ).toBeVisible();
  await page.screenshot({ path: new URL("../test-results/teacher-tools.png", import.meta.url).pathname });
  await page.getByRole("tab", { name: "调用记录", exact: true }).click();
  await expect(page.getByRole("button", { name: "刷新记录" })).toBeVisible();
  await page.locator('button[title="材料库"]').click();
  await page.getByRole("button", { name: "切片与索引" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "策略", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page.getByRole("button", { name: "上传教学材料" }).click();
  await page.getByRole("combobox", { name: "策略", exact: true }).selectOption("custom");
  await expect(page.getByLabel("最大字数")).toBeVisible();
  await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page.getByRole("button", { name: "智能体对话", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "选择助手" })).toBeVisible();
  await page.getByRole("button", { name: "切换深色" }).click();
  await expect(page.getByRole("combobox", {name:"选择助手"})).toHaveCSS("background-color", "rgb(24, 33, 49)");
  await page.screenshot({ path: new URL("../test-results/chat-dark.png", import.meta.url).pathname });
  expect(errors).toEqual([]);
});

test("student streams an answer, restores conversation and uses mobile layout", async ({
  page,
}) => {
  await login(page, "student_a1");
  await expect(
    page.getByRole("button", { name: "教学配置", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "智能体对话", exact: true }).click();
  await page
    .getByRole("combobox", { name: "选择助手" })
    .selectOption({ label: "数学助手" });
  await page
    .getByRole("textbox", { name: "向智能体提问" })
    .fill("方程去括号时容易漏乘，请用公式提示工具给我下一步检查方法。");
  await page.getByRole("button", { name: "发送问题", exact: true }).click();
  await expect(page.locator(".chat-answer")).toContainText(
    "formula_hint@campus-tools",
    { timeout: 150000 },
  );
  await expect(page.locator(".chat-panel .inline-error")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "新建会话" })).toBeEnabled({
    timeout: 150000,
  });
  await expect(page.locator(".chat-answer .chat-text")).not.toBeEmpty();
  await page.screenshot({ path: new URL("../test-results/student-answer.png", import.meta.url).pathname });
  const id = await page
    .getByRole("combobox", { name: "会话记录" })
    .inputValue();
  await page.reload();
  await page.getByRole("combobox", { name: "会话记录" }).selectOption(id);
  await expect(page.locator(".chat-answer .chat-text")).not.toBeEmpty();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: new URL("../test-results/student-mobile.png", import.meta.url).pathname });
});

test("Swagger loads documented operations", async ({ page }) => {
  await page.goto("/swagger");
  await expect(
    page.getByRole("heading", { name: "CampusClaw API", exact: false }),
  ).toBeVisible();
  await expect(page.locator(".opblock-summary-path").first()).toBeVisible();
});
