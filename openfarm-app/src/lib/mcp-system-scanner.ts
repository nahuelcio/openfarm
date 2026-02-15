import type { McpServerConfig, AgentProvider } from "@/lib/store";

/**
 * Detect operating system platform
 */
function getPlatform(): 'macos' | 'linux' | 'windows' | 'unknown' {
	if (typeof window === 'undefined') {
		// Node.js environment
		const { platform } = require('os');
		if (platform === 'darwin') return 'macos';
		if (platform === 'linux') return 'linux';
		if (platform === 'win32') return 'windows';
		return 'unknown';
	} else {
		// Browser environment - use navigator
		const userAgent = navigator.userAgent.toLowerCase();
		if (userAgent.includes('mac')) return 'macos';
		if (userAgent.includes('linux')) return 'linux';
		if (userAgent.includes('win')) return 'windows';
		return 'unknown';
	}
}

/**
 * Get standard MCP configuration paths for different platforms
 */
function getMcpConfigPaths(): string[] {
	const platform = getPlatform();
	const homeDir = typeof window !== 'undefined' 
		? '/home/user' // Browser fallback
		: require('os').homedir();

	switch (platform) {
		case 'macos':
			return [
				`${homeDir}/.config/mcp`,
				`${homeDir}/.mcp`,
				`${homeDir}/Library/Application Support/mcp`,
				`${homeDir}/.local/share/mcp`,
				'/usr/local/etc/mcp',
				'/opt/mcp/etc',
			];
		
		case 'linux':
			return [
				`${homeDir}/.config/mcp`,
				`${homeDir}/.mcp`,
				`${homeDir}/.local/share/mcp`,
				'/etc/mcp',
				'/usr/local/etc/mcp',
				'/opt/mcp/etc',
				`${homeDir}/.config/openfarm/mcp`,
			];
		
		case 'windows':
			return [
				`${homeDir}\\AppData\\Local\\mcp`,
				`${homeDir}\\AppData\\Roaming\\mcp`,
				`${homeDir}\\.mcp`,
				`${homeDir}\\.config\\mcp`,
				'C:\\ProgramData\\mcp',
				'C:\\Program Files\\mcp\\config',
				'%LOCALAPPDATA%\\mcp',
				'%APPDATA%\\mcp',
			];
		
		default:
			return [
				`${homeDir}/.config/mcp`,
				`${homeDir}/.mcp`,
			];
	}
}

/**
 * Get standard MCP binary paths for different platforms
 */
function getMcpBinaryPaths(): string[] {
	const platform = getPlatform();
	const homeDir = typeof window !== 'undefined' 
		? '/home/user' // Browser fallback
		: require('os').homedir();

	switch (platform) {
		case 'macos':
			return [
				'/usr/local/bin',
				'/opt/homebrew/bin',
				'/usr/bin',
				'/bin',
				`${homeDir}/.local/bin`,
				`${homeDir}/.npm-global/bin`,
				`${homeDir}/.node_modules/.bin`,
			];
		
		case 'linux':
			return [
				'/usr/local/bin',
				'/usr/bin',
				'/bin',
				`${homeDir}/.local/bin`,
				`${homeDir}/.npm-global/bin`,
				`${homeDir}/.node_modules/.bin`,
				'/snap/bin',
			];
		
		case 'windows':
			return [
				`${homeDir}\\AppData\\Local\\npm\\node_modules\\.bin`,
				`${homeDir}\\AppData\\Roaming\\npm\\node_modules\\.bin`,
				'C:\\Program Files\\nodejs\\node_modules\\.bin',
				'C:\\Program Files (x86)\\nodejs\\node_modules\\.bin',
				'%APPDATA%\\npm\\node_modules\\.bin',
				'%LOCALAPPDATA%\\npm\\node_modules\\.bin',
			];
		
		default:
			return [
				'/usr/local/bin',
				'/usr/bin',
				`${homeDir}/.local/bin`,
			];
	}
}

/**
 * Common MCP package names and their configurations
 */
const COMMON_MCP_PACKAGES = {
	'@modelcontextprotocol/server-filesystem': {
		name: 'Filesystem',
		description: 'File system access and operations',
		defaultConfig: { rootPath: '/' },
	},
	'@modelcontextprotocol/server-git': {
		name: 'Git',
		description: 'Git repository operations',
		defaultConfig: {},
	},
	'@modelcontextprotocol/server-fetch': {
		name: 'Fetch',
		description: 'HTTP requests and web scraping',
		defaultConfig: {},
	},
	'@modelcontextprotocol/server-brave-search': {
		name: 'Brave Search',
		description: 'Web search using Brave Search API',
		defaultConfig: { apiKey: '' },
	},
	'@modelcontextprotocol/server-memory': {
		name: 'Memory',
		description: 'Persistent memory storage',
		defaultConfig: {},
	},
	'@modelcontextprotocol/server-postgres': {
		name: 'PostgreSQL',
		description: 'PostgreSQL database access',
		defaultConfig: { connectionString: '' },
	},
	'@modelcontextprotocol/server-sqlite': {
		name: 'SQLite',
		description: 'SQLite database access',
		defaultConfig: { database: ':memory:' },
	},
	'@context7/mcp-server': {
		name: 'Context7',
		description: 'Context7 documentation and examples',
		defaultConfig: {},
	},
};

/**
 * Check if an MCP package is installed globally
 */
