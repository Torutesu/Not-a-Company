/**
 * Canonical status & priority color definitions.
 *
 * Every component that renders a status indicator (StatusIcon, StatusBadge,
 * agent status dots, etc.) should import from here so colors stay consistent.
 *
 * All colors reference CSS variables defined in index.css.
 * Never use Tailwind default color classes (e.g. blue-500, green-400) here.
 */

// ---------------------------------------------------------------------------
// Issue status colors
// ---------------------------------------------------------------------------

/** StatusIcon circle: text + border classes */
export const issueStatusIcon: Record<string, string> = {
  backlog:     "text-muted-foreground border-muted-foreground",
  todo:        "text-[var(--status-blue-fg)] border-[var(--status-blue-fg)]",
  in_progress: "text-[var(--status-yellow-fg)] border-[var(--status-yellow-fg)]",
  in_review:   "text-[var(--status-violet-fg)] border-[var(--status-violet-fg)]",
  done:        "text-[var(--status-green-fg)] border-[var(--status-green-fg)]",
  cancelled:   "text-muted-foreground border-muted-foreground",
  blocked:     "text-[var(--status-red-fg)] border-[var(--status-red-fg)]",
};

export const issueStatusIconDefault = "text-muted-foreground border-muted-foreground";

/** Text-only color for issue statuses (dropdowns, labels) */
export const issueStatusText: Record<string, string> = {
  backlog:     "text-muted-foreground",
  todo:        "text-[var(--status-blue-fg)]",
  in_progress: "text-[var(--status-yellow-fg)]",
  in_review:   "text-[var(--status-violet-fg)]",
  done:        "text-[var(--status-green-fg)]",
  cancelled:   "text-muted-foreground",
  blocked:     "text-[var(--status-red-fg)]",
};

export const issueStatusTextDefault = "text-muted-foreground";

// ---------------------------------------------------------------------------
// Badge colors — used by StatusBadge for all entity types
// ---------------------------------------------------------------------------

export const statusBadge: Record<string, string> = {
  // Agent statuses
  active:   "bg-[var(--status-green-bg)] text-[var(--status-green-fg)]",
  running:  "bg-[var(--status-cyan-bg)] text-[var(--status-cyan-fg)]",
  paused:   "bg-[var(--status-orange-bg)] text-[var(--status-orange-fg)]",
  idle:     "bg-[var(--status-yellow-bg)] text-[var(--status-yellow-fg)]",
  archived: "bg-muted text-muted-foreground",

  // Goal statuses
  planned:   "bg-muted text-muted-foreground",
  achieved:  "bg-[var(--status-green-bg)] text-[var(--status-green-fg)]",
  completed: "bg-[var(--status-green-bg)] text-[var(--status-green-fg)]",

  // Run statuses
  failed:     "bg-[var(--status-red-bg)] text-[var(--status-red-fg)]",
  timed_out:  "bg-[var(--status-orange-bg)] text-[var(--status-orange-fg)]",
  succeeded:  "bg-[var(--status-green-bg)] text-[var(--status-green-fg)]",
  error:      "bg-[var(--status-red-bg)] text-[var(--status-red-fg)]",
  terminated: "bg-[var(--status-red-bg)] text-[var(--status-red-fg)]",
  pending:    "bg-[var(--status-yellow-bg)] text-[var(--status-yellow-fg)]",

  // Approval statuses
  pending_approval:   "bg-[var(--status-amber-bg)] text-[var(--status-amber-fg)]",
  revision_requested: "bg-[var(--status-amber-bg)] text-[var(--status-amber-fg)]",
  approved:           "bg-[var(--status-green-bg)] text-[var(--status-green-fg)]",
  rejected:           "bg-[var(--status-red-bg)] text-[var(--status-red-fg)]",

  // Issue statuses — consistent hues with issueStatusIcon above
  backlog:     "bg-muted text-muted-foreground",
  todo:        "bg-[var(--status-blue-bg)] text-[var(--status-blue-fg)]",
  in_progress: "bg-[var(--status-yellow-bg)] text-[var(--status-yellow-fg)]",
  in_review:   "bg-[var(--status-violet-bg)] text-[var(--status-violet-fg)]",
  blocked:     "bg-[var(--status-red-bg)] text-[var(--status-red-fg)]",
  done:        "bg-[var(--status-green-bg)] text-[var(--status-green-fg)]",
  cancelled:   "bg-muted text-muted-foreground",
};

export const statusBadgeDefault = "bg-muted text-muted-foreground";

// ---------------------------------------------------------------------------
// Agent status dot — solid background for small indicator dots
// ---------------------------------------------------------------------------

export const agentStatusDot: Record<string, string> = {
  running:          "bg-[var(--dot-running)] animate-pulse",
  active:           "bg-[var(--dot-active)]",
  paused:           "bg-[var(--dot-paused)]",
  idle:             "bg-[var(--dot-paused)]",
  pending_approval: "bg-[var(--dot-amber)]",
  error:            "bg-[var(--dot-error)]",
  archived:         "bg-[var(--dot-neutral)]",
};

export const agentStatusDotDefault = "bg-[var(--dot-neutral)]";

// ---------------------------------------------------------------------------
// Priority colors
// ---------------------------------------------------------------------------

export const priorityColor: Record<string, string> = {
  critical: "text-[var(--priority-critical)]",
  high:     "text-[var(--priority-high)]",
  medium:   "text-[var(--priority-medium)]",
  low:      "text-[var(--priority-low)]",
};

export const priorityColorDefault = "text-[var(--priority-medium)]";
