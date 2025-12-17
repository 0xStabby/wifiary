import { forwardRef, type InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    const classes = [styles.input, className ?? ""].join(" ").trim();
    return <input ref={ref} className={classes} {...props} />;
  }
);

