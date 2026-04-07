// ============================================
// HUMAN-IN-THE-LOOP MANAGER - Complyment Connectors SDK
// ============================================
// Critical actions require human approval
// before AI agents can execute them
// ============================================

export type HITLActionType =
  | 'threat.quarantine'
  | 'threat.kill'
  | 'threat.remediate'
  | 'policy.change'
  | 'policy.delete'
  | 'deployment.create'
  | 'deployment.cancel'
  | 'agent.disconnect'
  | 'rule.add'
  | 'rule.delete'
  | 'scan.launch'

export type HITLStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'executing'
  | 'completed'
  | 'failed'

export type HITLRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface HITLRequest {
  id: string
  actionType: HITLActionType
  connector: string
  description: string
  riskLevel: HITLRiskLevel
  params: Record<string, unknown>
  requestedBy: string       // AI agent name
  requestedAt: Date
  expiresAt: Date
  status: HITLStatus
  approvedBy?: string
  approvedAt?: Date
  rejectedBy?: string
  rejectedReason?: string
  executedAt?: Date
  result?: unknown
  error?: string
}

export interface HITLManagerOptions {
  defaultTimeoutMs?: number       // default: 30 min
  autoApproveRiskLevels?: HITLRiskLevel[]  // auto approve low risk
  onApprovalRequired?: (request: HITLRequest) => void
  onApproved?: (request: HITLRequest) => void
  onRejected?: (request: HITLRequest) => void
  onExpired?: (request: HITLRequest) => void
  onCompleted?: (request: HITLRequest) => void
}

// ============================================
// HITL Manager
// ============================================

export class HITLManager {
  private requests: Map<string, HITLRequest> = new Map()
  private handlers: Map<string, (params: Record<string, unknown>) => Promise<unknown>> = new Map()
  private expiryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()  // Track timers for cleanup

  private readonly defaultTimeoutMs: number
  private readonly autoApproveRiskLevels: HITLRiskLevel[]
  private readonly onApprovalRequired?: (request: HITLRequest) => void
  private readonly onApproved?: (request: HITLRequest) => void
  private readonly onRejected?: (request: HITLRequest) => void
  private readonly onExpired?: (request: HITLRequest) => void
  private readonly onCompleted?: (request: HITLRequest) => void

  constructor(options?: HITLManagerOptions) {
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 30 * 60 * 1000
    this.autoApproveRiskLevels = options?.autoApproveRiskLevels ?? []
    this.onApprovalRequired = options?.onApprovalRequired
    this.onApproved = options?.onApproved
    this.onRejected = options?.onRejected
    this.onExpired = options?.onExpired
    this.onCompleted = options?.onCompleted
  }

  // ============================================
  // Register Action Handler
  // ============================================

  registerHandler(
    actionType: HITLActionType,
    handler: (params: Record<string, unknown>) => Promise<unknown>,
  ): void {
    this.handlers.set(actionType, handler)
  }

  // ============================================
  // Request Approval
  // ============================================

  async requestApproval(options: {
    actionType: HITLActionType
    connector: string
    description: string
    riskLevel: HITLRiskLevel
    params: Record<string, unknown>
    requestedBy: string
    timeoutMs?: number
  }): Promise<HITLRequest> {
    const request: HITLRequest = {
      id: this.generateId(),
      actionType: options.actionType,
      connector: options.connector,
      description: options.description,
      riskLevel: options.riskLevel,
      params: options.params,
      requestedBy: options.requestedBy,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + (options.timeoutMs ?? this.defaultTimeoutMs)),
      status: 'pending',
    }

    this.requests.set(request.id, request)

    // Auto approve if risk level is in auto approve list
    if (this.autoApproveRiskLevels.includes(options.riskLevel)) {
      return this.approve(request.id, 'auto-approve')
    }

    this.onApprovalRequired?.(request)

    // Set expiry timer and store reference for cleanup
    const timerId = setTimeout(() => {
      const req = this.requests.get(request.id)
      if (req && req.status === 'pending') {
        req.status = 'expired'
        this.onExpired?.(req)
      }
      this.expiryTimers.delete(request.id)  // Clean up timer reference
    }, options.timeoutMs ?? this.defaultTimeoutMs)

    this.expiryTimers.set(request.id, timerId)

