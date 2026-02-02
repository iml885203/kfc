#!/usr/bin/env node
import process from 'node:process'
import { render } from 'ink'
import meow from 'meow'
import * as React from 'react'
import App from './components/App.js'
import { loadErrorDetector } from './utils/errorDetectorLoader.js'
import { initErrorDetector } from './utils/initErrorDetector.js'

const cli = meow(
  `
  Usage
    $ kfctl [deployment-name]

  Options
    --namespace, -n  Kubernetes namespace (default: default)
    --context, -c    Kubernetes context
    --tail           Number of lines to show from the end (default: 100)
    --max-retry      Maximum retry attempts (default: 10)
    --timeout        Connection timeout in seconds (default: 10)
    --grep, -g       Filter logs by pattern (regex supported)
    --after, -A      Show N lines after match (default: 0)
    --before, -B     Show N lines before match (default: 0)
    --context, -C    Show N lines before and after match (default: 0)
    --ignore-case, -i  Case-insensitive pattern matching
    --invert, -v     Invert match (show non-matching lines)
    --init-error-detector  Create custom error detector template file
    --version        Show version
    --help, -h       Show help

  Examples
    $ kfctl my-deployment
    $ kfctl -n production my-deployment
    $ kfctl -c staging-cluster -n production my-deployment
    $ kfctl --tail 200 my-deployment
    $ kfctl --grep "ERROR" my-deployment
    $ kfctl -g "user.*login" -A 3 -B 2 my-deployment
    $ kfctl -g "payment" -C 5 my-deployment
    $ kfctl -g "success" -i my-deployment
`,
  {
    importMeta: import.meta,
    flags: {
      namespace: {
        type: 'string',
        shortFlag: 'n',
      },
      context: {
        type: 'string',
        shortFlag: 'c',
      },
      tail: {
        type: 'number',
        default: Number.parseInt(process.env.KFCTL_TAIL_LINES || '100'),
      },
      maxRetry: {
        type: 'number',
        default: Number.parseInt(process.env.KFCTL_MAX_RETRY || '10'),
      },
      timeout: {
        type: 'number',
        default: Number.parseInt(process.env.KFCTL_TIMEOUT || '10'),
      },
      grep: {
        type: 'string',
        shortFlag: 'g',
      },
      after: {
        type: 'number',
        shortFlag: 'A',
        default: 0,
      },
      before: {
        type: 'number',
        shortFlag: 'B',
        default: 0,
      },
      contextLines: {
        type: 'number',
        shortFlag: 'C',
        default: 0,
      },
      ignoreCase: {
        type: 'boolean',
        shortFlag: 'i',
        default: false,
      },
      invert: {
        type: 'boolean',
        shortFlag: 'v',
        default: false,
      },
      initErrorDetector: {
        type: 'boolean',
      },
      version: {
        type: 'boolean',
      },
    },
  },
)

if (cli.flags.initErrorDetector) {
  const result = initErrorDetector()
  console.log(result.message)
  process.exit(result.success ? 0 : 1)
}

const errorDetector = await loadErrorDetector()

const app = render(
  <App
    deploymentName={cli.input[0]}
    namespace={cli.flags.namespace || process.env.KFCTL_NAMESPACE}
    context={cli.flags.context}
    tail={cli.flags.tail}
    maxRetry={cli.flags.maxRetry}
    timeout={cli.flags.timeout}
    grepPattern={cli.flags.grep}
    grepAfter={cli.flags.after}
    grepBefore={cli.flags.before}
    grepContext={cli.flags.contextLines}
    grepIgnoreCase={cli.flags.ignoreCase}
    grepInvert={cli.flags.invert}
    errorDetector={errorDetector}
  />,
)

await app.waitUntilExit()
process.exit(0)
