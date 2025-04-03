import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';
import { z } from "zod";

// Create server instance
const server = new McpServer({
    name: "execute-batch-change-spec",
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
            timeout: 200000
        });

        const timer = setTimeout(() => {
            child.kill();
            reject(new Error(`Command timed out: ${command}`));
        }, 200000);

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
    try {
        console.error(`Executing command: ${bashCommand}`);
        return await openBashShell(bashCommand);
    } catch (error) {
        console.error('Error executing command:', error);
        throw error;
    }
}

// Placeholder Resource that simply returns batch changes documentation to user on a resources/read request
server.resource(
    "batchChangesDocumentation",
    "https://sourcegraph.com/docs/batch-changes",
    async (uri: URL) => {
        return {
            contents: [{
                uri: uri.toString(),
                text: uri.toString()
            }]
        }
    }
)

// Register tool
server.tool(
    "execute-batch-change-spec",
    "Execute (push up to s2) a draft batch change",
    {
        batchSpecPath: z.string().describe("The local file path of the batch spec ")
    },
    async ({ batchSpecPath }) => {
        process.on('unhandledRejection', (error) => {
            console.error('Unhandled rejection:', error);
        });

        process.on('uncaughtException', (error) => {
            console.error('Uncaught exception:', error);
        });

        try {
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

            let output = '';
            for (const command of commands) {
                // console.error(`\n[DEBUG] Executing: ${command}`);
                try {
                    const result = await runCommand(command, {
                        cwd: process.cwd(), // Explicitly set working directory
                        shell: true,        // Enable shell features
                    });
                    // console.info(`[DEBUG] Command succeeded with output: ${result}`);
                    output += `${command}: ${result}\n`;
                } catch (error) {
                    console.error('[DEBUG] Command failed with error:', error);
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
    console.error("Batch changes MCP Server running on stdio...");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
