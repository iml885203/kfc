#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './components/App.js';

const cli = meow(
	`
	Usage
	  $ kfc [deployment-name]

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
	  --version        Show version
	  --help, -h       Show help

	Examples
	  $ kfc my-deployment
	  $ kfc -n production my-deployment
	  $ kfc -c staging-cluster -n production my-deployment
	  $ kfc --tail 200 my-deployment
	  $ kfc --grep "ERROR" my-deployment
	  $ kfc -g "user.*login" -A 3 -B 2 my-deployment
	  $ kfc -g "payment" -C 5 my-deployment
	  $ kfc -g "success" -i my-deployment
`,
	{
		importMeta: import.meta,
		flags: {
			namespace: {
				type: 'string',
				shortFlag: 'n',
				default: process.env.KFC_NAMESPACE || 'default',
			},
			context: {
				type: 'string',
				shortFlag: 'c',
			},
			tail: {
				type: 'number',
				default: parseInt(process.env.KFC_TAIL_LINES || '100'),
			},
			maxRetry: {
				type: 'number',
				default: parseInt(process.env.KFC_MAX_RETRY || '10'),
			},
			timeout: {
				type: 'number',
				default: parseInt(process.env.KFC_TIMEOUT || '10'),
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
			version: {
				type: 'boolean',
			},
		},
	}
);

const app = render(
	<App
		deploymentName={cli.input[0]}
		namespace={cli.flags.namespace}
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
	/>
);

await app.waitUntilExit();
process.exit(0);
