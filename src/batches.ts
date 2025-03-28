import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';

// const NWS_API_BASE = "https://api.weather.gov";
// const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
  name: "batch-changes",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

function openBashShell(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const childProcess = exec(command);
        
        childProcess.stdout?.on('data', (data) => {
            console.log(data.toString());
        });

        childProcess.stderr?.on('data', (data) => {
            console.error(data.toString());
        });

        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(`Process exited with code ${code}`);
            }
        });
    });
}
  
async function runCommand(bashCommand: string) {
    try {
        await openBashShell(bashCommand);
    } catch (error) {
        console.error('Error:', error);
    }
}

//   runCommand('src login');
runCommand('src batch preview -f <path-to-batch-spec>.batch.yaml');