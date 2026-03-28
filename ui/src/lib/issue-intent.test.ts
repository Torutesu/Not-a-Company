// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  parseNaturalLanguageGoalInput,
  parseNaturalLanguageIssueInput,
  parseNaturalLanguageProjectInput,
} from "./issue-intent";

describe("parseNaturalLanguageIssueInput", () => {
  it("parses Japanese labeled fields", () => {
    const parsed = parseNaturalLanguageIssueInput(
      [
        "タイトル: ログイン導線の不具合を修正",
        "詳細: LPからの遷移で500エラーが出る",
        "ステータス: 進行中",
        "優先度: 高",
        "担当: Alice",
        "プロジェクト: Onboarding",
      ].join("\n"),
    );

    expect(parsed).toMatchObject({
      title: "ログイン導線の不具合を修正",
      description: "LPからの遷移で500エラーが出る",
      status: "in_progress",
      priority: "high",
      assigneeName: "Alice",
      projectName: "Onboarding",
    });
  });

  it("parses inline Japanese hints", () => {
    const parsed = parseNaturalLanguageIssueInput(
      "来週までにログイン導線の不具合を修正する。担当はBob、優先度は最優先。",
    );

    expect(parsed.assigneeName).toBe("Bob");
    expect(parsed.priority).toBe("critical");
    expect(parsed.title).toContain("来週までにログイン導線の不具合を修正する");
  });
});

describe("parseNaturalLanguageGoalInput", () => {
  it("parses Japanese goal fields and hierarchy", () => {
    const parsed = parseNaturalLanguageGoalInput(
      [
        "目標: オンボーディング完了率を15%改善",
        "説明: 今月末までに主要導線を改善する",
        "状態: active",
        "レベル: team",
        "親ゴール: FY26 Growth",
      ].join("\n"),
    );

    expect(parsed).toMatchObject({
      title: "オンボーディング完了率を15%改善",
      description: "今月末までに主要導線を改善する",
      status: "active",
      level: "team",
      parentGoalName: "FY26 Growth",
    });
  });
});

describe("parseNaturalLanguageProjectInput", () => {
  it("parses project fields, goal links and Japanese date", () => {
    const parsed = parseNaturalLanguageProjectInput(
      [
        "プロジェクト名: Q2 Growth Sprint",
        "説明: 新規ユーザーの初週定着率を改善する",
        "ステータス: 計画",
        "関連ゴール: Activation, Onboarding",
        "目標日: 2026年4月30日",
      ].join("\n"),
    );

    expect(parsed).toMatchObject({
      name: "Q2 Growth Sprint",
      description: "新規ユーザーの初週定着率を改善する",
      status: "planned",
      goalNames: ["Activation", "Onboarding"],
      targetDate: "2026-04-30",
    });
  });

  it("normalizes slash-form target date", () => {
    const parsed = parseNaturalLanguageProjectInput(
      "Project: Release 1.2\nTarget date: 2026/5/9",
    );

    expect(parsed.name).toBe("Release 1.2");
    expect(parsed.targetDate).toBe("2026-05-09");
  });
});
