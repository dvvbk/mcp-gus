/**
 * MCP Server for BDL API (Bank Danych Lokalnych - Local Data Bank)
 * Cloudflare Workers Implementation
 *
 * This server provides access to Polish statistical data through the Model Context Protocol.
 * Optimized for Cloudflare Workers edge network.
 */

// BDL API Base URL
const BDL_BASE_URL = 'https://bdl.stat.gov.pl/api/v1';

interface Env {
  // Environment variables and bindings
  ENVIRONMENT?: string;
  // Add KV namespace if needed for caching
  // MCP_CACHE?: KVNamespace;
}

/**
 * CORS headers for cross-origin requests
 */
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
 * MCP Tool definitions
 */
const MCP_TOOLS = [
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
        page: { type: 'integer' },
        page_size: { type: 'integer' },
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
        level: { type: 'integer' },
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
        level: { type: 'integer' },
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
        level: { type: 'integer' },
        year: { type: 'array', items: { type: 'integer' } },
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
        var_id: { type: 'integer' },
        unit_id: { type: 'string' },
        year: { type: 'array', items: { type: 'integer' } },
        lang: { type: 'string', enum: ['pl', 'en'] },
      },
      required: ['var_id'],
    },
  },
];

/**
 * Handle MCP tool calls
 */
async function handleToolCall(name: string, arguments_: any): Promise<any> {
  const client = new BDLClient();

  switch (name) {
    case 'get_aggregates':
      return await client.request('/aggregates', arguments_);

    case 'get_subjects':
      return await client.request('/subjects', {
        'parent-id': arguments_.parent_id,
        page: arguments_.page,
        'page-size': arguments_.page_size,
        lang: arguments_.lang,
      });

    case 'get_units':
      return await client.request('/units', {
        level: arguments_.level,
        'parent-id': arguments_.parent_id,
        name: arguments_.name,
        lang: arguments_.lang,
      });

    case 'search_units':
      return await client.request('/units/search', {
        name: arguments_.name,
        level: arguments_.level,
        lang: arguments_.lang,
      });

    case 'get_variables':
      return await client.request('/variables', {
        'subject-id': arguments_.subject_id,
        level: arguments_.level,
        year: arguments_.year,
        lang: arguments_.lang,
      });

    case 'get_data_by_variable':
      return await client.request(`/data/by-variable/${arguments_.var_id}`, {
        'unit-id': arguments_.unit_id,
        year: arguments_.year,
        lang: arguments_.lang,
      });

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Handle MCP protocol requests and notifications
 */
async function handleMCPRequest(request: any): Promise<any> {
  const { method, params, id } = request;

  // Handle notifications (no response needed)
  if (id === undefined || method?.startsWith('notifications/')) {
    // Notifications like 'notifications/initialized', 'notifications/cancelled'
    // Just acknowledge them silently
    return null;
  }

  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'bdl-mcp-server',
          version: '0.1.0',
        },
      };

    case 'tools/list':
      return {
        tools: MCP_TOOLS,
      };

    case 'tools/call':
      const result = await handleToolCall(params.name, params.arguments || {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    default:
      throw new Error(`Unknown method: ${method}`);
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
        JSON.stringify({
          service: 'BDL MCP Server',
          version: '0.1.0',
          protocol: 'MCP over HTTP (JSON-RPC 2.0)',
          endpoint: '/mcp',
          method: 'POST',
          description: 'Model Context Protocol server for Polish statistical data (GUS BDL API)',
          usage: {
            initialize: {
              method: 'initialize',
              params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'client', version: '1.0.0' },
              },
            },
            listTools: {
              method: 'tools/list',
              params: {},
            },
            callTool: {
              method: 'tools/call',
              params: {
                name: 'get_units',
                arguments: { level: 2, lang: 'pl' },
              },
            },
          },
          example: {
            url: url.origin + '/mcp',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/list',
              params: {},
            },
          },
          documentation: 'https://github.com/dvvbk/mcp-gus',
        }, null, 2),
        {
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        }
      );
    }

    // MCP endpoint - POST handles requests and notifications
    if (url.pathname === '/mcp' && request.method === 'POST') {
      try {
        const body = await request.json<any>();

        const response = await handleMCPRequest(body);

        // Notifications (no id) don't require a response
        if (response === null) {
          return new Response(null, {
            status: 204, // No Content
            headers: CORS_HEADERS,
          });
        }

        // Regular requests return JSON-RPC response
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: response,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...CORS_HEADERS,
            },
          }
        );
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

    // 404 for unknown routes
    return new Response('Not Found', {
      status: 404,
      headers: CORS_HEADERS,
    });
  },
};
