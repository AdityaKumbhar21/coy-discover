import { z } from "zod";

function isDatabaseUrl(value: string): boolean {
  if (value.startsWith("file:")) {
    const path = value.slice("file:".length);
    return (
      path.trim().length > 0 &&
      !path.includes(":memory:") &&
      !path.includes("?") &&
      !path.includes("#")
    );
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "libsql:" &&
      url.hostname.length > 0 &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

const environmentSchema = z
  .object({
    BACKEND_HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("127.0.0.1"),
    BACKEND_PORT: z
      .string()
      .regex(/^[1-9]\d*$/)
      .default("4000")
      .transform(Number)
      .pipe(z.number().int().min(1).max(65535)),
    DATABASE_URL: z
      .string()
      .trim()
      .refine(isDatabaseUrl)
      .default("file:./coy.sqlite"),
    DATABASE_AUTH_TOKEN: z.string().trim().min(1).optional(),
    DEMO_USER_ID: z
      .string()
      .regex(/^[1-9]\d*$/)
      .default("1")
      .transform(Number)
      .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
  })
  .refine(
    (env) =>
      !env.DATABASE_URL.startsWith("libsql:") ||
      Boolean(env.DATABASE_AUTH_TOKEN),
  );

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: unknown): Environment {
  const result = environmentSchema.safeParse(input);

  if (!result.success) {
    // Zod issues can contain supplied values; never print them or credentials.
    throw new Error(
      "Invalid server configuration. Check BACKEND_HOST, BACKEND_PORT, DATABASE_URL, DATABASE_AUTH_TOKEN, and DEMO_USER_ID.",
    );
  }

  return result.data;
}
