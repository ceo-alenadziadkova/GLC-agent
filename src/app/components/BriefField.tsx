import { Circle, Check, CheckCircle, Lightbulb, LockSimple, UserCircle } from '@phosphor-icons/react';
import type { ProductMode } from '../data/auditTypes';
import type { BriefQuestion, BriefResponseEntry } from '../data/briefQuestions';
import { choiceValueNeedsSpecify, INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL } from '@glc/intake-core';
import { Input, Textarea } from '../../design-system/ui';
import { cn } from './ui/utils';

export const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  required: { label: 'Required', className: 'text-destructive' },
  recommended: { label: 'Recommended', className: 'text-warning' },
  optional: { label: 'Optional', className: 'text-success' },
};

const EXCLUSIVE_MULTI_CHOICE_OPTIONS = new Set([
  'None',
  'None / minimal',
  'None currently',
  'Nothing specific yet',
  'Not really online yet',
  'Not ready to run tests yet',
  'No explicit guarantees',
]);

function isExclusiveMultiChoiceOption(option: string): boolean {
  if (option === INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL) return true;
  return EXCLUSIVE_MULTI_CHOICE_OPTIONS.has(option) || /^None(?:\b|\/|\s)/i.test(option);
}

const UNKNOWN_ESCAPE_CHIP = INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL;

