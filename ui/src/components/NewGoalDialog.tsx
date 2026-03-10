import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GOAL_STATUSES, GOAL_LEVELS } from "@paperclipai/shared";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { goalsApi } from "../api/goals";
import { assetsApi } from "../api/assets";
import { queryKeys } from "../lib/queryKeys";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Maximize2,
  Minimize2,
  Target,
  Layers,
} from "lucide-react";
import { cn } from "../lib/utils";
import { parseNaturalLanguageGoalInput } from "../lib/issue-intent";
import { MarkdownEditor, type MarkdownEditorRef } from "./MarkdownEditor";
import { StatusBadge } from "./StatusBadge";

const levelLabels: Record<string, string> = {
  company: "Company",
  team: "Team",
  agent: "Agent",
  task: "Task",
};

interface NaturalLanguageFeedback {
  kind: "info" | "error";
  text: string;
}

function normalizeLookupText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveGoalByTitle<T extends { title: string }>(items: T[], candidateTitle: string): T | null {
  const query = normalizeLookupText(candidateTitle);
  if (!query) return null;

  const exact = items.find((item) => normalizeLookupText(item.title) === query);
  if (exact) return exact;

  const partial = items.find((item) => normalizeLookupText(item.title).includes(query));
  if (partial) return partial;

  return null;
}

