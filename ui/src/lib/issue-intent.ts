export type IssueIntentStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type IssueIntentPriority = "critical" | "high" | "medium" | "low";
export type GoalIntentStatus = "planned" | "active" | "achieved" | "cancelled";
export type GoalIntentLevel = "company" | "team" | "agent" | "task";
export type ProjectIntentStatus = "backlog" | "planned" | "in_progress" | "completed" | "cancelled";

export interface ParsedIssueIntent {
  title: string | null;
  description: string | null;
  status: IssueIntentStatus | null;
  priority: IssueIntentPriority | null;
  assigneeName: string | null;
  projectName: string | null;
}

export interface ParsedGoalIntent {
  title: string | null;
  description: string | null;
  status: GoalIntentStatus | null;
  level: GoalIntentLevel | null;
  parentGoalName: string | null;
}

export interface ParsedProjectIntent {
  name: string | null;
  description: string | null;
  status: ProjectIntentStatus | null;
  goalNames: string[];
  targetDate: string | null;
}

function cleanValue(value: string): string {
  return value.trim().replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "").trim();
}

function normalizeValue(value: string): string {
  return cleanValue(value).toLowerCase();
}

function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractFirstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const sentence = trimmed.split(/[\n。.!?！？]/)[0] ?? "";
  return cleanValue(sentence);
}

function deriveFallbackDescription(
  raw: string,
  title: string | null,
  lines: string[],
  consumedLineIndexes: Set<number>,
): string | null {
  const remainingLines = lines.filter((_, index) => !consumedLineIndexes.has(index));
  const remainingText = remainingLines.join("\n").trim();
  if (remainingText && remainingText !== title) {
    return remainingText;
  }
  if (raw !== title && raw.length > (title?.length ?? 0) + 16) {
    return raw;
  }
  return null;
}

function findInlineValue(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const candidate = cleanValue(match[1] ?? "");
    if (candidate) return candidate;
  }
  return null;
}

function parseDelimitedNames(rawValue: string): string[] {
  return rawValue
    .split(/[;,、]/)
    .map((value) => cleanValue(value))
    .filter((value) => Boolean(value));
}

function canonicalizeIssueStatus(rawValue: string): IssueIntentStatus | null {
  const value = normalizeValue(rawValue);
  if (!value) return null;

  if (/\b(backlog)\b/.test(value) || value.includes("未着手") || value.includes("未対応")) {
    return "backlog";
  }
  if (/\b(todo|to do|pending|open)\b/.test(value) || value.includes("着手前") || value.includes("対応待ち")) {
    return "todo";
  }
  if (/\b(in[_\s-]?progress|doing|wip)\b/.test(value) || value.includes("進行中") || value.includes("作業中") || value.includes("対応中")) {
    return "in_progress";
  }
  if (/\b(in[_\s-]?review|review)\b/.test(value) || value.includes("レビュー") || value.includes("確認待ち")) {
    return "in_review";
  }
  if (/\b(done|complete|completed|closed)\b/.test(value) || value.includes("完了") || value.includes("クローズ") || value.includes("対応済")) {
    return "done";
  }
  return null;
}

function canonicalizePriority(rawValue: string): IssueIntentPriority | null {
  const value = normalizeValue(rawValue);
  if (!value) return null;

  if (/\b(critical|urgent|blocker|p0)\b/.test(value) || value.includes("最優先") || value.includes("緊急") || value.includes("致命")) {
    return "critical";
  }
  if (/\b(high|p1)\b/.test(value) || value === "高" || value.includes("高優先")) {
    return "high";
  }
  if (/\b(medium|normal|p2)\b/.test(value) || value === "中" || value.includes("中優先")) {
    return "medium";
  }
  if (/\b(low|minor|p3)\b/.test(value) || value === "低" || value.includes("低優先")) {
    return "low";
  }
  return null;
}

function canonicalizeGoalStatus(rawValue: string): GoalIntentStatus | null {
  const value = normalizeValue(rawValue);
  if (!value) return null;

  if (/\b(planned|plan|draft|planning)\b/.test(value) || value.includes("計画")) {
    return "planned";
  }
  if (/\b(active|ongoing|running)\b/.test(value) || value.includes("進行中") || value.includes("実行中")) {
    return "active";
  }
  if (/\b(achieved|done|completed)\b/.test(value) || value.includes("達成") || value.includes("完了")) {
    return "achieved";
  }
  if (/\b(cancelled|canceled)\b/.test(value) || value.includes("中止") || value.includes("キャンセル")) {
    return "cancelled";
  }
  return null;
}

function canonicalizeGoalLevel(rawValue: string): GoalIntentLevel | null {
  const value = normalizeValue(rawValue);
  if (!value) return null;

  if (/\b(company)\b/.test(value) || value.includes("会社")) return "company";
  if (/\b(team)\b/.test(value) || value.includes("チーム")) return "team";
  if (/\b(agent)\b/.test(value) || value.includes("エージェント")) return "agent";
  if (/\b(task)\b/.test(value) || value.includes("タスク")) return "task";
  return null;
}

