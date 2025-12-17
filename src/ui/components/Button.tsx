import { type ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    className ?? ""
  ]
    .join(" ")
    .trim();
  return <button className={classes} {...props} />;
}

