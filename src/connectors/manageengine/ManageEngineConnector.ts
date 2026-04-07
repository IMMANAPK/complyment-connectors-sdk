// ============================================
// MANAGEENGINE CONNECTOR - Complyment Connectors SDK
// ============================================

import { BaseConnector } from '../../core/BaseConnector'
import {
    ConnectorConfig,
    ConnectorResponse,
    AuthType,
    LogLevel,
} from '../../core/types'
import {
    ManageEngineConfig,
    ManageEnginePatch,
    ManageEnginePatchFilter,
    ManageEnginePatchListResponse,
    ManageEngineComputerFilter,
    ManageEngineComputerListResponse,
} from './types'
import {
    MANAGEENGINE_API_PATHS,
    MANAGEENGINE_DEFAULTS,
    MANAGEENGINE_PATCH_STATUS,
    MANAGEENGINE_SEVERITY,
} from './constants'

export class ManageEngineConnector extends BaseConnector {
    private refreshToken: string
    private clientId: string
    private clientSecret: string

    constructor(meConfig: ManageEngineConfig) {
        const config: ConnectorConfig = {
            name: 'manageengine',
            baseUrl: meConfig.baseUrl,
            auth: {
                type: AuthType.OAUTH2,
                clientId: meConfig.clientId,
                clientSecret: meConfig.clientSecret,
                tokenUrl: `${meConfig.baseUrl}${MANAGEENGINE_API_PATHS.OAUTH_TOKEN}`,
            },
            timeout: meConfig.timeout ?? 30000,
            retries: meConfig.retries ?? 3,
            cache: meConfig.cache,
            dryRun: meConfig.dryRun,
            logger: LogLevel.INFO,
        }
        super(config)
        this.refreshToken = meConfig.refreshToken
        this.clientId = meConfig.clientId
        this.clientSecret = meConfig.clientSecret
    }

    // ============================================
    // Auth - OAuth2 with Refresh Token
    // ============================================

    async authenticate(): Promise<void> {
        const response = await this.post<{
            access_token: string
            expires_in: number
        }>(MANAGEENGINE_API_PATHS.OAUTH_TOKEN, {
            grant_type: 'refresh_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: this.refreshToken,
        })

        if (response.data) {
            this.setToken(response.data.access_token, response.data.expires_in)
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.authenticate()
            await this.get(MANAGEENGINE_API_PATHS.PATCHES, {
                pagenumber: MANAGEENGINE_DEFAULTS.PAGE_NUMBER,
                pagesize: 1,
            })
            return true
        } catch {
            return false
        }
    }

    // ============================================
    // Patch Management
    // ============================================

    async getPatches(
        filter?: ManageEnginePatchFilter,
    ): Promise<ConnectorResponse<ManageEnginePatchListResponse>> {
        const params: Record<string, unknown> = {
            pagenumber: filter?.page ?? MANAGEENGINE_DEFAULTS.PAGE_NUMBER,
            pagesize: filter?.limit ?? MANAGEENGINE_DEFAULTS.PAGE_SIZE,
        }

        if (filter?.severity?.length) params['severity'] = filter.severity.join(',')
        if (filter?.status?.length) params['patchstatus'] = filter.status.join(',')
        if (filter?.rebootRequired !== undefined) params['rebootrequired'] = filter.rebootRequired

        return this.get<ManageEnginePatchListResponse>(
            MANAGEENGINE_API_PATHS.PATCHES,
            params,
        )
    }

    async getMissingPatches(
        computerId?: string,
    ): Promise<ConnectorResponse<ManageEnginePatchListResponse>> {
        const params: Record<string, unknown> = {
            pagenumber: MANAGEENGINE_DEFAULTS.PAGE_NUMBER,
            pagesize: MANAGEENGINE_DEFAULTS.MAX_PAGE_SIZE,
            patchstatus: MANAGEENGINE_PATCH_STATUS.MISSING,
        }

        if (computerId) params['computerid'] = computerId

        return this.get<ManageEnginePatchListResponse>(
            MANAGEENGINE_API_PATHS.PATCHES,
            params,
        )
    }

    async getCriticalPatches(): Promise<ConnectorResponse<ManageEnginePatchListResponse>> {
        return this.getPatches({
            severity: [MANAGEENGINE_SEVERITY.CRITICAL, MANAGEENGINE_SEVERITY.IMPORTANT],
            status: [MANAGEENGINE_PATCH_STATUS.MISSING],
        })
    }

    async getPatchById(
        patchId: string,
    ): Promise<ConnectorResponse<ManageEnginePatch>> {
        return this.get<ManageEnginePatch>(MANAGEENGINE_API_PATHS.PATCH_BY_ID(patchId))
    }

    // ============================================
    // Computer Management
    // ============================================

    async getComputers(
        meFilter?: ManageEngineComputerFilter,
    ): Promise<ConnectorResponse<ManageEngineComputerListResponse>> {
        const params: Record<string, unknown> = {
            pagenumber: meFilter?.page ?? MANAGEENGINE_DEFAULTS.PAGE_NUMBER,
            pagesize: meFilter?.limit ?? MANAGEENGINE_DEFAULTS.PAGE_SIZE,
        }

        if (meFilter?.status?.length) params['status'] = meFilter.status.join(',')
        if (meFilter?.domain) params['domain'] = meFilter.domain
        if (meFilter?.os) params['os'] = meFilter.os
        if (meFilter?.computerName) params['computername'] = meFilter.computerName

        return this.get<ManageEngineComputerListResponse>(
            MANAGEENGINE_API_PATHS.COMPUTERS,
            params,
            true, // cache
        )
    }
}
