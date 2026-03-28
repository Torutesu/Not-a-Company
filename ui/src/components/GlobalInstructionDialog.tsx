import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { useLocale } from "../context/LocaleContext";
import { agentsApi } from "../api/agents";
import { goalsApi } from "../api/goals";
import { issuesApi } from "../api/issues";
import { projectsApi } from "../api/projects";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import {
  parseNaturalLanguageGoalInput,
  parseNaturalLanguageIssueInput,
  parseNaturalLanguageProjectInput,
  type ParsedGoalIntent,
  type ParsedIssueIntent,
  type ParsedProjectIntent,
} from "../lib/issue-intent";

type InstructionTarget = "issue" | "goal" | "project";
type IssueCreationMode = "single" | "multiple";

interface RoutingPlan {
  suggestedTarget: InstructionTarget;
  reason: string;
  issue: ParsedIssueIntent;
  goal: ParsedGoalIntent;
  project: ParsedProjectIntent;
}

interface PlanFeedback {
  kind: "info" | "error";
  text: string;
}

const MAX_MULTI_ISSUES = 8;

function normalizeLookupText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanCandidate(value: string): string {
  return value
    .trim()
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "")
    .replace(/[。.!?！？]+$/g, "")
    .trim();
}

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const value of values) {
    const normalized = normalizeLookupText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    items.push(value);
  }
  return items;
}

function extractIssueCandidates(input: string): string[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fieldLikePrefixPattern =
    /^(?:title|goal|project|name|description|status|state|priority|prio|assignee|owner|担当(?:者)?|project|プロジェクト|ゴール|目標|親(?:goal|ゴール)?|level|階層|レベル|target\s*date|due|deadline|期限|締切|目標日)\s*[:：]/i;

  const bullets = lines
    .map((line) => {
      const bulletMatch = line.match(/^(?:[-*•]\s+|\d+[.)]\s+)(.+)$/);
      if (!bulletMatch) return "";
      const candidate = cleanCandidate(bulletMatch[1] ?? "");
      return fieldLikePrefixPattern.test(candidate) ? "" : candidate;
    })
    .filter((item) => item.length > 2);
  if (bullets.length > 0) {
    return uniquePreserveOrder(bullets).slice(0, MAX_MULTI_ISSUES);
  }

  const sentenceParts = input
    .split(/[。\n.!?！？;；]/)
    .map((part) => cleanCandidate(part))
    .filter((part) => part.length > 6 && !fieldLikePrefixPattern.test(part));
  return uniquePreserveOrder(sentenceParts).slice(0, MAX_MULTI_ISSUES);
}

function buildChecklistMarkdown(titles: string[], heading: string): string {
  if (titles.length === 0) return "";
  const items = titles
    .map((title) => cleanCandidate(title))
    .filter(Boolean)
    .map((title) => `- [ ] ${title}`)
    .join("\n");
  if (!items) return "";
  return `\n\n${heading}\n${items}`;
}

function resolveByName<T extends { name: string }>(items: T[], candidateName: string): T | null {
  const query = normalizeLookupText(candidateName).replace(/^@/, "");
  if (!query) return null;

  const exact = items.find((item) => normalizeLookupText(item.name) === query);
  if (exact) return exact;

  const partial = items.find((item) => normalizeLookupText(item.name).includes(query));
  if (partial) return partial;

  return null;
}

function resolveByTitle<T extends { title: string }>(items: T[], candidateTitle: string): T | null {
  const query = normalizeLookupText(candidateTitle);
  if (!query) return null;

  const exact = items.find((item) => normalizeLookupText(item.title) === query);
  if (exact) return exact;

  const partial = items.find((item) => normalizeLookupText(item.title).includes(query));
  if (partial) return partial;

  return null;
}

