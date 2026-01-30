import type { ResponseParser, ProviderResponse } from '@openfarm/sdk';
import type { OpenCodeEvent, OpenCodeExecutionState } from './types';

export class OpenCodeResponseParser implements ResponseParser {
  parse(response: string, context?: Record<string, unknown>): ProviderResponse {
    const verbose = context?.verbose === true;
    const onLog = context?.onLog as ((msg: string) => void) | undefined;
    
    const state: OpenCodeExecutionState = {
      outputText: '',
      totalTokens: 0,
      modifiedFiles: new Set(),
      createdFiles: new Set()
    };

    // Handle streaming JSON events from CLI mode
    if (this.isStreamingResponse(response)) {
      return this.parseStreamingResponse(response, state, verbose, onLog);
    }

    // Handle HTTP API response
    if (this.isHttpResponse(response)) {
      return this.parseHttpResponse(response);
    }

    // Fallback for plain text
    return {
      success: true,
      data: response,
      metadata: {
        tokens: 0,
        files: { modified: [], created: [] }
      }
    };
  }

  private isStreamingResponse(response: string): boolean {
    const lines = response.split('\n').filter(line => line.trim());
    return lines.some(line => {
      try {
        const event = JSON.parse(line);
        return event.type && typeof event.type === 'string';
      } catch {
        return false;
      }
    });
  }

  private isHttpResponse(response: string): boolean {
    try {
      const parsed = JSON.parse(response);
      return parsed.usage || parsed.diff || parsed.id;
    } catch {
      return false;
    }
  }