    return request
  }

  // ============================================
  // Clear Expiry Timer (called when request resolved)
  // ============================================

  private clearExpiryTimer(requestId: string): void {
    const timerId = this.expiryTimers.get(requestId)
    if (timerId) {
      clearTimeout(timerId)
      this.expiryTimers.delete(requestId)
    }
  }

  // ============================================
  // Approve Request
  // ============================================

  async approve(
    requestId: string,
    approvedBy: string,
  ): Promise<HITLRequest> {
    const request = this.requests.get(requestId)
    if (!request) throw new Error(`Request ${requestId} not found`)

    if (request.status === 'expired') {
      throw new Error(`Request ${requestId} has expired`)
    }
    if (request.status !== 'pending') {
      throw new Error(`Request ${requestId} is already ${request.status}`)
    }

    // Clear the expiry timer since request is being resolved
    this.clearExpiryTimer(requestId)

    request.status = 'approved'
    request.approvedBy = approvedBy
    request.approvedAt = new Date()

    this.onApproved?.(request)

    // Execute the action
    return this.execute(request)
  }

  // ============================================
  // Reject Request
  // ============================================

  reject(
    requestId: string,
    rejectedBy: string,
    reason: string,
  ): HITLRequest {
    const request = this.requests.get(requestId)
    if (!request) throw new Error(`Request ${requestId} not found`)

    if (request.status !== 'pending') {
      throw new Error(`Request ${requestId} is already ${request.status}`)
    }

    // Clear the expiry timer since request is being resolved
    this.clearExpiryTimer(requestId)

    request.status = 'rejected'
    request.rejectedBy = rejectedBy
    request.rejectedReason = reason

    this.onRejected?.(request)
    return request
  }

  // ============================================
  // Execute Approved Action
  // ============================================

  private async execute(request: HITLRequest): Promise<HITLRequest> {
    const handler = this.handlers.get(request.actionType)

    if (!handler) {
      request.status = 'failed'
      request.error = `No handler registered for action: ${request.actionType}`
      return request
    }

    request.status = 'executing'
    request.executedAt = new Date()

    try {
      request.result = await handler(request.params)
      request.status = 'completed'
      this.onCompleted?.(request)
    } catch (error) {
      request.status = 'failed'
      request.error = error instanceof Error ? error.message : 'Execution failed'
    }

    return request
  }

  // ============================================
  // Wait for Approval (async polling)
  // ============================================

  async waitForApproval(
    requestId: string,
    pollIntervalMs = 2000,
  ): Promise<HITLRequest> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const request = this.requests.get(requestId)

        if (!request) {
          clearInterval(interval)
          reject(new Error(`Request ${requestId} not found`))
          return
        }

        if (
          request.status === 'completed' ||
          request.status === 'rejected' ||
          request.status === 'failed' ||
          request.status === 'expired'
        ) {
          clearInterval(interval)
          resolve(request)
        }
      }, pollIntervalMs)
    })
  }

  // ============================================
  // Query Requests
  // ============================================

  getPendingRequests(): HITLRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.status === 'pending',
    )
  }

  getRequestById(id: string): HITLRequest | undefined {
    return this.requests.get(id)
  }

  getRequestsByConnector(connector: string): HITLRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.connector === connector,
    )
  }

  getRequestsByStatus(status: HITLStatus): HITLRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.status === status,
    )
  }

  // ============================================
  // Stats
  // ============================================

  getStats() {
    const all = Array.from(this.requests.values())
    return {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending').length,
      approved: all.filter((r) => r.status === 'approved').length,
      rejected: all.filter((r) => r.status === 'rejected').length,
      completed: all.filter((r) => r.status === 'completed').length,
      failed: all.filter((r) => r.status === 'failed').length,
      expired: all.filter((r) => r.status === 'expired').length,
    }
  }

  // ============================================
  // Risk Level Helper
  // ============================================

  static getRiskLevel(actionType: HITLActionType): HITLRiskLevel {
    const riskMap: Record<HITLActionType, HITLRiskLevel> = {
      'threat.quarantine': 'high',
      'threat.kill': 'critical',
      'threat.remediate': 'high',
      'policy.change': 'critical',
      'policy.delete': 'critical',
      'deployment.create': 'medium',
      'deployment.cancel': 'medium',
      'agent.disconnect': 'high',
      'rule.add': 'high',
      'rule.delete': 'critical',
      'scan.launch': 'low',
    }
    return riskMap[actionType] ?? 'medium'
  }

  // ============================================
  // Utility
  // ============================================

  private generateId(): string {
    return `hitl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

// ============================================
// Global HITL Manager
// ============================================

export const hitlManager = new HITLManager({
  autoApproveRiskLevels: ['low'],
  onApprovalRequired: (request) => {
    console.warn(
      `[HITL] Approval required: ${request.actionType} on ${request.connector} (Risk: ${request.riskLevel})`,
    )
  },
})