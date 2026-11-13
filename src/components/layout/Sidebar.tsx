"use client";

import ArcGauge from "@/components/dashboard/ArcGauge";
import DailyGoalGauge from "@/components/dashboard/DailyGoalGauge";
import { subjectSeed } from "@/lib/curriculum";
import { formatMediumDate } from "@/lib/date";
import { EXAM_DATE, daysUntilExam } from "@/lib/exam";
import { useStudy } from "@/lib/store";

interface SubjectRingProps {
  label: string;
  value: number;
  tone: "accent" | "success";
}

/** 102px completion ring from the design (Syllabus + PYQ). */
function SubjectRing({ label, value, tone }: SubjectRingProps) {
  const isSuccess = tone === "success";
  return (
    <div className="flex w-[102px] flex-col items-center">
      <ArcGauge
        value={value}
        size={102}
        strokeWidth={9}
        color={isSuccess ? "var(--success)" : "var(--accent)"}
      >
        <span
          className={`font-semibold text-[22px] leading-none ${
            isSuccess ? "text-success" : "text-primary"
          }`}
        >
          {value}%
        </span>
      </ArcGauge>
      <span className="mt-2 text-[11px] text-muted">{label}</span>
    </div>
  );
}

/**
 * Left rail from the design: boards countdown, subject progress (188px daily
 * goal ring + Syllabus / PYQ rings) and the study reminder card. Below the
 * desktop breakpoint the rail collapses and MobileGoalBar takes over.
 */
export default function Sidebar() {
  const { activeSubject, subjectProgress, quote, today, selectedDate, allDoneFor } = useStudy();
  const subject = subjectSeed(activeSubject);
  const progress = subjectProgress(activeSubject);
  const reminder = quote(selectedDate || today);
  const dayComplete = Boolean(today) && allDoneFor(today);
  const daysToExam = daysUntilExam(today);

  return (
    <aside className="hidden w-[284px] flex-shrink-0 flex-col gap-6 pt-6 lg:flex">
      {/* Boards countdown */}
      <div className="rounded-card border border-hairline bg-surface p-6">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
          Boards countdown
        </p>
        <p className="font-display text-[48px] font-bold leading-tight text-primary">
          {daysToExam ?? "—"}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">Days until board exams</p>
        <div className="mt-4 h-px bg-hairline" />
        <p className="mt-3 text-[10px] text-muted">
          Exam date · {formatMediumDate(EXAM_DATE)}
        </p>
      </div>

      {/* Subject progress */}
      <div className="rounded-card border border-hairline bg-surface p-6">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Subject progress
        </p>
        <p className="mt-1 truncate text-[11px] text-muted">
          {activeSubject} · {subject.detail}
        </p>

        <div className="mt-5">
          <DailyGoalGauge />
        </div>

        <div className="my-5 h-px bg-hairline" />

        <div className="flex items-start justify-center gap-[30px]">
          <SubjectRing label="Syllabus" value={progress.syllabusPct} tone="accent" />
          <SubjectRing label="PYQ" value={progress.pyqPct} tone="success" />
        </div>

        <p className="mt-4 text-center text-[10px] text-muted">
          {progress.lecturesCompleted}/{progress.lectures} lectures · subject-wise
        </p>
      </div>

      {/* Study reminder → rotating morale quote */}
      <div
        className={`rounded-card border p-6 ${
          dayComplete ? "border-border-success bg-success-soft" : "border-hairline bg-surface"
        }`}
      >
        <p
          className={`text-[11px] font-medium uppercase tracking-wider ${
            dayComplete ? "text-success" : "text-muted"
          }`}
        >
          {dayComplete ? "Day complete" : "Study reminder"}
        </p>
        <p className="mt-3 font-display text-[16px] font-medium leading-snug text-primary">
          “{reminder.text}”
        </p>
        <p className="mt-2 text-[11px] text-muted">— {reminder.author}</p>
      </div>
    </aside>
  );
}