  private parseStreamingResponse(
    response: string, 
    state: OpenCodeExecutionState, 
    verbose: boolean, 
    onLog?: (msg: string) => void
  ): ProviderResponse {
    const lines = response.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const event: OpenCodeEvent = JSON.parse(line);
        this.handleEvent(event, state, verbose, onLog);
      } catch {
        // Non-JSON line, treat as regular output
        if (onLog) {
          const display = line.length > 56 ? line.slice(0, 53) + '...' : line;
          onLog(display);
        }
      }
    }

    return {
      success: true,
      data: this.formatSummary(state.totalTokens, state.modifiedFiles, state.createdFiles),
      metadata: {
        tokens: state.totalTokens,
        files: {
          modified: Array.from(state.modifiedFiles),
          created: Array.from(state.createdFiles)
        },
        output: state.outputText
      }
    };
  }

  private parseHttpResponse(response: string): ProviderResponse {
    try {
      const data = JSON.parse(response);
      
      if (data.usage && data.diff) {
        // Complete HTTP response with usage and diff
        return {
          success: true,
          data: this.formatHttpOutput(data.usage, data.diff),
          metadata: {
            tokens: data.usage.total_tokens || 0,
            files: {
              modified: data.diff.map((d: any) => d.path),
              created: []
            }
          }
        };
      }

      return {
        success: true,
        data: JSON.stringify(data, null, 2),
        metadata: {
          tokens: data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse HTTP response: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private handleEvent(
    event: OpenCodeEvent,
    state: OpenCodeExecutionState,
    verbose: boolean,
    onLog?: (msg: string) => void
  ): void {
    const { type, part } = event;

    switch (type) {
      case 'text':
        if (part?.text) {
          state.outputText += part.text;
          if (onLog) {
            const lines = part.text.split('\n');
            for (const line of lines) {
              const display = verbose ? line : line.slice(0, 56);
              onLog(`💬 ${display}${!verbose && line.length > 56 ? '...' : ''}`);
            }
          }
        }
        break;

      case 'thinking':
      case 'reasoning': {
        const text = part?.text || event.text;
        if (text && onLog) {
          const display = verbose ? text : text.slice(0, 56);
          onLog(`🧠 ${display}${!verbose && text.length > 56 ? '...' : ''}`);
        }
        break;
      }

      case 'tool_use':
        this.handleToolUse(part, verbose, onLog, state.modifiedFiles, state.createdFiles);
        break;

      case 'step_start':
        if (onLog) {
          onLog(verbose 
            ? `▶️  STEP START: ${event.name || 'unnamed step'}` 
            : '▶️  Starting step...'
          );
        }
        break;

      case 'step_finish':
        if (part?.usage) {
          state.totalTokens = part.usage.total_tokens || 0;
          if (onLog) {
            if (verbose) {
              onLog(`📊 STEP FINISH - Tokens: ${part.usage.total_tokens} (input: ${part.usage.input_tokens}, output: ${part.usage.output_tokens})`);
            } else {
              onLog(`📊 Tokens: ${part.usage.total_tokens}`);
            }
          }
        }
        break;

      case 'error':
        if (onLog) {
          onLog(`❌ Error: ${event.message || event.error || 'Unknown error'}`);
        }
        break;

      case 'system':
        if (event.message && onLog) {
          onLog(`⚙️  ${event.message}`);
        }
        break;

      case 'progress':
        if (event.message && onLog) {
          onLog(`⏳ ${event.message}`);
        }
        break;

      default:
        if (event.message && onLog) {
          onLog(`📋 ${event.message}`);
        }
    }
  }

  private handleToolUse(
    part: any,
    verbose: boolean,
    onLog: ((msg: string) => void) | undefined,
    modifiedFiles: Set<string>,
    createdFiles: Set<string>
  ): void {
    if (!part || !onLog) return;

    const toolName = part.tool;
    const status = part.state?.status;
    const input = part.state?.input;

    const toolLogs: Record<string, string> = {
      edit: `📝 Editing: ${input?.filePath}`,
      write: `🔨 Writing: ${input?.filePath}`,
      read: `📖 Reading: ${input?.filePath}`,
      bash: `💻 $ ${input?.command || ''}`,
      glob: `🔍 Searching: ${input?.pattern}`,
      grep: `🔎 Grepping: ${input?.pattern}`,
    };

    const completionLogs: Record<string, string> = {
      edit: `✅ Edited: ${input?.filePath}`,
      write: `✅ Created: ${input?.filePath}`,
      read: `✅ Read: ${input?.filePath}`,
      bash: '✅ Command completed',
      glob: '✅ Search completed',
      grep: '✅ Search completed',
    };

    if (status === 'pending' || status === 'running') {
      if (toolLogs[toolName]) {
        onLog(toolLogs[toolName]);
      } else if (verbose) {
        onLog(`🔧 TOOL: ${toolName} (${status})\n   Input: ${JSON.stringify(input || {}, null, 2)}`);
      } else {
        onLog(`🔧 Using ${toolName}...`);
      }
    } else if (status === 'completed') {
      if (completionLogs[toolName]) {
        onLog(completionLogs[toolName]);
        if (toolName === 'edit' && input?.filePath) {
          modifiedFiles.add(input.filePath);
        }
        if (toolName === 'write' && input?.filePath) {
          createdFiles.add(input.filePath);
        }
      } else if (verbose) {
        onLog(`✅ TOOL COMPLETED: ${toolName}`);
        if (part.state?.output) {
          onLog(`   Output: ${JSON.stringify(part.state.output, null, 2)}`);
        }
      } else {
        onLog(`✅ ${toolName} completed`);
      }
    } else if (status === 'failed') {
      onLog(`❌ ${toolName} failed: ${part.state?.error || 'Unknown error'}`);
    }
  }

  private formatSummary(
    totalTokens: number,
    modifiedFiles: Set<string>,
    createdFiles: Set<string>
  ): string {
    const summary = [
      'OpenCode execution completed successfully',
      `Tokens used: ${totalTokens}`,
      `Files modified: ${modifiedFiles.size}`,
      `Files created: ${createdFiles.size}`,
    ];

    if (modifiedFiles.size > 0) {
      summary.push('Modified files:');
      for (const file of modifiedFiles) {
        summary.push(`  - ${file}`);
      }
    }

    if (createdFiles.size > 0) {
      summary.push('Created files:');
      for (const file of createdFiles) {
        summary.push(`  - ${file}`);
      }
    }

    return summary.join('\n');
  }

  private formatHttpOutput(usage: any, diff: any[]): string {
    const summary = [
      'OpenCode execution completed successfully',
      `Tokens used: ${usage.total_tokens || 0}`,
      `Files modified: ${diff.length}`,
    ];

    if (diff.length > 0) {
      summary.push('Modified files:');
      for (const file of diff) {
        summary.push(`  - ${file.path} (+${file.additions}/-${file.deletions})`);
      }
    }

    return summary.join('\n');
  }
}