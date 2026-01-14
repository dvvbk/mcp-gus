/**
 * MCP Server for BDL API using official @modelcontextprotocol/sdk
 * Cloudflare Workers Implementation with HTTP transport
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// BDL API Base URL
const BDL_BASE_URL = 'https://bdl.stat.gov.pl/api/v1';

interface Env {
  ENVIRONMENT?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * BDL API Client
 */
class BDLClient {
  private baseUrl: string;
  private lang: string;

  constructor(baseUrl: string = BDL_BASE_URL, lang: string = 'pl') {
    this.baseUrl = baseUrl;
    this.lang = lang;
  }

  async request(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams({
      ...params,
      lang: params.lang || this.lang,
      format: 'json',
    });

    // Remove undefined/null values
    for (const [key, value] of queryParams.entries()) {
      if (value === 'undefined' || value === 'null') {
        queryParams.delete(key);
      }
    }

    const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MCP-GUS-Workers/0.1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
          status_code: response.status,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create MCP Server instance
 */
function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'bdl-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const client = new BDLClient();

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [
      {
        name: 'get_aggregates',
        description: 'Pobiera listę poziomów agregacji danych / Get list of aggregation levels',
        inputSchema: {
          type: 'object',
          properties: {
            sort: {
              type: 'string',
              enum: ['Id', '-Id', 'Name', '-Name'],
            },
            lang: {
              type: 'string',
              enum: ['pl', 'en'],
            },
          },
        },
      },
      {
        name: 'get_subjects',
        description: 'Pobiera listę tematów (kategorii danych) / Get list of subjects',
        inputSchema: {
          type: 'object',
          properties: {
            parent_id: { type: 'string' },
            page: { type: 'number' },
            page_size: { type: 'number' },
            lang: { type: 'string', enum: ['pl', 'en'] },
          },
        },
      },
      {
        name: 'get_units',
        description: 'Pobiera listę jednostek terytorialnych / Get list of territorial units',
        inputSchema: {
          type: 'object',
          properties: {
            level: { type: 'number' },
            parent_id: { type: 'string' },
            name: { type: 'string' },
            lang: { type: 'string', enum: ['pl', 'en'] },
          },
        },
      },
      {
        name: 'search_units',
        description: 'Wyszukuje jednostki terytorialne / Search territorial units',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            level: { type: 'number' },
            lang: { type: 'string', enum: ['pl', 'en'] },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_variables',
        description: 'Pobiera listę zmiennych statystycznych / Get list of variables',
        inputSchema: {
          type: 'object',
          properties: {
            subject_id: { type: 'string' },
            level: { type: 'number' },
            year: { type: 'array', items: { type: 'number' } },
            lang: { type: 'string', enum: ['pl', 'en'] },
          },
        },
      },
      {
        name: 'get_data_by_variable',
        description: 'Pobiera dane dla zmiennej / Get data for a variable',
        inputSchema: {
          type: 'object',
          properties: {
            var_id: { type: 'number' },
            unit_id: { type: 'string' },
            year: { type: 'array', items: { type: 'number' } },
            lang: { type: 'string', enum: ['pl', 'en'] },
          },
          required: ['var_id'],
        },
      },
    ];

    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    let result: any;

    switch (name) {
      case 'get_aggregates':
        result = await client.request('/aggregates', args);
        break;

      case 'get_subjects':
        result = await client.request('/subjects', {
          'parent-id': args?.parent_id,
          page: args?.page,
          'page-size': args?.page_size,
          lang: args?.lang,
        });
        break;

      case 'get_units':
        result = await client.request('/units', {
          level: args?.level,
          'parent-id': args?.parent_id,
          name: args?.name,
          lang: args?.lang,
        });
        break;

      case 'search_units':
        result = await client.request('/units/search', {
          name: args?.name,
          level: args?.level,
          lang: args?.lang,
        });
        break;

      case 'get_variables':
        result = await client.request('/variables', {
          'subject-id': args?.subject_id,
          level: args?.level,
          year: args?.year,
          lang: args?.lang,
        });
        break;

      case 'get_data_by_variable':
        result = await client.request(`/data/by-variable/${args?.var_id}`, {
          'unit-id': args?.unit_id,
          year: args?.year,
          lang: args?.lang,
        });
        break;

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
        };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  return server;
}

/**
 * Handle MCP HTTP requests using SDK
 */
async function handleMCPHTTP(request: Request, server: Server): Promise<Response> {
  try {
    const body = await request.json<any>();

    // Use SDK's message handling
    const response = await server.handleRequest(body);

    // Notifications return null
    if (response === null) {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  }
}

/**
 * Main Worker handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: CORS_HEADERS,
      });
    }

    // Health check endpoint
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'mcp-gus-workers',
          version: '0.1.0',
          sdk: '@modelcontextprotocol/sdk',
          environment: env.ENVIRONMENT || 'production',
          edge: request.cf?.colo || 'unknown',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        }
      );
    }

    // MCP endpoint - GET shows instructions
    if (url.pathname === '/mcp' && request.method === 'GET') {
      return new Response(
        JSON.stringify(
          {
            service: 'BDL MCP Server',
            version: '0.1.0',
            sdk: '@modelcontextprotocol/sdk v1.0.4',
            protocol: 'MCP over HTTP (JSON-RPC 2.0)',
            endpoint: '/mcp',
            method: 'POST',
            description: 'Model Context Protocol server for Polish statistical data (GUS BDL API)',
            documentation: 'https://github.com/dvvbk/mcp-gus',
          },
          null,
          2
        ),
        {
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        }
      );
    }

    // MCP endpoint - POST handles requests
    if (url.pathname === '/mcp' && request.method === 'POST') {
      const server = createMCPServer();
      return await handleMCPHTTP(request, server);
    }

    // 404 for unknown routes
    return new Response('Not Found', {
      status: 404,
      headers: CORS_HEADERS,
    });
  },
};
