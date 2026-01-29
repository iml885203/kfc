import chalk from 'chalk';

interface ColorPattern {
	pattern: RegExp;
	color: (text: string) => string;
	priority?: number;
}

// ASP.NET Core log format: [13:29:11.454 INF]
const aspNetLogPattern = /\[(\d{2}:\d{2}:\d{2}\.\d+)\s+(INF|ERR|WRN|DBG|TRC|FATAL|ERROR|WARN|WARNING|INFO|DEBUG|TRACE)\]/;

export function colorizeLogLine(line: string): string {
	let result = line;
	
	// Handle ASP.NET Core log format: [13:29:11.454 INF]
	const aspNetMatch = result.match(aspNetLogPattern);
	if (aspNetMatch) {
		const [fullMatch, time, level] = aspNetMatch;
		const coloredTime = chalk.blue(time);
		let coloredLevel;
		
		// Color based on log level
		const upperLevel = level.toUpperCase();
		if (upperLevel.includes('ERR') || upperLevel.includes('FATAL')) {
			coloredLevel = chalk.red.bold(level);
		} else if (upperLevel.includes('WRN') || upperLevel.includes('WARN')) {
			coloredLevel = chalk.yellow.bold(level);
		} else if (upperLevel.includes('INF') || upperLevel.includes('INFO') || upperLevel.includes('SUCCESS')) {
			coloredLevel = chalk.green.bold(level);
		} else if (upperLevel.includes('DBG') || upperLevel.includes('DEBUG')) {
			coloredLevel = chalk.cyan.bold(level);
		} else if (upperLevel.includes('TRC') || upperLevel.includes('TRACE')) {
			coloredLevel = chalk.gray.bold(level);
		} else {
			coloredLevel = chalk.white(level);
		}
		
		const coloredBracket = chalk.gray('[') + coloredTime + ' ' + coloredLevel + chalk.gray(']');
		result = result.replace(fullMatch, coloredBracket);
	}
	
	// Check if line is JSON
	const trimmed = result.trim();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		try {
			const parsed = JSON.parse(trimmed);
			return colorizeJSON(parsed);
		} catch {
			// Not valid JSON, continue with regular colorization
		}
	}

	// Apply syntax highlighting to the rest
	result = colorizeSyntax(result);
	
	return result;
}

function colorizeSyntax(text: string): string {
	// Store already colored segments to avoid re-coloring
	const segments: Array<{ start: number; end: number; colored: string }> = [];
	
	// Pattern matching with non-overlapping replacement
	const patterns: Array<{ regex: RegExp; colorFn: (match: string) => string }> = [
		// HTTP status codes (with context)
		{
			regex: /StatusCode:\s*(\d{3})/gi,
			colorFn: (match) => {
				const code = parseInt(match.match(/\d{3}/)?.[0] || '0');
				const num = match.match(/\d{3}/)?.[0] || '';
				if (code >= 200 && code < 300) return match.replace(num, chalk.green(num));
				if (code >= 300 && code < 400) return match.replace(num, chalk.cyan(num));
				if (code >= 400 && code < 500) return match.replace(num, chalk.yellow(num));
				if (code >= 500) return match.replace(num, chalk.red(num));
				return match;
			}
		},
		
		// Duration values
		{
			regex: /Duration:\s*[\d.]+/gi,
			colorFn: (match) => chalk.red(match)
		},
		
		// HTTP methods
		{
			regex: /\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/g,
			colorFn: (match) => chalk.blue(match)
		},
		
		// API paths
		{
			regex: /\/api\/[a-zA-Z0-9_\-./]*/g,
			colorFn: (match) => chalk.magenta(match)
		},
		
		// URLs (before general paths)
		{
			regex: /https?:\/\/[^\s"]+/g,
			colorFn: (match) => chalk.blue.underline(match)
		},
		
		// UUIDs
		{
			regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
			colorFn: (match) => chalk.yellow(match)
		},
		
		// IP addresses
		{
			regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
			colorFn: (match) => chalk.magenta(match)
		},
		
		// JSON-like quoted strings (simple approach)
		{
			regex: /"([^"\\]|\\.)*"/g,
			colorFn: (match) => chalk.green(match)
		},
		
		// Booleans
		{
			regex: /\b(true|false)\b/g,
			colorFn: (match) => chalk.yellow(match)
		},
		
		// Null
		{
			regex: /\bnull\b/g,
			colorFn: (match) => chalk.gray(match)
		},
		
		// Numbers (last to avoid conflicts)
		{
			regex: /\b\d+\.?\d*\b/g,
			colorFn: (match) => chalk.cyan(match)
		},
	];
	
	let result = text;
	
	// Apply patterns one by one
	for (const { regex, colorFn } of patterns) {
		result = result.replace(regex, colorFn);
	}
	
	return result;
}

function colorizeJSON(obj: any, indent = 0): string {
	const indentStr = '  '.repeat(indent);

	if (obj === null) {
		return chalk.gray('null');
	}

	if (typeof obj === 'boolean') {
		return chalk.yellow(String(obj));
	}

	if (typeof obj === 'number') {
		return chalk.cyan(String(obj));
	}

	if (typeof obj === 'string') {
		return chalk.green(`"${obj}"`);
	}

	if (Array.isArray(obj)) {
		if (obj.length === 0) {
			return chalk.gray('[]');
		}

		const items = obj.map(item => `${indentStr}  ${colorizeJSON(item, indent + 1)}`);
		return chalk.gray('[') + '\n' + items.join(',\n') + '\n' + indentStr + chalk.gray(']');
	}

	if (typeof obj === 'object') {
		const keys = Object.keys(obj);
		if (keys.length === 0) {
			return chalk.gray('{}');
		}

		const items = keys.map(key => {
			const coloredKey = chalk.cyan(`"${key}"`);
			const coloredValue = colorizeJSON(obj[key], indent + 1);
			return `${indentStr}  ${coloredKey}: ${coloredValue}`;
		});

		return chalk.gray('{') + '\n' + items.join(',\n') + '\n' + indentStr + chalk.gray('}');
	}

	return String(obj);
}
