# Implementation Plan: Provider Architecture Refactor

## Overview

This implementation refactors OpenFarm's monolithic provider architecture into a modular, plugin-based system. The approach follows **SURGICAL CHANGES** - we'll build the new system alongside the old one, then migrate incrementally to avoid breaking existing functionality.

**Implementation Strategy:**
1. Build new provider system in parallel to existing executors
2. Migrate one provider at a time to validate the architecture
3. Update OpenFarm SDK to use new system while maintaining backward compatibility
4. Remove old executor system once migration is complete

## Tasks

- [x] 1. Create core provider system interfaces and types
  - Create TypeScript interfaces for Provider, ProviderMetadata, CommunicationStrategy, ResponseParser
  - Define core types for requests, responses, and configuration
  - Set up base directory structure in packages/sdk/src/provider-system/
  - _Requirements: 1.3, 2.1, 3.1, 4.1_

- [x] 1.1 Write property test for provider interfaces
  - **Property 3: Base Provider Inheritance**
  - **Validates: Requirements 1.3, 1.4**

- [ ] 2. Implement Provider Registry with auto-discovery
  - [x] 2.1 Create ProviderRegistry class with registration and discovery methods
    - Implement provider registration, lookup, and metadata management
    - Add support for both manual and automatic provider registration
    - _Requirements: 1.1, 1.2, 9.1, 9.5_

  - [x] 2.2 Write property test for provider registration independence
    - **Property 1: Provider Registration Independence**
    - **Validates: Requirements 1.1, 1.5**

  - [x] 2.3 Write property test for automatic provider discovery
    - **Property 2: Automatic Provider Discovery**
    - **Validates: Requirements 1.2, 9.1, 9.2, 9.3**

- [ ] 3. Implement Provider Factory
  - [x] 3.1 Create ProviderFactory class for provider instantiation
    - Implement factory pattern for creating provider instances
    - Add configuration validation and dependency injection
    - _Requirements: 1.5, 10.1_

  - [x] 3.2 Write property test for provider validation
    - **Property 13: Provider Validation**
    - **Validates: Requirements 9.5**

- [ ] 4. Create reusable Communication Strategies
  - [x] 4.1 Implement HttpCommunicationStrategy for REST API providers
    - Create HTTP strategy with connection reuse and error handling
    - Support for authentication, headers, and request/response handling
    - _Requirements: 2.1, 2.2, 10.3_

  - [x] 4.2 Implement CliCommunicationStrategy for command-line providers
    - Create CLI strategy with process management and output handling
    - Support for working directories, environment variables, and timeouts
    - _Requirements: 2.1, 2.3, 10.3_

  - [x] 4.3 Write property test for strategy reuse
    - **Property 4: Strategy and Parser Reuse**
    - **Validates: Requirements 2.2, 2.3, 3.2, 3.3**

- [ ] 5. Create reusable Response Parsers
  - [x] 5.1 Implement JsonResponseParser for JSON responses
    - Create JSON parser with error handling and validation
    - Support for nested JSON and type safety
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Implement StreamResponseParser for streaming/CLI responses
    - Create streaming parser for line-by-line JSON events
    - Handle mixed content (JSON events + plain text)
    - _Requirements: 3.1, 3.3_

  - [x] 5.3 Write property test for component delegation
    - **Property 5: Component Delegation**
    - **Validates: Requirements 2.5, 3.5, 4.3**

- [ ] 6. Implement Base Provider abstract class
  - [x] 6.1 Create BaseProvider with template method pattern
    - Implement common execution flow: validate → prepare → execute → parse → format
    - Add standardized error handling and logging
    - Provide abstract methods for provider-specific logic
    - _Requirements: 1.3, 1.4, 8.1_

  - [x] 6.2 Write property test for error handling consistency
    - **Property 12: Error Handling Consistency**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ] 7. Implement Configuration Manager
  - [x] 7.1 Create ConfigurationManager with schema validation
    - Implement configuration validation using JSON schema
    - Support for provider-specific configuration extensions
    - Add descriptive error messages for validation failures
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [x] 7.2 Write property test for configuration validation
    - **Property 6: Configuration Validation**
    - **Validates: Requirements 4.2, 4.5**

- [x] 8. Checkpoint - Core system validation
  - Ensure all core interfaces and base classes are working
  - Run all property tests to validate architecture
  - Verify no regressions in existing functionality

