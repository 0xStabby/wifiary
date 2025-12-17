import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./Select.module.css";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function clampIndex(i: number, len: number) {
  if (len <= 0) return -1;
  if (i < 0) return 0;
  if (i >= len) return len - 1;
  return i;
}

function nextEnabledIndex(options: SelectOption[], start: number, delta: 1 | -1) {
  if (options.length === 0) return -1;
  let i = clampIndex(start, options.length);
  for (let tries = 0; tries < options.length; tries++) {
    const opt = options[i];
    if (!opt?.disabled) return i;
    i = (i + delta + options.length) % options.length;
  }
  return -1;
}

export function Select({
  value,
  options,
  onChange,
  disabled,
  placeholder,
  ariaLabel,
  className
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const triggerClasses = [styles.trigger, className ?? ""].join(" ").trim();

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const selectedIndex = options.findIndex((o) => o.value === value);
    const idx = nextEnabledIndex(options, selectedIndex >= 0 ? selectedIndex : 0, 1);
    setActiveIndex(idx);

    queueMicrotask(() => {
      menuRef.current?.focus();
      const optionEl = menuRef.current?.querySelector<HTMLElement>(`[data-index="${idx}"]`);
      optionEl?.scrollIntoView?.({ block: "nearest" });
    });
  }, [open, options, value]);

  useEffect(() => {
    if (open) return;
    setActiveIndex(-1);
  }, [open]);

  function commitIndex(idx: number) {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      queueMicrotask(() => triggerRef.current?.focus());
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) commitIndex(activeIndex);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = nextEnabledIndex(options, (activeIndex >= 0 ? activeIndex : 0) + 1, 1);
      if (next >= 0) setActiveIndex(next);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = nextEnabledIndex(options, (activeIndex >= 0 ? activeIndex : 0) - 1, -1);
      if (next >= 0) setActiveIndex(next);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      const next = nextEnabledIndex(options, 0, 1);
      if (next >= 0) setActiveIndex(next);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      const next = nextEnabledIndex(options, options.length - 1, -1);
      if (next >= 0) setActiveIndex(next);
    }
  }

  useEffect(() => {
    if (!open) return;
    const idx = clampIndex(activeIndex, options.length);
    const optionEl = menuRef.current?.querySelector<HTMLElement>(`[data-index="${idx}"]`);
    optionEl?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open, options.length]);

  return (
    <div className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClasses}
        onClick={() => (disabled ? null : setOpen((v) => !v))}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span className={styles.value}>{selected?.label ?? placeholder ?? "Select…"}</span>
        <svg className={styles.chevron} viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M2 3.5L5 6.5L8 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={`${id}-listbox`}
          className={styles.menu}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={
            activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined
          }
          onKeyDown={onMenuKeyDown}
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            const active = i === activeIndex;
            const optionClasses = [
              styles.option,
              active ? styles.optionActive : "",
              selected ? styles.optionSelected : ""
            ]
              .join(" ")
              .trim();
            return (
              <button
                key={o.value}
                id={`${id}-opt-${i}`}
                type="button"
                role="option"
                aria-selected={selected}
                className={optionClasses}
                disabled={o.disabled}
                data-index={i}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commitIndex(i)}
              >
                <svg className={styles.check} viewBox="0 0 10 10" aria-hidden="true">
                  {selected ? (
                    <path
                      d="M2 5.2L4.2 7.4L8 3.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </svg>
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
