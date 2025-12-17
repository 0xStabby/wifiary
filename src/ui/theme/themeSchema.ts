import { z } from "zod";

export const ThemeSchema = z.object({
  name: z.string().min(1),
  colors: z.object({
    bg: z.string().min(1),
    panel: z.string().min(1),
    panel2: z.string().min(1),
    fg: z.string().min(1),
    muted: z.string().min(1),
    border: z.string().min(1),
    primary: z.string().min(1),
    primaryFg: z.string().min(1),
    danger: z.string().min(1),
    warning: z.string().min(1),
    success: z.string().min(1)
  })
});

export type Theme = z.infer<typeof ThemeSchema>;

