import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';
import { z } from "zod";

// Create server instance
const server = new McpServer({
  name: "batch-changes",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

function openBashShell(command: string, options?: { cwd?: string; shell?: string; env?: NodeJS.ProcessEnv }): Promise<string> {
    return new Promise((resolve, reject) => {
        let output = '';
        const childProcess = exec(command, options);
        
        childProcess.stdout?.on('data', (data) => {
            output += data.toString();
        });

        childProcess.stderr?.on('data', (data) => {
            output += data.toString();
        });

        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(`Process exited with code ${code}`);
            }
        });
    });
}
  
async function runCommand(bashCommand: string, options?: { cwd?: string; shell?: boolean; env?: NodeJS.ProcessEnv }): Promise<string> {
    try {
        console.error(`Executing command: ${bashCommand}`);
        return await openBashShell(bashCommand);
    } catch (error) {
        console.error('Error executing command:', error);
        throw error;
    }
}


// Register tool
server.tool(
    "run-draft-batch-change",
    "Generate a draft batch change",
    {
        batchSpecPath: z.string().describe("The file path for the batch spec")
    },
    async ({ batchSpecPath }) => {
        try {
            // Check if src is available
            console.error('Checking if src is available...');
            try {
                await runCommand('which src');
                console.error('src command found!');
            } catch (error) {
                console.error('src command not found in PATH');
            }
            
            // Try using the local src command first
            console.error('Attempting to use local src command');
            const commands = [
                'which src',        // Verify src location
                'echo $HOME',       // Check home directory
                'pwd',              // Check working directory
                'src login',
                `src batch validate -f "${batchSpecPath}"`,
                `src batch preview -f "${batchSpecPath}"`
            ];

            let output = '';
            for (const command of commands) {
                console.error(`\n[DEBUG] Executing: ${command}`);
                try {
                    // Set options for better debugging
                    const result = await runCommand(command, {
                        cwd: process.cwd(), // Explicitly set working directory
                        shell: true,        // Enable shell features
                        env: {              // Ensure environment variables are passed
                            ...process.env,
                            HOME: process.env.HOME,
                            PATH: process.env.PATH,
                            SRC_ENDPOINT: 'https://sourcegraph.sourcegraph.com',
                            SRC_ACCESS_TOKEN: ''
                        }
                    });
                    console.error(`[DEBUG] Command succeeded with output: ${result}`);
                    output += `${command}: ${result}\n`;
                } catch (error) {
                    console.error(`[DEBUG] Command failed with error:`, error);
                    output += `Error running '${command}': ${error}\n`;
                }
            }
            return {
                content: [{
                    type: "text",
                    text: output || "No output received"
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error generating batch change: ${error instanceof Error ? error.message : String(error)}`
                }]
            };
        }
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Batch changes MCP Server running on stdio");
  }

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});


//  runCommand('src login');
//  chmod +x <file-name>.js makes JS files executable on Unix-like systems (Linux/MacOS)
// runCommand('src batch preview -f src/test-batch-spec.batch.yaml');