async function isMcpPackageInstalled(packageName: string): Promise<boolean> {
	try {
		// In browser environment, we can't check directly
		if (typeof window !== 'undefined') {
			return false;
		}

		// Node.js environment - check with npm
		const { execSync } = require('child_process');
		const command = `npm list -g ${packageName} --depth=0`;
		execSync(command, { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Scan for MCP configurations in system paths
 */
export async function scanSystemMcpConfigs(): Promise<McpServerConfig[]> {
	const configs: McpServerConfig[] = [];
	const platform = getPlatform();

	console.log(`🔍 Scanning MCP configurations for ${platform}...`);

	// Check for globally installed MCP packages
	for (const [packageName, info] of Object.entries(COMMON_MCP_PACKAGES)) {
		try {
			const isInstalled = await isMcpPackageInstalled(packageName);
			if (isInstalled) {
				console.log(`✅ Found installed MCP: ${packageName}`);
				
				const config: McpServerConfig = {
					id: packageName.replace(/[^a-zA-Z0-9]/g, '-'),
					name: info.name,
					command: 'npx',
					args: [packageName],
					env: {},
					enabled: true,
					provider: 'claude-code' as AgentProvider, // Default provider
					installedAt: new Date().toISOString(),
				};

				// Add default configuration if available
				if (Object.keys(info.defaultConfig).length > 0) {
					config.env = {
						...Object.entries(info.defaultConfig).reduce((acc, [key, value]) => ({
							...acc,
							[`MCP_${key.toUpperCase()}`]: String(value),
						}), {}),
					};
				}

				configs.push(config);
			}
		} catch (error) {
			console.log(`❌ Error checking ${packageName}:`, error);
		}
	}

	// Scan configuration files (only in Node.js environment)
	if (typeof window === 'undefined') {
		try {
			const fs = require('fs');
			const path = require('path');
			
			for (const configPath of getMcpConfigPaths()) {
				if (fs.existsSync(configPath)) {
					const files = fs.readdirSync(configPath);
					for (const file of files) {
						if (file.endsWith('.json') || file.endsWith('.config')) {
							const filePath = path.join(configPath, file);
							try {
								const content = fs.readFileSync(filePath, 'utf8');
								const configData = JSON.parse(content);
								
								// Convert to our format
								if (configData.name && configData.command) {
									configs.push({
										id: configData.id || file.replace(/\.(json|config)$/, ''),
										name: configData.name,
										command: configData.command,
										args: configData.args || [],
										env: configData.env || {},
										enabled: configData.enabled !== false,
										provider: configData.provider || 'claude-code' as AgentProvider,
										installedAt: new Date().toISOString(),
									});
								}
							} catch (parseError) {
								console.log(`⚠️ Could not parse config file ${filePath}:`, parseError);
							}
						}
					}
				}
			}
		} catch (error) {
			console.log(`⚠️ Could not scan system config paths:`, error);
		}
	}

	console.log(`📦 Found ${configs.length} MCP configurations in system paths`);
	return configs;
}

/**
 * Get platform-specific MCP command
 */
export function getPlatformMcpCommand(packageName: string): string {
	const platform = getPlatform();
	
	switch (platform) {
		case 'windows':
			return 'npx.cmd';
		case 'macos':
		case 'linux':
		default:
			return 'npx';
	}
}

/**
 * Get platform-specific environment variables
 */
export function getPlatformEnvironment(): Record<string, string> {
	const platform = getPlatform();
	const env: Record<string, string> = {};

	// Add platform-specific variables
	switch (platform) {
		case 'windows':
			env['PATH'] = env['PATH'] || '';
			env['USERPROFILE'] = env['USERPROFILE'] || env['HOME'] || '';
			env['APPDATA'] = env['APPDATA'] || '';
			env['LOCALAPPDATA'] = env['LOCALAPPDATA'] || '';
			break;
		case 'macos':
		case 'linux':
			env['HOME'] = env['HOME'] || '';
			env['USER'] = env['USER'] || '';
			env['PATH'] = env['PATH'] || '';
			break;
	}

	// In browser environment, add some basic defaults
	if (typeof window !== 'undefined') {
		env['HOME'] = env['HOME'] || '/home/user';
		env['PATH'] = env['PATH'] || '/usr/local/bin:/usr/bin:/bin';
	}

	return env;
}

/**
 * Get platform-specific default paths
 */
export function getPlatformDefaults(): {
	home: string;
	temp: string;
	config: string[];
	data: string[];
} {
	const platform = getPlatform();
	const homeDir = typeof window !== 'undefined' 
		? '/home/user' // Browser fallback
		: (() => {
			try {
				return require('os').homedir();
			} catch {
				return '/home/user';
			}
		})();

	switch (platform) {
		case 'windows':
			return {
				home: homeDir,
				temp: '/tmp', // Browser fallback
				config: [
					`${homeDir}\\AppData\\Local`,
					`${homeDir}\\AppData\\Roaming`,
				],
				data: [
					`${homeDir}\\AppData\\Local`,
					`${homeDir}\\AppData\\Roaming`,
				],
			};
		
		case 'macos':
			return {
				home: homeDir,
				temp: '/tmp',
				config: [
					`${homeDir}/Library/Application Support`,
					`${homeDir}/.config`,
				],
				data: [
					`${homeDir}/Library/Application Support`,
					`${homeDir}/.local/share`,
				],
			};
		
		case 'linux':
		default:
			return {
				home: homeDir,
				temp: '/tmp',
				config: [
					`${homeDir}/.config`,
					'/etc/xdg',
				],
				data: [
					`${homeDir}/.local/share`,
					'/usr/local/share',
				],
			};
	}
}
