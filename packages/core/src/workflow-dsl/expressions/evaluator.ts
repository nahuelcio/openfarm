import { getContextValue } from "./context";
import { builtInFunctions } from "./functions";
import type { ExpressionContext, ExpressionResult } from "./types";

/**
 * Evaluates an expression string and returns the result
 * Supports:
 * - Variables: ${variableName}
 * - Nested properties: ${workItem.title}
 * - Functions: ${formatDate(now(), "YYYY-MM-DD")}
 * - Operators: ===, !==, >, <, >=, <=, &&, ||, !
 * - Arithmetic: +, -, *, /
 * - Ternary: ${condition ? valueIfTrue : valueIfFalse}
 */
export function evaluateExpression(
  expression: string,
  context: ExpressionContext
): unknown {
  // If expression is not a template string, return as-is
  if (!expression.includes("${")) {
    return expression;
  }

  // Perform multiple passes to handle nested expressions
  let result = expression;
  let previousResult = "";
  let iterations = 0;
  const maxIterations = 10; // Prevent infinite loops

  // Keep evaluating until no more ${...} expressions are found or max iterations reached
  while (
    result.includes("${") &&
    result !== previousResult &&
    iterations < maxIterations
  ) {
    previousResult = result;
    iterations++;

    // Replace all ${...} expressions using a parser that handles nested expressions
    let newResult = "";
    let i = 0;
    while (i < result.length) {
      if (result[i] === "$" && i + 1 < result.length && result[i + 1] === "{") {
        // Found start of expression, find matching closing brace
        let depth = 1;
        let j = i + 2;
        let inString = false;
        let stringChar = "";

        while (j < result.length && depth > 0) {
          const char = result[j];
          const prevChar = j > 0 ? result[j - 1] : "";

          // Handle string literals (including backticks for template strings)
          if (
            (char === '"' || char === "'" || char === "`") &&
            prevChar !== "\\"
          ) {
            if (!inString) {
              inString = true;
              stringChar = char;
            } else if (char === stringChar) {
              inString = false;
              stringChar = "";
            }
            j++;
            continue;
          }

          if (inString) {
            j++;
            continue;
          }

          if (char === "{") {
            depth++;
          } else if (char === "}") {
            depth--;
          }
          j++;
        }

        if (depth === 0) {
          // Found matching closing brace
          const expr = result.slice(i + 2, j - 1); // Extract content between ${ and }
          try {
            const evaluated = evaluateExpressionPart(expr.trim(), context);

            // If result is undefined, it means the variable was not found
            // Return the original expression so it can be resolved later
            if (evaluated === undefined) {
              newResult += result.slice(i, j); // Keep original
            } else {
              // Convert to string, handling null and undefined
              const stringValue =
                evaluated !== null && evaluated !== undefined
                  ? String(evaluated)
                  : "";
              newResult += stringValue;
            }
          } catch (error) {
            // If evaluation fails, keep the original expression
            console.error(
              `[Evaluator] Failed to evaluate expression: "${expr}"`,
              error
            );
            newResult += result.slice(i, j); // Keep original
          }
          i = j;
        } else {
          // No matching brace found, keep as-is
          newResult += result[i];
          i++;
        }
      } else {
        newResult += result[i];
        i++;
      }
    }
    result = newResult;
  }

  // If we still have expressions after max iterations, log a warning
  if (result.includes("${") && iterations >= maxIterations) {
    console.warn(
      `[Evaluator] Maximum iterations reached. Some expressions may not be fully evaluated: ${result.substring(0, 200)}`
    );
  }

  return result;
}

/**
 * Evaluates a single expression part (without ${})
 */
