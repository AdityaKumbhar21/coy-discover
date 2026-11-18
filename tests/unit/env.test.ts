import { describe, expect, it } from "vitest";
import { parseEnvironment } from "@/server/config/env";

describe("server environment validation", () => {
  it("uses local defaults without requiring an environment file", () => {
    expect(parseEnvironment({})).toEqual({
      DATABASE_URL: "file:./coy.sqlite",
      DEMO_USER_ID: 1,
      BACKEND_HOST: "127.0.0.1",
      BACKEND_PORT: 4000,
    });
  });

  it("allows unrelated process variables without exposing them", () => {
    expect(parseEnvironment({ PATH: "/bin", PRIVATE_VALUE: "secret" })).toEqual(
      {
        DATABASE_URL: "file:./coy.sqlite",
        DEMO_USER_ID: 1,
        BACKEND_HOST: "127.0.0.1",
        BACKEND_PORT: 4000,
      },
    );
  });

  it("accepts an explicit local database path and demo identity", () => {
    expect(
      parseEnvironment({
        DATABASE_URL: "file:/tmp/coy.sqlite",
        DEMO_USER_ID: "2",
      }),
    ).toEqual({
      DATABASE_URL: "file:/tmp/coy.sqlite",
      DEMO_USER_ID: 2,
      BACKEND_HOST: "127.0.0.1",
      BACKEND_PORT: 4000,
    });
  });

  it("requires a nonempty token for remote libSQL", () => {
    const DATABASE_URL = "libsql://demo.example.com";
    expect(() => parseEnvironment({ DATABASE_URL })).toThrow(
      "Invalid server configuration",
    );
    expect(() =>
      parseEnvironment({ DATABASE_URL, DATABASE_AUTH_TOKEN: " " }),
    ).toThrow("Invalid server configuration");
    expect(
      parseEnvironment({ DATABASE_URL, DATABASE_AUTH_TOKEN: "test-token" }),
    ).toMatchObject({ DATABASE_URL, DATABASE_AUTH_TOKEN: "test-token" });
  });

  it.each([
    "",
    "file:",
    "file::memory:",
    "file:coy.sqlite?mode=memory",
    "https://demo.example.com",
    "libsql://user:password@demo.example.com",
    "libsql://demo.example.com?authToken=secret",
    "not-a-url",
  ])("rejects unsupported or nonpersistent database URL %s", (DATABASE_URL) => {
    expect(() => parseEnvironment({ DATABASE_URL })).toThrow(
      "Invalid server configuration",
    );
  });

  it.each(["0", "-1", "1.5", " 1", "abc", "9007199254740992", 1])(
    "rejects invalid demo identity %s",
    (DEMO_USER_ID) => {
      expect(() => parseEnvironment({ DEMO_USER_ID })).toThrow(
        "Invalid server configuration",
      );
    },
  );

  it.each(["0", "65536", "1.5", "abc"])(
    "rejects invalid port %s",
    (BACKEND_PORT) => {
      expect(() => parseEnvironment({ BACKEND_PORT })).toThrow(
        "Invalid server configuration",
      );
    },
  );

  it("rejects an unsupported listen host", () => {
    expect(() =>
      parseEnvironment({ BACKEND_HOST: "external.example.com" }),
    ).toThrow("Invalid server configuration");
  });

  it("does not leak credentials or supplied values through validation errors", () => {
    expect(() =>
      parseEnvironment({
        DATABASE_URL: "libsql://private-host.example?token=private-value",
        DATABASE_AUTH_TOKEN: "private-token",
      }),
    ).toThrow(
      new Error(
        "Invalid server configuration. Check BACKEND_HOST, BACKEND_PORT, DATABASE_URL, DATABASE_AUTH_TOKEN, and DEMO_USER_ID.",
      ),
    );
  });
});