- [ ] 9. Migrate DirectAPI provider to new architecture
  - [x] 9.1 Create DirectApiProvider extending BaseProvider
    - Migrate DirectAPIExecutor logic to new provider system
    - Use HttpCommunicationStrategy and JsonResponseParser
    - Keep provider in core SDK (simple provider)
    - _Requirements: 7.4, 1.4_

  - [ ] 9.2 Write property test for provider test isolation
    - **Property 8: Provider Test Isolation**
    - **Validates: Requirements 6.1, 6.5**

  - [ ] 9.3 Write unit tests for DirectApiProvider
    - Test provider-specific logic and edge cases
    - Test integration with communication strategy and parser
    - _Requirements: 6.1_

- [ ] 10. Create separate package for OpenCode provider
  - [x] 10.1 Set up @openfarm/provider-opencode package structure
    - Create new package with proper package.json and TypeScript config
    - Set up build and test scripts following OpenFarm standards
    - _Requirements: 7.1, 7.2_

  - [x] 10.2 Migrate OpenCodeExecutor to OpenCodeProvider
    - Move OpenCode logic to new package extending BaseProvider
    - Use both HttpCommunicationStrategy and CliCommunicationStrategy based on mode
    - Implement custom response parsing for OpenCode's mixed output
    - _Requirements: 1.4, 2.4, 3.4_

  - [ ] 10.3 Write property test for external package loading
    - **Property 11: External Package Loading**
    - **Validates: Requirements 7.3**

  - [ ] 10.4 Write unit tests for OpenCodeProvider
    - Test both local and cloud modes
    - Test HTTP and CLI communication paths
    - Test custom response parsing logic
    - _Requirements: 6.1_

- [ ] 11. Create separate packages for remaining providers
  - [x] 11.1 Create @openfarm/provider-aider package
    - Set up package structure and migrate AiderExecutor
    - Use CliCommunicationStrategy and StreamResponseParser
    - _Requirements: 7.2, 1.4_

  - [x] 11.2 Create @openfarm/provider-claude package
    - Set up package structure and migrate ClaudeCodeExecutor
    - Use appropriate communication strategy based on Claude's API
    - _Requirements: 7.2, 1.4_

  - [ ] 11.3 Write property test for package organization
    - **Property 10: Package Organization**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5**

- [ ] 12. Update OpenFarm SDK to use new provider system
  - [x] 12.1 Modify OpenFarm class to use ProviderRegistry and ProviderFactory
    - Replace createExecutor calls with provider registry lookups
    - Maintain exact same public API (execute, testConnection, setProvider)
    - Add provider auto-discovery during SDK initialization
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 12.2 Write property test for backward compatibility
    - **Property 7: Backward Compatibility**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

  - [ ] 12.3 Write integration tests for SDK with new provider system
    - Test complete workflows with different providers
    - Test provider switching and configuration
    - _Requirements: 5.1_

- [ ] 13. Add testing utilities and mock support
  - [x] 13.1 Create mock implementations for testing
    - Implement MockCommunicationStrategy and MockResponseParser
    - Create test utilities for provider isolation
    - Add support for test-only provider registration
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [ ] 13.2 Write property test for mock support
    - **Property 9: Mock Support**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [ ] 14. Performance optimization and lazy loading
  - [x] 14.1 Implement lazy loading for providers
    - Add lazy loading support to ProviderRegistry
    - Implement provider metadata caching
    - Optimize provider instantiation and resource usage
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

  - [ ] 14.2 Write property test for performance optimization
    - **Property 14: Performance Optimization**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

- [ ] 15. Remove old executor system
  - [x] 15.1 Remove old executor files and factory
    - Delete packages/sdk/src/executors/ directory
    - Remove executor-related exports from SDK
    - Update any remaining references to use new provider system
    - _Requirements: 7.1_

  - [x] 15.2 Update documentation and examples
    - Update README files for affected packages
    - Add examples for new provider system usage
    - Document migration guide for external provider developers
    - _Requirements: 7.1_

- [x] 16. Final checkpoint - Complete system validation
  - Ensure all tests pass, including property-based tests
  - Verify backward compatibility with existing code
  - Run performance benchmarks to ensure no regressions
  - Validate that all requirements are met

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Integration tests ensure end-to-end functionality
- The migration strategy allows for incremental validation and rollback if needed
- Package separation follows OpenFarm's single-responsibility principle
- All new code follows strict TypeScript practices with no `any` types