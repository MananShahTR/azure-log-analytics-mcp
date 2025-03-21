#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { AnthropicService } from "./services/anthropic-service.js";
import { AzureLogAnalyticsService } from "./services/azure-service.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY environment variable is required");
  process.exit(1);
}

/**
 * A simple CLI tool for querying Azure Log Analytics using natural language
 */
class AzureLogAnalyticsQueryTool {
  private azureService: AzureLogAnalyticsService;
  private anthropicService: AnthropicService;
  private rl: readline.Interface;

  constructor() {
    // Initialize services
    this.azureService = new AzureLogAnalyticsService();
    this.anthropicService = new AnthropicService(ANTHROPIC_API_KEY);

    // Initialize readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "log-query> ",
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle CTRL+C
    process.on("SIGINT", () => {
      console.log("\nExiting log query tool");
      this.rl.close();
      process.exit(0);
    });

    // Handle line input
    this.rl.on("line", async (line) => {
      const trimmedLine = line.trim();

      if (trimmedLine === "exit" || trimmedLine === "quit") {
        console.log("Goodbye!");
        this.rl.close();
        process.exit(0);
      } else if (trimmedLine === "help") {
        this.showHelp();
      } else if (trimmedLine) {
        await this.processQuery(trimmedLine);
      }

      this.rl.prompt();
    });

    // Handle readline close
    this.rl.on("close", () => {
      process.exit(0);
    });
  }

  private showHelp() {
    console.log("\nAzure Log Analytics Natural Language Query Tool");
    console.log("------------------------------------------------");
    console.log("Type your query in natural language, for example:");
    console.log("  - Show me all error traces from the last hour");
    console.log(
      "  - What are the top 5 services with the most exceptions today?"
    );
    console.log("\nCommands:");
    console.log("  help  - Show this help message");
    console.log("  exit  - Exit the application");
    console.log("  quit  - Exit the application");
    console.log("\nOptions:");
    console.log("  You can add time range by including it in your query");
    console.log("  You can add a limit by specifying a number of results\n");
  }

  /**
   * Process a natural language query
   * @param queryText The natural language query text
   */
  private async processQuery(queryText: string) {
    try {
      console.log("Processing query...");

      // Extract time range and limit if specified
      const timeRange = this.extractTimeRange(queryText);
      const limit = this.extractLimit(queryText);

      // Step 1: Convert natural language to KQL using Anthropic
      const kqlQuery = await this.anthropicService.generateKustoQuery(
        queryText,
        timeRange
      );

      console.log(`\nGenerated KQL Query:\n${kqlQuery}\n`);
      console.log("Executing query against Azure Log Analytics...");

      // Step 2: Execute the KQL query against Azure Log Analytics
      const results = await this.azureService.executeQuery(kqlQuery, limit);

      // Step 3: Display the results
      console.log("\nResults:");
      console.log(results);
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
    }
  }

  /**
   * Extract time range from query text if specified
   */
  private extractTimeRange(queryText: string): string | undefined {
    // Simple regex patterns to extract time ranges
    const timeRangePatterns = [
      /(?:in|for|over|during) the (?:last|past) (\d+) (hour|hours|day|days|week|weeks|month|months)/i,
      /(?:in|for|over|during) the (?:last|past) (hour|day|week|month)/i,
      /(?:since|from) (\d+) (hour|hours|day|days|week|weeks|month|months) ago/i,
    ];

    for (const pattern of timeRangePatterns) {
      const match = queryText.match(pattern);
      if (match) {
        // Return the matched time range
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Extract result limit from query text if specified
   */
  private extractLimit(queryText: string): number | undefined {
    // Simple regex patterns to extract limits
    const limitPatterns = [
      /\btop (\d+)\b/i,
      /\blimit (\d+)\b/i,
      /\bshow me (\d+)\b/i,
      /\bonly (\d+)\b/i,
    ];

    for (const pattern of limitPatterns) {
      const match = queryText.match(pattern);
      if (match && match[1]) {
        // Return the matched limit as a number
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }

  /**
   * Start the application
   */
  public run() {
    console.log("Azure Log Analytics Natural Language Query Tool");
    console.log('Type "help" for available commands');
    this.rl.prompt();
  }
}

// Create and run the application
const app = new AzureLogAnalyticsQueryTool();
app.run();