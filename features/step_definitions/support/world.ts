import { World, setWorldConstructor } from '@cucumber/cucumber';
import { render } from 'ink-testing-library';
import * as chai from 'chai';
import { StdoutWriter } from '../../../src/components/LogViewer.js';

export class KfcWorld extends World {
  public rendered?: ReturnType<typeof render>;
  public clipboardContent: string = '';
  public logLines: string[] = [];
  public mockErrors: any[] = [];
  public deploymentName: string = '';
  public inputHandler?: (input: string, key: any) => void;
  public stdoutOutput: string = ''; // Captured stdout writes
  public stdoutWriter?: StdoutWriter; // Mock stdout writer for DI
  
  constructor(options: any) {
    super(options);
    // Create mock stdout writer that captures all writes
    // Handle ANSI escape codes like \x1Bc (clear screen) to simulate real terminal behavior
    this.stdoutWriter = {
      write: (text: string) => {
        // Handle clear screen escape sequence (\x1Bc or ESC c)
        if (text.includes('\x1Bc') || text.includes('\u001Bc')) {
          // Clear the output (simulate terminal clear)
          this.stdoutOutput = '';
          // Remove the escape sequence from the text
          text = text.replace(/\x1Bc/g, '').replace(/\u001Bc/g, '');
        }
        this.stdoutOutput += text;
      }
    };
  }

  public getOutput(): string {
    // Combine both Ink-rendered output and captured stdout
    const inkOutput = this.rendered?.lastFrame() || '';
    return inkOutput + this.stdoutOutput;
  }

  public clearStdout(): void {
    this.stdoutOutput = '';
  }
}

setWorldConstructor(KfcWorld);
