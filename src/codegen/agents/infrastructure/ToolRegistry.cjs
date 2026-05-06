'use strict'

/**
 * Central tool registry.
 * Tools are registered by namespace (file, code, test, git, llm).
 * Child agents receive ONLY the tools listed in their allowedTools array.
 */
class ToolRegistry {
  constructor() {
    this._tools = new Map() // 'namespace.name' → { fn, meta }
  }

  /**
   * Register a tool.
   * @param {string} namespace  e.g. 'file'
   * @param {string} name       e.g. 'readFile'
   * @param {Function} fn       the implementation
   * @param {object} meta       { description, params: [{name, type, description}] }
   */
  register(namespace, name, fn, meta = {}) {
    const key = `${namespace}.${name}`
    this._tools.set(key, { fn, meta: { ...meta, namespace, name, fullName: key } })
  }

  /** Get a tool by full name e.g. 'file.readFile' */
  get(fullName) {
    return this._tools.get(fullName)
  }

  /**
   * Returns a scoped tool map for a child agent.
   * Only tools in allowedTools are returned — enforces least-privilege.
   */
  getForAgent(allowedTools = []) {
    const scoped = {}
    for (const toolName of allowedTools) {
      const tool = this._tools.get(toolName)
      if (tool) scoped[toolName] = tool.fn
    }
    return scoped
  }

  list() {
    return [...this._tools.keys()]
  }

  /** Returns tool descriptions for inclusion in LLM system prompts */
  describe(allowedTools = null) {
    const keys = allowedTools || [...this._tools.keys()]
    return keys
      .filter(k => this._tools.has(k))
      .map(k => {
        const { meta } = this._tools.get(k)
        const params = (meta.params || []).map(p => `${p.name}: ${p.type}`).join(', ')
        return `- ${k}(${params}): ${meta.description || ''}`
      })
      .join('\n')
  }
}

// Singleton — loaded once, shared across all agents in the process
const globalRegistry = new ToolRegistry()

/** Auto-loads all tool files and registers them into the global registry */
function loadAllTools(rootDir) {
  const { registerFileTools } = require('../tools/file.tools.cjs')
  const { registerCodeTools } = require('../tools/code.tools.cjs')
  const { registerTestTools } = require('../tools/test.tools.cjs')
  const { registerGitTools  } = require('../tools/git.tools.cjs')
  const { registerLlmTools  } = require('../tools/llm.tools.cjs')

  registerFileTools(globalRegistry, rootDir)
  registerCodeTools(globalRegistry, rootDir)
  registerTestTools(globalRegistry, rootDir)
  registerGitTools(globalRegistry,  rootDir)
  registerLlmTools(globalRegistry)
}

module.exports = { ToolRegistry, globalRegistry, loadAllTools }
