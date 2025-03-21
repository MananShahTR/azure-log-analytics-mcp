import axios from "axios";

export class AnthropicService {
  private apiKey: string;
  private baseUrl = "https://api.anthropic.com/v1/messages";
  private model = "claude-3-7-sonnet-20250219";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generates a Kusto Query Language (KQL) query from natural language using Anthropic Claude
   * @param naturalLanguageQuery The natural language query about logs
   * @param timeRange Optional time range specification
   * @returns Promise containing the generated KQL query
   */
  async generateKustoQuery(
    naturalLanguageQuery: string,
    timeRange?: string
  ): Promise<string> {
    const systemPrompt = `You are a Kusto Query Language (KQL) expert assistant that specializes in Azure Log Analytics. 
Your task is to convert natural language queries into valid KQL queries. 
Focus specifically on trace data in Log Analytics.

Follow these rules:
1. Generate ONLY the KQL query with no explanation or markdown formatting
2. Ensure your KQL query is valid syntax
3. When a time range is provided, incorporate it appropriately using datetime operations
4. If no specific time range is given, default to the last 24 hours
5. If there is any ambiguity, make a reasonable assumption and proceed
6. Do not include any explanations or comments in your response - ONLY return the KQL query

For example:
User: "Show me all errors in the authentication service from the last hour"
You: traces | where timestamp > ago(1h) | where severityLevel == "Error" | where cloud_RoleName contains "authentication" | project timestamp, message, operation_Name, cloud_RoleName | order by timestamp desc

User: "What are the top 5 services with the most errors?"
You: traces | where severityLevel == "Error" | where timestamp > ago(24h) | summarize ErrorCount=count() by cloud_RoleName | top 5 by ErrorCount desc`;

    const userMessage = `Create a KQL query for Azure Log Analytics using trace data that does the following: ${naturalLanguageQuery}${
      timeRange ? ` for the ${timeRange}` : ""
    }`;

    try {
      const response = await axios.post(
        this.baseUrl,
        {
          model: this.model,
          messages: [
            {
              role: "user",
              content: userMessage,
            },
          ],
          system: systemPrompt,
          max_tokens: 1024,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
          },
        }
      );

      return response.data.content[0].text.trim();
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Anthropic API Error: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        );
      }
      throw new Error(`Failed to generate KQL query: ${error.message}`);
    }
  }
}