function routeInstruction(input: string, issue: ParsedIssueIntent, goal: ParsedGoalIntent, project: ParsedProjectIntent) {
  const text = input.toLowerCase();
  const score = {
    issue: 1,
    goal: 1,
    project: 1,
  };

  if (/(bug|fix|issue|todo|task|ticket|イシュー|不具合|修正|対応|タスク)/i.test(text)) score.issue += 2;
  if (/(goal|objective|kpi|okr|vision|strategy|ゴール|目標|戦略|達成)/i.test(text)) score.goal += 2;
  if (/(project|initiative|roadmap|release|program|プロジェクト|計画)/i.test(text)) score.project += 2;

  if (issue.priority || issue.assigneeName || issue.projectName) score.issue += 2;
  if (goal.level || goal.parentGoalName) score.goal += 2;
  if (project.goalNames.length > 0 || project.targetDate) score.project += 2;
  if (goal.title && issue.title && goal.title !== issue.title) score.goal += 1;
  if (/(まずは|first|then|次に|最終的に)/i.test(text) && /(goal|objective|kpi|okr|ゴール|目標)/i.test(text)) {
    score.goal += 1;
  }

  let suggestedTarget: InstructionTarget = "issue";
  let bestScore = score.issue;
  if (score.goal > bestScore) {
    suggestedTarget = "goal";
    bestScore = score.goal;
  }
  if (score.project > bestScore) {
    suggestedTarget = "project";
  }

  const reason =
    suggestedTarget === "issue"
      ? "Task-level wording and assignee/priority signals were detected."
      : suggestedTarget === "goal"
        ? "Objective-level wording and goal hierarchy signals were detected."
        : "Project-level wording and date/goal-link signals were detected.";

  return { suggestedTarget, reason };
}

function mergeIssueIntentForCandidate(baseIssue: ParsedIssueIntent, rawCandidate: string): ParsedIssueIntent {
  const candidateIntent = parseNaturalLanguageIssueInput(rawCandidate);
  const fallbackTitle = cleanCandidate(rawCandidate);
  return {
    title: candidateIntent.title ?? fallbackTitle ?? baseIssue.title,
    description: candidateIntent.description ?? baseIssue.description,
    status: candidateIntent.status ?? baseIssue.status,
    priority: candidateIntent.priority ?? baseIssue.priority,
    assigneeName: candidateIntent.assigneeName ?? baseIssue.assigneeName,
    projectName: candidateIntent.projectName ?? baseIssue.projectName,
  };
}

