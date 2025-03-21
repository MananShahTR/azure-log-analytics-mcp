import { AzureCliCredential } from "@azure/identity";
import { LogsQueryClient, LogsQueryResultStatus } from "@azure/monitor-query";

export class AzureLogAnalyticsService {
  private logsQueryClient: LogsQueryClient;
  private appInsightsId: string;
  private subscriptionId: string;
  private resourceGroup: string;

  constructor() {
    // Use AzureCliCredential to directly use Azure CLI credentials
    const credential = new AzureCliCredential();
    this.logsQueryClient = new LogsQueryClient(credential);

    // Set App Insights details
    this.subscriptionId = "cdc73b10-2ecb-4bb3-83fe-b1e50a1fa409"; // DCO-ThoughtTrace-N
    this.resourceGroup = "dev-rg-ncus-cocodraft";
    this.appInsightsId = "dev-askdi-flows";
  }

  /**
   * Executes a KQL query against Application Insights
   * @param kqlQuery The KQL query to execute
   * @param limit Optional maximum number of results to return
   * @returns Promise containing the formatted results as a string
   */
  async executeQuery(kqlQuery: string, limit?: number): Promise<string> {
    try {
      // Add a limit to the query if provided
      const query = limit ? `${kqlQuery} | limit ${limit}` : kqlQuery;

      // Construct the App Insights resource ID
      const resourceId = `/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}/providers/Microsoft.Insights/components/${this.appInsightsId}`;

      console.log(`Querying App Insights resource: ${resourceId}`);

      // Execute the query against App Insights
      const result = await this.logsQueryClient.queryResource(
        resourceId,
        query,
        {
          duration: "P1D", // Default to 1 day if not specified in the query
        }
      );

      // Check query status
      if (result.status !== LogsQueryResultStatus.Success) {
        throw new Error(`Query failed with status: ${result.status}`);
      }

      // Format the results as a table
      return this.formatResults(result.tables);
    } catch (error: any) {
      throw new Error(`Azure App Insights query error: ${error.message}`);
    }
  }

  /**
   * Formats query results into a readable table
   * @param tables The tables returned from the query
   * @returns Formatted string representation of the tables
   */
  private formatResults(tables: any[]): string {
    if (!tables || tables.length === 0) {
      return "No results found.";
    }

    let output = "";

    for (const table of tables) {
      if (!table.rows || table.rows.length === 0) {
        output += "Table returned no rows.\n";
        continue;
      }

      // Get column names
      const columns = table.columns.map((col: any) => col.name);

      // Calculate column widths based on content
      const columnWidths = columns.map((col: string) => col.length);

      // Update column widths based on data
      table.rows.forEach((row: any[]) => {
        for (let i = 0; i < row.length; i++) {
          const cellValue = String(row[i] === null ? "NULL" : row[i]);
          columnWidths[i] = Math.max(columnWidths[i], cellValue.length);
        }
      });

      // Create header row
      let headerRow = "| ";
      let separatorRow = "| ";

      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const width = columnWidths[i];
        headerRow += column.padEnd(width) + " | ";
        separatorRow += "-".repeat(width) + " | ";
      }

      output += headerRow + "\n";
      output += separatorRow + "\n";

      // Create data rows
      for (const row of table.rows) {
        let dataRow = "| ";
        for (let i = 0; i < row.length; i++) {
          const cellValue = String(row[i] === null ? "NULL" : row[i]);
          dataRow += cellValue.padEnd(columnWidths[i]) + " | ";
        }
        output += dataRow + "\n";
      }

      output += `\n(${table.rows.length} rows)\n\n`;
    }

    return output;
  }
}