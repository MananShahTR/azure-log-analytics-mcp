# Azure Log Analytics MCP Server

An MCP (Model Context Protocol) server for querying Azure Log Analytics using natural language. This server allows large language models to convert natural language queries into KQL (Kusto Query Language) and execute them against Azure Log Analytics.

## Features

- Convert natural language queries to KQL using Claude AI
- Execute KQL queries against Azure Log Analytics
- Format results for easy consumption by LLMs
- CLI mode for direct interactions and MCP server mode for LLM integrations

## Prerequisites

- Node.js 18.x or higher
- An Azure subscription with Log Analytics workspace
- An Anthropic API key for Claude AI
- Azure CLI configured with appropriate credentials

## Installation

```bash
# Clone the repository
git clone https://github.com/MananShahTR/azure-log-analytics-mcp.git
cd azure-log-analytics-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

The server requires the following environment variables:

- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude AI

Azure credentials are obtained through Azure CLI credentials. Ensure you're logged in with `az login` before running the server.

You'll need to configure the following in the `azure-service.ts` file:

- `subscriptionId`: Your Azure subscription ID
- `resourceGroup`: The resource group containing your App Insights resource
- `appInsightsId`: The name of your Application Insights resource

## Usage

### CLI Tool

```bash
# Run as a CLI tool
ANTHROPIC_API_KEY=your_key_here node build/index.js
```

### MCP Server

```bash
# Run as an MCP server
ANTHROPIC_API_KEY=your_key_here node build/mcp-server.js
```

### MCP Settings Configuration

Add the following to your MCP settings configuration file:

```json
{
  "mcpServers": {
    "azure-log-analytics": {
      "command": "node",
      "args": ["path/to/azure-log-analytics-mcp/build/mcp-server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Tool Usage

Once connected, the MCP server provides the following tool:

- `query_logs`: Query Azure Log Analytics using natural language
  - Parameters:
    - `query`: Natural language query about trace logs (required)
    - `timeRange`: Optional time range (e.g., "last 24 hours", "past week")
    - `limit`: Maximum number of results to return

## Examples

```javascript
// Example MCP tool use
use_mcp_tool({
  server_name: "azure-log-analytics",
  tool_name: "query_logs",
  arguments: {
    query: "Show me all errors in the authentication service from the last hour",
    timeRange: "last hour",
    limit: 10
  }
});
```

## License

MIT
