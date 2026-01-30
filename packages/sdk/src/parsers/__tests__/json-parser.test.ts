/**
 * Unit tests for JsonResponseParser.
 * 
 * Tests JSON parsing functionality, error handling, validation,
 * and edge cases for the JsonResponseParser implementation.
 */

import { describe, it, expect } from "vitest";
import { JsonResponseParser } from "../json-parser";
import type { CommunicationResponse } from "../../provider-system/types";

describe("JsonResponseParser", () => {
  describe("Basic JSON Parsing", () => {
    it("should parse valid JSON objects", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: '{"name": "test", "value": 42}',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual({ name: "test", value: 42 });
    });

    it("should parse valid JSON arrays", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: '[1, 2, 3, "test"]',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual([1, 2, 3, "test"]);
    });

    it("should parse nested JSON structures", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: '{"user": {"name": "John", "settings": {"theme": "dark", "notifications": true}}}',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual({
        user: {
          name: "John",
          settings: {
            theme: "dark",
            notifications: true,
          },
        },
      });
    });

    it("should parse JSON with null and boolean values", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: '{"active": true, "inactive": false, "empty": null}',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual({
        active: true,
        inactive: false,
        empty: null,
      });
    });
  });

  describe("Content-Type Validation", () => {
    it("should handle application/json content type", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: '{"test": true}',
        success: true,
      };

      expect(parser.canHandle(response)).toBe(true);
      const result = await parser.parse(response);
      expect(result).toEqual({ test: true });
    });

    it("should handle text/json content type", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        headers: { "Content-Type": "text/json" },
        body: '{"test": true}',
        success: true,
      };

      expect(parser.canHandle(response)).toBe(true);
    });

    it("should handle application/ld+json content type", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        headers: { "Content-Type": "application/ld+json" },
        body: '{"@context": "test"}',
        success: true,
      };

      expect(parser.canHandle(response)).toBe(true);
    });

    it("should handle content type with charset", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: '{"test": true}',
        success: true,
      };

      expect(parser.canHandle(response)).toBe(true);
    });

    it("should reject non-JSON content types", () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        headers: { "Content-Type": "text/plain" },
        body: '{"test": true}',
        success: true,
      };

      expect(parser.canHandle(response)).toBe(false);
    });

    it("should handle case-insensitive header names", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        headers: { "content-type": "application/json" },
        body: '{"test": true}',
        success: true,
      };

      expect(parser.canHandle(response)).toBe(true);
    });

    it("should allow parsing when no Content-Type header is present", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: '{"test": true}',
        success: true,
      };

      expect(parser.canHandle(response)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should throw on malformed JSON by default", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: '{"invalid": json}',
        success: true,
      };

      await expect(parser.parse(response)).rejects.toThrow("Cannot parse response: Response body is not valid JSON");
    });

    it("should return null for malformed JSON when throwOnError is false", async () => {
      const parser = new JsonResponseParser({ throwOnError: false });
      const response: CommunicationResponse = {
        status: 200,
        body: '{"invalid": json}',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toBeNull();
    });

    it("should throw on empty response body by default", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: "",
        success: true,
      };

      await expect(parser.parse(response)).rejects.toThrow("Cannot parse response: Response body is empty");
    });

    it("should return null for empty response when throwOnError is false", async () => {
      const parser = new JsonResponseParser({ throwOnError: false });
      const response: CommunicationResponse = {
        status: 200,
        body: "",
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toBeNull();
    });

    it("should handle whitespace-only response body", async () => {
      const parser = new JsonResponseParser({ throwOnError: false });
      const response: CommunicationResponse = {
        status: 200,
        body: "   \n\t  ",
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toBeNull();
    });

    it("should reject unsuccessful responses", () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 500,
        body: '{"error": "server error"}',
        success: false,
      };

      expect(parser.canHandle(response)).toBe(false);
    });
  });

  describe("Custom Reviver Function", () => {
    it("should use custom reviver function for parsing", async () => {
      const reviver = (key: string, value: unknown) => {
        if (key === "timestamp" && typeof value === "string") {
          return new Date(value);
        }
        return value;
      };

      const parser = new JsonResponseParser({ reviver });
      const response: CommunicationResponse = {
        status: 200,
        body: '{"timestamp": "2023-01-01T00:00:00Z", "data": "test"}',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual({
        timestamp: new Date("2023-01-01T00:00:00Z"),
        data: "test",
      });
    });
  });

  describe("Schema Validation", () => {
    it("should validate against simple schema", async () => {
      const schema = {
        required: ["name", "id"],
      };

      const parser = new JsonResponseParser({ schema, validate: true });
      const response: CommunicationResponse = {
        status: 200,
        body: '{"name": "test", "id": 123}',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual({ name: "test", id: 123 });
    });

    it("should throw when required properties are missing", async () => {
      const schema = {
        required: ["name", "id"],
      };

      const parser = new JsonResponseParser({ schema, validate: true });
      const response: CommunicationResponse = {
        status: 200,
        body: '{"name": "test"}',
        success: true,
      };

      await expect(parser.parse(response)).rejects.toThrow("Required property 'id' is missing");
    });

    it("should skip validation when validate is false", async () => {
      const schema = {
        required: ["name", "id"],
      };

      const parser = new JsonResponseParser({ schema, validate: false });
      const response: CommunicationResponse = {
        status: 200,
        body: '{"name": "test"}',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual({ name: "test" });
    });
  });

  describe("canHandle Method", () => {
    it("should return true for valid JSON responses", () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: '{"valid": true}',
        success: true,
      };

      expect(parser.canHandle(response)).toBe(true);
    });

    it("should return false for invalid JSON", () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: "not json",
        success: true,
      };

      expect(parser.canHandle(response)).toBe(false);
    });

    it("should return false for unsuccessful responses", () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 404,
        body: '{"error": "not found"}',
        success: false,
      };

      expect(parser.canHandle(response)).toBe(false);
    });

    it("should return false for empty body", () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: "",
        success: true,
      };

      expect(parser.canHandle(response)).toBe(false);
    });
  });

  describe("Static Factory Methods", () => {
    it("should create parser with create method", async () => {
      const parser = JsonResponseParser.create({ throwOnError: false });
      const response: CommunicationResponse = {
        status: 200,
        body: "invalid json",
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toBeNull();
    });

    it("should create safe parser that doesn't throw", async () => {
      const parser = JsonResponseParser.createSafe();
      const response: CommunicationResponse = {
        status: 200,
        body: "invalid json",
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toBeNull();
    });

    it("should create parser with schema validation", async () => {
      const schema = { required: ["id"] };
      const parser = JsonResponseParser.createWithSchema(schema);
      const response: CommunicationResponse = {
        status: 200,
        body: '{"name": "test"}',
        success: true,
      };

      await expect(parser.parse(response)).rejects.toThrow("Required property 'id' is missing");
    });
  });

  describe("Type Safety", () => {
    it("should support generic type parameters", async () => {
      interface User {
        name: string;
        id: number;
      }

      const parser = new JsonResponseParser<User>();
      const response: CommunicationResponse = {
        status: 200,
        body: '{"name": "John", "id": 123}',
        success: true,
      };

      const result = await parser.parse(response);
      // TypeScript should infer result as User type
      expect(result.name).toBe("John");
      expect(result.id).toBe(123);
    });
  });

  describe("Parser Properties", () => {
    it("should have correct type identifier", () => {
      const parser = new JsonResponseParser();
      expect(parser.type).toBe("json");
    });
  });

  describe("Edge Cases", () => {
    it("should handle JSON with special characters", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: '{"message": "Hello\\nWorld\\t\\"quoted\\""}',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual({ message: 'Hello\nWorld\t"quoted"' });
    });

    it("should handle large JSON objects", async () => {
      const parser = new JsonResponseParser();
      const largeObject = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `item${i}` })) };
      const response: CommunicationResponse = {
        status: 200,
        body: JSON.stringify(largeObject),
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual(largeObject);
    });

    it("should handle JSON with Unicode characters", async () => {
      const parser = new JsonResponseParser();
      const response: CommunicationResponse = {
        status: 200,
        body: '{"emoji": "🚀", "chinese": "你好", "arabic": "مرحبا"}',
        success: true,
      };

      const result = await parser.parse(response);
      expect(result).toEqual({
        emoji: "🚀",
        chinese: "你好",
        arabic: "مرحبا",
      });
    });
  });
});