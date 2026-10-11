import type { DatabaseSync } from "node:sqlite";
export type Store = {
  run: (
    sql: string,
    ...args: (string | number)[]
  ) => ReturnType<ReturnType<DatabaseSync["prepare"]>["run"]>;
  all: (
    sql: string,
    ...args: (string | number)[]
  ) => ReturnType<ReturnType<DatabaseSync["prepare"]>["all"]>;
  one: (
    sql: string,
    ...args: (string | number)[]
  ) => ReturnType<ReturnType<DatabaseSync["prepare"]>["get"]>;
  transaction: <T>(fn: () => T) => T;
};