export function GlobalInstructionDialog() {
  const {
    globalInstructionOpen,
    closeGlobalInstruction,
    openNewIssue,
    openNewGoal,
    openNewProject,
  } = useDialog();
  const { selectedCompanyId } = useCompany();
  const { translateText } = useLocale();
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState("");
  const [target, setTarget] = useState<InstructionTarget>("issue");
  const [plan, setPlan] = useState<RoutingPlan | null>(null);
  const [feedback, setFeedback] = useState<PlanFeedback | null>(null);
  const [issueCreationMode, setIssueCreationMode] = useState<IssueCreationMode>("single");
  const [issueCandidates, setIssueCandidates] = useState<string[]>([]);
  const [selectedIssueTitles, setSelectedIssueTitles] = useState<string[]>([]);
  const [createGoalIssueBundle, setCreateGoalIssueBundle] = useState(false);
  const [goalCreatesIssues, setGoalCreatesIssues] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && globalInstructionOpen,
  });
  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && globalInstructionOpen,
  });
  const { data: goals = [] } = useQuery({
    queryKey: queryKeys.goals.list(selectedCompanyId!),
    queryFn: () => goalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && globalInstructionOpen,
  });

  const activeAgents = useMemo(
    () => agents.filter((agent) => agent.status !== "terminated"),
    [agents],
  );

  useEffect(() => {
    if (!globalInstructionOpen) return;
    setInstruction("");
    setPlan(null);
    setFeedback(null);
    setTarget("issue");
    setIssueCreationMode("single");
    setIssueCandidates([]);
    setSelectedIssueTitles([]);
    setCreateGoalIssueBundle(false);
    setGoalCreatesIssues(false);
    setCreating(false);
  }, [globalInstructionOpen]);

  function analyzeInstruction() {
    const raw = instruction.trim();
    if (!raw) {
      setFeedback({ kind: "error", text: translateText("Please enter an instruction first.") });
      return;
    }

    const parsedIssue = parseNaturalLanguageIssueInput(raw);
    const parsedGoal = parseNaturalLanguageGoalInput(raw);
    const parsedProject = parseNaturalLanguageProjectInput(raw);
    const routing = routeInstruction(raw, parsedIssue, parsedGoal, parsedProject);
    const candidates = extractIssueCandidates(raw);
    const fallbackTitle = parsedIssue.title ?? raw;
    const normalizedCandidates = candidates.length > 0 ? candidates : [fallbackTitle];

    setPlan({
      suggestedTarget: routing.suggestedTarget,
      reason: routing.reason,
      issue: parsedIssue,
      goal: parsedGoal,
      project: parsedProject,
    });
    setTarget(routing.suggestedTarget);
    setIssueCandidates(normalizedCandidates);
    setIssueCreationMode(normalizedCandidates.length > 1 ? "multiple" : "single");
    setSelectedIssueTitles(normalizedCandidates);
    setCreateGoalIssueBundle(false);
    setGoalCreatesIssues(routing.suggestedTarget === "goal" && normalizedCandidates.length > 0);
    setFeedback({
      kind: "info",
      text: `Suggested ${routing.suggestedTarget.toUpperCase()}: ${routing.reason}`,
    });
  }

  function toggleIssueTitle(title: string) {
    setSelectedIssueTitles((current) =>
      current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title],
    );
  }

  function resolveAssigneeAndProjectForIssue(issue: ParsedIssueIntent, issueContext?: string) {
    const warnings: string[] = [];
    let assigneeAgentId: string | undefined;
    let projectId: string | undefined;

    const prefix = issueContext ? `${issueContext}: ` : "";

    if (issue.assigneeName) {
      const assignee = resolveByName(activeAgents, issue.assigneeName);
      if (assignee) assigneeAgentId = assignee.id;
      else warnings.push(`${prefix}Assignee "${issue.assigneeName}" was not found.`);
    }
    if (issue.projectName) {
      const project = resolveByName(projects, issue.projectName);
      if (project) projectId = project.id;
      else warnings.push(`${prefix}Project "${issue.projectName}" was not found.`);
    }

    return { assigneeAgentId, projectId, warnings };
  }

  function buildIssueTitlesForCreation(planIssue: ParsedIssueIntent) {
    const singleTitle = cleanCandidate(
      selectedIssueTitles[0] ?? issueCandidates[0] ?? planIssue.title ?? instruction.trim(),
    );
    return issueCreationMode === "multiple"
      ? selectedIssueTitles.map((title) => cleanCandidate(title)).filter(Boolean)
      : [singleTitle];
  }

  async function createIssuesLinkedToGoal(input: {
    goalId: string;
    baseIssue: ParsedIssueIntent;
    rawTitles: string[];
    warnings: string[];
  }) {
    if (!selectedCompanyId) return;
    for (const rawTitle of input.rawTitles) {
      const mergedIssue = mergeIssueIntentForCandidate(input.baseIssue, rawTitle);
      const assignment = resolveAssigneeAndProjectForIssue(
        mergedIssue,
        mergedIssue.title ?? cleanCandidate(rawTitle),
      );
      input.warnings.push(...assignment.warnings);

      await issuesApi.create(selectedCompanyId, {
        title: cleanCandidate(mergedIssue.title ?? rawTitle),
        description: mergedIssue.description ?? instruction.trim(),
        status: mergedIssue.status ?? "todo",
        priority: mergedIssue.priority ?? "medium",
        goalId: input.goalId,
        ...(assignment.assigneeAgentId ? { assigneeAgentId: assignment.assigneeAgentId } : {}),
        ...(assignment.projectId ? { projectId: assignment.projectId } : {}),
      });
    }
  }

  async function createNowFromPlan() {
    if (!plan || !selectedCompanyId) return;
    setCreating(true);
    const warnings: string[] = [];

    try {
      if (target === "issue") {
        const rawTitles = buildIssueTitlesForCreation(plan.issue);

        if (rawTitles.length === 0) {
          setFeedback({
            kind: "error",
            text: translateText("Select at least one issue candidate."),
          });
          return;
        }

        let goalId: string | undefined;
        if (createGoalIssueBundle) {
          let parentId: string | undefined;
          if (plan.goal.parentGoalName) {
            const parentGoal = resolveByTitle(goals, plan.goal.parentGoalName);
            if (parentGoal) parentId = parentGoal.id;
            else warnings.push(`Parent goal "${plan.goal.parentGoalName}" was not found.`);
          }

          const createdGoal = await goalsApi.create(selectedCompanyId, {
            title: cleanCandidate(plan.goal.title ?? instruction.trim()),
            description: plan.goal.description ?? instruction.trim(),
            status: plan.goal.status ?? "planned",
            level: plan.goal.level ?? "task",
            ...(parentId ? { parentId } : {}),
          });
          goalId = createdGoal.id;
          queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(selectedCompanyId) });
        }

        for (const rawTitle of rawTitles) {
          const mergedIssue = mergeIssueIntentForCandidate(plan.issue, rawTitle);
          const assignment = resolveAssigneeAndProjectForIssue(
            mergedIssue,
            mergedIssue.title ?? cleanCandidate(rawTitle),
          );
          warnings.push(...assignment.warnings);

          await issuesApi.create(selectedCompanyId, {
            title: cleanCandidate(mergedIssue.title ?? rawTitle),
            description: mergedIssue.description ?? instruction.trim(),
            status: mergedIssue.status ?? "todo",
            priority: mergedIssue.priority ?? "medium",
            ...(assignment.assigneeAgentId ? { assigneeAgentId: assignment.assigneeAgentId } : {}),
            ...(assignment.projectId ? { projectId: assignment.projectId } : {}),
            ...(goalId ? { goalId } : {}),
          });
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId) });
        closeGlobalInstruction();
        setFeedback({
          kind: warnings.length > 0 ? "error" : "info",
          text:
            warnings.length > 0
              ? `${warnings.join(" ")} Created${createGoalIssueBundle ? " 1 goal and" : ""} ${rawTitles.length} issue(s).`
              : `Created${createGoalIssueBundle ? " 1 goal and" : ""} ${rawTitles.length} issue(s).`,
        });
        return;
      }

      if (target === "goal") {
        const rawTitles = goalCreatesIssues ? buildIssueTitlesForCreation(plan.issue) : [];
        if (goalCreatesIssues && rawTitles.length === 0) {
          setFeedback({
            kind: "error",
            text: translateText("Select at least one issue candidate."),
          });
          return;
        }

        let parentId: string | undefined;
        if (plan.goal.parentGoalName) {
          const parentGoal = resolveByTitle(goals, plan.goal.parentGoalName);
          if (parentGoal) parentId = parentGoal.id;
          else warnings.push(`Parent goal "${plan.goal.parentGoalName}" was not found.`);
        }

        const createdGoal = await goalsApi.create(selectedCompanyId, {
          title: cleanCandidate(plan.goal.title ?? instruction.trim()),
          description: plan.goal.description ?? instruction.trim(),
          status: plan.goal.status ?? "planned",
          level: plan.goal.level ?? "task",
          ...(parentId ? { parentId } : {}),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(selectedCompanyId) });

        let createdIssuesCount = 0;
        if (goalCreatesIssues) {
          await createIssuesLinkedToGoal({
            goalId: createdGoal.id,
            baseIssue: plan.issue,
            rawTitles,
            warnings,
          });
          createdIssuesCount = rawTitles.length;
          queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId) });
        }

        closeGlobalInstruction();
        setFeedback({
          kind: warnings.length > 0 ? "error" : "info",
          text:
            warnings.length > 0
              ? `${warnings.join(" ")} Created 1 goal${goalCreatesIssues ? ` and ${createdIssuesCount} issue(s)` : ""}.`
              : `Created 1 goal${goalCreatesIssues ? ` and ${createdIssuesCount} issue(s)` : ""}.`,
        });
        return;
      }

      const goalIds = plan.project.goalNames
        .map((goalName) => {
          const goal = resolveByTitle(goals, goalName);
          if (!goal) {
            warnings.push(`Goal "${goalName}" was not found.`);
            return null;
          }
          return goal.id;
        })
        .filter((goalId): goalId is string => Boolean(goalId));

      await projectsApi.create(selectedCompanyId, {
        name: cleanCandidate(plan.project.name ?? instruction.trim()),
        description: plan.project.description ?? instruction.trim(),
        status: plan.project.status ?? "planned",
        ...(goalIds.length > 0 ? { goalIds } : {}),
        ...(plan.project.targetDate ? { targetDate: plan.project.targetDate } : {}),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(selectedCompanyId) });
      closeGlobalInstruction();
      setFeedback({
        kind: warnings.length > 0 ? "error" : "info",
        text:
          warnings.length > 0
            ? `${warnings.join(" ")} Created 1 project.`
            : "Created 1 project.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : translateText("Failed to create item from instruction."),
      });
    } finally {
      setCreating(false);
    }
  }

  function openDraftFromPlan() {
    if (!plan) return;
    const errors: string[] = [];

    if (target === "issue") {
      let assigneeAgentId: string | undefined;
      let projectId: string | undefined;

      if (plan.issue.assigneeName) {
        const assignee = resolveByName(activeAgents, plan.issue.assigneeName);
        if (assignee) assigneeAgentId = assignee.id;
        else errors.push(`Assignee "${plan.issue.assigneeName}" was not found.`);
      }
      if (plan.issue.projectName) {
        const project = resolveByName(projects, plan.issue.projectName);
        if (project) projectId = project.id;
        else errors.push(`Project "${plan.issue.projectName}" was not found.`);
      }

      const titleForDraft =
        issueCreationMode === "multiple"
          ? selectedIssueTitles[0] ?? plan.issue.title ?? instruction.trim()
          : plan.issue.title ?? instruction.trim();
      const baseDescription = plan.issue.description ?? instruction.trim();
      const checklist =
        issueCreationMode === "multiple"
          ? buildChecklistMarkdown(selectedIssueTitles, "Planned issue breakdown")
          : "";
      openNewIssue({
        title: cleanCandidate(titleForDraft),
        description: `${baseDescription}${checklist}`,
        status: plan.issue.status ?? "todo",
        priority: plan.issue.priority ?? "medium",
        assigneeAgentId,
        projectId,
      });
    } else if (target === "goal") {
      let parentId: string | undefined;
      if (plan.goal.parentGoalName) {
        const parentGoal = resolveByTitle(goals, plan.goal.parentGoalName);
        if (parentGoal) parentId = parentGoal.id;
        else errors.push(`Parent goal "${plan.goal.parentGoalName}" was not found.`);
      }
      const issueChecklist =
        goalCreatesIssues
          ? buildChecklistMarkdown(
              issueCreationMode === "multiple" ? selectedIssueTitles : buildIssueTitlesForCreation(plan.issue),
              "Planned linked issues",
            )
          : "";
      openNewGoal({
        title: cleanCandidate(plan.goal.title ?? instruction.trim()),
        description: `${plan.goal.description ?? instruction.trim()}${issueChecklist}`,
        status: plan.goal.status ?? "planned",
        level: plan.goal.level ?? "task",
        parentId,
      });
    } else {
      const goalIds = plan.project.goalNames
        .map((goalName) => {
          const goal = resolveByTitle(goals, goalName);
          if (!goal) {
            errors.push(`Goal "${goalName}" was not found.`);
            return null;
          }
          return goal.id;
        })
        .filter((goalId): goalId is string => Boolean(goalId));

      openNewProject({
        name: cleanCandidate(plan.project.name ?? instruction.trim()),
        description: plan.project.description ?? instruction.trim(),
        status: plan.project.status ?? "planned",
        goalIds,
        targetDate: plan.project.targetDate ?? undefined,
      });
    }

    if (errors.length > 0) {
      setFeedback({ kind: "error", text: `${errors.join(" ")} ${translateText("Opened draft with remaining fields.")}` });
    }
    closeGlobalInstruction();
  }

  const canOpenDraft = Boolean(plan && selectedCompanyId);
  const requiresIssueSelection =
    issueCreationMode === "multiple" &&
    selectedIssueTitles.length === 0 &&
    (target === "issue" || (target === "goal" && goalCreatesIssues));
  const canCreateNow = Boolean(
    plan &&
      selectedCompanyId &&
      !requiresIssueSelection,
  );

  return (
    <Dialog
      open={globalInstructionOpen}
      onOpenChange={(open) => {
        if (!open) closeGlobalInstruction();
      }}
    >
      <DialogContent showCloseButton={false} className="p-0 gap-0 sm:max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="text-sm font-medium">{translateText("Global Instruction")}</div>
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground" onClick={() => closeGlobalInstruction()}>
            <span className="text-lg leading-none">&times;</span>
          </Button>
        </div>

        <div className="p-4 border-b border-border space-y-2">
          <div className="text-xs text-muted-foreground">
            {translateText("Write one instruction. We suggest Issue/Goal/Project, and you can open a draft or create directly.")}
          </div>
          <textarea
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none resize-y min-h-28 placeholder:text-muted-foreground/50"
            placeholder={translateText("e.g. 来月までにオンボーディング完了率を15%改善したい。まずはログイン導線の不具合修正をAliceに割り当てる。")}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                analyzeInstruction();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">{translateText("Tip: `Cmd/Ctrl + Enter` to analyze.")}</p>
            <Button type="button" size="sm" onClick={analyzeInstruction} disabled={!instruction.trim()}>
              {translateText("Analyze")}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto min-h-0">
          {plan && (
            <>
              <div className="text-xs text-muted-foreground">
                {translateText("Suggested target")}: <span className="font-semibold text-foreground uppercase">{plan.suggestedTarget}</span>
              </div>
              <div className="flex items-center gap-2">
                {(["issue", "goal", "project"] as const).map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    className={cn(
                      "px-2.5 py-1 rounded-md border text-xs uppercase",
                      target === candidate ? "bg-accent border-foreground/30" : "border-border hover:bg-accent/40",
                    )}
                    onClick={() => setTarget(candidate)}
                  >
                    {candidate}
                  </button>
                ))}
              </div>

              {target === "issue" && (
                <div className="rounded-md border border-border p-3 text-xs space-y-2">
                  <div><span className="text-muted-foreground">Title:</span> {plan.issue.title ?? "-"}</div>
                  <div><span className="text-muted-foreground">Status:</span> {plan.issue.status ?? "-"}</div>
                  <div><span className="text-muted-foreground">Priority:</span> {plan.issue.priority ?? "-"}</div>
                  <div><span className="text-muted-foreground">Assignee:</span> {plan.issue.assigneeName ?? "-"}</div>
                  <div><span className="text-muted-foreground">Project:</span> {plan.issue.projectName ?? "-"}</div>

                  <div className="pt-1 space-y-1.5">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={createGoalIssueBundle}
                        onChange={(event) => setCreateGoalIssueBundle(event.target.checked)}
                      />
                      <span>Create 1 goal and link created issue(s) to that goal</span>
                    </label>
                    {createGoalIssueBundle && (
                      <div className="rounded border border-border p-2 space-y-1 text-[11px]">
                        <div><span className="text-muted-foreground">Goal title:</span> {plan.goal.title ?? "-"}</div>
                        <div><span className="text-muted-foreground">Goal status:</span> {plan.goal.status ?? "-"}</div>
                        <div><span className="text-muted-foreground">Goal level:</span> {plan.goal.level ?? "-"}</div>
                        <div><span className="text-muted-foreground">Goal parent:</span> {plan.goal.parentGoalName ?? "-"}</div>
                      </div>
                    )}
                  </div>

                  {issueCandidates.length > 1 && (
                    <div className="pt-1 space-y-2">
                      <div className="text-muted-foreground">Issue breakdown</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={cn(
                            "px-2 py-0.5 rounded border",
                            issueCreationMode === "single" ? "bg-accent border-foreground/30" : "border-border hover:bg-accent/40",
                          )}
                          onClick={() => setIssueCreationMode("single")}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "px-2 py-0.5 rounded border",
                            issueCreationMode === "multiple" ? "bg-accent border-foreground/30" : "border-border hover:bg-accent/40",
                          )}
                          onClick={() => setIssueCreationMode("multiple")}
                        >
                          Multiple ({issueCandidates.length})
                        </button>
                      </div>
                      {issueCreationMode === "multiple" && (
                        <div className="rounded border border-border p-2 space-y-1.5">
                          {issueCandidates.map((title) => {
                            const selected = selectedIssueTitles.includes(title);
                            return (
                              <label key={title} className="flex items-start gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={selected}
                                  onChange={() => toggleIssueTitle(title)}
                                />
                                <span>{title}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {target === "goal" && (
                <div className="rounded-md border border-border p-3 text-xs space-y-2">
                  <div><span className="text-muted-foreground">Title:</span> {plan.goal.title ?? "-"}</div>
                  <div><span className="text-muted-foreground">Status:</span> {plan.goal.status ?? "-"}</div>
                  <div><span className="text-muted-foreground">Level:</span> {plan.goal.level ?? "-"}</div>
                  <div><span className="text-muted-foreground">Parent:</span> {plan.goal.parentGoalName ?? "-"}</div>

                  <div className="pt-1 space-y-1.5">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={goalCreatesIssues}
                        onChange={(event) => setGoalCreatesIssues(event.target.checked)}
                      />
                      <span>Create linked issue(s) from this instruction as part of this goal</span>
                    </label>
                    {goalCreatesIssues && (
                      <div className="rounded border border-border p-2 space-y-1 text-[11px]">
                        <div><span className="text-muted-foreground">Issue status:</span> {plan.issue.status ?? "todo"}</div>
                        <div><span className="text-muted-foreground">Issue priority:</span> {plan.issue.priority ?? "medium"}</div>
                        <div><span className="text-muted-foreground">Issue assignee:</span> {plan.issue.assigneeName ?? "-"}</div>
                        <div><span className="text-muted-foreground">Issue project:</span> {plan.issue.projectName ?? "-"}</div>

                        {issueCandidates.length > 1 && (
                          <div className="pt-1 space-y-2">
                            <div className="text-muted-foreground">Issue breakdown</div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className={cn(
                                  "px-2 py-0.5 rounded border",
                                  issueCreationMode === "single" ? "bg-accent border-foreground/30" : "border-border hover:bg-accent/40",
                                )}
                                onClick={() => setIssueCreationMode("single")}
                              >
                                Single
                              </button>
                              <button
                                type="button"
                                className={cn(
                                  "px-2 py-0.5 rounded border",
                                  issueCreationMode === "multiple" ? "bg-accent border-foreground/30" : "border-border hover:bg-accent/40",
                                )}
                                onClick={() => setIssueCreationMode("multiple")}
                              >
                                Multiple ({issueCandidates.length})
                              </button>
                            </div>
                            {issueCreationMode === "multiple" && (
                              <div className="rounded border border-border p-2 space-y-1.5">
                                {issueCandidates.map((title) => {
                                  const selected = selectedIssueTitles.includes(title);
                                  return (
                                    <label key={title} className="flex items-start gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={selected}
                                        onChange={() => toggleIssueTitle(title)}
                                      />
                                      <span>{title}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {target === "project" && (
                <div className="rounded-md border border-border p-3 text-xs space-y-1">
                  <div><span className="text-muted-foreground">Name:</span> {plan.project.name ?? "-"}</div>
                  <div><span className="text-muted-foreground">Status:</span> {plan.project.status ?? "-"}</div>
                  <div><span className="text-muted-foreground">Goal links:</span> {plan.project.goalNames.join(", ") || "-"}</div>
                  <div><span className="text-muted-foreground">Target date:</span> {plan.project.targetDate ?? "-"}</div>
                </div>
              )}
            </>
          )}

          {feedback && (
            <p className={cn("text-xs", feedback.kind === "error" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {feedback.text}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={() => closeGlobalInstruction()}>
            {translateText("Cancel")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openDraftFromPlan} disabled={!canOpenDraft || creating}>
            {translateText("Open Draft")}
          </Button>
          <Button type="button" size="sm" onClick={createNowFromPlan} disabled={!canCreateNow || creating}>
            {creating ? translateText("Creating…") : translateText("Create now")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
