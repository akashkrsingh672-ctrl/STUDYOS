import { completedQuestionsOf } from "@/lib/planLogic";
import type { Todo } from "@/lib/types";

const KIND_LABEL: Record<Todo["kind"], string> = {
  lecture: "LECTURE",
  pyq: "PYQ",
  custom: "TASK",
};

function amountText(todo: Todo): string {
  if (todo.kind === "lecture") return "1 lecture";
  if (todo.kind === "pyq") {
    const done = completedQuestionsOf(todo);
    if (done > 0 && done < todo.amount) return `${done} of ${todo.amount} questions`;
    return `${todo.amount} question${todo.amount === 1 ? "" : "s"}`;
  }
  return "Study task";
}

interface TodoRowProps {
  todo: Todo;
  onToggle: () => void;
  /** Question rows only: log partial progress (0..amount). */
  onProgress?: (completedCount: number) => void;
}

/**
 * Checklist row using the design's PYQ row construction: 47px, 10px radius,
 * 20px checkbox, success tint once complete.
 */
export function TodoRow({ todo, onToggle, onProgress }: TodoRowProps) {
  const done = todo.completed;
  const completedQuestions = completedQuestionsOf(todo);
  const stepButton = (disabled: boolean) =>
    `flex size-[24px] items-center justify-center text-[12px] leading-none transition-colors ${
      disabled ? "cursor-not-allowed text-muted/40" : "text-accent hover:bg-surface-raised"
    }`;
  return (
    <div
      className={`flex h-[47px] shrink-0 items-center gap-3 rounded-control px-3 ${
        done ? "bg-success-soft" : "bg-surface-subtle"
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`${done ? "Uncheck" : "Check"} ${todo.label}`}
        onClick={onToggle}
        className={`flex size-[20px] shrink-0 items-center justify-center rounded-checkbox border transition-colors ${
          done
            ? "border-success-border bg-success-check text-success"
            : "border-border-check bg-surface-muted text-transparent hover:border-accent"
        }`}
      >
        <span className="text-[13px] font-semibold leading-none">✓</span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span
          className={`truncate text-[12px] font-medium ${
            done ? "text-muted line-through" : "text-primary"
          }`}
        >
          {todo.label}
        </span>
        <span className="truncate text-[10px] text-muted">
          {todo.chapterTitle ? `${todo.subject} · ${todo.chapterTitle} · ` : ""}
          {amountText(todo)}
        </span>
      </div>

      {todo.kind === "pyq" ? (
        <div
          role="group"
          aria-label={`Questions completed for ${todo.label}`}
          className="flex h-[26px] shrink-0 items-center overflow-hidden rounded-stepper border border-border-medium bg-surface"
        >
          <button
            type="button"
            aria-label={`One fewer question done for ${todo.label}`}
            disabled={completedQuestions <= 0}
            onClick={() => onProgress?.(completedQuestions - 1)}
            className={stepButton(completedQuestions <= 0)}
          >
            −
          </button>
          <span
            aria-live="polite"
            className="min-w-[44px] px-1 text-center text-[11px] font-semibold text-primary"
          >
            {completedQuestions}/{todo.amount}
          </span>
          <button
            type="button"
            aria-label={`One more question done for ${todo.label}`}
            disabled={completedQuestions >= todo.amount}
            onClick={() => onProgress?.(completedQuestions + 1)}
            className={stepButton(completedQuestions >= todo.amount)}
          >
            +
          </button>
        </div>
      ) : (
        <span className="shrink-0 rounded-pill border border-border-medium px-[8px] py-[3px] text-[9px] font-semibold tracking-wider text-muted">
          {KIND_LABEL[todo.kind]}
        </span>
      )}
    </div>
  );
}

export function TodoList({
  todos,
  onToggle,
  onProgress,
}: {
  todos: Todo[];
  onToggle: (todoId: string) => void;
  onProgress?: (todoId: string, completedCount: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {todos.map((todo) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          onToggle={() => onToggle(todo.id)}
          onProgress={
            onProgress ? (count) => onProgress(todo.id, count) : undefined
          }
        />
      ))}
    </div>
  );
}

export default TodoList;