export function NewGoalDialog() {
  const { newGoalOpen, newGoalDefaults, closeNewGoal } = useDialog();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planned");
  const [level, setLevel] = useState("task");
  const [parentId, setParentId] = useState("");
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [naturalLanguageFeedback, setNaturalLanguageFeedback] = useState<NaturalLanguageFeedback | null>(null);
  const [expanded, setExpanded] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const descriptionEditorRef = useRef<MarkdownEditorRef>(null);

  // Apply defaults when dialog opens
  const appliedParentId = parentId || newGoalDefaults.parentId || "";

  const { data: goals } = useQuery({
    queryKey: queryKeys.goals.list(selectedCompanyId!),
    queryFn: () => goalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && newGoalOpen,
  });

  const createGoal = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      goalsApi.create(selectedCompanyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(selectedCompanyId!) });
      reset();
      closeNewGoal();
    },
  });

  const uploadDescriptionImage = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      return assetsApi.uploadImage(selectedCompanyId, file, "goals/drafts");
    },
  });

  useEffect(() => {
    if (!newGoalOpen) return;
    setTitle(newGoalDefaults.title ?? "");
    setDescription(newGoalDefaults.description ?? "");
    setStatus(newGoalDefaults.status ?? "planned");
    setLevel(newGoalDefaults.level ?? "task");
    setParentId(newGoalDefaults.parentId ?? "");
    setNaturalLanguageInput("");
    setNaturalLanguageFeedback(null);
  }, [newGoalOpen, newGoalDefaults]);

  function reset() {
    setTitle("");
    setDescription("");
    setStatus("planned");
    setLevel("task");
    setParentId("");
    setNaturalLanguageInput("");
    setNaturalLanguageFeedback(null);
    setExpanded(false);
  }

  function handleSubmit() {
    if (!selectedCompanyId || !title.trim()) return;
    createGoal.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      level,
      ...(appliedParentId ? { parentId: appliedParentId } : {}),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function applyNaturalLanguageInput() {
    const raw = naturalLanguageInput.trim();
    if (!raw) return;

    const parsed = parseNaturalLanguageGoalInput(raw);
    const infoMessages: string[] = [];
    const errorMessages: string[] = [];
    let appliedCount = 0;

    if (parsed.title) {
      setTitle(parsed.title);
      appliedCount += 1;
      infoMessages.push("title");
    }
    if (parsed.description) {
      setDescription(parsed.description);
      appliedCount += 1;
      infoMessages.push("description");
    }
    if (parsed.status) {
      setStatus(parsed.status);
      appliedCount += 1;
      infoMessages.push("status");
    }
    if (parsed.level) {
      setLevel(parsed.level);
      appliedCount += 1;
      infoMessages.push("level");
    }
    if (parsed.parentGoalName) {
      const parentGoal = resolveGoalByTitle(goals ?? [], parsed.parentGoalName);
      if (parentGoal) {
        setParentId(parentGoal.id);
        appliedCount += 1;
        infoMessages.push("parent");
      } else {
        errorMessages.push(`Parent goal "${parsed.parentGoalName}" was not found in this company.`);
      }
    }

    if (appliedCount === 0) {
      setNaturalLanguageFeedback({
        kind: "error",
        text: "Could not parse goal fields. Try: `Title: ...`, `Level: team`, `Status: active`, `Parent: goal name`.",
      });
      return;
    }

    if (errorMessages.length > 0) {
      setNaturalLanguageFeedback({
        kind: "error",
        text: errorMessages.join(" "),
      });
      return;
    }

    setNaturalLanguageFeedback({
      kind: "info",
      text: `Applied ${infoMessages.join(", ")} from natural language.`,
    });
  }

  const currentParent = (goals ?? []).find((g) => g.id === appliedParentId);

  return (
    <Dialog
      open={newGoalOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          closeNewGoal();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn("p-0 gap-0", expanded ? "sm:max-w-2xl" : "sm:max-w-lg")}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {selectedCompany && (
              <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-medium">
                {selectedCompany.name.slice(0, 3).toUpperCase()}
              </span>
            )}
            <span className="text-muted-foreground/60">&rsaquo;</span>
            <span>{newGoalDefaults.parentId ? "New sub-goal" : "New goal"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() => { reset(); closeNewGoal(); }}
            >
              <span className="text-lg leading-none">&times;</span>
            </Button>
          </div>
        </div>

        <div className="px-4 pt-3 pb-2 border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Natural language input</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={applyNaturalLanguageInput}
              disabled={!naturalLanguageInput.trim()}
            >
              Apply
            </Button>
          </div>
          <textarea
            className="mt-2 w-full rounded-md border border-border bg-transparent px-2.5 py-2 text-sm outline-none resize-y min-h-16 placeholder:text-muted-foreground/50"
            placeholder="e.g. 新規顧客獲得KPIの達成。レベルはteam、状態はactive、親は売上目標。"
            value={naturalLanguageInput}
            onChange={(event) => setNaturalLanguageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                applyNaturalLanguageInput();
              }
            }}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Supports free text and labeled formats like Title/Level/Status/Parent.
          </p>
          {naturalLanguageFeedback && (
            <p
              className={cn(
                "mt-1 text-xs",
                naturalLanguageFeedback.kind === "error"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
              )}
            >
              {naturalLanguageFeedback.text}
            </p>
          )}
        </div>

        {/* Title */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <input
            className="w-full text-lg font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50"
            placeholder="Goal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                descriptionEditorRef.current?.focus();
              }
            }}
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="px-4 pb-2">
          <MarkdownEditor
            ref={descriptionEditorRef}
            value={description}
            onChange={setDescription}
            placeholder="Add description..."
            bordered={false}
            contentClassName={cn("text-sm text-muted-foreground", expanded ? "min-h-[220px]" : "min-h-[120px]")}
            imageUploadHandler={async (file) => {
              const asset = await uploadDescriptionImage.mutateAsync(file);
              return asset.contentPath;
            }}
          />
        </div>

        {/* Property chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-border flex-wrap">
          {/* Status */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/50 transition-colors">
                <StatusBadge status={status} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {GOAL_STATUSES.map((s) => (
                <button
                  key={s}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50 capitalize",
                    s === status && "bg-accent"
                  )}
                  onClick={() => { setStatus(s); setStatusOpen(false); }}
                >
                  {s}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Level */}
          <Popover open={levelOpen} onOpenChange={setLevelOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/50 transition-colors">
                <Layers className="h-3 w-3 text-muted-foreground" />
                {levelLabels[level] ?? level}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {GOAL_LEVELS.map((l) => (
                <button
                  key={l}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50",
                    l === level && "bg-accent"
                  )}
                  onClick={() => { setLevel(l); setLevelOpen(false); }}
                >
                  {levelLabels[l] ?? l}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Parent goal */}
          <Popover open={parentOpen} onOpenChange={setParentOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/50 transition-colors">
                <Target className="h-3 w-3 text-muted-foreground" />
                {currentParent ? currentParent.title : "Parent goal"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <button
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50",
                  !appliedParentId && "bg-accent"
                )}
                onClick={() => { setParentId(""); setParentOpen(false); }}
              >
                No parent
              </button>
              {(goals ?? []).map((g) => (
                <button
                  key={g.id}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50 truncate",
                    g.id === appliedParentId && "bg-accent"
                  )}
                  onClick={() => { setParentId(g.id); setParentOpen(false); }}
                >
                  {g.title}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-2.5 border-t border-border">
          <Button
            size="sm"
            disabled={!title.trim() || createGoal.isPending}
            onClick={handleSubmit}
          >
            {createGoal.isPending ? "Creating…" : newGoalDefaults.parentId ? "Create sub-goal" : "Create goal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
