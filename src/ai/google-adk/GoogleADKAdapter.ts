// ============================================
// GOOGLE ADK ADAPTER - Complyment Connectors SDK
// ============================================
// Convert connectors to Google Agent Development Kit tools
// Compatible with Google ADK for Gemini/Vertex AI agents
// ============================================

export interface GoogleADKTool {
  name: string
  description: string
  parameters: Record<string, GoogleADKToolParam>
  required?: string[]
  handler: (params: Record<string, unknown>) => Promise<GoogleADKToolResult>
}

export interface GoogleADKToolParam {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
  items?: { type: string }
}

export interface GoogleADKToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export interface GoogleADKAgentConfig {
  name: string
  description: string
  model?: string
  instructions?: string
  tools: GoogleADKTool[]
}

// ============================================
// Google ADK Adapter
// ============================================

export class GoogleADKAdapter {

  // ============================================
  // Create Single Tool
  // ============================================

  static createTool(options: {
    name: string
    description: string
    parameters?: Record<string, GoogleADKToolParam>
    required?: string[]
    handler: (params: Record<string, unknown>) => Promise<GoogleADKToolResult>
  }): GoogleADKTool {
    return {
      name: options.name,
      description: options.description,
      parameters: options.parameters ?? {},
      required: options.required ?? [],
      handler: async (params) => {
        try {
          const result = await options.handler(params)
          return {
            success: true,
            data: result.data,
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Tool execution failed',
          }
        }
      },
    }
  }

  // ============================================
  // Security Analyst Agent
  // ============================================

  static createSecurityAnalystAgent(connectors: {
    qualys?: {
      getVulnerabilities: (filter?: unknown) => Promise<unknown>
      getCriticalVulnerabilities: () => Promise<unknown>
      getAssets: (filter?: unknown) => Promise<unknown>
    }
    sentinelone?: {
      getThreats: (filter?: unknown) => Promise<unknown>
      getCriticalThreats: () => Promise<unknown>
      quarantineThreat: (id: string) => Promise<unknown>
    }
    jira?: {
      createSecurityTicket: (
        projectKey: string,
        title: string,
        description: string,
        severity: string,
        source: string,
      ) => Promise<unknown>
    }
  }): GoogleADKAgentConfig {
    const tools: GoogleADKTool[] = []

    // Qualys tools
    if (connectors.qualys) {
      tools.push(
        this.createTool({
          name: 'get_vulnerabilities',
          description: 'Fetch vulnerability scan results from Qualys vulnerability manager',
          parameters: {
            severity: { type: 'array', description: 'Severity levels (1-5)', items: { type: 'number' } },
            status: { type: 'string', description: 'Vulnerability status filter', enum: ['Active', 'Fixed', 'New'] },
          },
          handler: async (params) => ({ success: true, data: await connectors.qualys!.getVulnerabilities(params) }),
        }),

        this.createTool({
          name: 'get_critical_vulnerabilities',
          description: 'Retrieve only critical and high severity vulnerabilities requiring immediate attention',
          handler: async () => ({ success: true, data: await connectors.qualys!.getCriticalVulnerabilities() }),
        }),

        this.createTool({
          name: 'get_assets',
          description: 'Get IT assets from Qualys asset inventory',
          parameters: {
            hostname: { type: 'string', description: 'Filter by hostname' },
            limit: { type: 'number', description: 'Maximum results to return' },
          },
          handler: async (params) => ({ success: true, data: await connectors.qualys!.getAssets(params) }),
        }),
      )
    }

    // SentinelOne tools
    if (connectors.sentinelone) {
      tools.push(
        this.createTool({
          name: 'get_threats',
          description: 'Fetch detected threats from SentinelOne EDR endpoint protection',
          parameters: {
            severity: { type: 'string', description: 'Threat severity level', enum: ['critical', 'high', 'medium', 'low'] },
            status: { type: 'string', description: 'Threat status', enum: ['active', 'mitigated', 'resolved'] },
          },
          handler: async (params) => ({ success: true, data: await connectors.sentinelone!.getThreats(params) }),
        }),

        this.createTool({
          name: 'get_critical_threats',
          description: 'Get critical severity threats that require immediate investigation',
          handler: async () => ({ success: true, data: await connectors.sentinelone!.getCriticalThreats() }),
        }),

        this.createTool({
          name: 'quarantine_threat',
          description: 'Isolate a threat by quarantining the affected endpoint - use for active malware containment',
          parameters: {
            threatId: { type: 'string', description: 'The unique identifier of the threat to quarantine' },
          },
          required: ['threatId'],
          handler: async (params) => {
            if (typeof params.threatId !== 'string') {
              return { success: false, error: 'threatId must be a string' }
            }
            return {
              success: true,
              data: await connectors.sentinelone!.quarantineThreat(params.threatId),
            }
          },
        }),
      )
    }

    // Jira tools
    if (connectors.jira) {
      tools.push(
        this.createTool({
          name: 'create_security_ticket',
          description: 'Create a Jira issue/ticket for security findings and incidents',
          parameters: {
            projectKey: { type: 'string', description: 'Jira project key (e.g., SEC, SECURITY)' },
            title: { type: 'string', description: 'Ticket title/summary' },
            description: { type: 'string', description: 'Detailed description of the security issue' },
            severity: { type: 'string', description: 'Severity level', enum: ['critical', 'high', 'medium', 'low'] },
            source: { type: 'string', description: 'Source connector that generated the finding' },
          },
          required: ['projectKey', 'title', 'description', 'severity', 'source'],
          handler: async (params) => {
            const required = ['projectKey', 'title', 'description', 'severity', 'source'] as const
            for (const key of required) {
              if (typeof params[key] !== 'string') {
                return { success: false, error: `${key} must be a string` }
              }
            }
            return {
              success: true,
              data: await connectors.jira!.createSecurityTicket(
                params.projectKey as string,
                params.title as string,
                params.description as string,
                params.severity as string,
                params.source as string,
              ),
            }
          },
        }),
      )
    }

    return {
      name: 'SecurityAnalyst',
      description: 'AI agent for security operations - query vulnerabilities, threats, and create tickets',
      model: 'gemini-2.0-pro',
      instructions: 'You are a security analyst assistant. Use the provided tools to query security data from Qualys, SentinelOne, and create Jira tickets for findings. Always prioritize critical severity items.',
      tools,
    }
  }

