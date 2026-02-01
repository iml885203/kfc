import { Given, When, Then, After } from '@cucumber/cucumber';
import { expect } from 'chai';
import React from 'react';
import { render } from 'ink-testing-library';
import LogViewer from '../../src/components/LogViewer.js';
import { KfcWorld } from './support/world.js';
import { LogLine } from '../../src/k8s/client.js';
import { stripAnsiCodes } from '../../src/utils/clipboard.js';

// Helper for polling assertions
const waitFor = async (condition: () => void, timeout = 2000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            condition();
            return;
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    condition(); // Throw last error
};

// Note: Common steps like "I am viewing logs", "I press", "I should see", "the log stream receives" are in common.steps.ts
// This file only contains error-mode specific steps

Then('I should see {string} in the status bar', async function (this: KfcWorld, text: string) {
  await waitFor(() => {
    // Combine Ink-rendered output and captured stdout
    const inkOutput = stripAnsiCodes(this.rendered!.lastFrame() || '');
    const stdoutOutput = stripAnsiCodes(this.stdoutOutput);
    const output = inkOutput + stdoutOutput;
    
    if (!output.includes(text)) {
      // Debug: log the actual output if assertion fails
      console.error('Expected to find:', text);
      console.error('Actual output (ink):', inkOutput.substring(0, 300));
      console.error('Actual output (stdout):', stdoutOutput.substring(0, 300));
    }
    expect(output).to.include(text);
  }, 2000); // Increase timeout for error mode rendering
});

Then('I should see {string} in the list', async function (this: KfcWorld, text: string) {
  await waitFor(() => {
    // Combine Ink-rendered output and captured stdout
    const inkOutput = stripAnsiCodes(this.rendered!.lastFrame() || '');
    const stdoutOutput = stripAnsiCodes(this.stdoutOutput);
    const output = inkOutput + stdoutOutput;
    expect(output).to.include(text);
  });
});

Given('I see {int} errors in the error list', async function (this: KfcWorld, count: number) {
  if (!this.rendered) {
    // Clear stdout capture before rendering
    this.clearStdout();

    const errors = Array(count).fill(0).map((_, i) => `[ERROR] Error ${i + 1}`);
    const mockFollowLogs = async (
      dep: string, ns: string, ctx: string | undefined, tail: number, onLog: (log: LogLine) => void
    ) => {
      errors.forEach((line: string) => {
        onLog({
          pod: 'test-pod', container: 'test-container', line, timestamp: new Date()
        });
      });
      return new Promise<void>(() => {});
    };

    const mockUseInput = (handler: (input: string, key: any) => void) => {
        this.inputHandler = handler;
    };

    const { rerender, lastFrame, stdin, unmount } = render(
      React.createElement(LogViewer, {
        deployment: this.deploymentName || 'my-api',
        namespace: 'default',
        tail: 100,
        maxRetry: 0,
        timeout: 5,
        followLogs: mockFollowLogs,
        copyToClipboard: async (text: string) => {
          this.clipboardContent = text;
          return true;
        },
        useInputHook: mockUseInput as any,
        stdoutWriter: this.stdoutWriter
      })
    );
    this.rendered = { rerender, lastFrame, stdin, unmount } as any;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
});

// Note: "I should see {string}" and "I should NOT see {string}" are defined in common.steps.ts

Then('I should see the normal log view', async function (this: KfcWorld) {
    await waitFor(() => {
        // Combine Ink-rendered output and captured stdout
        const inkOutput = stripAnsiCodes(this.rendered!.lastFrame() || '');
        const stdoutOutput = stripAnsiCodes(this.stdoutOutput);
        const output = inkOutput + stdoutOutput;
        expect(output).to.not.include('[ERROR MODE]');
    });
});

Given('I am in error mode with the following error:', async function (this: KfcWorld, dataTable: any) {
    const errorLine = dataTable.raw()[0][0];
    const mockFollowLogs = async (
        dep: string, ns: string, ctx: string | undefined, tail: number, onLog: (log: LogLine) => void
    ) => {
        onLog({
            pod: 'test-pod', container: 'test-container', line: errorLine, timestamp: new Date()
        });
        return new Promise<void>(() => {});
    };

    const mockUseInput = (handler: (input: string, key: any) => void) => {
        this.inputHandler = handler;
    };

    const { rerender, lastFrame, stdin, unmount } = render(
        React.createElement(LogViewer, {
            deployment: 'my-api',
            namespace: 'default',
            tail: 100,
            maxRetry: 0,
            timeout: 5,
            followLogs: mockFollowLogs,
            copyToClipboard: async (text: string) => {
                this.clipboardContent = text;
                return true;
            },
            useInputHook: mockUseInput as any,
            stdoutWriter: this.stdoutWriter
        })
    );
    this.rendered = { rerender, lastFrame, stdin, unmount } as any;
    
    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 100));

    // Try to enter error mode with polling retry manually if needed? 
    // Or just robustly wait
    if (this.inputHandler) {
        this.inputHandler('e', { return: false, escape: false, ctrl: false, meta: false, shift: false, delete: false, backspace: false });
        await new Promise(resolve => setTimeout(resolve, 100));
    }
});

Then('the clipboard should contain {string}', function (this: KfcWorld, text: string) {
    expect(this.clipboardContent).to.include(text);
});

// Note: "I should see {string} message" is defined in common.steps.ts

After(function(this: KfcWorld) {
    if (this.rendered) {
        this.rendered.unmount();
    }
});
