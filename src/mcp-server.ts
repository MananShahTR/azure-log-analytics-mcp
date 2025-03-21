#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { AnthropicService } from "./services/anthropic-service.js";
import { AzureLogAnalyticsService } from "./services/azure-service.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY environment variable is required");
  process.exit(1);
}

/**
 * MCP server for querying Azure Log Analytics using natural language
 */
class AzureLogAnalyticsMCPServer {
  private server: Server;
  private azureService: AzureLogAnalyticsService;
  private anthropicService: AnthropicService;

  constructor() {
    this.server = new Server(
      {
        name: "azure-log-analytics-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize services
    this.azureService = new AzureLogAnalyticsService();
    this.anthropicService = new AnthropicService(ANTHROPIC_API_KEY);

    // Set up tool handlers
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "query_logs",
          description: "Query Azure Log Analytics using natural language",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Natural language query about trace logs",
              },
              timeRange: {
                type: "string",
                description:
                  'Optional time range (e.g., "last 24 hours", "past week")',
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
              },
            },
            required: ["query"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "query_logs") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const { query, timeRange, limit } = request.params.arguments as {
        query: string;
        timeRange?: string;
        limit?: number;
      };

      try {
        console.log(`Processing query: ${query}`);

        // Step 1: Convert natural language to KQL using Anthropic
        const kqlQuery = await this.anthropicService.generateKustoQuery(
          query,
          timeRange
        );
        console.log(`Generated KQL Query: ${kqlQuery}`);

        // Step 2: Execute the KQL query against Azure Log Analytics
        const results = await this.azureService.executeQuery(kqlQuery, limit);

        // Step 3: Format and return the results
        return {
          content: [
            {
              type: "text",
              text: `Query executed: ${kqlQuery}\n\n${results}`,
            },
          ],
        };
      } catch (error: any) {
        console.error(`Error processing query: ${error.message}`);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("Azure Log Analytics MCP server running on stdio");
  }
}

// Create and run the server
const server = new AzureLogAnalyticsMCPServer();
server.run().catch(console.error);