function canonicalizeProjectStatus(rawValue: string): ProjectIntentStatus | null {
  const value = normalizeValue(rawValue);
  if (!value) return null;

  if (/\b(backlog)\b/.test(value) || value.includes("未着手")) return "backlog";
  if (/\b(planned|plan|draft)\b/.test(value) || value.includes("計画")) return "planned";
  if (/\b(in[_\s-]?progress|active|doing)\b/.test(value) || value.includes("進行中") || value.includes("作業中")) {
    return "in_progress";
  }
  if (/\b(completed|complete|done)\b/.test(value) || value.includes("完了")) return "completed";
  if (/\b(cancelled|canceled)\b/.test(value) || value.includes("中止") || value.includes("キャンセル")) {
    return "cancelled";
  }
  return null;
}

function canonicalizeTargetDate(rawValue: string): string | null {
  const value = cleanValue(rawValue);
  if (!value) return null;

  const direct = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (direct) {
    const y = direct[1]!;
    const m = direct[2]!.padStart(2, "0");
    const d = direct[3]!.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const japanese = value.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (japanese) {
    const y = japanese[1]!;
    const m = japanese[2]!.padStart(2, "0");
    const d = japanese[3]!.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

export function parseNaturalLanguageIssueInput(input: string): ParsedIssueIntent {
  const raw = input.trim();
  if (!raw) {
    return {
      title: null,
      description: null,
      status: null,
      priority: null,
      assigneeName: null,
      projectName: null,
    };
  }

  const lines = parseLines(raw);
  const consumedLineIndexes = new Set<number>();

  let title: string | null = null;
  let description: string | null = null;
  let status: IssueIntentStatus | null = null;
  let priority: IssueIntentPriority | null = null;
  let assigneeName: string | null = null;
  let projectName: string | null = null;

  for (const [index, line] of lines.entries()) {
    const titleMatch = line.match(/^(?:title|件名|タイトル)\s*[:：]\s*(.+)$/i);
    if (titleMatch && !title) {
      title = cleanValue(titleMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const descriptionMatch = line.match(/^(?:description|details?|詳細|説明)\s*[:：]\s*(.+)$/i);
    if (descriptionMatch && !description) {
      description = cleanValue(descriptionMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const statusMatch = line.match(/^(?:status|state|ステータス|状態)\s*[:：]\s*(.+)$/i);
    if (statusMatch && !status) {
      status = canonicalizeIssueStatus(statusMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const priorityMatch = line.match(/^(?:priority|prio|優先度)\s*[:：]\s*(.+)$/i);
    if (priorityMatch && !priority) {
      priority = canonicalizePriority(priorityMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const assigneeMatch = line.match(/^(?:assignee|owner|担当(?:者)?)\s*[:：]\s*(.+)$/i);
    if (assigneeMatch && !assigneeName) {
      assigneeName = cleanValue(assigneeMatch[1] ?? "").replace(/^@/, "");
      consumedLineIndexes.add(index);
      continue;
    }

    const projectMatch = line.match(/^(?:project|プロジェクト)\s*[:：]\s*(.+)$/i);
    if (projectMatch && !projectName) {
      projectName = cleanValue(projectMatch[1] ?? "");
      consumedLineIndexes.add(index);
    }
  }

  if (!status) status = canonicalizeIssueStatus(raw);
  if (!priority) priority = canonicalizePriority(raw);

  if (!assigneeName) {
    assigneeName = findInlineValue(raw, [
      /(?:assignee|owner|担当(?:者)?)(?:\s*(?:is|=|:|：|は|を))?\s*[@]?"?([^,\n。.!?！？]+)"?/i,
    ]);
    if (assigneeName) assigneeName = assigneeName.replace(/^@/, "");
  }

  if (!projectName) {
    projectName = findInlineValue(raw, [
      /(?:project|プロジェクト)(?:\s*(?:is|=|:|：|は|を))?\s*"?([^,\n。.!?！？]+)"?/i,
    ]);
  }

  if (!title) {
    const firstSentence = extractFirstSentence(raw);
    title = firstSentence || cleanValue(lines[0] ?? "");
  }

  if (!description) {
    description = deriveFallbackDescription(raw, title, lines, consumedLineIndexes);
  }

  return {
    title: title || null,
    description: description || null,
    status,
    priority,
    assigneeName: assigneeName || null,
    projectName: projectName || null,
  };
}

export function parseNaturalLanguageGoalInput(input: string): ParsedGoalIntent {
  const raw = input.trim();
  if (!raw) {
    return {
      title: null,
      description: null,
      status: null,
      level: null,
      parentGoalName: null,
    };
  }

  const lines = parseLines(raw);
  const consumedLineIndexes = new Set<number>();

  let title: string | null = null;
  let description: string | null = null;
  let status: GoalIntentStatus | null = null;
  let level: GoalIntentLevel | null = null;
  let parentGoalName: string | null = null;

  for (const [index, line] of lines.entries()) {
    const titleMatch = line.match(/^(?:title|goal|件名|タイトル|目標)\s*[:：]\s*(.+)$/i);
    if (titleMatch && !title) {
      title = cleanValue(titleMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const descriptionMatch = line.match(/^(?:description|details?|詳細|説明)\s*[:：]\s*(.+)$/i);
    if (descriptionMatch && !description) {
      description = cleanValue(descriptionMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const statusMatch = line.match(/^(?:status|state|ステータス|状態)\s*[:：]\s*(.+)$/i);
    if (statusMatch && !status) {
      status = canonicalizeGoalStatus(statusMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const levelMatch = line.match(/^(?:level|階層|レベル)\s*[:：]\s*(.+)$/i);
    if (levelMatch && !level) {
      level = canonicalizeGoalLevel(levelMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const parentMatch = line.match(/^(?:parent|parent goal|親|親goal|親ゴール)\s*[:：]\s*(.+)$/i);
    if (parentMatch && !parentGoalName) {
      parentGoalName = cleanValue(parentMatch[1] ?? "");
      consumedLineIndexes.add(index);
    }
  }

  if (!status) status = canonicalizeGoalStatus(raw);
  if (!level) level = canonicalizeGoalLevel(raw);

  if (!parentGoalName) {
    parentGoalName = findInlineValue(raw, [
      /(?:parent(?:\s+goal)?|親(?:goal|ゴール)?)(?:\s*(?:is|=|:|：|は|を))?\s*"?([^,\n。.!?！？]+)"?/i,
    ]);
  }

  if (!title) {
    const firstSentence = extractFirstSentence(raw);
    title = firstSentence || cleanValue(lines[0] ?? "");
  }

  if (!description) {
    description = deriveFallbackDescription(raw, title, lines, consumedLineIndexes);
  }

  return {
    title: title || null,
    description: description || null,
    status,
    level,
    parentGoalName: parentGoalName || null,
  };
}

export function parseNaturalLanguageProjectInput(input: string): ParsedProjectIntent {
  const raw = input.trim();
  if (!raw) {
    return {
      name: null,
      description: null,
      status: null,
      goalNames: [],
      targetDate: null,
    };
  }

  const lines = parseLines(raw);
  const consumedLineIndexes = new Set<number>();

  let name: string | null = null;
  let description: string | null = null;
  let status: ProjectIntentStatus | null = null;
  let targetDate: string | null = null;
  let goalNames: string[] = [];

  for (const [index, line] of lines.entries()) {
    const nameMatch = line.match(/^(?:name|project|project name|プロジェクト|プロジェクト名)\s*[:：]\s*(.+)$/i);
    if (nameMatch && !name) {
      name = cleanValue(nameMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const descriptionMatch = line.match(/^(?:description|details?|詳細|説明)\s*[:：]\s*(.+)$/i);
    if (descriptionMatch && !description) {
      description = cleanValue(descriptionMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const statusMatch = line.match(/^(?:status|state|ステータス|状態)\s*[:：]\s*(.+)$/i);
    if (statusMatch && !status) {
      status = canonicalizeProjectStatus(statusMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const goalsMatch = line.match(/^(?:goals?|goal link|関連goal|関連ゴール)\s*[:：]\s*(.+)$/i);
    if (goalsMatch && goalNames.length === 0) {
      goalNames = parseDelimitedNames(goalsMatch[1] ?? "");
      consumedLineIndexes.add(index);
      continue;
    }

    const targetDateMatch = line.match(/^(?:target date|due|deadline|期限|締切|目標日)\s*[:：]\s*(.+)$/i);
    if (targetDateMatch && !targetDate) {
      targetDate = canonicalizeTargetDate(targetDateMatch[1] ?? "");
      consumedLineIndexes.add(index);
    }
  }

  if (!status) status = canonicalizeProjectStatus(raw);

  if (goalNames.length === 0) {
    const inlineGoals = findInlineValue(raw, [
      /(?:goals?|関連goal|関連ゴール)(?:\s*(?:are|is|=|:|：|は|を))?\s*"?([^。\n!?！？]+)"?/i,
    ]);
    if (inlineGoals) {
      goalNames = parseDelimitedNames(inlineGoals);
    }
  }

  if (!targetDate) {
    const inlineDate = findInlineValue(raw, [
      /(?:target\s*date|due|deadline|期限|締切|目標日)(?:\s*(?:is|=|:|：|は|を))?\s*"?([^,\n。!?！？]+)"?/i,
    ]);
    if (inlineDate) {
      targetDate = canonicalizeTargetDate(inlineDate);
    }
  }

  if (!name) {
    const firstSentence = extractFirstSentence(raw);
    name = firstSentence || cleanValue(lines[0] ?? "");
  }

  if (!description) {
    description = deriveFallbackDescription(raw, name, lines, consumedLineIndexes);
  }

  return {
    name: name || null,
    description: description || null,
    status,
    goalNames,
    targetDate,
  };
}
