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

function openBashShell(command: string, options?: { timeout?: number } & Record<string, any>): Promise<string> {
    return new Promise((resolve, reject) => {
        let output = '';
        const child = exec(command, {
            ...options,
            timeout: 30000 // 30 second timeout
        });

        const timer = setTimeout(() => {
            child.kill();
            reject(new Error(`Command timed out after 30s: ${command}`));
        }, 30000);

        child.stdout?.on('data', (data) => output += data.toString());
        child.stderr?.on('data', (data) => output += data.toString());
        
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) resolve(output);
            else reject(new Error(`Command failed (${code}): ${output}`));
        });
    });
}

async function runCommand(bashCommand: string, options?: { cwd?: string; shell?: boolean; env?: NodeJS.ProcessEnv }): Promise<string> {
    // const hasSrcCli = await verifySrcCli();
    // if (!hasSrcCli) {
    //     throw new Error('src-cli not properly installed');
    // }
    try {
        console.error(`Executing command: ${bashCommand}`);
        return await openBashShell(bashCommand);
    } catch (error) {
        console.error('Error executing command:', error);
        throw error;
    }
}


const loginCmd = `src login ${process.env.SRC_ENDPOINT} --token=${process.env.SRC_ACCESS_TOKEN}`;


// Add this diagnostic check at startup:
// async function verifySrcCli() {
//     try {
//         // Check using absolute path
//         const srcPath = '/usr/local/bin/src';
//         await import('fs/promises').then(fs => fs.access(srcPath, fs.constants.X_OK));

//         const version = await 
//         // console.error('src-cli verified:', version.trim());
//         return true;
//     } catch (error) {
//         console.error('src-cli verification failed. Ensure you ran:');
//         console.error('sudo curl -L https://sourcegraph.sourcegraph.com/.api/src-cli/src_darwin_amd64 -o /usr/local/bin/src');
//         console.error('sudo chmod +x /usr/local/bin/src');
//         return false;
//     }
// }


// Register tool
server.tool(
    "run-draft-batch-change",
    "Generate a draft batch change",
    {
        batchSpecPath: z.string().describe("The file path for the batch spec")
    },
    async ({ batchSpecPath }) => {
        try {
            console.error('PATH:', process.env.PATH);

            // Check if src is available
            console.error('Checking if `src-cli` is available...');
            try {
                await runCommand('which src');
                console.info('`src` command found!');
            } catch (error) {
                console.error('!! `src` command not found in PATH');
            }

            // Try using the local src command first
            console.error('Attempting to use local `src` command');
            if (!process.env.SRC_ACCESS_TOKEN) {
                throw new Error("SRC_ACCESS_TOKEN environment variable is required");
            }
            if (!process.env.SRC_ENDPOINT) {
                throw new Error("SRC_Endpoint environment variable is required");
            }
            const commands = [
                "/usr/local/bin/src version",
                `/usr/local/bin/src login ${process.env.SRC_ENDPOINT} --token=${process.env.SRC_ACCESS_TOKEN}`,
                `/usr/local/bin/src batch preview -f "${batchSpecPath}"`
            ];

            // Add better error handling:
            process.on('unhandledRejection', (error) => {
                console.error('Unhandled rejection:', error);
            });

            process.on('uncaughtException', (error) => {
                console.error('Uncaught exception:', error);
            });

            let output = '';
            for (const command of commands) {
                console.error(`\n[DEBUG] Executing: ${command}`);
                try {
                    // Set options for better debugging
                    const result = await runCommand(command, {
                        cwd: process.cwd(), // Explicitly set working directory
                        shell: true,        // Enable shell features
                    });
                    console.info(`[DEBUG] Command succeeded with output: ${result}`);
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

server.prompt(
    "resources/list",
    async () => {
      return { resources: [], messages: [] }; // Return empty array if no resources
    }
  );
  
  server.prompt(
    "prompts/list", 
    async () => {
      return { prompts: [], messages: [] }; // Return empty array if no prompts
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
