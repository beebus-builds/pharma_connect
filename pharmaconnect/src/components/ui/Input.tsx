"use client";

import {
  createElement,
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared control chrome.
 *
 * Every form control in the app used to spell out its own ring/shadow/focus
 * classes, and the `Input` primitive's `<label htmlFor={id}>` silently rendered
 * `htmlFor=undefined` whenever a caller forgot `id` — so clicking the label did
 * nothing and the field had no programmatic name. `useId` fixes that class of bug
 * for good: the label is now always wired, whether or not a caller passes `id`.
 */
const controlBase =
  "w-full rounded-xl bg-surface text-fg ring-1 ring-inset ring-line " +
  "shadow-xs transition-[box-shadow,border-color] duration-200 motion-reduce:transition-none " +
  "placeholder:text-fg-subtle " +
  "focus:outline-none focus:ring-2 focus:ring-accent-ring " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface-sunken";

const controlError = "ring-red-500/70 focus:ring-red-500";

interface FieldProps {
  label?: ReactNode;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
  error?: string;
  hint?: ReactNode;
  /** Rendered at the right end of the label row, e.g. a "Forgot password?" link. */
  action?: ReactNode;
  children: (ids: { id?: string; describedBy?: string }) => ReactNode;
  className?: string;
}

/** Label + control + hint/error, with the a11y wiring done once. */
export function Field({ label, hideLabel, error, hint, action, children, className }: FieldProps) {
  const generatedId = useId();
  const id = `${generatedId}-field`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || action) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label
              htmlFor={id}
              className={cn(
                "text-sm font-medium text-fg",
                hideLabel && "sr-only"
              )}
            >
              {label}
            </label>
          )}
          {action}
        </div>
      )}
      {children({ id, describedBy })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const sizeClass = "px-3.5 py-2.5 text-sm";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hideLabel?: boolean;
  error?: string;
  hint?: ReactNode;
  /** Trailing affordance, e.g. a show/hide password button. */
  trailing?: ReactNode;
  leading?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hideLabel, error, hint, trailing, leading, className, id, ...props },
  ref
) {
  const field = (
    ({ id: fieldId, describedBy }: { id?: string; describedBy?: string }) => (
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle [&>svg]:h-4 [&>svg]:w-4">
            {leading}
          </span>
        )}
        <input
          id={id ?? fieldId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            controlBase,
            sizeClass,
            "h-10",
            leading && "pl-10",
            trailing && "pr-11",
            error && controlError,
            className
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </div>
    )
  );

  if (!label && !hint && !error && !trailing) {
    // Bare input: keep the control class list but skip the field scaffolding.
    return field({ id, describedBy: undefined });
  }

  return (
    <Field label={label} hideLabel={hideLabel} error={error} hint={hint}>
      {field}
    </Field>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hideLabel?: boolean;
  error?: string;
  hint?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hideLabel, error, hint, className, rows = 3, id, ...props },
  ref
) {
  const field = (
    ({ id: fieldId, describedBy }: { id?: string; describedBy?: string }) => (
      <textarea
        id={id ?? fieldId}
        ref={ref}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlBase, sizeClass, "resize-y leading-relaxed", error && controlError, className)}
        {...props}
      />
    )
  );

  if (!label && !hint && !error) return field({ id, describedBy: undefined });

  return (
    <Field label={label} hideLabel={hideLabel} error={error} hint={hint}>
      {field}
    </Field>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hideLabel?: boolean;
  error?: string;
  hint?: ReactNode;
}

/**
 * Native `<select>` with a custom chevron.
 *
 * A styled chevron over an unstyled `<select>` keeps the mobile picker (which
 * is what most Nepal traffic uses) instead of the desktop listbox a custom
 * combobox would give up.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hideLabel, error, hint, className, id, children, ...props },
  ref
) {
  const field = (
    ({ id: fieldId, describedBy }: { id?: string; describedBy?: string }) => (
      <div className="relative">
        <select
          id={id ?? fieldId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            controlBase,
            sizeClass,
            "h-10 cursor-pointer appearance-none pr-10",
            error && controlError,
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden="true"
        />
      </div>
    )
  );

  if (!label && !hint && !error) return field({ id, describedBy: undefined });

  return (
    <Field label={label} hideLabel={hideLabel} error={error} hint={hint}>
      {field}
    </Field>
  );
});

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Accessible toggle built on a real checkbox so forms and keyboards work. */
export function Switch({ checked, onChange, label, description, disabled, className, id }: SwitchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return createElement(
    "label",
    {
      htmlFor: inputId,
      className: cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-sunken",
        disabled && "cursor-not-allowed opacity-60",
        className
      ),
    },
    <>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-fg-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "block h-6 w-10 rounded-full bg-line-strong transition-colors duration-200",
            "peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas"
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-spring peer-checked:translate-x-4"
        />
      </span>
    </>
  );
}
