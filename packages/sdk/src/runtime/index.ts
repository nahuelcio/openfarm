// Runtime System - TypeScript-first Agent Execution
// This module provides the new TypeScript-based runtime system
// that replaces the previous Rust-only execution logic

// Bridge client for Rust-TS communication
export { BridgeClient, bridgeClient } from "./bridge-client";
// Protocol types and validation
export * from "./protocol";
