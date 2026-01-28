import type { ExpressionFunction } from "./types";

/**
 * Built-in functions for expression evaluation
 */
export const builtInFunctions: Record<string, ExpressionFunction> = {
  // Date/time functions
  now: () => new Date().toISOString(),

  timestamp: () => Date.now(),

  formatDate: (args, _context) => {
    if (args.length === 0) {
      return new Date().toISOString();
    }
    const date = args[0] ? new Date(String(args[0])) : new Date();
    const format = args[1] ? String(args[1]) : "YYYY-MM-DD";

    // Simple date formatting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return format
      .replace("YYYY", String(year))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds)
      .replace("HHmmss", `${hours}${minutes}${seconds}`);
  },

  // String functions
  uuid: () => {
    // Simple UUID v4 implementation
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  concat: (args) => {
    return args.map(String).join("");
  },

  join: (args) => {
    if (args.length < 2) {
      return args[0] ? String(args[0]) : "";
    }
    const separator = String(args.at(-1));
    const values = args.slice(0, -1).map(String);
    return values.join(separator);
  },

  // Math functions
  add: (args) => {
    return args.reduce((sum, val) => {
      const num = Number(val) || 0;
      return Number(sum) + num;
    }, 0);
  },

  subtract: (args) => {
    if (args.length === 0) {
      return 0;
    }
    if (args.length === 1) {
      return -Number(args[0]) || 0;
    }
    const first = Number(args[0]) || 0;
    return args.slice(1).reduce<number>((result, val) => {
      return result - (Number(val) || 0);
    }, first);
  },

  multiply: (args) => {
    return args.reduce((product, val) => {
      const num = Number(val) || 1;
      return Number(product) * num;
    }, 1);
  },

  divide: (args) => {
    if (args.length < 2) {
      return args[0] ? Number(args[0]) : 0;
    }
    const first = Number(args[0]) || 0;
    return args.slice(1).reduce<number>((result, val) => {
      const divisor = Number(val) || 1;
      return result / divisor;
    }, first);
  },

  // Comparison functions
  equals: (args) => {
    if (args.length < 2) {
      return false;
    }
    return String(args[0]) === String(args[1]);
  },

  notEquals: (args) => {
    if (args.length < 2) {
      return true;
    }
    return String(args[0]) !== String(args[1]);
  },

  greaterThan: (args) => {
    if (args.length < 2) {
      return false;
    }
    return Number(args[0]) > Number(args[1]);
  },

  lessThan: (args) => {
    if (args.length < 2) {
      return false;
    }
    return Number(args[0]) < Number(args[1]);
  },

  greaterThanOrEqual: (args) => {
    if (args.length < 2) {
      return false;
    }
    return Number(args[0]) >= Number(args[1]);
  },

  lessThanOrEqual: (args) => {
    if (args.length < 2) {
      return false;
    }
    return Number(args[0]) <= Number(args[1]);
  },

  // Logical functions
  and: (args) => {
    return args.every((val) => Boolean(val));
  },

  or: (args) => {
    return args.some((val) => Boolean(val));
  },

  not: (args) => {
    return !args[0];
  },

  // Array functions
  length: (args) => {
    if (args.length === 0) {
      return 0;
    }
    const value = args[0];
    if (Array.isArray(value)) {
      return value.length;
    }
    if (typeof value === "string") {
      return value.length;
    }
    return 0;
  },

  // Type checking
  isString: (args) => {
    return typeof args[0] === "string";
  },

  isNumber: (args) => {
    return typeof args[0] === "number" && !Number.isNaN(args[0]);
  },

  isBoolean: (args) => {
    return typeof args[0] === "boolean";
  },

  isArray: (args) => {
    return Array.isArray(args[0]);
  },

  isObject: (args) => {
    return (
      typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0])
    );
  },

  // Conditional
  if: (args) => {
    if (args.length < 2) {
      return undefined;
    }
    const condition = Boolean(args[0]);
    return condition ? args[1] : args[2] || undefined;
  },

  // Coalesce
  coalesce: (args) => {
    for (const arg of args) {
      if (arg !== null && arg !== undefined) {
        return arg;
      }
    }
    return undefined;
  },

  // Helper functions
  slugify: (args) => {
    if (!args[0]) {
      return "";
    }
    return String(args[0])
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  },
};