  // ============================================
  // Create Full Tool Set (All Connectors)
  // ============================================

  static createFullToolSet(connectors: {
    qualys?: unknown
    sentinelone?: unknown
    checkpoint?: unknown
    manageengine?: unknown
    jira?: unknown
    zoho?: unknown
    tenableIo?: unknown
    tenableSc?: unknown
  }): GoogleADKTool[] {
    const tools: GoogleADKTool[] = []

    // Dynamically discover and convert methods to tools
    for (const [connectorName, connector] of Object.entries(connectors)) {
      if (!connector) continue

      const conn = connector as Record<string, unknown>

      for (const [methodName, method] of Object.entries(conn)) {
        if (typeof method === 'function' && !methodName.startsWith('_')) {
          tools.push(
            this.createTool({
              name: `${connectorName}_${methodName}`,
              description: `Execute ${methodName} on ${connectorName} connector`,
              handler: async (params) => ({
                success: true,
                data: await (method as (params?: unknown) => Promise<unknown>)(params),
              }),
            }),
          )
        }
      }
    }

    return tools
  }

  // ============================================
  // Convert to Vertex AI Function Calling Format
  // ============================================

  static toVertexAIFunction(tools: GoogleADKTool[]): Record<string, unknown> {
    return {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: tool.required,
        },
      })),
    }
  }

  // ============================================
  // Execute Tool by Name
  // ============================================

  static async executeTool(
    tools: GoogleADKTool[],
    toolName: string,
    params: Record<string, unknown>,
  ): Promise<GoogleADKToolResult> {
    const tool = tools.find((t) => t.name === toolName)
    if (!tool) {
      return { success: false, error: `Tool '${toolName}' not found` }
    }
    return tool.handler(params)
  }
}

// ============================================
// Global Instance
// ============================================

export const googleADKAdapter = GoogleADKAdapter