function evaluateExpressionPart(
  expr: string,
  context: ExpressionContext
): unknown {
  // Handle string literals (including template strings with backticks)
  if (
    (expr.startsWith('"') && expr.endsWith('"')) ||
    (expr.startsWith("'") && expr.endsWith("'"))
  ) {
    return expr.slice(1, -1);
  }

  // Handle template strings with backticks (e.g., `text ${var} more text`)
  if (expr.startsWith("`") && expr.endsWith("`")) {
    // Extract the content inside backticks and evaluate any expressions within
    const templateContent = expr.slice(1, -1);
    // Evaluate the template string content recursively to handle nested expressions
    const evaluated = evaluateExpression(templateContent, context);
    return typeof evaluated === "string" ? evaluated : String(evaluated);
  }

  // Handle numbers
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return Number(expr);
  }

  // Handle booleans
  if (expr === "true") {
    return true;
  }
  if (expr === "false") {
    return false;
  }
  if (expr === "null") {
    return null;
  }
  if (expr === "undefined") {
    return undefined;
  }

  // Handle ternary expressions: condition ? valueIfTrue : valueIfFalse
  // This needs to be checked before operators to handle nested expressions correctly
  const ternaryMatch = findTernaryOperator(expr);
  if (ternaryMatch) {
    const { condition, trueValue, falseValue } = ternaryMatch;
    const conditionResult = evaluateExpressionPart(condition.trim(), context);
    const isTruthy = Boolean(conditionResult);

    // Evaluate the selected branch recursively to handle nested expressions
    const selectedValue = isTruthy ? trueValue : falseValue;
    const evaluatedValue = evaluateExpressionPart(
      selectedValue.trim(),
      context
    );

    // If the evaluated value is a string with expressions, evaluate it again
    if (typeof evaluatedValue === "string" && evaluatedValue.includes("${")) {
      return evaluateExpression(evaluatedValue, context);
    }

    return evaluatedValue;
  }

  // Handle function calls: functionName(arg1, arg2, ...)
  const functionMatch = expr.match(/^(\w+)\((.*)\)$/);
  if (functionMatch) {
    const functionName = functionMatch[1] || "";
    const argsString = functionMatch[2] || "";

    // Parse arguments
    const args = parseFunctionArguments(argsString, context);

    // Get function
    const func = builtInFunctions[functionName];
    if (!func) {
      throw new Error(`Unknown function: ${functionName}`);
    }

    return func(args, context);
  }

  // Handle operators: ===, !==, >, <, >=, <=, &&, ||, !
  // This must be checked BEFORE property access to properly handle expressions like:
  // "workItem.defaultBranch || 'main'" where || takes precedence over property access
  const operatorResult = evaluateOperatorExpression(expr, context);
  if (operatorResult !== null) {
    return operatorResult;
  }

  // Handle property access: obj.prop or obj.prop.subprop
  // Only do this if there are no operators in the expression
  if (expr.includes(".")) {
    const value = getContextValue(expr, context);

    // If the value is a string that contains an expression, evaluate it recursively
    if (
      typeof value === "string" &&
      value.includes("${") &&
      value !== expr // Avoid infinite recursion
    ) {
      const evaluated = evaluateExpression(value, context);
      // If the evaluated result is the same as the original value, return it to avoid infinite recursion
      if (typeof evaluated === "string" && evaluated === value) {
        return value;
      }
      return evaluated;
    }

    return value;
  }

  // Handle simple variable access
  const value = getContextValue(expr, context);

  // Check if the variable name itself is stored as a value (common bug from previous versions)
  // If so, treat it as not found so it can be resolved properly
  if (
    value !== undefined &&
    typeof value === "string" &&
    value === expr &&
    context.variables &&
    expr in context.variables &&
    context.variables[expr] === expr
  ) {
    return undefined;
  }

  // If variable is not found, return undefined instead of the variable name
  if (value === undefined) {
    return undefined;
  }

  // If the value is a string that contains an expression, evaluate it recursively
  if (
    typeof value === "string" &&
    value.includes("${") &&
    value !== expr // Avoid infinite recursion if the variable references itself
  ) {
    const evaluated = evaluateExpression(value, context);
    // If the evaluated result is the same as the original value, return it to avoid infinite recursion
    if (typeof evaluated === "string" && evaluated === value) {
      return value;
    }
    return evaluated;
  }

  return value;
}

/**
 * Finds ternary operator in expression, handling nested expressions and template strings
 * Returns null if no ternary operator is found
 */
function findTernaryOperator(expr: string): {
  condition: string;
  trueValue: string;
  falseValue: string;
} | null {
  const _depth = 0;
  let inString = false;
  let stringChar = "";
  let questionMarkIndex = -1;
  let colonIndex = -1;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  // Find the outermost ? and matching :
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    const prevChar = i > 0 ? expr[i - 1] : "";

    // Handle string literals (both single and double quotes, and backticks for template strings)
    if ((char === '"' || char === "'" || char === "`") && prevChar !== "\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = "";
      }
      continue;
    }

    if (inString) {
      continue;
    }

    // Track nested structures
    if (char === "(") {
      parenDepth++;
    }
    if (char === ")") {
      parenDepth--;
    }
    if (char === "[") {
      bracketDepth++;
    }
    if (char === "]") {
      bracketDepth--;
    }
    if (char === "{") {
      braceDepth++;
    }
    if (char === "}") {
      braceDepth--;
    }

    // Only look for ? and : when not inside nested structures
    if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      if (char === "?") {
        if (questionMarkIndex === -1) {
          questionMarkIndex = i;
        }
      } else if (char === ":" && questionMarkIndex !== -1) {
        colonIndex = i;
        break; // Found the matching colon
      }
    }
  }

  if (questionMarkIndex === -1 || colonIndex === -1) {
    return null;
  }

  const condition = expr.slice(0, questionMarkIndex);
  const trueValue = expr.slice(questionMarkIndex + 1, colonIndex);
  const falseValue = expr.slice(colonIndex + 1);

  return {
    condition,
    trueValue,
    falseValue,
  };
}

/**
 * Parses function arguments (handles nested functions and strings)
 */
