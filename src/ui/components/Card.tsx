import { type PropsWithChildren } from "react";
import styles from "./Card.module.css";

export function Card({ children }: PropsWithChildren) {
  return <div className={styles.card}>{children}</div>;
}

