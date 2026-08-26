import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GraphQLError } from "graphql";
import { mapServiceError } from "@/lib/graphql/map-service-error";

describe("mapServiceError", () => {
  it("maps allowlisted codes", () => {
    assert.throws(
      () => mapServiceError(new Error("UNAUTHORIZED")),
      (e: unknown) =>
        e instanceof GraphQLError &&
        e.message === "Unauthorized" &&
        e.extensions?.code === "UNAUTHORIZED",
    );
    assert.throws(
      () => mapServiceError(new Error("DB_UNAVAILABLE")),
      (e: unknown) =>
        e instanceof GraphQLError &&
        e.message === "Service temporarily unavailable" &&
        e.extensions?.code === "DB_UNAVAILABLE",
    );
  });

  it("masks unknown internal errors", () => {
    assert.throws(
      () => mapServiceError(new Error("relation \"secret_table\" does not exist")),
      (e: unknown) =>
        e instanceof GraphQLError &&
        e.message === "Request failed" &&
        e.extensions?.code === "BAD_REQUEST",
    );
  });

  it("passes through safe validation messages", () => {
    assert.throws(
      () => mapServiceError(new Error("Invalid account")),
      (e: unknown) =>
        e instanceof GraphQLError &&
        e.message === "Invalid account" &&
        e.extensions?.code === "BAD_REQUEST",
    );
  });
});
