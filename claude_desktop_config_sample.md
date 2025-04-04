```json
{
  "mcpServers": {
    "batchchanges": { // Bee's MCP Server for generating batch spec files (can ignore or add as you see fit)
      "command": "npx",
      "args": [
        "mcp-bc"
      ],
      "env": {
        "SOURCEGRAPH_TOKEN": "<your key here>",
        "SOURCEGRAPH_URL": "https://sourcegraph.sourcegraph.com"
      }
    },
    "filesystem": { // MCP Server for accessing local file system (can ignore or add as you see fit)
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/audrey.lorberfeld/Desktop",  // These are the dirs you give the LLM access to write to
        "/Users/audrey.lorberfeld/Desktop/src/test-mcp/src"  // These are the dirs you give the LLM access to write to
      ]
    },
    "execute-batch-change-spec": {  // --> MCP Server this repo is about <--
      "command": "node",
      "args": [
        "execute-batch-change"
      ],
      "env": {
        "SRC_ENDPOINT": "https://sourcegraph.sourcegraph.com",
        "SRC_ACCESS_TOKEN": "<your key here>",
        "PATH": "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",  // your `src-cli` path
        "HOME": "/Users/audrey.lorberfeld"  // your $HOME path
      },
      "permissions": {
        "allow_local_tool_execution": true,
        "allow_network_access": true,
        "allow_env_access": true,
        "allow_home_access": true,
        "allow_system_binaries": true,
        "allow_debugging": true
      }
```
    }
  }
}
