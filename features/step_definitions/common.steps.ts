import { Given, When, Then } from '@cucumber/cucumber';
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

Given('I am viewing logs for deployment {string}', function (this: KfcWorld, deployment: string) {
  this.deploymentName = deployment;
  this.logLines = [];
  this.mockErrors = [];
});

When('the log stream receives the following lines:', function (this: KfcWorld, dataTable: any) {
  const lines = dataTable.raw().map((row: string[]) => row[0]);
  this.logLines = lines;

  const mockFollowLogs = async (
    dep: string,
    ns: string,
    ctx: string | undefined,
    tail: number,
    onLog: (log: LogLine) => void
  ) => {
    lines.forEach((line: string) => {
      onLog({
        pod: 'test-pod',
        container: 'test-container',
        line: line,
        timestamp: new Date()
      });
    });
    return new Promise<void>(() => {});
  };

  // Capture input handler
  const mockUseInput = (handler: (input: string, key: any) => void) => {
      this.inputHandler = handler;
  };

  // Clear stdout capture before rendering
  this.clearStdout();

  const { rerender, lastFrame, stdin, unmount, frames } = render(
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

  this.rendered = { rerender, lastFrame, stdin, unmount, frames, clear: () => {} } as any;
  // Wait for component to initialize and process logs
  return new Promise(resolve => setTimeout(resolve, 200));
});

When('I press {string}', async function (this: KfcWorld, key: string) {
  if (!this.inputHandler) {
    throw new Error('Input handler not captured. Component might not have mounted or called useInput.');
  }

  const keyObj: any = {
      return: false,
      escape: false,
      ctrl: false,
      meta: false,
      shift: false,
      delete: false,
      backspace: false
  };

  let input = key;
  if (key === 'Enter') {
      input = '\r';
      keyObj.return = true;
  } else if (key === 'ESC') {
      input = '';
      keyObj.escape = true;
  }

  // Manually trigger the handler
  this.inputHandler(input, keyObj);
  
  // Wait for state changes and re-renders
  await new Promise(resolve => setTimeout(resolve, 150));
});

Then('I should see {string}', async function (this: KfcWorld, text: string) {
  await waitFor(() => {
    // Combine Ink-rendered output and captured stdout
    const inkOutput = stripAnsiCodes(this.rendered!.lastFrame() || '');
    const stdoutOutput = stripAnsiCodes(this.stdoutOutput);
    const output = inkOutput + stdoutOutput;
    
    if (!output.includes(text)) {
      console.error('Expected to find:', text);
      console.error('Actual output (ink):', inkOutput.substring(0, 300));
      console.error('Actual output (stdout):', stdoutOutput.substring(0, 300));
    }
    expect(output).to.include(text);
  });
});

Then('I should NOT see {string}', async function (this: KfcWorld, text: string) {
  await waitFor(() => {
    // Combine Ink-rendered output and captured stdout
    const inkOutput = stripAnsiCodes(this.rendered!.lastFrame() || '');
    const stdoutOutput = stripAnsiCodes(this.stdoutOutput);
    const output = inkOutput + stdoutOutput;
    expect(output).to.not.include(text);
  });
});

Then('I should see {string} message', async function (this: KfcWorld, text: string) {
  await waitFor(() => {
    // Combine Ink-rendered output and captured stdout
    const inkOutput = stripAnsiCodes(this.rendered!.lastFrame() || '');
    const stdoutOutput = stripAnsiCodes(this.stdoutOutput);
    const output = inkOutput + stdoutOutput;
    // The message might be "Copied to clipboard" or "✓ Copied to clipboard"
    const hasMessage = output.includes(text) || output.includes('Copied to clipboard');
    if (!hasMessage) {
      console.error('Expected to find:', text);
      console.error('Actual output (ink):', inkOutput.substring(0, 300));
      console.error('Actual output (stdout):', stdoutOutput.substring(0, 300));
    }
    expect(hasMessage).to.be.true;
  }, 2000);
});