function normalizeChoiceComparable(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function choiceValuesEquivalent(left: string, right: string): boolean {
  return normalizeChoiceComparable(left) === normalizeChoiceComparable(right);
}

function friendlyFreeTextPlaceholder(questionId: string): string {
  const byId: Record<string, string> = {
    b1: 'Example: "Families visiting Palma for 3-5 nights, booking 2-4 weeks ahead."',
    c6: 'Example: "People visit but rarely contact us" or "Mobile pages feel slow."',
    c8: 'Add 2-3 competitor names or URLs.',
    f1: 'Example: "Too much manual work and unclear channel performance."',
  };
  return byId[questionId] ?? 'Write what comes to mind first. Short is fine, detailed is even better.';
}

export function BriefField({
  q,
  value,
  onChange,
  onSetUnknown,
  emphasizeClientSource,
  interviewMode,
  otherSpecify,
  onOtherSpecifyChange,
  disabledOptions,
  productMode,
  /** Same length as `q.options`; button text only; `onChange` still receives canonical option strings. */
  optionDisplayLabels,
}: {
  q: BriefQuestion;
  value: string | string[] | number | boolean | null | BriefResponseEntry | undefined;
  onChange: (v: string | string[] | number | null) => void;
  onSetUnknown: () => void;
  /** When true, shows a tag if the entry came from the client (e.g. pre-brief link). */
  emphasizeClientSource?: boolean;
  /** When true, shows consultant_hint coaching prompts and marks answers as consultant-sourced. */
  interviewMode?: boolean;
  /** Current free-text clarification when an "Other / specify" option is selected. */
  otherSpecify?: string;
  /** Callback to update the clarification text. Required to enable the specify input. */
  onOtherSpecifyChange?: (v: string) => void;
  /** Optional set of option labels that must be non-selectable for current mode. */
  disabledOptions?: readonly string[];
  /** Optional product mode for contextual hints. */
  productMode?: ProductMode;
  optionDisplayLabels?: string[];
}) {
  const rawValue = (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value)
    ? value.value
    : value;
  const entrySource = (value && typeof value === 'object' && !Array.isArray(value) && 'source' in value)
    ? (value as BriefResponseEntry).source
    : undefined;
  const badge = PRIORITY_BADGE[q.priority];
  const strVal = (typeof rawValue === 'number' ? String(rawValue) : (rawValue as string) ?? '');
  const arrVal = (Array.isArray(rawValue) ? rawValue : []) as string[];
  const markedUnknown = entrySource === 'unknown';
  /** Universal defer is already a chip on choice questions; hide the duplicate footer control. */
  const deferChipAlreadyInChoices =
    (q.type === 'single_choice' || q.type === 'multi_choice') &&
    Boolean(q.options?.includes(UNKNOWN_ESCAPE_CHIP));
  const showUnknownEscapeFooter = markedUnknown || !deferChipAlreadyInChoices;

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <label className="text-foreground block flex-1 text-sm leading-snug">
          {q.question}
        </label>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 mt-0.5">
          {emphasizeClientSource && entrySource === 'client' && (
            <span
              className="text-info border-info/40 bg-info/10 rounded px-1.5 py-0.5 text-[length:var(--text-2xs)] font-medium"
            >
              Client
            </span>
          )}
          <span
            className={cn('flex items-center gap-0.5 text-[length:var(--text-2xs)] opacity-75', badge.className)}
          >
            <Circle size={6} weight="fill" />
            {badge.label}
          </span>
        </div>
      </div>
      {q.hint && q.type !== 'free_text' && (
        <p className="text-muted-foreground -mt-0.5 text-xs">{q.hint}</p>
      )}
      {q.id === 'f2' && productMode === 'express' && (
        <p className="text-muted-foreground -mt-0.5 text-xs">
          In Pro coverage, deep analysis focuses on selected domains. Marketing and Automation inputs are still captured for prioritization and complete coverage planning.
        </p>
      )}

      {interviewMode && q.consultant_hint && (
        <div
          className="bg-warning/10 border-warning/40 mt-0.5 flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5"
        >
          <Lightbulb size={13} weight="fill" className="text-warning mt-0.5 flex-shrink-0" />
          <p className="text-warning-foreground m-0 text-xs leading-[1.5]">
            {q.consultant_hint}
          </p>
        </div>
      )}

      {q.type === 'free_text' && (
        <div className="space-y-1.5">
          <Textarea
            rows={interviewMode ? 3 : 2}
            value={strVal}
            onChange={e => onChange(e.target.value || null)}
            placeholder={q.hint ?? friendlyFreeTextPlaceholder(q.id)}
            className="bg-muted resize-none text-sm"
          />
          <p className="text-muted-foreground m-0 text-xs">
            Write what comes to mind first. Short is fine, detailed is even better.
          </p>
        </div>
      )}

      {q.type === 'number' && (
        <Input
          type="number"
          value={typeof rawValue === 'number' ? rawValue : ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          className="bg-muted text-sm"
        />
      )}

      {q.type === 'single_choice' && q.options && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((opt, optIdx) => {
              const display =
                optionDisplayLabels &&
                optionDisplayLabels.length === q.options!.length &&
                (optionDisplayLabels[optIdx] ?? '').trim()
                  ? (optionDisplayLabels[optIdx] as string).trim()
                  : opt;
              const isUnknownOpt = opt === UNKNOWN_ESCAPE_CHIP;
              const selected = isUnknownOpt ? markedUnknown : choiceValuesEquivalent(strVal, opt);
              const locked = disabledOptions?.includes(opt) ?? false;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (locked) return;
                    if (isUnknownOpt) {
                      if (markedUnknown) {
                        onChange(null);
                      } else {
                        onSetUnknown();
                      }
                      return;
                    }
                    onChange(selected ? null : opt);
                  }}
                  disabled={locked}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs transition-all',
                    selected ? 'border-info/50 bg-info/10 text-info font-medium' : 'bg-muted text-muted-foreground',
                    locked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer',
                  )}
                >
                  {locked && <LockSimple size={11} weight="bold" className="mr-0.5 inline" />}
                  {display}
                </button>
              );
            })}
          </div>
          {choiceValueNeedsSpecify(strVal) && onOtherSpecifyChange !== undefined && (
            <Input
              type="text"
              value={otherSpecify ?? ''}
              onChange={e => onOtherSpecifyChange(e.target.value)}
              placeholder="Add one short clarification..."
              autoFocus
              className="bg-muted border-info text-sm"
            />
          )}
        </div>
      )}

      {q.type === 'multi_choice' && q.options && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((opt, optIdx) => {
              const display =
                optionDisplayLabels &&
                optionDisplayLabels.length === q.options!.length &&
                (optionDisplayLabels[optIdx] ?? '').trim()
                  ? (optionDisplayLabels[optIdx] as string).trim()
                  : opt;
              const isUnknownOpt = opt === UNKNOWN_ESCAPE_CHIP;
              const selected = isUnknownOpt
                ? markedUnknown
                : arrVal.some(answer => choiceValuesEquivalent(answer, opt));
              const locked = disabledOptions?.includes(opt) ?? false;
              const clickedExclusive = isExclusiveMultiChoiceOption(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (locked) return;
                    if (isUnknownOpt) {
                      if (markedUnknown) {
                        onChange(null);
                      } else {
                        onSetUnknown();
                      }
                      return;
                    }
                    let next: string[];
                    if (selected) {
                      next = arrVal.filter(v => !choiceValuesEquivalent(v, opt));
                    } else if (clickedExclusive) {
                      // "None/Not really..." answers must be exclusive.
                      next = [opt];
                    } else {
                      // Choosing a concrete channel/tool removes exclusive "none" answer.
                      next = [...arrVal.filter(v => !isExclusiveMultiChoiceOption(v)), opt];
                    }
                    onChange(next.length ? next : null);
                  }}
                  disabled={locked}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs transition-all',
                    selected ? 'border-info/50 bg-info/10 text-info font-medium' : 'bg-muted text-muted-foreground',
                    locked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer',
                  )}
                >
                  {locked ? (
                    <LockSimple size={11} weight="bold" className="mr-0.5 inline" />
                  ) : selected ? (
                    <Check size={11} weight="bold" className="mr-0.5 inline" />
                  ) : null}
                  {display}
                </button>
              );
            })}
          </div>
          {choiceValueNeedsSpecify(arrVal) && onOtherSpecifyChange !== undefined && (
            <Input
              type="text"
              value={otherSpecify ?? ''}
              onChange={e => onOtherSpecifyChange(e.target.value)}
              placeholder="Add one short clarification..."
              autoFocus
              className="bg-muted border-info text-sm"
            />
          )}
        </div>
      )}

      {showUnknownEscapeFooter ? (
        <div className="mt-2 space-y-1.5">
          {markedUnknown ? (
            <div
              className="bg-success/10 border-success/40 text-muted-foreground flex flex-wrap items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs leading-snug"
            >
              <CheckCircle className="text-success mt-0.5 h-4 w-4 shrink-0" weight="fill" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-foreground">
                  {interviewMode
                    ? 'Client doesn\'t know — flagged for post-audit follow-up.'
                    : 'Marked as "I don\'t know" — this counts toward progress. You can return and fill this later.'}
                </p>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="text-info cursor-pointer text-xs font-medium underline underline-offset-2"
                >
                  {interviewMode ? 'Clear — enter answer instead' : 'I\'ll answer myself instead'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSetUnknown}
              className="bg-card text-muted-foreground hover:text-foreground hover:border-info flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors"
            >
              {interviewMode
                ? <><UserCircle size={13} className="flex-shrink-0" /> Client doesn&apos;t know — flag for follow-up</>
                : <>I don&apos;t know for now</>}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
