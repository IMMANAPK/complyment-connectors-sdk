import fs from 'fs'
import path from 'path'

export interface ConnectorGeneratorToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export class ConnectorGeneratorServer {
  constructor(private readonly rootDir = process.cwd()) {}

  listTools() {
    return [
      'analyze_document',
      'generate_connector',
      'update_connector',
      'list_connectors',
      'get_connector_files',
      'run_typecheck',
      'get_changelog',
    ]
  }

  async analyze_document(input: { text?: string; file?: string; url?: string }): Promise<ConnectorGeneratorToolResult> {
    const { analyzeDocument } = require('../../codegen/analyzer.cjs')
    const { extractUrl } = require('../../codegen/extractors/index.cjs')
    const text = input.text
      ?? (input.url ? await extractUrl(input.url) : fs.readFileSync(path.resolve(this.rootDir, input.file ?? ''), 'utf8'))
    return { success: true, data: await analyzeDocument(text) }
  }

  async generate_connector(input: { text: string; auto?: boolean }): Promise<ConnectorGeneratorToolResult> {
    const { run } = require('../../codegen/pipeline/orchestrator.cjs')
    return { success: true, data: await run({ rootDir: this.rootDir, docText: input.text, autoApprove: input.auto !== false }) }
  }

  async update_connector(input: { text: string; connectorId: string; auto?: boolean }): Promise<ConnectorGeneratorToolResult> {
    const { run } = require('../../codegen/pipeline/orchestrator.cjs')
    return { success: true, data: await run({ rootDir: this.rootDir, docText: input.text, mode: 'update', autoApprove: input.auto !== false }) }
  }

  list_connectors(): ConnectorGeneratorToolResult {
    const registryPath = path.join(this.rootDir, 'playground', 'connectors.registry.cjs')
    delete require.cache[require.resolve(registryPath)]
    return { success: true, data: require(registryPath) }
  }

  get_connector_files(input: { connectorId: string }): ConnectorGeneratorToolResult {
    const dir = path.join(this.rootDir, 'src', 'connectors', input.connectorId)
    if (!fs.existsSync(dir)) return { success: false, error: `Connector not found: ${input.connectorId}` }
    const files: Record<string, string> = {}
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith('.ts')) files[name] = fs.readFileSync(path.join(dir, name), 'utf8')
    }
    return { success: true, data: files }
  }

  run_typecheck(): ConnectorGeneratorToolResult {
    const { runTypecheck } = require('../../codegen/type-checker.cjs')
    return { success: true, data: runTypecheck(this.rootDir) }
  }

  async get_changelog(input: { text: string; connectorId: string }): Promise<ConnectorGeneratorToolResult> {
    const { analyzeDocument } = require('../../codegen/analyzer.cjs')
    const { readExistingConnector, getChangelog } = require('../../codegen/differ.cjs')
    const analysis = await analyzeDocument(input.text)
    return { success: true, data: getChangelog(analysis, readExistingConnector(this.rootDir, input.connectorId)) }
  }
}

export const connectorGeneratorServer = new ConnectorGeneratorServer()
