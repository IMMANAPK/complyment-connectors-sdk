// ============================================
// JIRA CONNECTOR - Complyment Connectors SDK
// ============================================

import { BaseConnector } from '../../core/BaseConnector'
import {
  ConnectorConfig,
  ConnectorResponse,
  AuthType,
  LogLevel,
  PaginatedResponse,
} from '../../core/types'
import {
  JiraConfig,
  JiraProject,
  JiraIssue,
  JiraIssueFilter,
  JiraIssueListResponse,
  JiraCreateIssueRequest,
  JiraUpdateIssueRequest,
  JiraComment,
  JiraTransition,
  JiraSprint,
} from './types'
import {
  JIRA_API_PATHS,
  JIRA_AGILE_API_PATHS,
  JIRA_DEFAULTS,
  JIRA_SEVERITY_TO_PRIORITY,
} from './constants'

export class JiraConnector extends BaseConnector {
  constructor(jiraConfig: JiraConfig) {
    const config: ConnectorConfig = {
      name: 'jira',
      baseUrl: jiraConfig.baseUrl,
      auth: {
        type: AuthType.BASIC,
        username: jiraConfig.email,
        password: jiraConfig.apiToken,
      },
      timeout: jiraConfig.timeout ?? 30000,
      retries: jiraConfig.retries ?? 3,
      cache: jiraConfig.cache,
      dryRun: jiraConfig.dryRun,
      logger: LogLevel.INFO,
    }
    super(config)
  }

  // ============================================
  // Auth - Basic Auth (email + apiToken)
  // ============================================

