// ============================================
// BASE CONNECTOR - Heart of Complyment SDK
// ============================================

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { EventEmitter } from 'events'
import {
    ConnectorConfig,
    ConnectorResponse,
    ConnectorStatus,
    ConnectorEvent,
    HealthCheckResult,
    PaginationOptions,
    PaginatedResponse,
    LogLevel,
} from './types'
import {
    AuthenticationError,
    ConnectionError,
    TimeoutError,
    RateLimitError,
    APIError,
    CircuitBreakerOpenError,
    ConfigurationError,
} from './errors'

// ============================================
// Circuit Breaker State
// ============================================

interface CircuitBreakerState {
    failures: number
    lastFailureTime?: Date
    state: 'closed' | 'open' | 'half-open'
}

// ============================================
// Cache Entry
// ============================================

interface CacheEntry<T> {
    data: T
    expiresAt: Date
    createdAt: Date
}

// ============================================
// Cache Config
// ============================================

const CACHE_MAX_SIZE = 1000  // Maximum cache entries

// ============================================
// Abstract Base Connector
// ============================================

export abstract class BaseConnector extends EventEmitter {
    protected config: ConnectorConfig
    protected httpClient: AxiosInstance
    protected status: ConnectorStatus = ConnectorStatus.DISCONNECTED
    protected accessToken?: string
    protected tokenExpiresAt?: Date

    // Circuit Breaker
    private circuitBreaker: CircuitBreakerState = {
        failures: 0,
        state: 'closed',
    }
    private readonly failureThreshold = 5
    private readonly recoveryTimeMs = 60000 // 1 min

    // Cache
    private cache: Map<string, CacheEntry<unknown>> = new Map()

    // Rate Limiting
    private requestTimestamps: number[] = []

    constructor(config: ConnectorConfig) {
        super()
        this.validateConfig(config)
        this.config = config
        this.httpClient = this.createHttpClient()
        this.log(LogLevel.INFO, `Connector initialized: ${config.name}`)
    }

    // ============================================
    // Abstract Methods - Each connector must implement
    // ============================================

    abstract authenticate(): Promise<void>
    abstract testConnection(): Promise<boolean>

    // ============================================
    // Config Validation
    // ============================================

    private validateConfig(config: ConnectorConfig): void {
        if (!config.name) throw new ConfigurationError('Connector name is required')
        if (!config.baseUrl) throw new ConfigurationError('Base URL is required')
        if (!config.auth) throw new ConfigurationError('Auth config is required')
    }

    // ============================================
    // HTTP Client Setup
    // ============================================

