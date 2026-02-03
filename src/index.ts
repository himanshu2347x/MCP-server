import { createServer } from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { analyzeGardenOrder } from "./tools/analyzeGardenOrder.js";

const server = new McpServer({
  name: "demo-mcp-server",
  version: "1.0.0",
});

// Register tool
server.registerTool(
  "say_hello",
  {
    description: "Returns a friendly greeting message",
    inputSchema: {
      name: z.string().optional(),
    },
  },
  async ({ name }) => {
    return {
      content: [
        {
          type: "text",
          text: `👋 Hey ${name ?? "there"}! Greetings from MCP Server.`,
        },
      ],
    };
  }
);

server.registerTool(
  "analyze_garden_order",
  {
    description:
      "Analyze a Garden Finance order to check deadline vs initiate timing",
    inputSchema: {
      order_id: z.string(),
    },
  },
  async ({ order_id }) => {
    const result = await analyzeGardenOrder({ order_id });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);


const transport = new StreamableHTTPServerTransport();

// Create HTTP server
const httpServer = createServer(async (req, res) => {
  // Let MCP try to handle the request
  await transport.handleRequest(req, res);

  // If MCP didn’t write a response, handle it yourself
  if (!res.headersSent) {
    res.statusCode = 404;
    res.end("Not Found");
  }
});

// Connect MCP
await server.connect(transport);

// Start server
httpServer.listen(4000, "127.0.0.1", () => {
  console.log("🚀 MCP HTTP Server running at http://127.0.0.1:4000");
});