  async authenticate(): Promise<void> {
    // Basic auth handled by BaseConnector
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.get(JIRA_API_PATHS.MYSELF)
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // Projects
  // ============================================

  async getProjects(): Promise<ConnectorResponse<JiraProject[]>> {
    return this.get<JiraProject[]>(
      JIRA_API_PATHS.PROJECT_SEARCH,
      { maxResults: 100 },
      true,
    )
  }

  async getProjectByKey(
    projectKey: string,
  ): Promise<ConnectorResponse<JiraProject>> {
    return this.get<JiraProject>(
      JIRA_API_PATHS.PROJECT_BY_KEY(projectKey),
      {},
      true,
    )
  }

  // ============================================
  // Issues
  // ============================================

  async getIssues(
    filter?: JiraIssueFilter,
  ): Promise<ConnectorResponse<PaginatedResponse<JiraIssue>>> {
    // Build JQL
    const jqlParts: string[] = []

    if (filter?.jql) {
      jqlParts.push(filter.jql)
    } else {
      if (filter?.projectKey) jqlParts.push(`project = "${filter.projectKey}"`)
      if (filter?.status?.length) jqlParts.push(`status in (${filter.status.map((s) => `"${s}"`).join(',')})`)
      if (filter?.priority?.length) jqlParts.push(`priority in (${filter.priority.map((p) => `"${p}"`).join(',')})`)
      if (filter?.issueType?.length) jqlParts.push(`issuetype in (${filter.issueType.map((t) => `"${t}"`).join(',')})`)
      if (filter?.assigneeAccountId) jqlParts.push(`assignee = "${filter.assigneeAccountId}"`)
      if (filter?.labels?.length) jqlParts.push(`labels in (${filter.labels.map((l) => `"${l}"`).join(',')})`)
      if (filter?.createdAfter) jqlParts.push(`created >= "${filter.createdAfter}"`)
      if (filter?.createdBefore) jqlParts.push(`created <= "${filter.createdBefore}"`)
    }

    // New search/jql endpoint requires bounded queries - must have at least one filter
    // Add default filter if none provided
    if (jqlParts.length === 0) {
      jqlParts.push(`created >= -${JIRA_DEFAULTS.DEFAULT_DATE_RANGE_DAYS}d`)
    }

    const jql = jqlParts.join(' AND ') + ' ORDER BY created DESC'
    const fields = JIRA_DEFAULTS.DEFAULT_ISSUE_FIELDS.join(',')

    const response = await this.get<JiraIssueListResponse>(
      JIRA_API_PATHS.ISSUE_SEARCH,
      {
        jql,
        startAt: filter?.startAt ?? 0,
        maxResults: filter?.maxResults ?? JIRA_DEFAULTS.MAX_RESULTS,
        fields,
      },
    )

    if (response.data) {
      const paginated = this.buildPaginatedResponse(
        response.data.issues,
        response.data.total,
        {
          page: Math.floor((filter?.startAt ?? 0) / (filter?.maxResults ?? JIRA_DEFAULTS.MAX_RESULTS)) + 1,
          limit: filter?.maxResults ?? JIRA_DEFAULTS.MAX_RESULTS,
        },
      )
      return { ...response, data: paginated }
    }

    return response as unknown as ConnectorResponse<PaginatedResponse<JiraIssue>>
  }

  async getIssueByKey(
    issueKey: string,
  ): Promise<ConnectorResponse<JiraIssue>> {
    return this.get<JiraIssue>(JIRA_API_PATHS.ISSUE_BY_KEY(issueKey))
  }

  async createIssue(
    request: JiraCreateIssueRequest,
  ): Promise<ConnectorResponse<JiraIssue>> {
    const fields: Record<string, unknown> = {
      project: { key: request.projectKey },
      summary: request.summary,
      issuetype: { name: request.issueType },
    }

    if (request.description) {
      fields['description'] = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: request.description }],
          },
        ],
      }
    }

    if (request.priority) fields['priority'] = { name: request.priority }
    if (request.assigneeAccountId) fields['assignee'] = { accountId: request.assigneeAccountId }
    if (request.labels?.length) fields['labels'] = request.labels
    if (request.dueDate) fields['duedate'] = request.dueDate
    if (request.components?.length) {
      fields['components'] = request.components.map((c) => ({ name: c }))
    }
    if (request.customFields) {
      Object.assign(fields, request.customFields)
    }

    return this.post<JiraIssue>(JIRA_API_PATHS.ISSUE_CREATE, { fields })
  }

  async updateIssue(
    issueKey: string,
    request: JiraUpdateIssueRequest,
  ): Promise<ConnectorResponse<void>> {
    const fields: Record<string, unknown> = {}

    if (request.summary) fields['summary'] = request.summary
    if (request.priority) fields['priority'] = { name: request.priority }
    if (request.assigneeAccountId) fields['assignee'] = { accountId: request.assigneeAccountId }
    if (request.labels?.length) fields['labels'] = request.labels
    if (request.dueDate) fields['duedate'] = request.dueDate

    return this.put(JIRA_API_PATHS.ISSUE_BY_KEY(issueKey), { fields })
  }

  async deleteIssue(issueKey: string): Promise<ConnectorResponse<void>> {
    return this.delete(JIRA_API_PATHS.ISSUE_BY_KEY(issueKey))
  }

  // ============================================
  // Bulk Create - Security findings → Jira tickets
  // ============================================

  async bulkCreateIssues(
    requests: JiraCreateIssueRequest[],
  ): Promise<ConnectorResponse<JiraIssue[]>> {
    const issueUpdates = requests.map((request) => ({
      fields: {
        project: { key: request.projectKey },
        summary: request.summary,
        issuetype: { name: request.issueType },
        ...(request.priority && { priority: { name: request.priority } }),
        ...(request.labels?.length && { labels: request.labels }),
      },
    }))

    return this.post<JiraIssue[]>(JIRA_API_PATHS.ISSUE_BULK_CREATE, { issueUpdates })
  }

  // ============================================
  // Comments
  // ============================================

  async getComments(
    issueKey: string,
  ): Promise<ConnectorResponse<JiraComment[]>> {
    return this.get<JiraComment[]>(JIRA_API_PATHS.ISSUE_COMMENTS(issueKey))
  }

  async addComment(
    issueKey: string,
    body: string,
  ): Promise<ConnectorResponse<JiraComment>> {
    return this.post<JiraComment>(
      JIRA_API_PATHS.ISSUE_COMMENTS(issueKey),
      {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: body }],
            },
          ],
        },
      },
    )
  }

  // ============================================
  // Transitions (Status Change)
  // ============================================

  async getTransitions(
    issueKey: string,
  ): Promise<ConnectorResponse<JiraTransition[]>> {
    return this.get<JiraTransition[]>(JIRA_API_PATHS.ISSUE_TRANSITIONS(issueKey))
  }

  async transitionIssue(
    issueKey: string,
    transitionId: string,
    comment?: string,
  ): Promise<ConnectorResponse<void>> {
    const body: Record<string, unknown> = {
      transition: { id: transitionId },
    }

    if (comment) {
      body['update'] = {
        comment: [
          {
            add: {
              body: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: comment }],
                  },
                ],
              },
            },
          },
        ],
      }
    }

    return this.post(JIRA_API_PATHS.ISSUE_TRANSITIONS(issueKey), body)
  }

  // ============================================
  // Sprints
  // ============================================

  async getSprints(
    boardId: number,
  ): Promise<ConnectorResponse<JiraSprint[]>> {
    return this.get<JiraSprint[]>(
      JIRA_AGILE_API_PATHS.BOARD_SPRINTS(boardId),
      { state: 'active,future' },
      true,
    )
  }

  async getActiveSprint(
    boardId: number,
  ): Promise<ConnectorResponse<JiraSprint | null>> {
    const response = await this.getSprints(boardId)
    const active = response.data?.find((s) => s.state === 'active') ?? null
    return { ...response, data: active }
  }

  // ============================================
  // Security Integration Helper
  // ============================================

  async createSecurityTicket(
    projectKey: string,
    title: string,
    description: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    source: string,
  ): Promise<ConnectorResponse<JiraIssue>> {
    return this.createIssue({
      projectKey,
      summary: `[${source.toUpperCase()}] ${title}`,
      description: `**Source:** ${source}\n**Severity:** ${severity}\n\n${description}`,
      issueType: 'Bug',
      priority: JIRA_SEVERITY_TO_PRIORITY[severity],
      labels: ['security', source, severity],
    })
  }
}
