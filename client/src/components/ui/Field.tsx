import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn.js';

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

type ControlProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
};

/**
 * Labels the control, links hint/error text to it via `aria-describedby`, and
 * marks invalid state with `aria-invalid` — so screen readers announce
 * validation feedback instead of it being visually-only.
 */
export function Field({ label, htmlFor, required, optional, hint, error, children }: FieldWrapperProps) {
  const hintId = useId();
  const errorId = useId();

  let control: ReactNode = children;
  if (isValidElement(children)) {
    const child = children as ReactElement<ControlProps>;
    const childProps = child.props;
    const injected: ControlProps = {};
    if (!childProps.id) injected.id = htmlFor;
    const describedBy = [childProps['aria-describedby'], error ? errorId : hint ? hintId : null]
      .filter(Boolean)
      .join(' ');
    if (describedBy) injected['aria-describedby'] = describedBy;
    if (error) injected['aria-invalid'] = true;
    if (required) injected['aria-required'] = true;
    control = cloneElement(child, injected);
  }

  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
        {optional && <span className="text-slate font-normal"> (optional)</span>}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="hint text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn('input', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn('select', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn('textarea', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});