function parseFunctionArguments(
  argsString: string,
  context: ExpressionContext
): unknown[] {
  if (!argsString.trim()) {
    return [];
  }

  const args: unknown[] = [];
  let current = "";
  let depth = 0;
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    const prevChar = i > 0 ? argsString[i - 1] : "";

    // Handle string literals
    if ((char === '"' || char === "'") && prevChar !== "\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = "";
        current += char;
      } else {
        current += char;
      }
      continue;
    }

    if (inString) {
      current += char;
      continue;
    }

    // Track parentheses depth
    if (char === "(") {
      depth++;
      current += char;
    } else if (char === ")") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      // Argument separator
      args.push(evaluateExpressionPart(current.trim(), context));
      current = "";
    } else {
      current += char;
    }
  }

  // Add last argument
  if (current.trim()) {
    args.push(evaluateExpressionPart(current.trim(), context));
  }

  return args;
}

/**
 * Evaluates operator expressions (===, !==, >, <, >=, <=, &&, ||, !)
 * Returns the result of the operation, or null if no operator was found.
 *
 * For && and ||, follows JavaScript semantics:
 * - || returns the first truthy value or the last value
 * - && returns the first falsy value or the last value
 */
function evaluateOperatorExpression(
  expr: string,
  context: ExpressionContext
): unknown {
  // Logical NOT
  if (expr.startsWith("!")) {
    const operand = evaluateExpressionPart(expr.slice(1).trim(), context);
    return !operand;
  }

  // Comparison operators (return boolean)
  const comparisonOperators: Array<{
    op: string;
    fn: (a: unknown, b: unknown) => boolean;
  }> = [
    { op: "===", fn: (a: unknown, b: unknown) => a === b },
    { op: "!==", fn: (a: unknown, b: unknown) => a !== b },
    { op: ">=", fn: (a: unknown, b: unknown) => Number(a) >= Number(b) },
    { op: "<=", fn: (a: unknown, b: unknown) => Number(a) <= Number(b) },
    { op: ">", fn: (a: unknown, b: unknown) => Number(a) > Number(b) },
    { op: "<", fn: (a: unknown, b: unknown) => Number(a) < Number(b) },
  ];

  // Logical operators (return actual values, following JavaScript semantics)
  const logicalOperators: Array<{
    op: string;
    fn: (a: unknown, b: unknown) => unknown;
  }> = [
    // && returns first falsy value or last value
    { op: "&&", fn: (a: unknown, b: unknown) => (a ? b : a) },
    // || returns first truthy value or last value
    { op: "||", fn: (a: unknown, b: unknown) => (a ? a : b) },
  ];

  // Check comparison operators first
  for (const { op, fn } of comparisonOperators) {
    const index = expr.indexOf(op);
    if (index > 0) {
      const left = expr.slice(0, index).trim();
      const right = expr.slice(index + op.length).trim();
      const leftValue = evaluateExpressionPart(left, context);
      const rightValue = evaluateExpressionPart(right, context);
      return fn(leftValue, rightValue);
    }
  }

  // Check logical operators (return actual values, not booleans)
  for (const { op, fn } of logicalOperators) {
    const index = expr.indexOf(op);
    if (index > 0) {
      const left = expr.slice(0, index).trim();
      const right = expr.slice(index + op.length).trim();
      const leftValue = evaluateExpressionPart(left, context);
      const rightValue = evaluateExpressionPart(right, context);
      return fn(leftValue, rightValue);
    }
  }

  // Arithmetic operators (lower priority)
  const arithmeticOps = [
    { op: "+", fn: (a: unknown, b: unknown) => Number(a) + Number(b) },
    { op: "-", fn: (a: unknown, b: unknown) => Number(a) - Number(b) },
    { op: "*", fn: (a: unknown, b: unknown) => Number(a) * Number(b) },
    { op: "/", fn: (a: unknown, b: unknown) => Number(a) / Number(b) },
  ];

  for (const { op, fn } of arithmeticOps) {
    const index = expr.indexOf(op);
    if (index > 0 && !expr.slice(0, index).includes("=")) {
      // Make sure it's not part of ===, !==, >=, <=
      const left = expr.slice(0, index).trim();
      const right = expr.slice(index + 1).trim();
      const leftValue = evaluateExpressionPart(left, context);
      const rightValue = evaluateExpressionPart(right, context);
      return fn(leftValue, rightValue);
    }
  }

  return null;
}

/**
 * Evaluates an expression and returns typed result
 */
export function evaluateExpressionTyped(
  expression: string,
  context: ExpressionContext
): ExpressionResult {
  const value = evaluateExpression(expression, context);

  let type: ExpressionResult["type"];
  if (value === null) {
    type = "null";
  } else if (value === undefined) {
    type = "undefined";
  } else if (typeof value === "string") {
    type = "string";
  } else if (typeof value === "number") {
    type = "number";
  } else if (typeof value === "boolean") {
    type = "boolean";
  } else if (Array.isArray(value)) {
    type = "array";
  } else if (typeof value === "object") {
    type = "object";
  } else {
    type = "string";
  }

  return { value, type };
}

/**
 * Evaluates a boolean expression
 */
export function evaluateBooleanExpression(
  expression: string,
  context: ExpressionContext
): boolean {
  const result = evaluateExpression(expression, context);
  return Boolean(result);
}