    private createHttpClient(): AxiosInstance {
        const client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout ?? 30000,
            headers: { 'Content-Type': 'application/json' },
        })

        // Request interceptor
        client.interceptors.request.use(async (reqConfig) => {
            await this.injectAuthHeaders(reqConfig)
            this.log(LogLevel.DEBUG, `→ ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`)
            return reqConfig
        })

        // Response interceptor
        client.interceptors.response.use(
            (response) => {
                this.log(LogLevel.DEBUG, `← ${response.status} ${response.config.url}`)
                this.resetCircuitBreaker()
                return response
            },
            async (error) => {
                this.recordCircuitBreakerFailure()
                const status = error.response?.status

                if (status === 401) throw new AuthenticationError(this.config.name)
                if (status === 429) {
                    const retryAfter = error.response?.headers['retry-after']
                    throw new RateLimitError(this.config.name, retryAfter)
                }
                if (error.code === 'ECONNABORTED') {
                    throw new TimeoutError(this.config.name, this.config.timeout ?? 30000)
                }
                if (!error.response) throw new ConnectionError(this.config.name)

                throw new APIError(
                    this.config.name,
                    status,
                    error.response?.data?.message ?? error.message,
                    error.response?.data,
                )
            },
        )

        return client
    }

    // ============================================
    // Auth Header Injection
    // ============================================

    private async injectAuthHeaders(reqConfig: AxiosRequestConfig): Promise<void> {
        const auth = this.config.auth

        switch (auth.type) {
            case 'api_key':
                reqConfig.headers = reqConfig.headers ?? {}
                reqConfig.headers[auth.headerName ?? 'X-API-Key'] = auth.apiKey
                break

            case 'basic': {
                const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
                reqConfig.headers = reqConfig.headers ?? {}
                reqConfig.headers['Authorization'] = `Basic ${encoded}`
                break
            }

            case 'bearer':
                reqConfig.headers = reqConfig.headers ?? {}
                reqConfig.headers['Authorization'] = `Bearer ${auth.token}`
                break

            case 'oauth2':
                if (!this.accessToken || this.isTokenExpired()) {
                    await this.authenticate()
                }
                reqConfig.headers = reqConfig.headers ?? {}
                reqConfig.headers['Authorization'] = `Bearer ${this.accessToken}`
                break
        }
    }

    // ============================================
    // HTTP Methods (with dry run support)
    // ============================================

    protected async get<T>(
        url: string,
        params?: Record<string, unknown>,
        useCache = false,
    ): Promise<ConnectorResponse<T>> {
        if (this.config.dryRun) return this.dryRunResponse<T>('GET', url)

        // Check cache
        if (useCache && this.config.cache?.enabled) {
            const cached = this.getFromCache<T>(url)
            if (cached) {
                this.emit(ConnectorEvent.CACHE_HIT, { url })
                return {
                    success: true,
                    data: cached,
                    timestamp: new Date(),
                    connector: this.config.name,
                    cached: true,
                }
            }
            this.emit(ConnectorEvent.CACHE_MISS, { url })
        }

        return this.executeWithRetry<T>(async () => {
            await this.checkRateLimit()
            this.checkCircuitBreaker()
            const response = await this.httpClient.get<T>(url, { params })

            if (useCache && this.config.cache?.enabled) {
                this.setCache(url, response.data)
            }

            this.emit(ConnectorEvent.DATA_FETCHED, { url, connector: this.config.name })
            return {
                success: true,
                data: response.data,
                statusCode: response.status,
                timestamp: new Date(),
                connector: this.config.name,
            }
        })
    }

    protected async post<T>(
        url: string,
        body?: unknown,
        useCache = false,
    ): Promise<ConnectorResponse<T>> {
        if (this.config.dryRun) return this.dryRunResponse<T>('POST', url)

        // Check cache
        if (useCache && this.config.cache?.enabled) {
            const cacheKey = `POST:${url}:${JSON.stringify(body)}`
            const cached = this.getFromCache<T>(cacheKey)
            if (cached) {
                this.emit(ConnectorEvent.CACHE_HIT, { url })
                return {
                    success: true,
                    data: cached,
                    timestamp: new Date(),
                    connector: this.config.name,
                    cached: true,
                }
            }
            this.emit(ConnectorEvent.CACHE_MISS, { url })
        }

        return this.executeWithRetry<T>(async () => {
            await this.checkRateLimit()
            this.checkCircuitBreaker()
            const response = await this.httpClient.post<T>(url, body)

            if (useCache && this.config.cache?.enabled) {
                const cacheKey = `POST:${url}:${JSON.stringify(body)}`
                this.setCache(cacheKey, response.data)
            }

            return {
                success: true,
                data: response.data,
                statusCode: response.status,
                timestamp: new Date(),
                connector: this.config.name,
            }
        })
    }

    protected async put<T>(
        url: string,
        body?: unknown,
    ): Promise<ConnectorResponse<T>> {
        if (this.config.dryRun) return this.dryRunResponse<T>('PUT', url)

        return this.executeWithRetry<T>(async () => {
            await this.checkRateLimit()
            this.checkCircuitBreaker()
            const response = await this.httpClient.put<T>(url, body)
            return {
                success: true,
                data: response.data,
                statusCode: response.status,
                timestamp: new Date(),
                connector: this.config.name,
            }
        })
    }

    protected async delete<T>(url: string): Promise<ConnectorResponse<T>> {
        if (this.config.dryRun) return this.dryRunResponse<T>('DELETE', url)

        return this.executeWithRetry<T>(async () => {
            await this.checkRateLimit()
            this.checkCircuitBreaker()
            const response = await this.httpClient.delete<T>(url)
            return {
                success: true,
                data: response.data,
                statusCode: response.status,
                timestamp: new Date(),
                connector: this.config.name,
            }
        })
    }

    // ============================================
    // Retry Logic
    // ============================================

    private async executeWithRetry<T>(
        fn: () => Promise<ConnectorResponse<T>>,
        attempt = 1,
    ): Promise<ConnectorResponse<T>> {
        try {
            return await fn()
        } catch (error) {
            const maxRetries = this.config.retries ?? 3

            if (
                attempt < maxRetries &&
                !(error instanceof RateLimitError) &&
                !(error instanceof AuthenticationError) &&
                !(error instanceof CircuitBreakerOpenError)
            ) {
                const delay = Math.pow(2, attempt) * 1000 // exponential backoff
                this.log(LogLevel.WARN, `Retry ${attempt}/${maxRetries} after ${delay}ms`)
                this.emit(ConnectorEvent.RETRY, { attempt, connector: this.config.name })
                await this.sleep(delay)
                return this.executeWithRetry(fn, attempt + 1)
            }

            this.emit(ConnectorEvent.ERROR, { error, connector: this.config.name })
            throw error
        }
    }

    // ============================================
    // Circuit Breaker
    // ============================================

    private checkCircuitBreaker(): void {
        if (this.circuitBreaker.state === 'open') {
            const now = new Date()
            const lastFailure = this.circuitBreaker.lastFailureTime

            if (lastFailure && now.getTime() - lastFailure.getTime() > this.recoveryTimeMs) {
                this.circuitBreaker.state = 'half-open'
                this.log(LogLevel.INFO, 'Circuit breaker: half-open')
            } else {
                throw new CircuitBreakerOpenError(this.config.name)
            }
        }
    }

    private recordCircuitBreakerFailure(): void {
        this.circuitBreaker.failures++
        this.circuitBreaker.lastFailureTime = new Date()

        if (this.circuitBreaker.failures >= this.failureThreshold) {
            this.circuitBreaker.state = 'open'
            this.log(LogLevel.ERROR, 'Circuit breaker: OPEN')
        }
    }

    private resetCircuitBreaker(): void {
        this.circuitBreaker = { failures: 0, state: 'closed' }
    }

    // ============================================
    // Rate Limiting
    // ============================================

    private async checkRateLimit(): Promise<void> {
        if (!this.config.rateLimit) return

        const { requests, perSeconds } = this.config.rateLimit
        const now = Date.now()
        const windowMs = perSeconds * 1000

        this.requestTimestamps = this.requestTimestamps.filter(
            (t) => now - t < windowMs,
        )

        if (this.requestTimestamps.length >= requests) {
            const waitMs = windowMs - (now - this.requestTimestamps[0])
            this.log(LogLevel.WARN, `Rate limit: waiting ${waitMs}ms`)
            this.emit(ConnectorEvent.RATE_LIMITED, { waitMs })
            await this.sleep(waitMs)
        }

        this.requestTimestamps.push(now)
    }

    // ============================================
    // Cache
    // ============================================

    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined
        if (!entry) return null
        if (new Date() > entry.expiresAt) {
            this.cache.delete(key)
            return null
        }
        return entry.data
    }

    private setCache<T>(key: string, data: T): void {
        // Enforce max cache size - evict oldest entries if needed
        if (this.cache.size >= CACHE_MAX_SIZE) {
            this.evictOldestCacheEntries(Math.floor(CACHE_MAX_SIZE * 0.1)) // Evict 10%
        }

        const ttl = (this.config.cache?.ttl ?? 300) * 1000
        const now = new Date()
        this.cache.set(key, {
            data,
            expiresAt: new Date(now.getTime() + ttl),
            createdAt: now,
        })
    }

    private evictOldestCacheEntries(count: number): void {
        // First, remove expired entries
        const now = new Date()
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
            }
        }

        // If still over limit, remove oldest by creation time
        if (this.cache.size >= CACHE_MAX_SIZE) {
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())

            for (let i = 0; i < count && i < entries.length; i++) {
                this.cache.delete(entries[i][0])
            }
        }
    }

    clearCache(): void {
        this.cache.clear()
        this.log(LogLevel.INFO, 'Cache cleared')
    }

    // ============================================
    // Health Check
    // ============================================

    async healthCheck(): Promise<HealthCheckResult> {
        const start = Date.now()
        try {
            const ok = await this.testConnection()
            const latency = Date.now() - start
            this.status = ok ? ConnectorStatus.CONNECTED : ConnectorStatus.DEGRADED
            return {
                connector: this.config.name,
                status: this.status,
                latency,
                checkedAt: new Date(),
            }
        } catch (error) {
            this.status = ConnectorStatus.ERROR
            return {
                connector: this.config.name,
                status: ConnectorStatus.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
                checkedAt: new Date(),
            }
        }
    }

    // ============================================
    // Pagination Helper
    // ============================================

    protected buildPaginatedResponse<T>(
        data: T[],
        total: number,
        options: PaginationOptions,
    ): PaginatedResponse<T> {
        const limit = options.limit ?? 50
        const page = options.page ?? 1
        return {
            data,
            total,
            page,
            limit,
            hasMore: page * limit < total,
        }
    }

    // ============================================
    // Token Helpers
    // ============================================

    protected isTokenExpired(): boolean {
        if (!this.tokenExpiresAt) return true
        return new Date() >= this.tokenExpiresAt
    }

    protected setToken(token: string, expiresInSeconds: number): void {
        this.accessToken = token
        this.tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000)
    }

    // ============================================
    // Dry Run
    // ============================================

    private dryRunResponse<T>(method: string, url: string): ConnectorResponse<T> {
        this.log(LogLevel.INFO, `[DRY RUN] ${method} ${url}`)
        return {
            success: true,
            data: undefined,
            timestamp: new Date(),
            connector: this.config.name,
            dryRun: true,
        }
    }

    // ============================================
    // Logger
    // ============================================

    protected log(level: LogLevel, message: string, meta?: unknown): void {
        if (!this.config.logger) return
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
        const configLevel = levels.indexOf(this.config.logger)
        const msgLevel = levels.indexOf(level)
        if (msgLevel < configLevel) return

        const prefix = `[${this.config.name}] [${level.toUpperCase()}]`
        const log = meta ? `${prefix} ${message} ${JSON.stringify(meta)}` : `${prefix} ${message}`

        switch (level) {
            case LogLevel.ERROR: console.error(log); break
            case LogLevel.WARN: console.warn(log); break
            case LogLevel.DEBUG: console.debug(log); break
            default: console.log(log)
        }
    }

    // ============================================
    // Utility
    // ============================================

    protected sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    getStatus(): ConnectorStatus {
        return this.status
    }

    getConfig(): Omit<ConnectorConfig, 'auth'> {
        const { auth: _, ...safeConfig } = this.config
        return safeConfig
    }
}