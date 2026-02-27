"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  APIError: () => APIError,
  AgentOrchestrator: () => AgentOrchestrator,
  AgentWorkflow: () => AgentWorkflow,
  AuditLogger: () => AuditLogger,
  AuthType: () => AuthType,
  AuthenticationError: () => AuthenticationError,
  BaseConnector: () => BaseConnector,
  CacheLayer: () => CacheLayer,
  CheckpointConnector: () => CheckpointConnector,
  CircuitBreaker: () => CircuitBreaker,
  CircuitBreakerOpenError: () => CircuitBreakerOpenError,
  ConfigurationError: () => ConfigurationError,
  ConnectionError: () => ConnectionError,
  ConnectorEvent: () => ConnectorEvent,
  ConnectorRegistry: () => ConnectorRegistry,
  ConnectorStatus: () => ConnectorStatus,
  DuplicatePluginError: () => DuplicatePluginError,
  EnvHandler: () => EnvHandler,
  HITLManager: () => HITLManager,
  InvalidCredentialsError: () => InvalidCredentialsError,
  JiraConnector: () => JiraConnector,
  LangChainAdapter: () => LangChainAdapter,
  LogLevel: () => LogLevel2,
  Logger: () => Logger,
  MCPServer: () => MCPServer,
  ManageEngineConnector: () => ManageEngineConnector,
  NormalizationEngine: () => NormalizationEngine,
  NotFoundError: () => NotFoundError,
  OpenAIAgentsAdapter: () => OpenAIAgentsAdapter,
  PluginNotFoundError: () => PluginNotFoundError,
  QualysConnector: () => QualysConnector,
  QualysScanStatus: () => QualysScanStatus,
  QualysScanType: () => QualysScanType,
  RateLimitError: () => RateLimitError,
  RateLimiter: () => RateLimiter,
  RetryHandler: () => RetryHandler,
  SDKError: () => SDKError,
  SDK_NAME: () => SDK_NAME,
  SDK_VERSION: () => SDK_VERSION,
  SemanticSearch: () => SemanticSearch,
  SentinelOneConnector: () => SentinelOneConnector,
  SlidingWindowRateLimiter: () => SlidingWindowRateLimiter,
  StreamManager: () => StreamManager,
  TimeoutError: () => TimeoutError,
  TokenExpiredError: () => TokenExpiredError,
  Tracer: () => Tracer,
  ValidationError: () => ValidationError,
  VaultHandler: () => VaultHandler,
  VercelAIAdapter: () => VercelAIAdapter,
  WebhookManager: () => WebhookManager,
  ZohoConnector: () => ZohoConnector,
  agentWorkflow: () => agentWorkflow,
  auditLogger: () => auditLogger,
  createQualysMCPTools: () => createQualysMCPTools,
  createSentinelOneMCPTools: () => createSentinelOneMCPTools,
  cvssToSeverity: () => cvssToSeverity,
  detectAssetType: () => detectAssetType,
  envHandler: () => envHandler,
  hitlManager: () => hitlManager,
  isPrivateIP: () => isPrivateIP,
  isQualysScanActive: () => isQualysScanActive,
  isQualysScanTerminal: () => isQualysScanTerminal,
  isValidQualysScanStatus: () => isValidQualysScanStatus,
  logger: () => logger,
  mcpServer: () => mcpServer,
  normalizationEngine: () => normalizationEngine,
  orchestrator: () => orchestrator,
  registry: () => registry,
  semanticSearch: () => semanticSearch,
  tracer: () => tracer,
  validateAssets: () => validateAssets,
  validateQualysScanStatus: () => validateQualysScanStatus,
  validateVulnerabilities: () => validateVulnerabilities,
  withRetry: () => withRetry
});
module.exports = __toCommonJS(index_exports);

// src/core/BaseConnector.ts
var import_axios = __toESM(require("axios"));
var import_events = require("events");

// src/core/types.ts
var AuthType = /* @__PURE__ */ ((AuthType2) => {
  AuthType2["API_KEY"] = "api_key";
  AuthType2["BASIC"] = "basic";
  AuthType2["OAUTH2"] = "oauth2";
  AuthType2["BEARER"] = "bearer";
  AuthType2["VAULT"] = "vault";
  return AuthType2;
})(AuthType || {});
var ConnectorStatus = /* @__PURE__ */ ((ConnectorStatus2) => {
  ConnectorStatus2["CONNECTED"] = "connected";
  ConnectorStatus2["DISCONNECTED"] = "disconnected";
  ConnectorStatus2["DEGRADED"] = "degraded";
  ConnectorStatus2["ERROR"] = "error";
  ConnectorStatus2["CONNECTING"] = "connecting";
  return ConnectorStatus2;
})(ConnectorStatus || {});
var ConnectorEvent = /* @__PURE__ */ ((ConnectorEvent2) => {
  ConnectorEvent2["CONNECTED"] = "connector.connected";
  ConnectorEvent2["DISCONNECTED"] = "connector.disconnected";
  ConnectorEvent2["ERROR"] = "connector.error";
  ConnectorEvent2["DATA_FETCHED"] = "data.fetched";
  ConnectorEvent2["RATE_LIMITED"] = "connector.rate_limited";
  ConnectorEvent2["RETRY"] = "connector.retry";
  ConnectorEvent2["CACHE_HIT"] = "cache.hit";
  ConnectorEvent2["CACHE_MISS"] = "cache.miss";
  return ConnectorEvent2;
})(ConnectorEvent || {});

// src/core/errors.ts
var SDKError = class extends Error {
  constructor(message, code, connector, statusCode) {
    super(message);
    this.code = code;
    this.connector = connector;
    this.statusCode = statusCode;
    this.name = "SDKError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var AuthenticationError = class extends SDKError {
  constructor(connector, message = "Authentication failed") {
    super(message, "AUTH_ERROR", connector, 401);
    this.name = "AuthenticationError";
  }
};
var TokenExpiredError = class extends SDKError {
  constructor(connector) {
    super("Token has expired", "TOKEN_EXPIRED", connector, 401);
    this.name = "TokenExpiredError";
  }
};
var InvalidCredentialsError = class extends SDKError {
  constructor(connector) {
    super("Invalid credentials provided", "INVALID_CREDENTIALS", connector, 403);
    this.name = "InvalidCredentialsError";
  }
};
var ConnectionError = class extends SDKError {
  constructor(connector, message = "Connection failed") {
    super(message, "CONNECTION_ERROR", connector, 503);
    this.name = "ConnectionError";
  }
};
var TimeoutError = class extends SDKError {
  constructor(connector, timeoutMs) {
    super(`Request timed out after ${timeoutMs}ms`, "TIMEOUT", connector, 408);
    this.name = "TimeoutError";
  }
};
var RateLimitError = class extends SDKError {
  constructor(connector, retryAfter) {
    super("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", connector, 429);
    this.retryAfter = retryAfter;
    this.name = "RateLimitError";
  }
};
var ValidationError = class extends SDKError {
  constructor(message, field) {
    super(message, "VALIDATION_ERROR", void 0, 400);
    this.field = field;
    this.name = "ValidationError";
  }
};
var ConfigurationError = class extends SDKError {
  constructor(message, connector) {
    super(message, "CONFIGURATION_ERROR", connector, 400);
    this.name = "ConfigurationError";
  }
};
var APIError = class extends SDKError {
  constructor(connector, statusCode, message, response) {
    super(message, "API_ERROR", connector, statusCode);
    this.response = response;
    this.name = "APIError";
  }
};
var NotFoundError = class extends SDKError {
  constructor(connector, resource) {
    super(`${resource} not found`, "NOT_FOUND", connector, 404);
    this.name = "NotFoundError";
  }
};
var CircuitBreakerOpenError = class extends SDKError {
  constructor(connector) {
    super(
      `Circuit breaker is open for ${connector}. Too many failures.`,
      "CIRCUIT_BREAKER_OPEN",
      connector,
      503
    );
    this.name = "CircuitBreakerOpenError";
  }
};
var PluginNotFoundError = class extends SDKError {
  constructor(connectorName) {
    super(`Connector plugin '${connectorName}' not found`, "PLUGIN_NOT_FOUND");
    this.name = "PluginNotFoundError";
  }
};
var DuplicatePluginError = class extends SDKError {
  constructor(connectorName) {
    super(`Connector plugin '${connectorName}' already registered`, "DUPLICATE_PLUGIN");
    this.name = "DuplicatePluginError";
  }
};

// src/core/BaseConnector.ts
var BaseConnector = class extends import_events.EventEmitter {
  constructor(config) {
    super();
    this.status = "disconnected" /* DISCONNECTED */;
    // Circuit Breaker
    this.circuitBreaker = {
      failures: 0,
      state: "closed"
    };
    this.failureThreshold = 5;
    this.recoveryTimeMs = 6e4;
    // 1 min
    // Cache
    this.cache = /* @__PURE__ */ new Map();
    // Rate Limiting
    this.requestTimestamps = [];
    this.validateConfig(config);
    this.config = config;
    this.httpClient = this.createHttpClient();
    this.log("info" /* INFO */, `Connector initialized: ${config.name}`);
  }
  // ============================================
  // Config Validation
  // ============================================
  validateConfig(config) {
    if (!config.name) throw new ConfigurationError("Connector name is required");
    if (!config.baseUrl) throw new ConfigurationError("Base URL is required");
    if (!config.auth) throw new ConfigurationError("Auth config is required");
  }
  // ============================================
  // HTTP Client Setup
  // ============================================
  createHttpClient() {
    const client = import_axios.default.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout ?? 3e4,
      headers: { "Content-Type": "application/json" }
    });
    client.interceptors.request.use(async (reqConfig) => {
      await this.injectAuthHeaders(reqConfig);
      this.log("debug" /* DEBUG */, `\u2192 ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);
      return reqConfig;
    });
    client.interceptors.response.use(
      (response) => {
        this.log("debug" /* DEBUG */, `\u2190 ${response.status} ${response.config.url}`);
        this.resetCircuitBreaker();
        return response;
      },
      async (error) => {
        this.recordCircuitBreakerFailure();
        const status = error.response?.status;
        if (status === 401) throw new AuthenticationError(this.config.name);
        if (status === 429) {
          const retryAfter = error.response?.headers["retry-after"];
          throw new RateLimitError(this.config.name, retryAfter);
        }
        if (error.code === "ECONNABORTED") {
          throw new TimeoutError(this.config.name, this.config.timeout ?? 3e4);
        }
        if (!error.response) throw new ConnectionError(this.config.name);
        throw new APIError(
          this.config.name,
          status,
          error.response?.data?.message ?? error.message,
          error.response?.data
        );
      }
    );
    return client;
  }
  // ============================================
  // Auth Header Injection
  // ============================================
  async injectAuthHeaders(reqConfig) {
    const auth = this.config.auth;
    switch (auth.type) {
      case "api_key":
        reqConfig.headers = reqConfig.headers ?? {};
        reqConfig.headers[auth.headerName ?? "X-API-Key"] = auth.apiKey;
        break;
      case "basic": {
        const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
        reqConfig.headers = reqConfig.headers ?? {};
        reqConfig.headers["Authorization"] = `Basic ${encoded}`;
        break;
      }
      case "bearer":
        reqConfig.headers = reqConfig.headers ?? {};
        reqConfig.headers["Authorization"] = `Bearer ${auth.token}`;
        break;
      case "oauth2":
        if (!this.accessToken || this.isTokenExpired()) {
          await this.authenticate();
        }
        reqConfig.headers = reqConfig.headers ?? {};
        reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
        break;
    }
  }
  // ============================================
  // HTTP Methods (with dry run support)
  // ============================================
  async get(url, params, useCache = false) {
    if (this.config.dryRun) return this.dryRunResponse("GET", url);
    if (useCache && this.config.cache?.enabled) {
      const cached = this.getFromCache(url);
      if (cached) {
        this.emit("cache.hit" /* CACHE_HIT */, { url });
        return {
          success: true,
          data: cached,
          timestamp: /* @__PURE__ */ new Date(),
          connector: this.config.name,
          cached: true
        };
      }
      this.emit("cache.miss" /* CACHE_MISS */, { url });
    }
    return this.executeWithRetry(async () => {
      await this.checkRateLimit();
      this.checkCircuitBreaker();
      const response = await this.httpClient.get(url, { params });
      if (useCache && this.config.cache?.enabled) {
        this.setCache(url, response.data);
      }
      this.emit("data.fetched" /* DATA_FETCHED */, { url, connector: this.config.name });
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        timestamp: /* @__PURE__ */ new Date(),
        connector: this.config.name
      };
    });
  }
  async post(url, body, useCache = false) {
    if (this.config.dryRun) return this.dryRunResponse("POST", url);
    if (useCache && this.config.cache?.enabled) {
      const cacheKey = `POST:${url}:${JSON.stringify(body)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.emit("cache.hit" /* CACHE_HIT */, { url });
        return {
          success: true,
          data: cached,
          timestamp: /* @__PURE__ */ new Date(),
          connector: this.config.name,
          cached: true
        };
      }
      this.emit("cache.miss" /* CACHE_MISS */, { url });
    }
    return this.executeWithRetry(async () => {
      await this.checkRateLimit();
      this.checkCircuitBreaker();
      const response = await this.httpClient.post(url, body);
      if (useCache && this.config.cache?.enabled) {
        const cacheKey = `POST:${url}:${JSON.stringify(body)}`;
        this.setCache(cacheKey, response.data);
      }
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        timestamp: /* @__PURE__ */ new Date(),
        connector: this.config.name
      };
    });
  }
  async put(url, body) {
    if (this.config.dryRun) return this.dryRunResponse("PUT", url);
    return this.executeWithRetry(async () => {
      await this.checkRateLimit();
      this.checkCircuitBreaker();
      const response = await this.httpClient.put(url, body);
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        timestamp: /* @__PURE__ */ new Date(),
        connector: this.config.name
      };
    });
  }
  async delete(url) {
    if (this.config.dryRun) return this.dryRunResponse("DELETE", url);
    return this.executeWithRetry(async () => {
      await this.checkRateLimit();
      this.checkCircuitBreaker();
      const response = await this.httpClient.delete(url);
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        timestamp: /* @__PURE__ */ new Date(),
        connector: this.config.name
      };
    });
  }
  // ============================================
  // Retry Logic
  // ============================================
  async executeWithRetry(fn, attempt = 1) {
    try {
      return await fn();
    } catch (error) {
      const maxRetries = this.config.retries ?? 3;
      if (attempt < maxRetries && !(error instanceof RateLimitError) && !(error instanceof AuthenticationError) && !(error instanceof CircuitBreakerOpenError)) {
        const delay = Math.pow(2, attempt) * 1e3;
        this.log("warn" /* WARN */, `Retry ${attempt}/${maxRetries} after ${delay}ms`);
        this.emit("connector.retry" /* RETRY */, { attempt, connector: this.config.name });
        await this.sleep(delay);
        return this.executeWithRetry(fn, attempt + 1);
      }
      this.emit("connector.error" /* ERROR */, { error, connector: this.config.name });
      throw error;
    }
  }
  // ============================================
  // Circuit Breaker
  // ============================================
  checkCircuitBreaker() {
    if (this.circuitBreaker.state === "open") {
      const now = /* @__PURE__ */ new Date();
      const lastFailure = this.circuitBreaker.lastFailureTime;
      if (lastFailure && now.getTime() - lastFailure.getTime() > this.recoveryTimeMs) {
        this.circuitBreaker.state = "half-open";
        this.log("info" /* INFO */, "Circuit breaker: half-open");
      } else {
        throw new CircuitBreakerOpenError(this.config.name);
      }
    }
  }
  recordCircuitBreakerFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = /* @__PURE__ */ new Date();
    if (this.circuitBreaker.failures >= this.failureThreshold) {
      this.circuitBreaker.state = "open";
      this.log("error" /* ERROR */, "Circuit breaker: OPEN");
    }
  }
  resetCircuitBreaker() {
    this.circuitBreaker = { failures: 0, state: "closed" };
  }
  // ============================================
  // Rate Limiting
  // ============================================
  async checkRateLimit() {
    if (!this.config.rateLimit) return;
    const { requests, perSeconds } = this.config.rateLimit;
    const now = Date.now();
    const windowMs = perSeconds * 1e3;
    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => now - t < windowMs
    );
    if (this.requestTimestamps.length >= requests) {
      const waitMs = windowMs - (now - this.requestTimestamps[0]);
      this.log("warn" /* WARN */, `Rate limit: waiting ${waitMs}ms`);
      this.emit("connector.rate_limited" /* RATE_LIMITED */, { waitMs });
      await this.sleep(waitMs);
    }
    this.requestTimestamps.push(now);
  }
  // ============================================
  // Cache
  // ============================================
  getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (/* @__PURE__ */ new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  setCache(key, data) {
    const ttl = (this.config.cache?.ttl ?? 300) * 1e3;
    this.cache.set(key, {
      data,
      expiresAt: new Date(Date.now() + ttl)
    });
  }
  clearCache() {
    this.cache.clear();
    this.log("info" /* INFO */, "Cache cleared");
  }
  // ============================================
  // Health Check
  // ============================================
  async healthCheck() {
    const start = Date.now();
    try {
      const ok = await this.testConnection();
      const latency = Date.now() - start;
      this.status = ok ? "connected" /* CONNECTED */ : "degraded" /* DEGRADED */;
      return {
        connector: this.config.name,
        status: this.status,
        latency,
        checkedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      this.status = "error" /* ERROR */;
      return {
        connector: this.config.name,
        status: "error" /* ERROR */,
        message: error instanceof Error ? error.message : "Unknown error",
        checkedAt: /* @__PURE__ */ new Date()
      };
    }
  }
  // ============================================
  // Pagination Helper
  // ============================================
  buildPaginatedResponse(data, total, options) {
    const limit = options.limit ?? 50;
    const page = options.page ?? 1;
    return {
      data,
      total,
      page,
      limit,
      hasMore: page * limit < total
    };
  }
  // ============================================
  // Token Helpers
  // ============================================
  isTokenExpired() {
    if (!this.tokenExpiresAt) return true;
    return /* @__PURE__ */ new Date() >= this.tokenExpiresAt;
  }
  setToken(token, expiresInSeconds) {
    this.accessToken = token;
    this.tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1e3);
  }
  // ============================================
  // Dry Run
  // ============================================
  dryRunResponse(method, url) {
    this.log("info" /* INFO */, `[DRY RUN] ${method} ${url}`);
    return {
      success: true,
      data: void 0,
      timestamp: /* @__PURE__ */ new Date(),
      connector: this.config.name,
      dryRun: true
    };
  }
  // ============================================
  // Logger
  // ============================================
  log(level, message, meta) {
    if (!this.config.logger) return;
    const levels = ["debug" /* DEBUG */, "info" /* INFO */, "warn" /* WARN */, "error" /* ERROR */];
    const configLevel = levels.indexOf(this.config.logger);
    const msgLevel = levels.indexOf(level);
    if (msgLevel < configLevel) return;
    const prefix = `[${this.config.name}] [${level.toUpperCase()}]`;
    const log = meta ? `${prefix} ${message} ${JSON.stringify(meta)}` : `${prefix} ${message}`;
    switch (level) {
      case "error" /* ERROR */:
        console.error(log);
        break;
      case "warn" /* WARN */:
        console.warn(log);
        break;
      case "debug" /* DEBUG */:
        console.debug(log);
        break;
      default:
        console.log(log);
    }
  }
  // ============================================
  // Utility
  // ============================================
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  getStatus() {
    return this.status;
  }
  getConfig() {
    const { auth: _, ...safeConfig } = this.config;
    return safeConfig;
  }
};

// src/core/ConnectorRegistry.ts
var ConnectorRegistry = class {
  constructor() {
    this.connectors = /* @__PURE__ */ new Map();
  }
  // ============================================
  // Register
  // ============================================
  register(name, connector) {
    if (this.connectors.has(name)) {
      throw new DuplicatePluginError(name);
    }
    this.connectors.set(name, connector);
  }
  // ============================================
  // Get
  // ============================================
  get(name) {
    const connector = this.connectors.get(name);
    if (!connector) throw new PluginNotFoundError(name);
    return connector;
  }
  has(name) {
    return this.connectors.has(name);
  }
  unregister(name) {
    this.connectors.delete(name);
  }
  // ============================================
  // Health Check All
  // ============================================
  async healthCheckAll() {
    const results = {};
    await Promise.all(
      Array.from(this.connectors.entries()).map(async ([name, connector]) => {
        results[name] = await connector.healthCheck();
      })
    );
    return results;
  }
  // ============================================
  // List
  // ============================================
  list() {
    return Array.from(this.connectors.keys());
  }
  size() {
    return this.connectors.size;
  }
  clear() {
    this.connectors.clear();
  }
};
var registry = new ConnectorRegistry();

// src/connectors/qualys/types.ts
var QualysScanStatus = /* @__PURE__ */ ((QualysScanStatus2) => {
  QualysScanStatus2["RUNNING"] = "Running";
  QualysScanStatus2["PAUSED"] = "Paused";
  QualysScanStatus2["FINISHED"] = "Finished";
  QualysScanStatus2["ERROR"] = "Error";
  QualysScanStatus2["CANCELED"] = "Canceled";
  QualysScanStatus2["QUEUED"] = "Queued";
  QualysScanStatus2["LOADING"] = "Loading";
  QualysScanStatus2["SUBMITTED"] = "Submitted";
  return QualysScanStatus2;
})(QualysScanStatus || {});
var QualysScanType = /* @__PURE__ */ ((QualysScanType2) => {
  QualysScanType2["VM"] = "VM";
  QualysScanType2["WAS"] = "WAS";
  QualysScanType2["PC"] = "PC";
  return QualysScanType2;
})(QualysScanType || {});
function validateQualysScanStatus(status) {
  if (!status) return null;
  const statusUpper = status.toUpperCase();
  const statusMap = {
    RUNNING: "Running" /* RUNNING */,
    PAUSED: "Paused" /* PAUSED */,
    FINISHED: "Finished" /* FINISHED */,
    ERROR: "Error" /* ERROR */,
    CANCELED: "Canceled" /* CANCELED */,
    CANCELLED: "Canceled" /* CANCELED */,
    QUEUED: "Queued" /* QUEUED */,
    LOADING: "Loading" /* LOADING */,
    SUBMITTED: "Submitted" /* SUBMITTED */
  };
  return statusMap[statusUpper] || null;
}
function isValidQualysScanStatus(status) {
  return validateQualysScanStatus(status) !== null;
}
function isQualysScanTerminal(status) {
  return [
    "Finished" /* FINISHED */,
    "Error" /* ERROR */,
    "Canceled" /* CANCELED */
  ].includes(status);
}
function isQualysScanActive(status) {
  return [
    "Running" /* RUNNING */,
    "Queued" /* QUEUED */,
    "Loading" /* LOADING */,
    "Submitted" /* SUBMITTED */
  ].includes(status);
}

// src/connectors/qualys/constants.ts
var QUALYS_VM_API_PATHS = {
  // Scan Operations
  SCAN_LIST: "/api/3.0/fo/scan/",
  SCAN_LAUNCH: "/api/3.0/fo/scan/",
  SCAN_STATUS: "/api/3.0/fo/scan/",
  SCAN_RESULTS: "/api/3.0/fo/scan/",
  SCAN_PAUSE: "/api/3.0/fo/scan/",
  SCAN_RESUME: "/api/3.0/fo/scan/",
  SCAN_CANCEL: "/api/3.0/fo/scan/",
  SCAN_DELETE: "/api/3.0/fo/scan/",
  // Host Detection
  HOST_DETECTIONS: "/api/4.0/fo/asset/host/vm/detection/",
  // Reports
  REPORT_LIST: "/api/3.0/fo/report/",
  REPORT_LAUNCH: "/api/3.0/fo/report/",
  REPORT_FETCH: "/api/3.0/fo/report/",
  REPORT_DELETE: "/api/3.0/fo/report/",
  // Knowledge Base
  VULN_KB: "/api/3.0/fo/knowledge_base/vuln/",
  // Asset Management
  ASSET_HOST_LIST: "/api/3.0/fo/asset/host/",
  ASSET_GROUP_LIST: "/api/3.0/fo/asset/group/",
  // Option Profiles
  OPTION_PROFILES: "/api/3.0/fo/subscription/option_profile/",
  // QPS API (newer REST API)
  QPS_HOST_ASSET: "/qps/rest/2.0/search/am/hostasset"
};
var QUALYS_WAS_API_PATHS = {
  WAS_SCAN_LIST: "/qps/rest/3.0/search/was/wasscan",
  WAS_SCAN_GET: "/qps/rest/3.0/get/was/wasscan/",
  WAS_SCAN_LAUNCH: "/qps/rest/3.0/launch/was/wasscan/",
  WAS_FINDINGS: "/qps/rest/3.0/search/was/finding",
  WAS_WEBAPPS: "/qps/rest/3.0/search/was/webapp",
  WAS_REPORT_CREATE: "/qps/rest/3.0/create/was/report"
};
var QUALYS_DEFAULTS = {
  DEFAULT_SCAN_TYPE: "VM",
  POLL_INTERVAL_MS: 3e4,
  // 30 seconds
  MAX_POLL_ATTEMPTS: 120,
  // 1 hour maximum
  REQUEST_TIMEOUT_MS: 3e5,
  // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5e3,
  // 5 seconds
  TRUNCATION_LIMIT: 1e3,
  // Max results per request
  KB_FETCH_LIMIT: 100
  // Max QIDs per KB request
};
var QUALYS_HEADERS = {
  XML_CONTENT: {
    "Content-Type": "text/xml",
    "Accept": "application/json"
  },
  FORM_CONTENT: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  DEFAULT: {
    "X-Requested-With": "ComplymentConnectorsSDK"
  }
};

// src/connectors/qualys/parser.ts
function parseHostDetections(response, scanTitle) {
  const vulnerabilities = [];
  const hosts = [];
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };
  const serviceResponse = response?.ServiceResponse || response?.serviceResponse;
  if (serviceResponse) {
    const hostAssets = serviceResponse.data || [];
    if (!Array.isArray(hostAssets) || hostAssets.length === 0) {
      return emptyReport(scanTitle);
    }
    for (const hostData of hostAssets) {
      const hostAsset = hostData.HostAsset || hostData;
      const hostInfo = {
        id: hostAsset.id,
        ip: hostAsset.address,
        dns: hostAsset.dnsHostName || hostAsset.name,
        os: hostAsset.os,
        trackingMethod: hostAsset.trackingMethod,
        lastScanDatetime: hostAsset.vulnsUpdated || hostAsset.lastVulnScan ? new Date(hostAsset.vulnsUpdated || hostAsset.lastVulnScan) : void 0
      };
      hosts.push(hostInfo);
      const vulnList = hostAsset.vuln?.list || [];
      if (!Array.isArray(vulnList) || vulnList.length === 0) {
        continue;
      }
      for (const vulnData of vulnList) {
        const hostAssetVuln = vulnData.HostAssetVuln || vulnData;
        const vulnerability = parseQPSVulnerability(hostAssetVuln, hostInfo);
        vulnerabilities.push(vulnerability);
        incrementSeverityCount(severityCounts, vulnerability.severity);
      }
    }
  } else {
    const hostList = response?.host_list_vm_detection_output?.response?.host_list?.host;
    if (!hostList) {
      return emptyReport(scanTitle);
    }
    const hostsArray = Array.isArray(hostList) ? hostList : [hostList];
    for (const host of hostsArray) {
      const hostInfo = {
        id: host.id,
        ip: host.ip,
        dns: host.dns,
        netbios: host.netbios,
        os: host.os,
        trackingMethod: host.tracking_method,
        lastScanDatetime: host.last_scan_datetime ? new Date(host.last_scan_datetime) : void 0
      };
      hosts.push(hostInfo);
      const detections = host.detection_list?.detection;
      if (!detections) continue;
      const detectionsArray = Array.isArray(detections) ? detections : [detections];
      for (const detection of detectionsArray) {
        const vulnerability = parseDetection(detection, hostInfo);
        vulnerabilities.push(vulnerability);
        incrementSeverityCount(severityCounts, vulnerability.severity);
      }
    }
  }
  return {
    scanTitle,
    hostsScanned: hosts.length,
    totalVulnerabilities: vulnerabilities.length,
    criticalCount: severityCounts.critical,
    highCount: severityCounts.high,
    mediumCount: severityCounts.medium,
    lowCount: severityCounts.low,
    infoCount: severityCounts.info,
    vulnerabilities,
    hosts
  };
}
function parseWASFindings(response, scanTitle) {
  const vulnerabilities = [];
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };
  const findingsList = response?.ServiceResponse?.data;
  if (!findingsList || !Array.isArray(findingsList) || findingsList.length === 0) {
    return emptyReport(scanTitle);
  }
  const webAppsSet = /* @__PURE__ */ new Set();
  for (const findingWrapper of findingsList) {
    const finding = findingWrapper?.Finding;
    if (!finding) continue;
    if (finding.webApp?.url) {
      webAppsSet.add(finding.webApp.url);
    }
    const vulnerability = parseWASFinding(finding);
    vulnerabilities.push(vulnerability);
    incrementSeverityCount(severityCounts, vulnerability.severity);
  }
  return {
    scanTitle,
    hostsScanned: webAppsSet.size,
    totalVulnerabilities: vulnerabilities.length,
    criticalCount: severityCounts.critical,
    highCount: severityCounts.high,
    mediumCount: severityCounts.medium,
    lowCount: severityCounts.low,
    infoCount: severityCounts.info,
    vulnerabilities,
    hosts: Array.from(webAppsSet).map((url) => ({ url }))
  };
}
function parseVulnerabilityKB(response) {
  const kbMap = /* @__PURE__ */ new Map();
  const vulnList = response?.knowledge_base_vuln_list_output?.response?.vuln_list?.vuln;
  if (!vulnList) {
    return kbMap;
  }
  const vulnsArray = Array.isArray(vulnList) ? vulnList : [vulnList];
  for (const vuln of vulnsArray) {
    const qid = parseInt(vuln.qid || "0");
    if (qid === 0) continue;
    const kbEntry = {
      qid,
      title: vuln.title || `QID-${qid}`,
      vulnType: vuln.vuln_type,
      severityLevel: parseInt(vuln.severity_level || "1"),
      category: vuln.category,
      publishedDatetime: vuln.published_datetime,
      patchable: vuln.patchable === "true" || vuln.patchable === true,
      diagnosis: vuln.diagnosis,
      consequence: vuln.consequence,
      solution: vuln.solution,
      cvssBase: vuln.cvss?.base ? parseFloat(vuln.cvss.base) : void 0,
      cvssTemporal: vuln.cvss?.temporal ? parseFloat(vuln.cvss.temporal) : void 0,
      cvss3Base: vuln.cvss_v3?.base ? parseFloat(vuln.cvss_v3.base) : void 0,
      cvss3Temporal: vuln.cvss_v3?.temporal ? parseFloat(vuln.cvss_v3.temporal) : void 0,
      cveList: extractCVEList(vuln.cve_list),
      vendorReferenceList: extractVendorReferences(vuln.vendor_reference_list),
      bugtraqList: extractBugtraqList(vuln.bugtraq_list),
      pciFlag: vuln.pci_flag === "true" || vuln.pci_flag === true,
      pciReasons: extractPCIReasons(vuln.pci_reasons),
      exploitability: vuln.correlation?.exploits ? "Available" : "Unknown",
      associatedMalware: extractMalware(vuln.correlation?.malware)
    };
    kbMap.set(qid, kbEntry);
  }
  return kbMap;
}
function enrichVulnerabilitiesWithKB(vulnerabilities, kbMap) {
  return vulnerabilities.map((vuln) => {
    const kbEntry = kbMap.get(vuln.qid);
    if (!kbEntry) return vuln;
    return {
      ...vuln,
      title: kbEntry.title,
      cvssBase: kbEntry.cvssBase,
      cvssTemporal: kbEntry.cvssTemporal,
      cvss3Base: kbEntry.cvss3Base,
      cvss3Temporal: kbEntry.cvss3Temporal,
      cveList: kbEntry.cveList,
      vendorReferenceList: kbEntry.vendorReferenceList,
      bugtraqList: kbEntry.bugtraqList,
      threat: kbEntry.consequence,
      impact: kbEntry.consequence,
      solution: kbEntry.solution,
      diagnosis: kbEntry.diagnosis,
      consequence: kbEntry.consequence,
      pciFlag: kbEntry.pciFlag,
      pciReasons: kbEntry.pciReasons,
      category: kbEntry.category,
      exploitability: kbEntry.exploitability,
      associatedMalware: kbEntry.associatedMalware,
      patchable: kbEntry.patchable
    };
  });
}
function parseVMScanList(response) {
  const scans = [];
  const serviceResponse = response?.ServiceResponse || response?.serviceResponse;
  if (serviceResponse) {
    let hostAssets = serviceResponse.data || [];
    if (serviceResponse.data?.HostAsset) {
      hostAssets = Array.isArray(serviceResponse.data.HostAsset) ? serviceResponse.data.HostAsset : [serviceResponse.data.HostAsset];
    }
    if (!Array.isArray(hostAssets)) {
      hostAssets = [hostAssets];
    }
    for (const host of hostAssets) {
      let asset = host.HostAsset || host;
      const assetId = asset.id || asset.ID || asset.assetId;
      const assetName = asset.name || asset.Name || asset.hostname || asset.hostName;
      const assetAddress = asset.address || asset.Address || asset.ip || asset.IP;
      const assetDns = asset.dnsHostName || asset.dns || asset.DNS || asset.fqdn;
      const osName = asset.operatingSystem || asset.os || asset.OS;
      const lastScan = asset.lastVulnScan || asset.lastVulnerabilitysScan || asset.lastScan;
      const scan = {
        id: assetId || "",
        scanRef: `asset/${assetId || "unknown"}`,
        title: assetName || `Host: ${assetAddress || assetDns || "Unknown"}`,
        type: "VM" /* VM */,
        target: assetAddress || assetDns || "unknown",
        launchDatetime: lastScan ? new Date(lastScan) : void 0,
        status: lastScan ? "Finished" /* FINISHED */ : "Submitted" /* SUBMITTED */,
        state: lastScan ? "FINISHED" : "UNKNOWN",
        totalVulnerabilities: asset.vulnerabilityStats?.count || asset.vulnCount || 0
      };
      scans.push(scan);
    }
    return scans;
  }
  const scanListOutput = response?.scan_list_output || response?.SCAN_LIST_OUTPUT;
  if (!scanListOutput) return scans;
  const responseData = scanListOutput?.response || scanListOutput?.RESPONSE;
  if (!responseData) return scans;
  const scanList = responseData?.scan_list || responseData?.SCAN_LIST;
  if (!scanList) return scans;
  const scanArray = scanList?.scan || scanList?.SCAN;
  if (!scanArray) return scans;
  const scansToProcess = Array.isArray(scanArray) ? scanArray : [scanArray];
  for (const scanData of scansToProcess) {
    const scan = {
      id: scanData?.ref || scanData?.REF || "",
      scanRef: scanData?.ref || scanData?.REF || "",
      title: scanData?.title || scanData?.TITLE || "",
      type: "VM" /* VM */,
      status: mapQualysStateToStatus(scanData?.state || scanData?.STATE),
      state: scanData?.state || scanData?.STATE,
      target: scanData?.target || scanData?.TARGET,
      userLogin: scanData?.user_login || scanData?.USER_LOGIN,
      assetGroupTitle: scanData?.asset_group_title || scanData?.ASSET_GROUP_TITLE,
      launchDatetime: scanData?.launch_datetime ? new Date(scanData.launch_datetime) : void 0,
      duration: scanData?.duration ? parseInt(scanData.duration) : void 0,
      processed: scanData?.processed ? parseInt(scanData.processed) : void 0,
      total: scanData?.total ? parseInt(scanData.total) : void 0
    };
    scans.push(scan);
  }
  return scans;
}
function parseWASScanList(response) {
  const scans = [];
  const scanData = response?.ServiceResponse?.data;
  if (!scanData || !Array.isArray(scanData)) return scans;
  for (const item of scanData) {
    const wasScan = item.WasScan;
    if (!wasScan) continue;
    const scan = {
      id: wasScan.id || "",
      scanRef: wasScan.reference || `was/${wasScan.id}`,
      title: wasScan.name || "Unnamed WAS Scan",
      type: "WAS" /* WAS */,
      status: mapWASStatusToStatus(wasScan.status),
      state: wasScan.consolidatedStatus || wasScan.status,
      target: wasScan.target?.webApp?.url || "N/A",
      wasScanId: wasScan.id,
      wasScanType: wasScan.type || "VULNERABILITY",
      webAppId: wasScan.target?.webApp?.id,
      webAppName: wasScan.target?.webApp?.name,
      webAppUrl: wasScan.target?.webApp?.url,
      launchDatetime: wasScan.launchedDate ? new Date(wasScan.launchedDate) : void 0,
      duration: wasScan.summary?.testDuration || 0,
      userLogin: wasScan.launchedBy?.username || "Unknown",
      processed: wasScan.summary?.nbRequests || 0,
      total: wasScan.summary?.linksCrawled || 0
    };
    scans.push(scan);
  }
  return scans;
}
function parseScanStatusResponse(response, scanRef) {
  const scanList = response?.scan_list_output?.response?.scan_list?.scan;
  if (!scanList) {
    throw new Error("No scan list found in response");
  }
  const scans = Array.isArray(scanList) ? scanList : [scanList];
  const scan = scans.find((s) => s.ref === scanRef);
  if (!scan) {
    throw new Error(`Scan with reference ${scanRef} not found in response`);
  }
  const state = scan.status?.state || "Unknown";
  const status = mapQualysStateToStatus(state);
  let duration;
  if (scan.duration) {
    if (typeof scan.duration === "string" && scan.duration.includes(":")) {
      const parts = scan.duration.split(":");
      duration = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else {
      duration = parseInt(scan.duration);
    }
  }
  return {
    status,
    state,
    processed: parseInt(scan.processed || "0"),
    total: parseInt(scan.target?.ip?.split(",").length || "0"),
    userLogin: scan.user_login,
    startDatetime: scan.launch_datetime ? new Date(scan.launch_datetime) : void 0,
    duration
  };
}
function extractScanRefFromLaunchResponse(response) {
  const itemList = response?.simple_return?.response?.item_list?.item;
  if (!itemList) {
    throw new Error("Invalid launch response: missing item_list");
  }
  const items = Array.isArray(itemList) ? itemList : [itemList];
  const scanRefItem = items.find(
    (item) => item.key?.toLowerCase() === "id" || item.key === "ID"
  );
  if (!scanRefItem || !scanRefItem.value) {
    throw new Error("Invalid launch response: scan reference not found");
  }
  return scanRefItem.value;
}
function emptyReport(scanTitle) {
  return {
    scanTitle,
    hostsScanned: 0,
    totalVulnerabilities: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    infoCount: 0,
    vulnerabilities: [],
    hosts: []
  };
}
function parseQPSVulnerability(hostAssetVuln, hostInfo) {
  const qid = parseInt(hostAssetVuln.qid || "0");
  const severity = hostAssetVuln.severity ? parseInt(hostAssetVuln.severity) : 3;
  return {
    qid,
    title: `QID-${qid}`,
    severity,
    ip: hostInfo.ip,
    dns: hostInfo.dns,
    netbios: hostInfo.netbios,
    os: hostInfo.os,
    port: hostAssetVuln.port ? parseInt(hostAssetVuln.port) : void 0,
    protocol: hostAssetVuln.protocol,
    ssl: hostAssetVuln.ssl === "true" || hostAssetVuln.ssl === true,
    firstFound: hostAssetVuln.firstFound ? new Date(hostAssetVuln.firstFound) : void 0,
    lastFound: hostAssetVuln.lastFound ? new Date(hostAssetVuln.lastFound) : void 0,
    lastUpdate: hostAssetVuln.lastFound ? new Date(hostAssetVuln.lastFound) : void 0,
    timesFound: 1,
    results: hostAssetVuln.results || "",
    status: hostAssetVuln.status || "Active"
  };
}
function parseDetection(detection, hostInfo) {
  const qid = parseInt(detection.qid || "0");
  const severity = parseInt(detection.severity || "1");
  const ssl = detection.ssl === "true" || detection.ssl === true;
  let port;
  let protocol;
  if (detection.results) {
    const portMatch = detection.results.match(/port\s+(\d+)/i);
    if (portMatch) port = parseInt(portMatch[1]);
    const protocolMatch = detection.results.match(/(tcp|udp)/i);
    if (protocolMatch) protocol = protocolMatch[1].toUpperCase();
  }
  return {
    qid,
    title: `QID-${qid}`,
    severity,
    ip: hostInfo.ip,
    dns: hostInfo.dns,
    netbios: hostInfo.netbios,
    os: hostInfo.os,
    port,
    protocol,
    ssl,
    firstFound: detection.first_found_datetime ? new Date(detection.first_found_datetime) : void 0,
    lastFound: detection.last_found_datetime ? new Date(detection.last_found_datetime) : void 0,
    lastUpdate: detection.last_update_datetime ? new Date(detection.last_update_datetime) : void 0,
    timesFound: parseInt(detection.times_found || "1"),
    results: detection.results,
    status: detection.status || "Unknown"
  };
}
function parseWASFinding(finding) {
  const qid = parseInt(finding.qid || "0");
  const severity = parseInt(finding.severity || "1");
  return {
    qid,
    title: finding.name || `QID-${qid}`,
    severity,
    ip: finding.webApp?.url,
    dns: finding.webApp?.name,
    os: "Web Application",
    protocol: "HTTPS",
    ssl: true,
    firstFound: finding.firstDetectedDate ? new Date(finding.firstDetectedDate) : void 0,
    lastFound: finding.lastDetectedDate ? new Date(finding.lastDetectedDate) : void 0,
    lastUpdate: finding.lastTestedDate ? new Date(finding.lastTestedDate) : void 0,
    timesFound: 1,
    results: `Finding Type: ${finding.type}, Finding ID: ${finding.id || finding.uniqueId}, Potential: ${finding.potential || "false"}`,
    status: finding.status || "Unknown"
  };
}
function incrementSeverityCount(counts, severity) {
  switch (severity) {
    case 5:
      counts.critical++;
      break;
    case 4:
      counts.high++;
      break;
    case 3:
      counts.medium++;
      break;
    case 2:
      counts.low++;
      break;
    case 1:
      counts.info++;
      break;
  }
}
function mapQualysStateToStatus(state) {
  if (!state) return "Submitted" /* SUBMITTED */;
  const stateUpper = state.toUpperCase();
  switch (stateUpper) {
    case "FINISHED":
      return "Finished" /* FINISHED */;
    case "RUNNING":
    case "PROCESSING":
      return "Running" /* RUNNING */;
    case "PAUSED":
      return "Paused" /* PAUSED */;
    case "CANCELED":
    case "CANCELLED":
      return "Canceled" /* CANCELED */;
    case "ERROR":
      return "Error" /* ERROR */;
    case "QUEUED":
    case "LOADING":
    case "SUBMITTED":
      return "Submitted" /* SUBMITTED */;
    default:
      return "Submitted" /* SUBMITTED */;
  }
}
function mapWASStatusToStatus(status) {
  if (!status) return "Submitted" /* SUBMITTED */;
  const statusUpper = status.toUpperCase();
  switch (statusUpper) {
    case "FINISHED":
    case "SUCCESS":
      return "Finished" /* FINISHED */;
    case "RUNNING":
    case "PROCESSING":
    case "SUBMITTED":
    case "QUEUED":
      return "Running" /* RUNNING */;
    case "PAUSED":
      return "Paused" /* PAUSED */;
    case "CANCELED":
    case "CANCELLED":
      return "Canceled" /* CANCELED */;
    case "ERROR":
    case "FAILED":
      return "Error" /* ERROR */;
    default:
      return "Submitted" /* SUBMITTED */;
  }
}
function extractCVEList(cveList) {
  if (!cveList || !cveList.cve) return [];
  const cves = Array.isArray(cveList.cve) ? cveList.cve : [cveList.cve];
  return cves.map((cve) => cve.id || cve).filter(Boolean);
}
function extractVendorReferences(vendorRefList) {
  if (!vendorRefList || !vendorRefList.vendor_reference) return [];
  const refs = Array.isArray(vendorRefList.vendor_reference) ? vendorRefList.vendor_reference : [vendorRefList.vendor_reference];
  return refs.map((ref) => ref.id || ref).filter(Boolean);
}
function extractBugtraqList(bugtraqList) {
  if (!bugtraqList || !bugtraqList.bugtraq) return [];
  const ids = Array.isArray(bugtraqList.bugtraq) ? bugtraqList.bugtraq : [bugtraqList.bugtraq];
  return ids.map((bug) => bug.id || bug).filter(Boolean);
}
function extractPCIReasons(pciReasons) {
  if (!pciReasons || !pciReasons.pci_reason) return [];
  return Array.isArray(pciReasons.pci_reason) ? pciReasons.pci_reason : [pciReasons.pci_reason];
}
function extractMalware(malware) {
  if (!malware || !malware.mw_src) return void 0;
  const sources = Array.isArray(malware.mw_src) ? malware.mw_src : [malware.mw_src];
  const malwareNames = [];
  for (const src of sources) {
    if (src.mw_list?.mw_info) {
      const infos = Array.isArray(src.mw_list.mw_info) ? src.mw_list.mw_info : [src.mw_list.mw_info];
      infos.forEach((info) => {
        if (info.mw_alias) malwareNames.push(info.mw_alias);
      });
    }
  }
  return malwareNames.length > 0 ? malwareNames.join(", ") : void 0;
}

// src/connectors/qualys/QualysConnector.ts
var QualysConnector = class extends BaseConnector {
  constructor(qualysConfig) {
    const config = {
      name: "qualys",
      baseUrl: qualysConfig.baseUrl,
      auth: {
        type: "basic" /* BASIC */,
        username: qualysConfig.username,
        password: qualysConfig.password
      },
      timeout: qualysConfig.timeout ?? QUALYS_DEFAULTS.REQUEST_TIMEOUT_MS,
      retries: qualysConfig.retries ?? QUALYS_DEFAULTS.MAX_RETRIES,
      cache: qualysConfig.cache,
      dryRun: qualysConfig.dryRun,
      logger: "info" /* INFO */
    };
    super(config);
    this.qualysConfig = qualysConfig;
  }
  // ============================================
  // Auth - Basic Auth (handled by BaseConnector)
  // ============================================
  async authenticate() {
  }
  async testConnection() {
    try {
      await this.makeFormRequest(QUALYS_VM_API_PATHS.SCAN_LIST, { action: "list" });
      return true;
    } catch {
      return false;
    }
  }
  // ============================================
  // VM Scan Operations (Production-tested)
  // ============================================
  /**
   * Launch a VM (Vulnerability Management) scan
   */
  async launchVMScan(params) {
    const requestParams = {
      action: "launch",
      scan_title: params.scanTitle
    };
    if (params.optionTitle) requestParams.option_title = params.optionTitle;
    if (params.optionId) requestParams.option_id = params.optionId;
    if (params.ip) requestParams.ip = params.ip;
    if (params.assetGroups) requestParams.asset_groups = params.assetGroups;
    if (params.assetGroupIds) requestParams.asset_group_ids = params.assetGroupIds;
    if (params.excludeIpPerScan) requestParams.exclude_ip_per_scan = params.excludeIpPerScan;
    if (params.priority !== void 0) requestParams.priority = params.priority;
    if (params.iscannerName) requestParams.iscanner_name = params.iscannerName;
    if (params.iscannerId) requestParams.iscanner_id = params.iscannerId;
    if (params.defaultScanner !== void 0) requestParams.default_scanner = params.defaultScanner;
    const response = await this.makeFormRequest(QUALYS_VM_API_PATHS.SCAN_LAUNCH, requestParams);
    const scanRef = extractScanRefFromLaunchResponse(response);
    return {
      success: true,
      data: {
        scanRef,
        scanTitle: params.scanTitle,
        status: "Submitted" /* SUBMITTED */,
        message: "Scan launched successfully"
      },
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  /**
   * Get scan status
   */
  async getVMScanStatus(scanRef) {
    const response = await this.makeFormRequest(QUALYS_VM_API_PATHS.SCAN_STATUS, {
      action: "list",
      scan_ref: scanRef
    });
    const scanInfo = parseScanStatusResponse(response, scanRef);
    const progress = scanInfo.total > 0 ? Math.round(scanInfo.processed / scanInfo.total * 100) : 0;
    return {
      success: true,
      data: {
        scanRef,
        status: scanInfo.status,
        state: scanInfo.state,
        processed: scanInfo.processed,
        total: scanInfo.total,
        progress,
        startDatetime: scanInfo.startDatetime,
        duration: scanInfo.duration,
        userLogin: scanInfo.userLogin
      },
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  /**
   * Cancel a running scan
   */
  async cancelVMScan(scanRef) {
    await this.makeFormRequest(QUALYS_VM_API_PATHS.SCAN_CANCEL, {
      action: "cancel",
      scan_ref: scanRef
    });
    return {
      success: true,
      data: {
        scanRef,
        message: "Scan canceled successfully"
      },
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  /**
   * List VM scans
   */
  async listVMScans(filters) {
    try {
      const requestParams = { action: "list" };
      if (filters?.state) requestParams.state = filters.state;
      if (filters?.scanRef) requestParams.scan_ref = filters.scanRef;
      if (filters?.launchedAfterDatetime) requestParams.launched_after_datetime = filters.launchedAfterDatetime;
      if (filters?.launchedBeforeDatetime) requestParams.launched_before_datetime = filters.launchedBeforeDatetime;
      const response = await this.get(QUALYS_VM_API_PATHS.SCAN_LIST, requestParams);
      const scans = parseVMScanList(response.data);
      return {
        success: true,
        data: { scans },
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    } catch (legacyError) {
      const qpsResponse = await this.makeQPSRequest(QUALYS_VM_API_PATHS.QPS_HOST_ASSET, {
        limitResults: 100,
        filterCriteria: '<Criteria field="lastVulnScan" operator="GREATER">2000-01-01</Criteria>'
      });
      const scans = parseVMScanList(qpsResponse);
      return {
        success: true,
        data: { scans },
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
  }
  // ============================================
  // Host Detections / Vulnerabilities (Production-tested)
  // ============================================
  /**
   * Fetch host detections (vulnerabilities) from Qualys
   * Uses hybrid approach: QPS API for asset_id, Legacy API for scan_ref
   */
  async fetchHostDetections(params) {
    const requiresLegacyAPI = params.scanRef !== void 0;
    const requiresQPSAPI = params.assetId !== void 0;
    if (requiresQPSAPI || !requiresLegacyAPI) {
      try {
        let filterCriteria = '<Criteria field="vulnerabilityCount" operator="GREATER">0</Criteria>';
        if (params.assetId) {
          filterCriteria = `<Criteria field="id" operator="EQUALS">${params.assetId}</Criteria>`;
        }
        const response2 = await this.makeQPSRequest(QUALYS_VM_API_PATHS.QPS_HOST_ASSET, {
          limitResults: 100,
          filterCriteria
        });
        const parsed2 = parseHostDetections(response2, "Host Detections");
        return {
          success: true,
          data: parsed2,
          timestamp: /* @__PURE__ */ new Date(),
          connector: "qualys"
        };
      } catch (qpsError) {
        if (requiresQPSAPI) throw qpsError;
      }
    }
    const requestParams = {
      action: "list",
      truncation_limit: QUALYS_DEFAULTS.TRUNCATION_LIMIT
    };
    if (params.scanRef) requestParams.scan_ref = params.scanRef;
    if (params.ips) requestParams.ips = params.ips;
    if (params.agIds) requestParams.ag_ids = params.agIds;
    if (params.showIgs !== void 0) requestParams.show_igs = params.showIgs;
    if (params.status) requestParams.status = params.status;
    if (params.severities) requestParams.severities = params.severities;
    const response = await this.makeFormRequest(QUALYS_VM_API_PATHS.HOST_DETECTIONS, requestParams);
    const parsed = parseHostDetections(response, params.scanRef || "Host Detections");
    return {
      success: true,
      data: parsed,
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  /**
   * Fetch vulnerability knowledge base data
   */
  async fetchVulnerabilityKB(qids) {
    try {
      const limitedQids = qids.slice(0, QUALYS_DEFAULTS.KB_FETCH_LIMIT);
      const response = await this.makeFormRequest(QUALYS_VM_API_PATHS.VULN_KB, {
        action: "list",
        ids: limitedQids.join(","),
        details: "All"
      });
      const kbMap = parseVulnerabilityKB(response);
      return {
        success: true,
        data: kbMap,
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    } catch (error) {
      return {
        success: true,
        data: /* @__PURE__ */ new Map(),
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
  }
  // ============================================
  // WAS (Web Application Scanning) Operations
  // ============================================
  /**
   * List WAS scans
   */
  async listWASScans(filters) {
    let filterXml = "";
    if (filters && Object.keys(filters).length > 0) {
      filterXml = "<filters>" + Object.entries(filters).map(
        ([key, value]) => `<Criteria field="${key}" operator="EQUALS">${value}</Criteria>`
      ).join("") + "</filters>";
    }
    const response = await this.makeWASRequest(QUALYS_WAS_API_PATHS.WAS_SCAN_LIST, filterXml);
    const scans = parseWASScanList(response);
    return {
      success: true,
      data: { scans },
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  /**
   * List WAS findings (vulnerabilities)
   */
  async listWASFindings(filters) {
    let filterXml = "";
    if (filters && Object.keys(filters).length > 0) {
      const criteriaElements = Object.entries(filters).map(([key, value]) => {
        const field = key === "webAppId" ? "webApp.id" : key;
        return `<Criteria field="${field}" operator="EQUALS">${value}</Criteria>`;
      }).join("");
      filterXml = `<filters>${criteriaElements}</filters>`;
    }
    const response = await this.makeWASRequest(QUALYS_WAS_API_PATHS.WAS_FINDINGS, filterXml);
    const parsed = parseWASFindings(response, "WAS Findings");
    return {
      success: true,
      data: parsed,
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  // ============================================
  // High-Level Operations
  // ============================================
  /**
   * Get scan results with KB enrichment
   */
  async getScanResults(scanRef, enrichWithKB = true) {
    const detectionsResponse = await this.fetchHostDetections({
      scanRef,
      showIgs: 0
    });
    if (!detectionsResponse.success || !detectionsResponse.data) {
      return {
        success: false,
        data: void 0,
        error: "Failed to fetch detections",
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
    let report = detectionsResponse.data;
    if (enrichWithKB && report.vulnerabilities.length > 0) {
      const uniqueQIDs = [...new Set(report.vulnerabilities.map((v) => v.qid))];
      const kbResponse = await this.fetchVulnerabilityKB(uniqueQIDs);
      if (kbResponse.success && kbResponse.data && kbResponse.data.size > 0) {
        report = {
          ...report,
          vulnerabilities: enrichVulnerabilitiesWithKB(report.vulnerabilities, kbResponse.data)
        };
      }
    }
    return {
      success: true,
      data: report,
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  /**
   * Poll scan until completion
   */
  async pollScanUntilComplete(scanRef, options) {
    const pollInterval = options?.pollIntervalMs || QUALYS_DEFAULTS.POLL_INTERVAL_MS;
    const maxAttempts = options?.maxAttempts || QUALYS_DEFAULTS.MAX_POLL_ATTEMPTS;
    let attempts = 0;
    while (attempts < maxAttempts) {
      const statusResponse = await this.getVMScanStatus(scanRef);
      if (!statusResponse.success || !statusResponse.data) {
        return {
          success: false,
          data: void 0,
          error: "Failed to get scan status during polling",
          timestamp: /* @__PURE__ */ new Date(),
          connector: "qualys"
        };
      }
      const status = statusResponse.data;
      if (options?.onProgress) {
        options.onProgress(status);
      }
      if (isQualysScanTerminal(status.status)) {
        return statusResponse;
      }
      await this.delay(pollInterval);
      attempts++;
    }
    return {
      success: false,
      data: void 0,
      error: `Scan polling exceeded max attempts (${maxAttempts})`,
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  /**
   * Trigger scan and wait for results
   */
  async triggerScanAndWait(params, options) {
    const launchResponse = await this.launchVMScan(params);
    if (!launchResponse.success || !launchResponse.data) {
      return {
        success: false,
        data: void 0,
        error: "Failed to launch scan",
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
    const { scanRef } = launchResponse.data;
    const finalStatus = await this.pollScanUntilComplete(scanRef, {
      pollIntervalMs: options?.pollIntervalMs,
      maxAttempts: options?.maxAttempts,
      onProgress: options?.onProgress
    });
    if (!finalStatus.success || finalStatus.data?.status !== "Finished" /* FINISHED */) {
      return {
        success: false,
        data: void 0,
        error: `Scan did not complete successfully: ${finalStatus.data?.status || "Unknown"}`,
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
    return this.getScanResults(scanRef, options?.enrichWithKB ?? true);
  }
  // ============================================
  // Asset Management (Original + Enhanced)
  // ============================================
  async getAssets(filter) {
    try {
      const response = await this.makeQPSRequest(QUALYS_VM_API_PATHS.QPS_HOST_ASSET, {
        limitResults: filter?.limit || 100,
        filterCriteria: ""
      });
      const serviceResponse = response?.ServiceResponse;
      const hostAssets = serviceResponse?.data || [];
      const assets = hostAssets.map((item) => {
        const asset = item.HostAsset || item;
        return {
          id: asset.id || "",
          hostname: asset.name || asset.hostname || "",
          ipAddress: asset.address || asset.ip || "",
          os: asset.os || asset.operatingSystem || "",
          type: "Host",
          lastSeen: asset.lastVulnScan || asset.vulnsUpdated || "",
          vulnerabilityCount: asset.vulnerabilityStats?.count || asset.vulnCount || 0
        };
      });
      const paginated = this.buildPaginatedResponse(
        assets,
        assets.length,
        { page: filter?.page, limit: filter?.limit }
      );
      return {
        success: true,
        data: paginated,
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    } catch (error) {
      return {
        success: false,
        data: void 0,
        error: error.message,
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
  }
  async getAssetById(assetId) {
    const response = await this.makeQPSRequest(QUALYS_VM_API_PATHS.QPS_HOST_ASSET, {
      limitResults: 1,
      filterCriteria: `<Criteria field="id" operator="EQUALS">${assetId}</Criteria>`
    });
    const serviceResponse = response?.ServiceResponse;
    const hostAssets = serviceResponse?.data || [];
    if (hostAssets.length === 0) {
      return {
        success: false,
        data: void 0,
        error: "Asset not found",
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
    const asset = hostAssets[0].HostAsset || hostAssets[0];
    return {
      success: true,
      data: {
        id: asset.id || "",
        hostname: asset.name || asset.hostname || "",
        ipAddress: asset.address || asset.ip || "",
        os: asset.os || asset.operatingSystem || "",
        type: "Host",
        lastSeen: asset.lastVulnScan || asset.vulnsUpdated || "",
        vulnerabilityCount: asset.vulnerabilityStats?.count || asset.vulnCount || 0
      },
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  // ============================================
  // Vulnerability Management (Original + Enhanced)
  // ============================================
  async getVulnerabilities(filter) {
    const detectionsParams = {};
    if (filter?.severity?.length) detectionsParams.severities = filter.severity.join(",");
    if (filter?.status?.length) detectionsParams.status = filter.status.join(",");
    if (filter?.ipAddress) detectionsParams.ips = filter.ipAddress;
    const response = await this.fetchHostDetections(detectionsParams);
    if (!response.success || !response.data) {
      return {
        success: false,
        data: void 0,
        error: response.error || "Failed to fetch vulnerabilities",
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
    const paginated = this.buildPaginatedResponse(
      response.data.vulnerabilities,
      response.data.totalVulnerabilities,
      { page: filter?.page, limit: filter?.limit }
    );
    return {
      success: true,
      data: paginated,
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  async getCriticalVulnerabilities() {
    return this.getVulnerabilities({
      severity: [4, 5],
      status: ["Active", "New"]
    });
  }
  // ============================================
  // Scan Management (Original - using new methods)
  // ============================================
  async getScans(filter) {
    const response = await this.listVMScans(filter);
    if (!response.success || !response.data) {
      return {
        success: false,
        data: void 0,
        error: response.error || "Failed to list scans",
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
    const paginated = this.buildPaginatedResponse(
      response.data.scans,
      response.data.scans.length,
      { page: filter?.page, limit: filter?.limit }
    );
    return {
      success: true,
      data: paginated,
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  async launchScan(title, targetHosts, optionProfileId) {
    const response = await this.launchVMScan({
      scanTitle: title,
      ip: targetHosts.join(","),
      optionId: parseInt(optionProfileId)
    });
    if (!response.success || !response.data) {
      return {
        success: false,
        data: void 0,
        error: response.error || "Failed to launch scan",
        timestamp: /* @__PURE__ */ new Date(),
        connector: "qualys"
      };
    }
    return {
      success: true,
      data: {
        id: response.data.scanRef,
        scanRef: response.data.scanRef,
        title: response.data.scanTitle,
        status: response.data.status,
        type: "VM" /* VM */,
        target: targetHosts.join(",")
      },
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  async cancelScan(scanId) {
    const response = await this.cancelVMScan(scanId);
    return {
      success: response.success,
      data: void 0,
      error: response.error,
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  // ============================================
  // Reports (Original)
  // ============================================
  async getReports() {
    return this.get("/api/2.0/fo/report/", { action: "list" });
  }
  async downloadReport(reportId) {
    return this.get("/api/2.0/fo/report/", {
      action: "fetch",
      id: reportId
    });
  }
  // ============================================
  // Compliance (Original)
  // ============================================
  async getComplianceControls() {
    return this.get("/api/2.0/fo/compliance/control/", { action: "list" });
  }
  // ============================================
  // Normalization - Maps to SDK standard format
  // ============================================
  async getNormalizedVulnerabilities(filter) {
    const response = await this.getVulnerabilities(filter);
    if (!response.data) {
      return { ...response, data: [] };
    }
    const normalized = response.data.data.map(
      (vuln) => ({
        id: String(vuln.qid),
        title: vuln.title,
        severity: this.mapSeverity(vuln.severity),
        cvss: vuln.cvss3Base ?? vuln.cvssBase,
        cve: vuln.cveList?.[0],
        affectedAsset: vuln.dns ?? vuln.ip ?? "unknown",
        source: "qualys",
        detectedAt: vuln.firstFound ? new Date(vuln.firstFound) : /* @__PURE__ */ new Date(),
        raw: vuln
      })
    );
    return { ...response, data: normalized };
  }
  async getNormalizedAssets(filter) {
    const response = await this.getAssets(filter);
    if (!response.data) {
      return { ...response, data: [] };
    }
    const normalized = response.data.data.map((asset) => ({
      id: asset.id,
      hostname: asset.hostname,
      ipAddress: asset.ipAddress,
      os: asset.os,
      type: "server",
      source: "qualys",
      lastSeen: new Date(asset.lastSeen),
      raw: asset
    }));
    return { ...response, data: normalized };
  }
  // ============================================
  // Private HTTP Methods (Form-encoded for Qualys)
  // ============================================
  async makeFormRequest(endpoint, params) {
    const formData = Object.entries(params).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&");
    const response = await this.postRaw(endpoint, formData, {
      "Content-Type": "application/x-www-form-urlencoded",
      ...QUALYS_HEADERS.DEFAULT
    });
    return response.data;
  }
  async makeQPSRequest(endpoint, options) {
    const xmlBody = `<ServiceRequest>
      <preferences>
        <limitResults>${options.limitResults || 100}</limitResults>
      </preferences>
      <filters>
        ${options.filterCriteria || ""}
      </filters>
    </ServiceRequest>`;
    const response = await this.postRaw(endpoint, xmlBody, {
      "Content-Type": "text/xml",
      "Accept": "application/json",
      ...QUALYS_HEADERS.DEFAULT
    });
    return response.data;
  }
  async makeWASRequest(endpoint, filterXml = "") {
    const xmlBody = `<ServiceRequest>${filterXml}</ServiceRequest>`;
    const response = await this.postRaw(endpoint, xmlBody, {
      "Content-Type": "text/xml",
      "Accept": "application/json",
      ...QUALYS_HEADERS.DEFAULT
    });
    return response.data;
  }
  // Post with raw body and custom headers
  async postRaw(url, body, headers) {
    const httpClient = this.httpClient;
    const response = await httpClient.post(url, body, { headers });
    return {
      success: true,
      data: response.data,
      statusCode: response.status,
      timestamp: /* @__PURE__ */ new Date(),
      connector: "qualys"
    };
  }
  // ============================================
  // Private Helpers
  // ============================================
  mapSeverity(severity) {
    const map = {
      5: "critical",
      4: "high",
      3: "medium",
      2: "low",
      1: "info"
    };
    return map[severity];
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};

// src/connectors/sentinelone/SentinelOneConnector.ts
var SentinelOneConnector = class extends BaseConnector {
  constructor(s1Config) {
    const config = {
      name: "sentinelone",
      baseUrl: s1Config.baseUrl,
      auth: {
        type: "api_key" /* API_KEY */,
        apiKey: s1Config.apiToken,
        headerName: "Authorization"
      },
      timeout: s1Config.timeout ?? 3e4,
      retries: s1Config.retries ?? 3,
      cache: s1Config.cache,
      dryRun: s1Config.dryRun,
      logger: "info" /* INFO */
    };
    super(config);
  }
  // ============================================
  // Auth
  // ============================================
  async authenticate() {
  }
  async testConnection() {
    try {
      await this.get("/web/api/v2.1/system/status");
      return true;
    } catch {
      return false;
    }
  }
  // ============================================
  // Agents (Endpoints)
  // ============================================
  async getAgents(filter) {
    const params = {
      limit: filter?.limit ?? 50
    };
    if (filter?.status?.length) params["isActive"] = filter.status.includes("connected");
    if (filter?.infected !== void 0) params["infected"] = filter.infected;
    if (filter?.osName) params["osTypes"] = filter.osName;
    if (filter?.computerName) params["computerName"] = filter.computerName;
    if (filter?.cursor) params["cursor"] = filter.cursor;
    return this.get(
      "/web/api/v2.1/agents",
      params,
      true
      // cache
    );
  }
  async getAgentById(agentId) {
    return this.get(`/web/api/v2.1/agents/${agentId}`);
  }
  async getInfectedAgents() {
    return this.getAgents({ infected: true });
  }
  async disconnectAgentFromNetwork(agentId) {
    return this.post(`/web/api/v2.1/agents/${agentId}/actions/disconnect`);
  }
  async reconnectAgentToNetwork(agentId) {
    return this.post(`/web/api/v2.1/agents/${agentId}/actions/connect`);
  }
  async initiateAgentScan(agentId) {
    return this.post(`/web/api/v2.1/agents/${agentId}/actions/initiate-scan`);
  }
  // ============================================
  // Threats
  // ============================================
  async getThreats(filter) {
    const params = {
      limit: filter?.limit ?? 50
    };
    if (filter?.status?.length) params["mitigationStatuses"] = filter.status.join(",");
    if (filter?.severity?.length) params["severities"] = filter.severity.join(",");
    if (filter?.confidenceLevel?.length) params["confidenceLevels"] = filter.confidenceLevel.join(",");
    if (filter?.agentId) params["agentIds"] = filter.agentId;
    if (filter?.cursor) params["cursor"] = filter.cursor;
    if (filter?.createdAfter) params["createdAt__gte"] = filter.createdAfter;
    if (filter?.createdBefore) params["createdAt__lte"] = filter.createdBefore;
    return this.get(
      "/web/api/v2.1/threats",
      params
    );
  }
  async getActiveThreatCount() {
    const response = await this.getThreats({ status: ["active"] });
    return response.data?.pagination.totalItems ?? 0;
  }
  async getCriticalThreats() {
    return this.getThreats({
      severity: ["critical", "high"],
      status: ["active", "suspicious"]
    });
  }
  // ============================================
  // Mitigation
  // ============================================
  async mitigateThreats(request) {
    return this.post(
      `/web/api/v2.1/threats/mitigate/${request.action}`,
      { filter: { ids: request.threatIds } }
    );
  }
  async quarantineThreat(threatId) {
    return this.mitigateThreats({
      threatIds: [threatId],
      action: "quarantine"
    });
  }
  async killThreat(threatId) {
    return this.mitigateThreats({
      threatIds: [threatId],
      action: "kill"
    });
  }
  async remediateThreat(threatId) {
    return this.mitigateThreats({
      threatIds: [threatId],
      action: "remediate"
    });
  }
  // ============================================
  // Activities
  // ============================================
  async getActivities(limit = 50) {
    return this.get("/web/api/v2.1/activities", {
      limit,
      sortBy: "createdAt",
      sortOrder: "desc"
    });
  }
  // ============================================
  // Groups & Sites
  // ============================================
  async getGroups() {
    return this.get("/web/api/v2.1/groups", {
      limit: 100
    }, true);
  }
  async getSites() {
    return this.get("/web/api/v2.1/sites", {
      limit: 100
    }, true);
  }
  // ============================================
  // Normalization
  // ============================================
  async getNormalizedThreats(filter) {
    const response = await this.getThreats(filter);
    if (!response.data) return { ...response, data: [] };
    const normalized = response.data.data.map((threat) => ({
      id: threat.id,
      name: threat.threatName,
      severity: threat.severity,
      status: this.mapThreatStatus(threat.mitigationStatus),
      affectedAsset: threat.agentComputerName,
      source: "sentinelone",
      detectedAt: new Date(threat.createdAt),
      raw: threat
    }));
    return { ...response, data: normalized };
  }
  async getNormalizedAssets(filter) {
    const response = await this.getAgents(filter);
    if (!response.data) return { ...response, data: [] };
    const normalized = response.data.data.map((agent) => ({
      id: agent.id,
      hostname: agent.computerName,
      ipAddress: agent.ipAddress,
      os: `${agent.osName} ${agent.osVersion}`,
      type: "workstation",
      source: "sentinelone",
      lastSeen: new Date(agent.lastActiveDate),
      raw: agent
    }));
    return { ...response, data: normalized };
  }
  // ============================================
  // Private Helpers
  // ============================================
  mapThreatStatus(status) {
    const map = {
      active: "active",
      suspicious: "investigating",
      mitigated: "resolved",
      resolved: "resolved",
      blocked: "resolved"
    };
    return map[status] ?? "active";
  }
};

// src/connectors/checkpoint/CheckpointConnector.ts
var CheckpointConnector = class extends BaseConnector {
  constructor(cpConfig) {
    const config = {
      name: "checkpoint",
      baseUrl: cpConfig.baseUrl,
      auth: {
        type: "basic" /* BASIC */,
        username: cpConfig.username,
        password: cpConfig.password
      },
      timeout: cpConfig.timeout ?? 3e4,
      retries: cpConfig.retries ?? 3,
      cache: cpConfig.cache,
      dryRun: cpConfig.dryRun,
      logger: "info" /* INFO */
    };
    super(config);
    this.domain = cpConfig.domain;
  }
  // ============================================
  // Auth - Checkpoint uses session-based auth
  // ============================================
  async authenticate() {
    const response = await this.post("/web_api/login", {
      user: this.config.auth,
      password: this.config.auth,
      ...this.domain && { domain: this.domain }
    });
    if (response.data) {
      this.session = response.data;
      this.httpClient.defaults.headers.common["X-chkp-sid"] = this.session.sid;
    }
  }
  async logout() {
    if (this.session) {
      await this.post("/web_api/logout", {});
      this.session = void 0;
      delete this.httpClient.defaults.headers.common["X-chkp-sid"];
    }
  }
  async testConnection() {
    try {
      await this.authenticate();
      return !!this.session;
    } catch {
      return false;
    }
  }
  // ============================================
  // Policy Management
  // ============================================
  async getPolicies() {
    return this.post("/web_api/show-access-rulebase", {
      limit: 100,
      offset: 0
    });
  }
  async getRules(filter) {
    return this.post("/web_api/show-access-rulebase", {
      name: filter?.policyName ?? "Network",
      limit: filter?.limit ?? 50,
      offset: filter?.offset ?? 0
    });
  }
  async addRule(policyName, rule) {
    return this.post("/web_api/add-access-rule", {
      layer: policyName,
      ...rule
    });
  }
  async updateRule(ruleUid, policyName, updates) {
    return this.post("/web_api/set-access-rule", {
      uid: ruleUid,
      layer: policyName,
      ...updates
    });
  }
  async deleteRule(ruleUid, policyName) {
    return this.post("/web_api/delete-access-rule", {
      uid: ruleUid,
      layer: policyName
    });
  }
  async publishChanges() {
    return this.post("/web_api/publish", {});
  }
  async discardChanges() {
    return this.post("/web_api/discard", {});
  }
  async installPolicy(policyName, targets) {
    return this.post("/web_api/install-policy", {
      "policy-package": policyName,
      targets
    });
  }
  // ============================================
  // Network Objects
  // ============================================
  async getHosts(filter) {
    return this.post("/web_api/show-hosts", {
      limit: filter?.limit ?? 50,
      offset: filter?.offset ?? 0,
      ...filter?.name && { filter: filter.name }
    }, true);
  }
  async addHost(name, ipAddress, comments) {
    return this.post("/web_api/add-host", {
      name,
      "ip-address": ipAddress,
      ...comments && { comments }
    });
  }
  async deleteHost(uid) {
    return this.post("/web_api/delete-host", { uid });
  }
  async getNetworks() {
    return this.post("/web_api/show-networks", {
      limit: 100
    }, true);
  }
  async getGroups() {
    return this.post("/web_api/show-groups", {
      limit: 100
    }, true);
  }
  // ============================================
  // Threat Prevention
  // ============================================
  async getThreats() {
    return this.post(
      "/web_api/show-threat-protections",
      { limit: 100 },
      true
    );
  }
  async blockThreat(threatUid) {
    return this.post("/web_api/set-threat-protection", {
      uid: threatUid,
      action: "Prevent"
    });
  }
  // ============================================
  // Logs
  // ============================================
  async getLogs(filter) {
    return this.post("/web_api/show-logs", {
      "time-frame": "last-hour",
      limit: filter?.limit ?? 50,
      ...filter?.startTime && { "start-time": filter.startTime },
      ...filter?.endTime && { "end-time": filter.endTime },
      ...filter?.sourceIp && { "source-ip": filter.sourceIp },
      ...filter?.destinationIp && { "destination-ip": filter.destinationIp },
      ...filter?.action && { action: filter.action }
    });
  }
  // ============================================
  // Gateways
  // ============================================
  async getGateways() {
    return this.post(
      "/web_api/show-gateways-and-servers",
      { limit: 100 },
      true
    );
  }
  async getGatewayStatus(gatewayUid) {
    return this.post("/web_api/show-gateway", {
      uid: gatewayUid
    });
  }
  // ============================================
  // Normalization
  // ============================================
  async getNormalizedThreats() {
    const response = await this.getThreats();
    if (!response.data) return { ...response, data: [] };
    const normalized = response.data.map((threat) => ({
      id: threat.uid,
      name: threat.name,
      severity: threat.severity.toLowerCase(),
      status: "active",
      affectedAsset: threat.affectedSystems.join(", "),
      source: "checkpoint",
      detectedAt: /* @__PURE__ */ new Date(),
      raw: threat
    }));
    return { ...response, data: normalized };
  }
  async getNormalizedAssets() {
    const response = await this.getGateways();
    if (!response.data) return { ...response, data: [] };
    const normalized = response.data.map((gateway) => ({
      id: gateway.uid,
      hostname: gateway.name,
      ipAddress: gateway.ipAddress,
      os: gateway.osName,
      type: "network",
      source: "checkpoint",
      lastSeen: new Date(gateway.lastUpdateTime),
      raw: gateway
    }));
    return { ...response, data: normalized };
  }
};

// src/connectors/manageengine/ManageEngineConnector.ts
var ManageEngineConnector = class extends BaseConnector {
  constructor(meConfig) {
    const config = {
      name: "manageengine",
      baseUrl: meConfig.baseUrl,
      auth: {
        type: "oauth2" /* OAUTH2 */,
        clientId: meConfig.clientId,
        clientSecret: meConfig.clientSecret,
        tokenUrl: `${meConfig.baseUrl}/oauth/token`
      },
      timeout: meConfig.timeout ?? 3e4,
      retries: meConfig.retries ?? 3,
      cache: meConfig.cache,
      dryRun: meConfig.dryRun,
      logger: "info" /* INFO */
    };
    super(config);
    this.refreshToken = meConfig.refreshToken;
    this.clientId = meConfig.clientId;
    this.clientSecret = meConfig.clientSecret;
  }
  // ============================================
  // Auth - OAuth2 with Refresh Token
  // ============================================
  async authenticate() {
    const response = await this.post("/oauth/token", {
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken
    });
    if (response.data) {
      this.setToken(response.data.access_token, response.data.expires_in);
    }
  }
  async testConnection() {
    try {
      await this.authenticate();
      await this.get("/api/1.3/patch/allpatches", { pagenumber: 1, pagesize: 1 });
      return true;
    } catch {
      return false;
    }
  }
  // ============================================
  // Patch Management
  // ============================================
  async getPatches(filter) {
    const params = {
      pagenumber: filter?.page ?? 1,
      pagesize: filter?.limit ?? 50
    };
    if (filter?.severity?.length) params["severity"] = filter.severity.join(",");
    if (filter?.status?.length) params["patchstatus"] = filter.status.join(",");
    if (filter?.rebootRequired !== void 0) params["rebootrequired"] = filter.rebootRequired;
    return this.get(
      "/api/1.3/patch/allpatches",
      params
    );
  }
  async getMissingPatches(computerId) {
    const params = {
      pagenumber: 1,
      pagesize: 100,
      patchstatus: "Missing"
    };
    if (computerId) params["computerid"] = computerId;
    return this.get(
      "/api/1.3/patch/allpatches",
      params
    );
  }
  async getCriticalPatches() {
    return this.getPatches({
      severity: ["Critical", "Important"],
      status: ["Missing"]
    });
  }
  async getPatchById(patchId) {
    return this.get(`/api/1.3/patch/${patchId}`);
  }
  // ============================================
  // Computer Management
  // ============================================
  async getComputers(meFilter) {
    const params = {
      pagenumber: meFilter?.page ?? 1,
      pagesize: meFilter?.limit ?? 50
    };
    if (meFilter?.status?.length) params["status"] = meFilter.status.join(",");
    if (meFilter?.domain) params["domain"] = meFilter.domain;
    if (meFilter?.os) params["os"] = meFilter.os;
    if (meFilter?.computerName) params["computername"] = meFilter.computerName;
    return this.get(
      "/api/1.3/patch/allsystems",
      params,
      true
      // cache
    );
  }
};

// src/connectors/jira/JiraConnector.ts
var JiraConnector = class extends BaseConnector {
  constructor(jiraConfig) {
    const config = {
      name: "jira",
      baseUrl: jiraConfig.baseUrl,
      auth: {
        type: "basic" /* BASIC */,
        username: jiraConfig.email,
        password: jiraConfig.apiToken
      },
      timeout: jiraConfig.timeout ?? 3e4,
      retries: jiraConfig.retries ?? 3,
      cache: jiraConfig.cache,
      dryRun: jiraConfig.dryRun,
      logger: "info" /* INFO */
    };
    super(config);
  }
  // ============================================
  // Auth - Basic Auth (email + apiToken)
  // ============================================
  async authenticate() {
  }
  async testConnection() {
    try {
      await this.get("/rest/api/3/myself");
      return true;
    } catch {
      return false;
    }
  }
  // ============================================
  // Projects
  // ============================================
  async getProjects() {
    return this.get(
      "/rest/api/3/project/search",
      { maxResults: 100 },
      true
    );
  }
  async getProjectByKey(projectKey) {
    return this.get(
      `/rest/api/3/project/${projectKey}`,
      {},
      true
    );
  }
  // ============================================
  // Issues
  // ============================================
  async getIssues(filter) {
    const jqlParts = [];
    if (filter?.jql) {
      jqlParts.push(filter.jql);
    } else {
      if (filter?.projectKey) jqlParts.push(`project = "${filter.projectKey}"`);
      if (filter?.status?.length) jqlParts.push(`status in (${filter.status.map((s) => `"${s}"`).join(",")})`);
      if (filter?.priority?.length) jqlParts.push(`priority in (${filter.priority.map((p) => `"${p}"`).join(",")})`);
      if (filter?.issueType?.length) jqlParts.push(`issuetype in (${filter.issueType.map((t) => `"${t}"`).join(",")})`);
      if (filter?.assigneeAccountId) jqlParts.push(`assignee = "${filter.assigneeAccountId}"`);
      if (filter?.labels?.length) jqlParts.push(`labels in (${filter.labels.map((l) => `"${l}"`).join(",")})`);
      if (filter?.createdAfter) jqlParts.push(`created >= "${filter.createdAfter}"`);
      if (filter?.createdBefore) jqlParts.push(`created <= "${filter.createdBefore}"`);
    }
    const jql = jqlParts.length ? jqlParts.join(" AND ") : "ORDER BY created DESC";
    const fields = [
      "summary",
      "description",
      "status",
      "priority",
      "issuetype",
      "project",
      "assignee",
      "reporter",
      "labels",
      "created",
      "updated",
      "duedate",
      "resolutiondate",
      "components"
    ].join(",");
    const response = await this.get(
      "/rest/api/3/search/jql",
      {
        jql,
        startAt: filter?.startAt ?? 0,
        maxResults: filter?.maxResults ?? 50,
        fields
      }
    );
    if (response.data) {
      const paginated = this.buildPaginatedResponse(
        response.data.issues,
        response.data.total,
        {
          page: Math.floor((filter?.startAt ?? 0) / (filter?.maxResults ?? 50)) + 1,
          limit: filter?.maxResults ?? 50
        }
      );
      return { ...response, data: paginated };
    }
    return response;
  }
  async getIssueByKey(issueKey) {
    return this.get(`/rest/api/3/issue/${issueKey}`);
  }
  async createIssue(request) {
    const fields = {
      project: { key: request.projectKey },
      summary: request.summary,
      issuetype: { name: request.issueType }
    };
    if (request.description) {
      fields["description"] = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: request.description }]
          }
        ]
      };
    }
    if (request.priority) fields["priority"] = { name: request.priority };
    if (request.assigneeAccountId) fields["assignee"] = { accountId: request.assigneeAccountId };
    if (request.labels?.length) fields["labels"] = request.labels;
    if (request.dueDate) fields["duedate"] = request.dueDate;
    if (request.components?.length) {
      fields["components"] = request.components.map((c) => ({ name: c }));
    }
    if (request.customFields) {
      Object.assign(fields, request.customFields);
    }
    return this.post("/rest/api/3/issue", { fields });
  }
  async updateIssue(issueKey, request) {
    const fields = {};
    if (request.summary) fields["summary"] = request.summary;
    if (request.priority) fields["priority"] = { name: request.priority };
    if (request.assigneeAccountId) fields["assignee"] = { accountId: request.assigneeAccountId };
    if (request.labels?.length) fields["labels"] = request.labels;
    if (request.dueDate) fields["duedate"] = request.dueDate;
    return this.put(`/rest/api/3/issue/${issueKey}`, { fields });
  }
  async deleteIssue(issueKey) {
    return this.delete(`/rest/api/3/issue/${issueKey}`);
  }
  // ============================================
  // Bulk Create - Security findings → Jira tickets
  // ============================================
  async bulkCreateIssues(requests) {
    const issueUpdates = requests.map((request) => ({
      fields: {
        project: { key: request.projectKey },
        summary: request.summary,
        issuetype: { name: request.issueType },
        ...request.priority && { priority: { name: request.priority } },
        ...request.labels?.length && { labels: request.labels }
      }
    }));
    return this.post("/rest/api/3/issue/bulk", { issueUpdates });
  }
  // ============================================
  // Comments
  // ============================================
  async getComments(issueKey) {
    return this.get(
      `/rest/api/3/issue/${issueKey}/comment`
    );
  }
  async addComment(issueKey, body) {
    return this.post(
      `/rest/api/3/issue/${issueKey}/comment`,
      {
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: body }]
            }
          ]
        }
      }
    );
  }
  // ============================================
  // Transitions (Status Change)
  // ============================================
  async getTransitions(issueKey) {
    return this.get(
      `/rest/api/3/issue/${issueKey}/transitions`
    );
  }
  async transitionIssue(issueKey, transitionId, comment) {
    const body = {
      transition: { id: transitionId }
    };
    if (comment) {
      body["update"] = {
        comment: [
          {
            add: {
              body: {
                type: "doc",
                version: 1,
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: comment }]
                  }
                ]
              }
            }
          }
        ]
      };
    }
    return this.post(`/rest/api/3/issue/${issueKey}/transitions`, body);
  }
  // ============================================
  // Sprints
  // ============================================
  async getSprints(boardId) {
    return this.get(
      `/rest/agile/1.0/board/${boardId}/sprint`,
      { state: "active,future" },
      true
    );
  }
  async getActiveSprint(boardId) {
    const response = await this.getSprints(boardId);
    const active = response.data?.find((s) => s.state === "active") ?? null;
    return { ...response, data: active };
  }
  // ============================================
  // Security Integration Helper
  // ============================================
  async createSecurityTicket(projectKey, title, description, severity, source) {
    const priorityMap = {
      critical: "Highest",
      high: "High",
      medium: "Medium",
      low: "Low"
    };
    return this.createIssue({
      projectKey,
      summary: `[${source.toUpperCase()}] ${title}`,
      description: `**Source:** ${source}
**Severity:** ${severity}

${description}`,
      issueType: "Bug",
      priority: priorityMap[severity],
      labels: ["security", source, severity]
    });
  }
};

// src/connectors/zoho/ZohoConnector.ts
var ZohoConnector = class extends BaseConnector {
  constructor(zohoConfig) {
    const config = {
      name: "zoho",
      baseUrl: zohoConfig.baseUrl,
      auth: {
        type: "oauth2" /* OAUTH2 */,
        clientId: zohoConfig.clientId,
        clientSecret: zohoConfig.clientSecret,
        tokenUrl: `${zohoConfig.accountsUrl ?? "https://accounts.zoho.com"}/oauth/v2/token`
      },
      timeout: zohoConfig.timeout ?? 3e4,
      retries: zohoConfig.retries ?? 3,
      cache: zohoConfig.cache,
      dryRun: zohoConfig.dryRun,
      logger: "info" /* INFO */
    };
    super(config);
    this.clientId = zohoConfig.clientId;
    this.clientSecret = zohoConfig.clientSecret;
    this.refreshToken = zohoConfig.refreshToken;
    this.accountsUrl = zohoConfig.accountsUrl ?? "https://accounts.zoho.com";
  }
  // ============================================
  // Auth - OAuth2 Refresh Token
  // ============================================
  async authenticate() {
    const response = await this.post(`${this.accountsUrl}/oauth/v2/token`, {
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken
    });
    if (response.data) {
      this.setToken(response.data.access_token, response.data.expires_in);
    }
  }
  async testConnection() {
    try {
      await this.authenticate();
      await this.get("/crm/v3/Contacts", { per_page: 1 });
      return true;
    } catch {
      return false;
    }
  }
  // ============================================
  // Contacts
  // ============================================
  async getContacts(filter) {
    const params = {
      page: filter?.page ?? 1,
      per_page: filter?.perPage ?? 50
    };
    if (filter?.sortBy) params["sort_by"] = filter.sortBy;
    if (filter?.sortOrder) params["sort_order"] = filter.sortOrder;
    const response = await this.get(
      "/crm/v3/Contacts",
      params,
      true
    );
    if (response.data) {
      const paginated = this.buildPaginatedResponse(
        response.data.data,
        response.data.info.count,
        { page: filter?.page, limit: filter?.perPage }
      );
      return { ...response, data: paginated };
    }
    return response;
  }
  async getContactById(contactId) {
    return this.get(`/crm/v3/Contacts/${contactId}`);
  }
  async createContact(contact) {
    return this.post("/crm/v3/Contacts", {
      data: [contact]
    });
  }
  async updateContact(contactId, updates) {
    return this.put(`/crm/v3/Contacts/${contactId}`, {
      data: [updates]
    });
  }
  async deleteContact(contactId) {
    return this.delete(`/crm/v3/Contacts/${contactId}`);
  }
  // ============================================
  // Leads
  // ============================================
  async getLeads(filter) {
    const params = {
      page: filter?.page ?? 1,
      per_page: filter?.perPage ?? 50
    };
    if (filter?.sortBy) params["sort_by"] = filter.sortBy;
    if (filter?.sortOrder) params["sort_order"] = filter.sortOrder;
    const response = await this.get(
      "/crm/v3/Leads",
      params,
      true
    );
    if (response.data) {
      const paginated = this.buildPaginatedResponse(
        response.data.data,
        response.data.info.count,
        { page: filter?.page, limit: filter?.perPage }
      );
      return { ...response, data: paginated };
    }
    return response;
  }
  async getLeadById(leadId) {
    return this.get(`/crm/v3/Leads/${leadId}`);
  }
  async createLead(lead) {
    return this.post("/crm/v3/Leads", { data: [lead] });
  }
  async convertLead(leadId, accountName) {
    return this.post(`/crm/v3/Leads/${leadId}/actions/convert`, {
      data: [{ Accounts: { Account_Name: accountName } }]
    });
  }
  // ============================================
  // Accounts
  // ============================================
  async getAccounts(page = 1, perPage = 50) {
    const response = await this.get(
      "/crm/v3/Accounts",
      { page, per_page: perPage },
      true
    );
    if (response.data) {
      const paginated = this.buildPaginatedResponse(
        response.data.data,
        response.data.info.count,
        { page, limit: perPage }
      );
      return { ...response, data: paginated };
    }
    return response;
  }
  async getAccountById(accountId) {
    return this.get(`/crm/v3/Accounts/${accountId}`);
  }
  async createAccount(account) {
    return this.post("/crm/v3/Accounts", { data: [account] });
  }
  // ============================================
  // Deals
  // ============================================
  async getDeals(filter) {
    const params = {
      page: filter?.page ?? 1,
      per_page: filter?.perPage ?? 50
    };
    if (filter?.sortBy) params["sort_by"] = filter.sortBy;
    if (filter?.sortOrder) params["sort_order"] = filter.sortOrder;
    const response = await this.get(
      "/crm/v3/Deals",
      params,
      true
    );
    if (response.data) {
      const paginated = this.buildPaginatedResponse(
        response.data.data,
        response.data.info.count,
        { page: filter?.page, limit: filter?.perPage }
      );
      return { ...response, data: paginated };
    }
    return response;
  }
  async getDealById(dealId) {
    return this.get(`/crm/v3/Deals/${dealId}`);
  }
  async createDeal(deal) {
    return this.post("/crm/v3/Deals", { data: [deal] });
  }
  async updateDeal(dealId, updates) {
    return this.put(`/crm/v3/Deals/${dealId}`, {
      data: [updates]
    });
  }
  // ============================================
  // Tasks
  // ============================================
  async getTasks() {
    return this.get("/crm/v3/Tasks", {
      page: 1,
      per_page: 100
    });
  }
  async createTask(task) {
    return this.post("/crm/v3/Tasks", { data: [task] });
  }
  // ============================================
  // Search
  // ============================================
  async searchContacts(query) {
    return this.get(
      "/crm/v3/Contacts/search",
      { criteria: query }
    );
  }
  async searchLeads(query) {
    return this.get(
      "/crm/v3/Leads/search",
      { criteria: query }
    );
  }
  async searchDeals(query) {
    return this.get(
      "/crm/v3/Deals/search",
      { criteria: query }
    );
  }
  // ============================================
  // Bulk Operations
  // ============================================
  async bulkCreateContacts(contacts) {
    const chunks = this.chunkArray(contacts, 100);
    const results = [];
    for (const chunk of chunks) {
      const response = await this.post(
        "/crm/v3/Contacts",
        { data: chunk }
      );
      if (response.data) results.push(...response.data);
    }
    return {
      success: true,
      data: results,
      timestamp: /* @__PURE__ */ new Date(),
      connector: "zoho"
    };
  }
  // ============================================
  // Private Helpers
  // ============================================
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};

// src/middleware/RetryHandler.ts
var DEFAULT_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 1e3,
  maxDelayMs: 3e4,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  onRetry: () => {
  }
};
function calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffMultiplier) {
  const exponential = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  const jitter = Math.random() * 0.3 * exponential;
  return Math.min(exponential + jitter, maxDelayMs);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetry(fn, options) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError = new Error("Unknown error");
  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const statusCode = error.statusCode;
      const isRetryable = statusCode ? opts.retryableStatusCodes.includes(statusCode) : true;
      if (!isRetryable || attempt > opts.maxRetries) {
        throw lastError;
      }
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );
      opts.onRetry(attempt, lastError);
      await sleep(delay);
    }
  }
  throw lastError;
}
var RetryHandler = class {
  constructor(options) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  async execute(fn) {
    return withRetry(fn, this.options);
  }
  updateOptions(options) {
    this.options = { ...this.options, ...options };
  }
};

// src/middleware/RateLimiter.ts
var RateLimiter = class {
  constructor(options) {
    this.maxTokens = options.maxRequests;
    this.tokens = options.maxRequests;
    this.lastRefillTime = Date.now();
    this.refillRate = options.maxRequests / (options.perSeconds * 1e3);
    this.onThrottled = options.onThrottled;
  }
  // ============================================
  // Refill tokens based on elapsed time
  // ============================================
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }
  // ============================================
  // Acquire a token (wait if needed)
  // ============================================
  async acquire() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const tokensNeeded = 1 - this.tokens;
    const waitMs = Math.ceil(tokensNeeded / this.refillRate);
    if (this.onThrottled) {
      this.onThrottled(waitMs);
    }
    await this.sleep(waitMs);
    this.refill();
    this.tokens -= 1;
  }
  // ============================================
  // Check if request is allowed (non-blocking)
  // ============================================
  tryAcquire() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
  // ============================================
  // Get current state
  // ============================================
  getState() {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      maxTokens: this.maxTokens,
      utilization: (this.maxTokens - this.tokens) / this.maxTokens * 100
    };
  }
  reset() {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
var SlidingWindowRateLimiter = class {
  constructor(options) {
    this.timestamps = [];
    this.maxRequests = options.maxRequests;
    this.windowMs = options.perSeconds * 1e3;
  }
  async acquire() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (t) => now - t < this.windowMs
    );
    if (this.timestamps.length >= this.maxRequests) {
      const waitMs = this.windowMs - (now - this.timestamps[0]);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.acquire();
    }
    this.timestamps.push(now);
  }
  getRemainingRequests() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (t) => now - t < this.windowMs
    );
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }
};

// src/middleware/CircuitBreaker.ts
var CircuitBreaker = class {
  constructor(options) {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.lastStateChangeTime = /* @__PURE__ */ new Date();
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.successThreshold = options?.successThreshold ?? 2;
    this.recoveryTimeMs = options?.recoveryTimeMs ?? 6e4;
    this.onStateChange = options?.onStateChange;
    this.onFailure = options?.onFailure;
    this.onSuccess = options?.onSuccess;
  }
  // ============================================
  // Execute with Circuit Breaker
  // ============================================
  async execute(fn) {
    this.totalRequests++;
    if (this.state === "open") {
      if (this.canAttemptReset()) {
        this.transitionTo("half-open");
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Last failure: ${this.lastFailureTime?.toISOString()}`
        );
      }
    }
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  // ============================================
  // Record Success
  // ============================================
  recordSuccess() {
    this.failures = 0;
    this.successes++;
    this.onSuccess?.();
    if (this.state === "half-open" && this.successes >= this.successThreshold) {
      this.transitionTo("closed");
    }
  }
  // ============================================
  // Record Failure
  // ============================================
  recordFailure(error) {
    this.failures++;
    this.successes = 0;
    this.lastFailureTime = /* @__PURE__ */ new Date();
    this.onFailure?.(error, this.failures);
    if (this.state === "closed" && this.failures >= this.failureThreshold) {
      this.transitionTo("open");
    } else if (this.state === "half-open") {
      this.transitionTo("open");
    }
  }
  // ============================================
  // State Transition
  // ============================================
  transitionTo(newState) {
    const prevState = this.state;
    this.state = newState;
    this.lastStateChangeTime = /* @__PURE__ */ new Date();
    if (newState === "closed") {
      this.failures = 0;
      this.successes = 0;
    }
    this.onStateChange?.(prevState, newState);
  }
  // ============================================
  // Can Attempt Reset
  // ============================================
  canAttemptReset() {
    if (!this.lastFailureTime) return true;
    const elapsed = Date.now() - this.lastFailureTime.getTime();
    return elapsed >= this.recoveryTimeMs;
  }
  // ============================================
  // Public API
  // ============================================
  getState() {
    return this.state;
  }
  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastStateChangeTime: this.lastStateChangeTime
    };
  }
  reset() {
    this.transitionTo("closed");
    this.totalRequests = 0;
    this.lastFailureTime = void 0;
  }
  isOpen() {
    return this.state === "open";
  }
  isClosed() {
    return this.state === "closed";
  }
};

// src/middleware/CacheLayer.ts
var CacheLayer = class {
  constructor(options) {
    this.store = /* @__PURE__ */ new Map();
    // Stats
    this.totalHits = 0;
    this.totalMisses = 0;
    this.totalSets = 0;
    this.totalEvictions = 0;
    this.ttlMs = options.ttl * 1e3;
    this.maxSize = options.maxSize ?? 1e3;
    this.onHit = options.onHit;
    this.onMiss = options.onMiss;
    this.onEvict = options.onEvict;
  }
  // ============================================
  // Get
  // ============================================
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.totalMisses++;
      this.onMiss?.(key);
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.totalMisses++;
      this.onMiss?.(key);
      return null;
    }
    entry.hits++;
    this.store.delete(key);
    this.store.set(key, entry);
    this.totalHits++;
    this.onHit?.(key);
    return entry.data;
  }
  // ============================================
  // Set
  // ============================================
  set(key, data, ttlSeconds) {
    if (this.store.size >= this.maxSize) {
      this.evictLRU();
    }
    const ttlMs = ttlSeconds ? ttlSeconds * 1e3 : this.ttlMs;
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
      hits: 0
    });
    this.totalSets++;
  }
  // ============================================
  // Get or Set (most useful pattern)
  // ============================================
  async getOrSet(key, fetchFn, ttlSeconds) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const data = await fetchFn();
    this.set(key, data, ttlSeconds);
    return data;
  }
  // ============================================
  // Delete
  // ============================================
  delete(key) {
    return this.store.delete(key);
  }
  // ============================================
  // Clear
  // ============================================
  clear() {
    this.store.clear();
  }
  clearByPrefix(prefix) {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }
  // ============================================
  // Has
  // ============================================
  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }
  // ============================================
  // LRU Eviction
  // ============================================
  evictLRU() {
    const firstKey = this.store.keys().next().value;
    if (firstKey) {
      this.store.delete(firstKey);
      this.totalEvictions++;
      this.onEvict?.(firstKey);
    }
  }
  // ============================================
  // Cleanup expired entries
  // ============================================
  cleanup() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }
  // ============================================
  // Stats
  // ============================================
  getStats() {
    return {
      size: this.store.size,
      maxSize: this.maxSize,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      totalSets: this.totalSets,
      totalEvictions: this.totalEvictions,
      hitRate: this.totalHits + this.totalMisses > 0 ? (this.totalHits / (this.totalHits + this.totalMisses) * 100).toFixed(2) + "%" : "0%"
    };
  }
};

// src/telemetry/Logger.ts
var LogLevel2 = /* @__PURE__ */ ((LogLevel3) => {
  LogLevel3[LogLevel3["DEBUG"] = 0] = "DEBUG";
  LogLevel3[LogLevel3["INFO"] = 1] = "INFO";
  LogLevel3[LogLevel3["WARN"] = 2] = "WARN";
  LogLevel3[LogLevel3["ERROR"] = 3] = "ERROR";
  LogLevel3[LogLevel3["SILENT"] = 4] = "SILENT";
  return LogLevel3;
})(LogLevel2 || {});
var Logger = class _Logger {
  constructor(options) {
    this.logs = [];
    this.level = options?.level ?? 1 /* INFO */;
    this.connector = options?.connector;
    this.enableConsole = options?.enableConsole ?? true;
    this.enableJson = options?.enableJson ?? false;
    this.onLog = options?.onLog;
  }
  // ============================================
  // Core Log Method
  // ============================================
  log(level, message, meta, traceId) {
    if (level < this.level) return;
    const entry = {
      level,
      message,
      timestamp: /* @__PURE__ */ new Date(),
      connector: this.connector,
      meta,
      traceId
    };
    this.logs.push(entry);
    this.onLog?.(entry);
    if (this.enableConsole) {
      this.printToConsole(entry);
    }
  }
  // ============================================
  // Console Output
  // ============================================
  printToConsole(entry) {
    const levelName = LogLevel2[entry.level];
    const connector = entry.connector ? `[${entry.connector}]` : "";
    const traceId = entry.traceId ? `[${entry.traceId}]` : "";
    const timestamp = entry.timestamp.toISOString();
    if (this.enableJson) {
      console.log(JSON.stringify({
        timestamp,
        level: levelName,
        connector: entry.connector,
        traceId: entry.traceId,
        message: entry.message,
        meta: entry.meta
      }));
      return;
    }
    const prefix = `${timestamp} ${levelName} ${connector}${traceId}`;
    const output = entry.meta ? `${prefix} ${entry.message} ${JSON.stringify(entry.meta)}` : `${prefix} ${entry.message}`;
    switch (entry.level) {
      case 0 /* DEBUG */:
        console.debug(output);
        break;
      case 1 /* INFO */:
        console.info(output);
        break;
      case 2 /* WARN */:
        console.warn(output);
        break;
      case 3 /* ERROR */:
        console.error(output);
        break;
    }
  }
  // ============================================
  // Public Methods
  // ============================================
  debug(message, meta, traceId) {
    this.log(0 /* DEBUG */, message, meta, traceId);
  }
  info(message, meta, traceId) {
    this.log(1 /* INFO */, message, meta, traceId);
  }
  warn(message, meta, traceId) {
    this.log(2 /* WARN */, message, meta, traceId);
  }
  error(message, meta, traceId) {
    this.log(3 /* ERROR */, message, meta, traceId);
  }
  // ============================================
  // Child Logger (for connector-specific)
  // ============================================
  child(connector) {
    return new _Logger({
      level: this.level,
      connector,
      enableConsole: this.enableConsole,
      enableJson: this.enableJson,
      onLog: this.onLog
    });
  }
  // ============================================
  // Log History
  // ============================================
  getLogs(level) {
    if (level === void 0) return this.logs;
    return this.logs.filter((l) => l.level === level);
  }
  clearLogs() {
    this.logs = [];
  }
  setLevel(level) {
    this.level = level;
  }
  getStats() {
    return {
      total: this.logs.length,
      debug: this.logs.filter((l) => l.level === 0 /* DEBUG */).length,
      info: this.logs.filter((l) => l.level === 1 /* INFO */).length,
      warn: this.logs.filter((l) => l.level === 2 /* WARN */).length,
      error: this.logs.filter((l) => l.level === 3 /* ERROR */).length
    };
  }
};
var logger = new Logger({
  level: 1 /* INFO */,
  enableConsole: true
});

// src/telemetry/OpenTelemetry.ts
var Tracer = class {
  constructor(options) {
    this.spans = /* @__PURE__ */ new Map();
    this.serviceName = options?.serviceName ?? "complyment-connectors-sdk";
    this.serviceVersion = options?.serviceVersion ?? "1.0.0";
    this.enabled = options?.enabled ?? true;
    this.onSpanEnd = options?.onSpanEnd;
  }
  // ============================================
  // Start Span
  // ============================================
  startSpan(options) {
    if (!this.enabled) return "disabled";
    const spanId = this.generateId();
    const traceId = this.generateId();
    const span = {
      spanId,
      traceId,
      name: options.name,
      startTime: /* @__PURE__ */ new Date(),
      status: "unset",
      attributes: {
        "service.name": this.serviceName,
        "service.version": this.serviceVersion,
        ...options.connector && { "connector.name": options.connector },
        ...options.method && { "http.method": options.method },
        ...options.url && { "http.url": options.url },
        ...options.attributes
      },
      events: []
    };
    this.spans.set(spanId, span);
    return spanId;
  }
  // ============================================
  // End Span
  // ============================================
  endSpan(spanId, error) {
    if (!this.enabled || spanId === "disabled") return;
    const span = this.spans.get(spanId);
    if (!span) return;
    span.endTime = /* @__PURE__ */ new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = error ? "error" : "ok";
    if (error) {
      span.error = error;
      span.attributes["error.message"] = error.message;
      span.attributes["error.type"] = error.constructor.name;
    }
    this.onSpanEnd?.(span);
    this.spans.delete(spanId);
  }
  // ============================================
  // Add Event to Span
  // ============================================
  addEvent(spanId, name, attributes) {
    if (!this.enabled || spanId === "disabled") return;
    const span = this.spans.get(spanId);
    if (!span) return;
    span.events.push({
      name,
      timestamp: /* @__PURE__ */ new Date(),
      attributes
    });
  }
  // ============================================
  // Set Attribute
  // ============================================
  setAttribute(spanId, key, value) {
    if (!this.enabled || spanId === "disabled") return;
    const span = this.spans.get(spanId);
    if (!span) return;
    span.attributes[key] = value;
  }
  // ============================================
  // Wrap Function with Span
  // ============================================
  async trace(options, fn) {
    const spanId = this.startSpan(options);
    try {
      const result = await fn(spanId);
      this.endSpan(spanId);
      return result;
    } catch (error) {
      this.endSpan(spanId, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  // ============================================
  // Active Spans
  // ============================================
  getActiveSpans() {
    return Array.from(this.spans.values());
  }
  // ============================================
  // Utility
  // ============================================
  generateId() {
    return Math.random().toString(36).substring(2, 18) + Date.now().toString(36);
  }
  isEnabled() {
    return this.enabled;
  }
};
var tracer = new Tracer({
  serviceName: "complyment-connectors-sdk",
  enabled: true
});

// src/audit/AuditLogger.ts
var AuditLogger = class {
  constructor(options) {
    this.entries = [];
    this.enabled = options?.enabled ?? true;
    this.maxEntries = options?.maxEntries ?? 1e4;
    this.onEntry = options?.onEntry;
  }
  // ============================================
  // Log Entry
  // ============================================
  log(entry) {
    if (!this.enabled) {
      return { ...entry, id: "disabled", timestamp: /* @__PURE__ */ new Date() };
    }
    const auditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: /* @__PURE__ */ new Date()
    };
    if (this.entries.length >= this.maxEntries) {
      this.entries.shift();
    }
    this.entries.push(auditEntry);
    this.onEntry?.(auditEntry);
    return auditEntry;
  }
  // ============================================
  // Convenience Methods
  // ============================================
  logSuccess(action, connector, details, duration) {
    return this.log({
      action,
      connector,
      status: "success",
      details,
      duration
    });
  }
  logFailure(action, connector, error, details) {
    return this.log({
      action,
      connector,
      status: "failure",
      error,
      details
    });
  }
  logDataFetch(connector, resourceType, resourceId, duration) {
    return this.log({
      action: "data.fetch",
      connector,
      status: "success",
      resourceType,
      resourceId,
      duration
    });
  }
  // ============================================
  // Query
  // ============================================
  getEntries(filter) {
    let results = [...this.entries];
    if (filter?.connector) {
      results = results.filter((e) => e.connector === filter.connector);
    }
    if (filter?.action) {
      results = results.filter((e) => e.action === filter.action);
    }
    if (filter?.status) {
      results = results.filter((e) => e.status === filter.status);
    }
    if (filter?.from) {
      results = results.filter((e) => e.timestamp >= filter.from);
    }
    if (filter?.to) {
      results = results.filter((e) => e.timestamp <= filter.to);
    }
    if (filter?.limit) {
      results = results.slice(-filter.limit);
    }
    return results.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }
  getFailures(connector) {
    return this.getEntries({ status: "failure", connector });
  }
  getRecentEntries(limit = 50) {
    return this.getEntries({ limit });
  }
  // ============================================
  // Stats
  // ============================================
  getStats(connector) {
    const entries = connector ? this.entries.filter((e) => e.connector === connector) : this.entries;
    const successCount = entries.filter((e) => e.status === "success").length;
    const failureCount = entries.filter((e) => e.status === "failure").length;
    const avgDuration = entries.filter((e) => e.duration !== void 0).reduce((sum, e) => sum + (e.duration ?? 0), 0) / (entries.filter((e) => e.duration !== void 0).length || 1);
    return {
      total: entries.length,
      success: successCount,
      failure: failureCount,
      successRate: entries.length > 0 ? (successCount / entries.length * 100).toFixed(2) + "%" : "0%",
      avgDurationMs: Math.round(avgDuration)
    };
  }
  // ============================================
  // Export
  // ============================================
  exportAsJson() {
    return JSON.stringify(this.entries, null, 2);
  }
  exportAsCsv() {
    const headers = [
      "id",
      "action",
      "connector",
      "status",
      "timestamp",
      "duration",
      "resourceType",
      "error"
    ];
    const rows = this.entries.map((e) => [
      e.id,
      e.action,
      e.connector,
      e.status,
      e.timestamp.toISOString(),
      e.duration ?? "",
      e.resourceType ?? "",
      e.error ?? ""
    ]);
    return [
      headers.join(","),
      ...rows.map((r) => r.join(","))
    ].join("\n");
  }
  clear() {
    this.entries = [];
  }
  // ============================================
  // Utility
  // ============================================
  generateId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
};
var auditLogger = new AuditLogger({ enabled: true });

// src/normalization/NormalizationEngine.ts
var NormalizationEngine = class {
  // ============================================
  // Vulnerability Normalization
  // ============================================
  normalizeVulnerabilities(sources) {
    const normalized = [];
    const errors = [];
    const sourceNames = [];
    for (const source of sources) {
      sourceNames.push(source.connector);
      for (const item of source.data) {
        try {
          const result = source.mapper(item);
          if (result) normalized.push(result);
        } catch (error) {
          errors.push({
            source: source.connector,
            message: error instanceof Error ? error.message : "Mapping failed",
            raw: item
          });
        }
      }
    }
    return {
      data: this.deduplicateVulnerabilities(normalized),
      total: normalized.length,
      sources: sourceNames,
      normalizedAt: /* @__PURE__ */ new Date(),
      errors
    };
  }
  // ============================================
  // Asset Normalization
  // ============================================
  normalizeAssets(sources) {
    const normalized = [];
    const errors = [];
    const sourceNames = [];
    for (const source of sources) {
      sourceNames.push(source.connector);
      for (const item of source.data) {
        try {
          const result = source.mapper(item);
          if (result) normalized.push(result);
        } catch (error) {
          errors.push({
            source: source.connector,
            message: error instanceof Error ? error.message : "Mapping failed",
            raw: item
          });
        }
      }
    }
    return {
      data: this.deduplicateAssets(normalized),
      total: normalized.length,
      sources: sourceNames,
      normalizedAt: /* @__PURE__ */ new Date(),
      errors
    };
  }
  // ============================================
  // Threat Normalization
  // ============================================
  normalizeThreats(sources) {
    const normalized = [];
    const errors = [];
    const sourceNames = [];
    for (const source of sources) {
      sourceNames.push(source.connector);
      for (const item of source.data) {
        try {
          const result = source.mapper(item);
          if (result) normalized.push(result);
        } catch (error) {
          errors.push({
            source: source.connector,
            message: error instanceof Error ? error.message : "Mapping failed",
            raw: item
          });
        }
      }
    }
    return {
      data: normalized,
      total: normalized.length,
      sources: sourceNames,
      normalizedAt: /* @__PURE__ */ new Date(),
      errors
    };
  }
  // ============================================
  // Deduplication
  // ============================================
  deduplicateVulnerabilities(vulns) {
    const seen = /* @__PURE__ */ new Map();
    for (const vuln of vulns) {
      const key = vuln.cve ?? `${vuln.title}-${vuln.affectedAsset}`;
      if (!seen.has(key)) {
        seen.set(key, vuln);
      } else {
        const existing = seen.get(key);
        if (this.severityScore(vuln.severity) > this.severityScore(existing.severity)) {
          seen.set(key, vuln);
        }
      }
    }
    return Array.from(seen.values());
  }
  deduplicateAssets(assets) {
    const seen = /* @__PURE__ */ new Map();
    for (const asset of assets) {
      const key = asset.ipAddress;
      if (!seen.has(key)) {
        seen.set(key, asset);
      } else {
        const existing = seen.get(key);
        if (asset.lastSeen > existing.lastSeen) {
          seen.set(key, asset);
        }
      }
    }
    return Array.from(seen.values());
  }
  // ============================================
  // Severity Helpers
  // ============================================
  severityScore(severity) {
    const scores = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1
    };
    return scores[severity] ?? 0;
  }
  mapSeverity(value, mapping) {
    return mapping[value] ?? "info";
  }
  // ============================================
  // Sort Helpers
  // ============================================
  sortBySeverity(items, order = "desc") {
    return [...items].sort((a, b) => {
      const diff = this.severityScore(b.severity) - this.severityScore(a.severity);
      return order === "desc" ? diff : -diff;
    });
  }
  // ============================================
  // Filter Helpers
  // ============================================
  filterBySeverity(items, minSeverity) {
    const minScore = this.severityScore(minSeverity);
    return items.filter((item) => this.severityScore(item.severity) >= minScore);
  }
  // ============================================
  // Stats
  // ============================================
  getSeverityStats(items) {
    return {
      critical: items.filter((i) => i.severity === "critical").length,
      high: items.filter((i) => i.severity === "high").length,
      medium: items.filter((i) => i.severity === "medium").length,
      low: items.filter((i) => i.severity === "low").length,
      info: items.filter((i) => i.severity === "info").length
    };
  }
};
var normalizationEngine = new NormalizationEngine();

// src/normalization/schemas/vulnerability.ts
var import_zod = require("zod");
var SeveritySchema = import_zod.z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info"
]);
var NormalizedVulnerabilitySchema = import_zod.z.object({
  id: import_zod.z.string().min(1),
  title: import_zod.z.string().min(1),
  severity: SeveritySchema,
  cvss: import_zod.z.number().min(0).max(10).optional(),
  cve: import_zod.z.string().regex(/^CVE-\d{4}-\d+$/).optional(),
  affectedAsset: import_zod.z.string().min(1),
  source: import_zod.z.string().min(1),
  detectedAt: import_zod.z.date(),
  raw: import_zod.z.unknown().optional()
});
function validateVulnerabilities(items) {
  const valid = [];
  const invalid = [];
  for (const item of items) {
    const result = NormalizedVulnerabilitySchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        data: item,
        errors: result.error.issues.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        )
      });
    }
  }
  return { valid, invalid };
}
function cvssToSeverity(cvss) {
  if (cvss >= 9) return "critical";
  if (cvss >= 7) return "high";
  if (cvss >= 4) return "medium";
  if (cvss >= 0.1) return "low";
  return "info";
}

// src/normalization/schemas/asset.ts
var import_zod2 = require("zod");
var AssetTypeSchema = import_zod2.z.enum([
  "server",
  "workstation",
  "network",
  "cloud",
  "unknown"
]);
var NormalizedAssetSchema = import_zod2.z.object({
  id: import_zod2.z.string().min(1),
  hostname: import_zod2.z.string().min(1),
  ipAddress: import_zod2.z.string().refine(isValidIP, { message: "Invalid IP address" }),
  os: import_zod2.z.string().optional(),
  type: AssetTypeSchema,
  source: import_zod2.z.string().min(1),
  lastSeen: import_zod2.z.date(),
  raw: import_zod2.z.unknown().optional()
});
function validateAssets(items) {
  const valid = [];
  const invalid = [];
  for (const item of items) {
    const result = NormalizedAssetSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        data: item,
        errors: result.error.issues.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        )
      });
    }
  }
  return { valid, invalid };
}
function detectAssetType(hostname, os) {
  const h = hostname.toLowerCase();
  const o = os?.toLowerCase() ?? "";
  if (h.includes("srv") || h.includes("server") || o.includes("server") || o.includes("ubuntu") || o.includes("centos") || o.includes("rhel")) return "server";
  if (h.includes("ws") || h.includes("desktop") || h.includes("laptop") || o.includes("windows 10") || o.includes("windows 11") || o.includes("macos")) return "workstation";
  if (h.includes("fw") || h.includes("router") || h.includes("switch") || h.includes("firewall")) return "network";
  if (h.includes("aws") || h.includes("azure") || h.includes("gcp") || h.includes("cloud")) return "cloud";
  return "unknown";
}
function isPrivateIP(ip) {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./
  ];
  return privateRanges.some((range) => range.test(ip));
}
function isValidIP(ip) {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4.test(ip) || ipv6.test(ip);
}

// src/streaming/StreamManager.ts
var import_events2 = require("events");
var StreamManager = class extends import_events2.EventEmitter {
  constructor() {
    super(...arguments);
    this.activeStreams = /* @__PURE__ */ new Map();
  }
  // ============================================
  // Create Stream from Paginated API
  // ============================================
  async *createStream(fetchFn, options) {
    const batchSize = options?.batchSize ?? 50;
    const maxItems = options?.maxItems ?? Infinity;
    let page = 1;
    let totalFetched = 0;
    let batchNumber = 0;
    while (true) {
      try {
        const result = await fetchFn(page, batchSize);
        batchNumber++;
        totalFetched += result.data.length;
        const isLast = !result.hasMore || totalFetched >= maxItems;
        yield {
          items: result.data,
          batchNumber,
          isLast,
          timestamp: /* @__PURE__ */ new Date()
        };
        if (isLast) break;
        page++;
        if (options?.intervalMs) {
          await this.sleep(options.intervalMs);
        }
      } catch (error) {
        options?.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
        break;
      }
    }
  }
  // ============================================
  // Poll Stream (real-time polling)
  // ============================================
  async startPolling(streamId, fetchFn, onData, options) {
    this.activeStreams.set(streamId, true);
    const intervalMs = options?.intervalMs ?? 3e4;
    while (this.activeStreams.get(streamId)) {
      try {
        const items = await fetchFn();
        if (items.length > 0) {
          onData(items);
          this.emit("data", { streamId, items });
        }
      } catch (error) {
        options?.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
      }
      await this.sleep(intervalMs);
    }
  }
  stopPolling(streamId) {
    this.activeStreams.set(streamId, false);
    this.activeStreams.delete(streamId);
  }
  stopAllStreams() {
    for (const key of this.activeStreams.keys()) {
      this.activeStreams.set(key, false);
    }
    this.activeStreams.clear();
  }
  // ============================================
  // Batch Processor
  // ============================================
  async processBatches(items, processFn, batchSize = 100) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processFn(batch);
      results.push(...batchResults);
    }
    return results;
  }
  getActiveStreams() {
    return Array.from(this.activeStreams.keys());
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
var streamManager = new StreamManager();

// src/secrets/VaultHandler.ts
var import_axios2 = __toESM(require("axios"));
var VaultHandler = class {
  constructor(config) {
    this.token = config.token;
    this.client = import_axios2.default.create({
      baseURL: config.vaultUrl,
      timeout: config.timeout ?? 1e4,
      headers: {
        "X-Vault-Token": config.token,
        "Content-Type": "application/json",
        ...config.namespace && { "X-Vault-Namespace": config.namespace }
      }
    });
  }
  // ============================================
  // Read Secret
  // ============================================
  async readSecret(path) {
    const response = await this.client.get(`/v1/${path}`);
    const data = response.data;
    return {
      path,
      data: data.data?.data ?? data.data ?? {},
      version: data.data?.metadata?.version,
      createdAt: data.data?.metadata?.created_time ? new Date(data.data.metadata.created_time) : void 0
    };
  }
  // ============================================
  // Write Secret
  // ============================================
  async writeSecret(path, data) {
    await this.client.post(`/v1/${path}`, { data });
  }
  // ============================================
  // Delete Secret
  // ============================================
  async deleteSecret(path) {
    await this.client.delete(`/v1/${path}`);
  }
  // ============================================
  // List Secrets
  // ============================================
  async listSecrets(path) {
    const response = await this.client.request({
      method: "LIST",
      url: `/v1/${path}`
    });
    return response.data?.data?.keys ?? [];
  }
  // ============================================
  // Get Connector Credentials
  // ============================================
  async getConnectorCredentials(connectorName) {
    try {
      const secret = await this.readSecret(
        `secret/data/connectors/${connectorName}`
      );
      return secret.data;
    } catch {
      throw new Error(
        `Failed to fetch credentials for connector: ${connectorName}`
      );
    }
  }
  // ============================================
  // Health Check
  // ============================================
  async healthCheck() {
    try {
      await this.client.get("/v1/sys/health");
      return true;
    } catch {
      return false;
    }
  }
  // ============================================
  // Renew Token
  // ============================================
  async renewToken() {
    const response = await this.client.post("/v1/auth/token/renew-self");
    return {
      token: response.data.auth.client_token,
      leaseDuration: response.data.auth.lease_duration,
      renewable: response.data.auth.renewable
    };
  }
};

// src/secrets/EnvHandler.ts
var EnvHandler = class {
  constructor(prefix = "COMPLYMENT") {
    this.prefix = prefix;
  }
  // ============================================
  // Get Single Env Var
  // ============================================
  get(key, required = false) {
    const fullKey = `${this.prefix}_${key.toUpperCase()}`;
    const value = process.env[fullKey] ?? process.env[key];
    if (required && !value) {
      throw new Error(`Required environment variable '${fullKey}' is not set`);
    }
    return value;
  }
  getRequired(key) {
    return this.get(key, true);
  }
  // ============================================
  // Get Qualys Credentials
  // ============================================
  getQualysCredentials() {
    return {
      baseUrl: this.getRequired("QUALYS_BASE_URL"),
      username: this.getRequired("QUALYS_USERNAME"),
      password: this.getRequired("QUALYS_PASSWORD")
    };
  }
  // ============================================
  // Get SentinelOne Credentials
  // ============================================
  getSentinelOneCredentials() {
    return {
      baseUrl: this.getRequired("SENTINELONE_BASE_URL"),
      apiToken: this.getRequired("SENTINELONE_API_TOKEN")
    };
  }
  // ============================================
  // Get Checkpoint Credentials
  // ============================================
  getCheckpointCredentials() {
    return {
      baseUrl: this.getRequired("CHECKPOINT_BASE_URL"),
      username: this.getRequired("CHECKPOINT_USERNAME"),
      password: this.getRequired("CHECKPOINT_PASSWORD"),
      domain: this.get("CHECKPOINT_DOMAIN")
    };
  }
  // ============================================
  // Get ManageEngine Credentials
  // ============================================
  getManageEngineCredentials() {
    return {
      baseUrl: this.getRequired("MANAGEENGINE_BASE_URL"),
      clientId: this.getRequired("MANAGEENGINE_CLIENT_ID"),
      clientSecret: this.getRequired("MANAGEENGINE_CLIENT_SECRET"),
      refreshToken: this.getRequired("MANAGEENGINE_REFRESH_TOKEN")
    };
  }
  // ============================================
  // Get Jira Credentials
  // ============================================
  getJiraCredentials() {
    return {
      baseUrl: this.getRequired("JIRA_BASE_URL"),
      email: this.getRequired("JIRA_EMAIL"),
      apiToken: this.getRequired("JIRA_API_TOKEN")
    };
  }
  // ============================================
  // Get Zoho Credentials
  // ============================================
  getZohoCredentials() {
    return {
      baseUrl: this.getRequired("ZOHO_BASE_URL"),
      clientId: this.getRequired("ZOHO_CLIENT_ID"),
      clientSecret: this.getRequired("ZOHO_CLIENT_SECRET"),
      refreshToken: this.getRequired("ZOHO_REFRESH_TOKEN")
    };
  }
  // ============================================
  // Validate All Required Env Vars
  // ============================================
  validateConnector(connectorName) {
    const requiredVars = {
      qualys: ["QUALYS_BASE_URL", "QUALYS_USERNAME", "QUALYS_PASSWORD"],
      sentinelone: ["SENTINELONE_BASE_URL", "SENTINELONE_API_TOKEN"],
      checkpoint: ["CHECKPOINT_BASE_URL", "CHECKPOINT_USERNAME", "CHECKPOINT_PASSWORD"],
      manageengine: ["MANAGEENGINE_BASE_URL", "MANAGEENGINE_CLIENT_ID", "MANAGEENGINE_CLIENT_SECRET", "MANAGEENGINE_REFRESH_TOKEN"],
      jira: ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"],
      zoho: ["ZOHO_BASE_URL", "ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"]
    };
    const vars = requiredVars[connectorName];
    const missing = vars.filter(
      (v) => !process.env[`${this.prefix}_${v}`] && !process.env[v]
    );
    if (missing.length > 0) {
      console.warn(`Missing env vars for ${connectorName}: ${missing.join(", ")}`);
      return false;
    }
    return true;
  }
  // ============================================
  // Get .env.example content
  // ============================================
  static getEnvExample() {
    return `# Complyment Connectors SDK - Environment Variables

# Qualys
COMPLYMENT_QUALYS_BASE_URL=https://qualysapi.qualys.com
COMPLYMENT_QUALYS_USERNAME=your_username
COMPLYMENT_QUALYS_PASSWORD=your_password

# SentinelOne
COMPLYMENT_SENTINELONE_BASE_URL=https://your-instance.sentinelone.net
COMPLYMENT_SENTINELONE_API_TOKEN=your_api_token

# Checkpoint
COMPLYMENT_CHECKPOINT_BASE_URL=https://your-checkpoint-mgmt
COMPLYMENT_CHECKPOINT_USERNAME=admin
COMPLYMENT_CHECKPOINT_PASSWORD=your_password
COMPLYMENT_CHECKPOINT_DOMAIN=your_domain

# ManageEngine
COMPLYMENT_MANAGEENGINE_BASE_URL=https://your-manageengine
COMPLYMENT_MANAGEENGINE_CLIENT_ID=your_client_id
COMPLYMENT_MANAGEENGINE_CLIENT_SECRET=your_client_secret
COMPLYMENT_MANAGEENGINE_REFRESH_TOKEN=your_refresh_token

# Jira
COMPLYMENT_JIRA_BASE_URL=https://your-org.atlassian.net
COMPLYMENT_JIRA_EMAIL=your@email.com
COMPLYMENT_JIRA_API_TOKEN=your_api_token

# Zoho
COMPLYMENT_ZOHO_BASE_URL=https://www.zohoapis.com
COMPLYMENT_ZOHO_CLIENT_ID=your_client_id
COMPLYMENT_ZOHO_CLIENT_SECRET=your_client_secret
COMPLYMENT_ZOHO_REFRESH_TOKEN=your_refresh_token
`;
  }
};
var envHandler = new EnvHandler("COMPLYMENT");

// src/webhook/WebhookManager.ts
var import_events3 = require("events");
var import_crypto = __toESM(require("crypto"));
var WebhookManager = class extends import_events3.EventEmitter {
  constructor(options) {
    super();
    this.handlers = [];
    this.endpoints = /* @__PURE__ */ new Map();
    this.eventHistory = [];
    this.maxHistory = options?.maxHistory ?? 1e3;
  }
  // ============================================
  // Register Endpoint
  // ============================================
  registerEndpoint(config) {
    this.endpoints.set(config.id, {
      ...config,
      receivedCount: 0
    });
  }
  on(event, listener) {
    if (typeof event === "string" && (event === "*" || event.includes("."))) {
      this.handlers.push({
        eventType: event,
        handler: listener
      });
    }
    return super.on(event, listener);
  }
  onConnector(connector, eventType, handler) {
    this.handlers.push({ eventType, connector, handler });
  }
  // ============================================
  // Process Incoming Webhook
  // ============================================
  async processWebhook(endpointId, payload, signature) {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { success: false, error: `Endpoint '${endpointId}' not found` };
    }
    if (!endpoint.enabled) {
      return { success: false, error: "Endpoint is disabled" };
    }
    if (endpoint.secret && signature) {
      const isValid = this.verifySignature(
        JSON.stringify(payload),
        signature,
        endpoint.secret
      );
      if (!isValid) {
        return { success: false, error: "Invalid webhook signature" };
      }
    }
    const event = {
      id: this.generateId(),
      type: payload["type"] ?? "threat.detected",
      connector: endpoint.connector,
      timestamp: /* @__PURE__ */ new Date(),
      payload,
      signature
    };
    endpoint.receivedCount++;
    endpoint.lastReceivedAt = /* @__PURE__ */ new Date();
    if (this.eventHistory.length >= this.maxHistory) {
      this.eventHistory.shift();
    }
    this.eventHistory.push(event);
    await this.dispatchEvent(event);
    return { success: true };
  }
  // ============================================
  // Dispatch Event to Handlers
  // ============================================
  async dispatchEvent(event) {
    const matchingHandlers = this.handlers.filter((h) => {
      const typeMatch = h.eventType === "*" || h.eventType === event.type;
      const connectorMatch = !h.connector || h.connector === event.connector;
      return typeMatch && connectorMatch;
    });
    await Promise.all(
      matchingHandlers.map(async (h) => {
        try {
          await h.handler(event);
        } catch (error) {
          this.emit("error", { handler: h, event, error });
        }
      })
    );
    this.emit(event.type, event);
    this.emit("*", event);
  }
  // ============================================
  // Verify HMAC Signature
  // ============================================
  verifySignature(payload, signature, secret) {
    const expected = import_crypto.default.createHmac("sha256", secret).update(payload).digest("hex");
    return import_crypto.default.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
  // ============================================
  // Generate Webhook Secret
  // ============================================
  static generateSecret() {
    return import_crypto.default.randomBytes(32).toString("hex");
  }
  // ============================================
  // Query History
  // ============================================
  getHistory(filter) {
    let events = [...this.eventHistory];
    if (filter?.connector) {
      events = events.filter((e) => e.connector === filter.connector);
    }
    if (filter?.eventType) {
      events = events.filter((e) => e.type === filter.eventType);
    }
    if (filter?.limit) {
      events = events.slice(-filter.limit);
    }
    return events.reverse();
  }
  // ============================================
  // Stats
  // ============================================
  getStats() {
    const byConnector = {};
    const byType = {};
    for (const event of this.eventHistory) {
      byConnector[event.connector] = (byConnector[event.connector] ?? 0) + 1;
      byType[event.type] = (byType[event.type] ?? 0) + 1;
    }
    return {
      totalEvents: this.eventHistory.length,
      registeredEndpoints: this.endpoints.size,
      registeredHandlers: this.handlers.length,
      byConnector,
      byType
    };
  }
  getEndpoints() {
    return Array.from(this.endpoints.values());
  }
  // ============================================
  // Utility
  // ============================================
  generateId() {
    return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
};
var webhookManager = new WebhookManager({ maxHistory: 1e3 });

// src/ai/mcp/MCPServer.ts
var MCPServer = class {
  constructor(options) {
    this.tools = /* @__PURE__ */ new Map();
    this.name = options?.name ?? "complyment-connectors-mcp";
    this.version = options?.version ?? "1.0.0";
    this.description = options?.description ?? "Complyment Connectors SDK MCP Server";
  }
  // ============================================
  // Register Tool
  // ============================================
  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }
  // ============================================
  // Register Connector Tools (Auto-register)
  // ============================================
  registerConnectorTools(connectorName, methods) {
    for (const method of methods) {
      this.registerTool({
        name: `${connectorName}_${method.name}`,
        description: method.description,
        inputSchema: {
          type: "object",
          properties: method.params ?? {},
          required: []
        },
        handler: async (input) => {
          try {
            const result = await method.handler(input);
            return {
              content: [{ type: "json", data: result }]
            };
          } catch (error) {
            return {
              content: [{
                type: "text",
                text: error instanceof Error ? error.message : "Unknown error"
              }],
              isError: true
            };
          }
        }
      });
    }
  }
  // ============================================
  // Execute Tool
  // ============================================
  async executeTool(name, input) {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Tool '${name}' not found` }],
        isError: true
      };
    }
    try {
      return await tool.handler(input);
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: error instanceof Error ? error.message : "Tool execution failed"
        }],
        isError: true
      };
    }
  }
  // ============================================
  // List Tools (MCP Protocol)
  // ============================================
  listTools() {
    return Array.from(this.tools.values());
  }
  getToolByName(name) {
    return this.tools.get(name);
  }
  // ============================================
  // Server Info (MCP Protocol)
  // ============================================
  getServerInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      toolCount: this.tools.size
    };
  }
  // ============================================
  // Generate MCP Manifest
  // ============================================
  generateManifest() {
    return {
      schema_version: "1.0",
      name_for_human: this.name,
      name_for_model: this.name.replace(/-/g, "_"),
      description_for_human: this.description,
      description_for_model: this.description,
      api: {
        type: "mcp",
        version: this.version
      },
      tools: Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }))
    };
  }
};
function createQualysMCPTools(qualysConnector) {
  return [
    {
      name: "get_assets",
      description: "Get all assets from Qualys vulnerability management",
      params: {
        limit: { type: "number", description: "Number of assets to return" },
        hostname: { type: "string", description: "Filter by hostname" }
      },
      handler: async (params) => qualysConnector.getAssets(params)
    },
    {
      name: "get_vulnerabilities",
      description: "Get vulnerabilities from Qualys",
      params: {
        severity: { type: "array", description: "Filter by severity levels (1-5)", items: { type: "number" } },
        status: { type: "string", description: "Filter by status (Active, Fixed, New)" }
      },
      handler: async (params) => qualysConnector.getVulnerabilities(params)
    },
    {
      name: "get_critical_vulnerabilities",
      description: "Get only critical and high severity active vulnerabilities",
      handler: async () => qualysConnector.getCriticalVulnerabilities()
    },
    {
      name: "health_check",
      description: "Check Qualys connector health and connection status",
      handler: async () => qualysConnector.healthCheck()
    }
  ];
}
function createSentinelOneMCPTools(s1Connector) {
  return [
    {
      name: "get_agents",
      description: "Get all endpoint agents from SentinelOne",
      params: {
        infected: { type: "boolean", description: "Filter infected agents only" },
        limit: { type: "number", description: "Number of agents to return" }
      },
      handler: async (params) => s1Connector.getAgents(params)
    },
    {
      name: "get_threats",
      description: "Get threats detected by SentinelOne",
      params: {
        severity: { type: "string", description: "Filter by severity (critical, high, medium, low)" },
        status: { type: "string", description: "Filter by status (active, mitigated, resolved)" }
      },
      handler: async (params) => s1Connector.getThreats(params)
    },
    {
      name: "quarantine_threat",
      description: "Quarantine a specific threat by ID",
      params: {
        threatId: { type: "string", description: "Threat ID to quarantine" }
      },
      handler: async (params) => s1Connector.quarantineThreat(params["threatId"])
    },
    {
      name: "health_check",
      description: "Check SentinelOne connector health",
      handler: async () => s1Connector.healthCheck()
    }
  ];
}
var mcpServer = new MCPServer({
  name: "complyment-connectors-mcp",
  version: "1.0.0",
  description: "AI Agent interface for Complyment security connectors"
});

// src/ai/langchain/LangChainAdapter.ts
var LangChainAdapter = class {
  // ============================================
  // Create Tool from Connector Method
  // ============================================
  static createTool(options) {
    return {
      name: options.name,
      description: options.description,
      schema: options.schema ?? { type: "object", properties: {} },
      call: async (input) => {
        try {
          const parsedInput = typeof input === "string" ? JSON.parse(input) : input;
          const result = await options.handler(parsedInput);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: error instanceof Error ? error.message : "Tool execution failed"
          });
        }
      }
    };
  }
  // ============================================
  // Qualys Tools
  // ============================================
  static createQualysTools(qualysConnector) {
    return [
      this.createTool({
        name: "qualys_get_assets",
        description: "Fetch all IT assets and hosts from Qualys. Use this to get information about servers, workstations, and network devices.",
        schema: {
          type: "object",
          properties: {
            hostname: { type: "string", description: "Filter by hostname" },
            ipAddress: { type: "string", description: "Filter by IP address" },
            limit: { type: "number", description: "Max results to return" }
          }
        },
        handler: async (input) => qualysConnector.getAssets(input)
      }),
      this.createTool({
        name: "qualys_get_vulnerabilities",
        description: "Get vulnerability scan results from Qualys. Returns CVEs, severity, affected hosts.",
        schema: {
          type: "object",
          properties: {
            severity: {
              type: "array",
              description: "Severity levels to filter (1=Info, 2=Low, 3=Medium, 4=High, 5=Critical)"
            },
            status: {
              type: "string",
              description: "Status filter",
              enum: ["Active", "Fixed", "New", "Re-Opened"]
            }
          }
        },
        handler: async (input) => qualysConnector.getVulnerabilities(input)
      }),
      this.createTool({
        name: "qualys_get_critical_vulnerabilities",
        description: "Get only critical and high severity active vulnerabilities from Qualys. Use this for urgent security assessment.",
        handler: async () => qualysConnector.getCriticalVulnerabilities()
      }),
      this.createTool({
        name: "qualys_normalized_vulnerabilities",
        description: "Get vulnerabilities in normalized format for cross-connector comparison.",
        handler: async (input) => qualysConnector.getNormalizedVulnerabilities(input)
      }),
      this.createTool({
        name: "qualys_health_check",
        description: "Check if Qualys connector is healthy and connected.",
        handler: async () => qualysConnector.healthCheck()
      })
    ];
  }
  // ============================================
  // SentinelOne Tools
  // ============================================
  static createSentinelOneTools(s1Connector) {
    return [
      this.createTool({
        name: "sentinelone_get_agents",
        description: "Get all endpoint agents from SentinelOne EDR. Returns device info, status, and threat count.",
        schema: {
          type: "object",
          properties: {
            infected: { type: "boolean", description: "Return only infected agents" },
            limit: { type: "number", description: "Max results" }
          }
        },
        handler: async (input) => s1Connector.getAgents(input)
      }),
      this.createTool({
        name: "sentinelone_get_threats",
        description: "Get detected threats from SentinelOne. Returns malware, ransomware, and suspicious activity.",
        schema: {
          type: "object",
          properties: {
            severity: {
              type: "string",
              description: "Severity filter",
              enum: ["critical", "high", "medium", "low"]
            },
            status: {
              type: "string",
              description: "Status filter",
              enum: ["active", "mitigated", "resolved", "suspicious"]
            }
          }
        },
        handler: async (input) => s1Connector.getThreats(input)
      }),
      this.createTool({
        name: "sentinelone_get_critical_threats",
        description: "Get only critical and high severity active threats from SentinelOne.",
        handler: async () => s1Connector.getCriticalThreats()
      }),
      this.createTool({
        name: "sentinelone_quarantine_threat",
        description: "Quarantine a specific threat to prevent spread. Requires threat ID.",
        schema: {
          type: "object",
          properties: {
            threatId: { type: "string", description: "The threat ID to quarantine" }
          },
          required: ["threatId"]
        },
        handler: async (input) => s1Connector.quarantineThreat(input["threatId"])
      }),
      this.createTool({
        name: "sentinelone_kill_threat",
        description: "Kill a threat process immediately. Use for active malware.",
        schema: {
          type: "object",
          properties: {
            threatId: { type: "string", description: "The threat ID to kill" }
          },
          required: ["threatId"]
        },
        handler: async (input) => s1Connector.killThreat(input["threatId"])
      }),
      this.createTool({
        name: "sentinelone_health_check",
        description: "Check SentinelOne connector health.",
        handler: async () => s1Connector.healthCheck()
      })
    ];
  }
  // ============================================
  // Jira Tools
  // ============================================
  static createJiraTools(jiraConnector) {
    return [
      this.createTool({
        name: "jira_get_issues",
        description: "Get issues from Jira project management. Filter by project, status, priority.",
        schema: {
          type: "object",
          properties: {
            projectKey: { type: "string", description: "Jira project key e.g. SEC, DEV" },
            status: { type: "string", description: "Issue status filter" },
            priority: { type: "string", description: "Priority filter" },
            jql: { type: "string", description: "Custom JQL query" }
          }
        },
        handler: async (input) => jiraConnector.getIssues(input)
      }),
      this.createTool({
        name: "jira_create_issue",
        description: "Create a new Jira issue.",
        schema: {
          type: "object",
          properties: {
            projectKey: { type: "string", description: "Jira project key" },
            summary: { type: "string", description: "Issue summary" },
            description: { type: "string", description: "Issue description" },
            issueType: { type: "string", description: "Issue type (e.g., Bug, Task)" }
          },
          required: ["projectKey", "summary", "issueType"]
        },
        handler: async (input) => jiraConnector.createIssue(input)
      }),
      this.createTool({
        name: "jira_update_issue",
        description: "Update an existing Jira issue.",
        schema: {
          type: "object",
          properties: {
            issueKey: { type: "string", description: "The issue key (e.g., SEC-123)" },
            summary: { type: "string", description: "Updated summary" },
            priority: { type: "string", description: "Updated priority" }
          },
          required: ["issueKey"]
        },
        handler: async (input) => {
          const { issueKey, ...rest } = input;
          return jiraConnector.updateIssue(issueKey, rest);
        }
      }),
      this.createTool({
        name: "jira_create_security_ticket",
        description: "Create a security ticket in Jira from a vulnerability or threat finding.",
        schema: {
          type: "object",
          properties: {
            projectKey: { type: "string", description: "Jira project key" },
            title: { type: "string", description: "Issue title/summary" },
            description: { type: "string", description: "Detailed description" },
            severity: {
              type: "string",
              description: "Severity level",
              enum: ["critical", "high", "medium", "low"]
            },
            source: { type: "string", description: "Source connector (qualys, sentinelone etc)" }
          },
          required: ["projectKey", "title", "description", "severity", "source"]
        },
        handler: async (input) => jiraConnector.createSecurityTicket(
          input["projectKey"],
          input["title"],
          input["description"],
          input["severity"],
          input["source"]
        )
      }),
      this.createTool({
        name: "jira_add_comment",
        description: "Add a comment to an existing Jira issue.",
        schema: {
          type: "object",
          properties: {
            issueKey: { type: "string", description: "Issue key e.g. SEC-123" },
            comment: { type: "string", description: "Comment text to add" }
          },
          required: ["issueKey", "comment"]
        },
        handler: async (input) => jiraConnector.addComment(
          input["issueKey"],
          input["comment"]
        )
      }),
      this.createTool({
        name: "jira_transition_issue",
        description: "Change the status of a Jira issue.",
        schema: {
          type: "object",
          properties: {
            issueKey: { type: "string", description: "Issue key e.g. SEC-123" },
            transitionId: { type: "string", description: "Transition ID to apply" }
          },
          required: ["issueKey", "transitionId"]
        },
        handler: async (input) => jiraConnector.transitionIssue(
          input["issueKey"],
          input["transitionId"]
        )
      }),
      this.createTool({
        name: "jira_health_check",
        description: "Check Jira connector health.",
        handler: async () => jiraConnector.healthCheck()
      })
    ];
  }
  // ============================================
  // Create All Tools (Full Toolkit)
  // ============================================
  static createAllTools(connectors) {
    const tools = [];
    if (connectors.qualys) {
      tools.push(...this.createQualysTools(connectors.qualys));
    }
    if (connectors.sentinelone) {
      tools.push(...this.createSentinelOneTools(connectors.sentinelone));
    }
    if (connectors.jira) {
      tools.push(...this.createJiraTools(connectors.jira));
    }
    return tools;
  }
};

// src/ai/vercel-ai/VercelAIAdapter.ts
var VercelAIAdapter = class {
  /**
   * Create a tool for Vercel AI SDK
   */
  static createTool(options) {
    return {
      description: options.description,
      parameters: options.parameters,
      execute: options.execute
    };
  }
  /**
   * Create a set of tools for a connector
   */
  static createToolkit(tools) {
    return tools;
  }
  /**
   * Create Qualys-specific tools for Vercel AI SDK
   */
  static createQualysTools(qualysConnector) {
    return {
      qualys_get_assets: this.createTool({
        description: "Fetch all IT assets and hosts from Qualys.",
        parameters: {
          type: "object",
          properties: {
            hostname: { type: "string" },
            ipAddress: { type: "string" }
          }
        },
        execute: async (args) => qualysConnector.getAssets(args)
      }),
      qualys_get_vulnerabilities: this.createTool({
        description: "Get vulnerability scan results from Qualys.",
        parameters: {
          type: "object",
          properties: {
            severity: { type: "array", items: { type: "number" } },
            status: { type: "string" }
          }
        },
        execute: async (args) => qualysConnector.getVulnerabilities(args)
      }),
      qualys_get_critical_vulnerabilities: this.createTool({
        description: "Get critical and high severity active vulnerabilities from Qualys.",
        parameters: { type: "object", properties: {} },
        execute: async () => qualysConnector.getCriticalVulnerabilities()
      }),
      qualys_get_scans: this.createTool({
        description: "Get vulnerability scan history and status from Qualys.",
        parameters: { type: "object", properties: {} },
        execute: async (args) => qualysConnector.getScans(args)
      }),
      qualys_health_check: this.createTool({
        description: "Check Qualys connector health.",
        parameters: { type: "object", properties: {} },
        execute: async () => qualysConnector.healthCheck()
      })
    };
  }
  /**
   * Create SentinelOne-specific tools for Vercel AI SDK
   */
  static createSentinelOneTools(s1Connector) {
    return {
      sentinelone_get_agents: this.createTool({
        description: "Get all endpoint agents from SentinelOne.",
        parameters: {
          type: "object",
          properties: {
            infected: { type: "boolean" }
          }
        },
        execute: async (args) => s1Connector.getAgents(args)
      }),
      sentinelone_get_threats: this.createTool({
        description: "Get detected threats from SentinelOne.",
        parameters: {
          type: "object",
          properties: {
            severity: { type: "string" },
            status: { type: "string" }
          }
        },
        execute: async (args) => s1Connector.getThreats(args)
      }),
      sentinelone_quarantine_threat: this.createTool({
        description: "Quarantine a threat in SentinelOne.",
        parameters: {
          type: "object",
          properties: {
            threatId: { type: "string" }
          },
          required: ["threatId"]
        },
        execute: async (args) => s1Connector.quarantineThreat(args.threatId)
      }),
      sentinelone_health_check: this.createTool({
        description: "Check SentinelOne connector health.",
        parameters: { type: "object", properties: {} },
        execute: async () => s1Connector.healthCheck()
      })
    };
  }
  /**
   * Create Jira-specific tools for Vercel AI SDK
   */
  static createJiraTools(jiraConnector) {
    return {
      jira_get_issues: this.createTool({
        description: "Get issues from Jira.",
        parameters: {
          type: "object",
          properties: {
            projectKey: { type: "string" },
            status: { type: "string" }
          }
        },
        execute: async (args) => jiraConnector.getIssues(args)
      }),
      jira_create_issue: this.createTool({
        description: "Create a new Jira issue.",
        parameters: {
          type: "object",
          properties: {
            projectKey: { type: "string" },
            summary: { type: "string" },
            issueType: { type: "string" }
          },
          required: ["projectKey", "summary", "issueType"]
        },
        execute: async (args) => jiraConnector.createIssue(args)
      }),
      jira_update_issue: this.createTool({
        description: "Update an existing Jira issue.",
        parameters: {
          type: "object",
          properties: {
            issueKey: { type: "string" },
            summary: { type: "string" }
          },
          required: ["issueKey"]
        },
        execute: async (args) => {
          const { issueKey, ...rest } = args;
          return jiraConnector.updateIssue(issueKey, rest);
        }
      }),
      jira_add_comment: this.createTool({
        description: "Add a comment to a Jira issue.",
        parameters: {
          type: "object",
          properties: {
            issueKey: { type: "string" },
            comment: { type: "string" }
          },
          required: ["issueKey", "comment"]
        },
        execute: async (args) => jiraConnector.addComment(args.issueKey, args.comment)
      }),
      jira_health_check: this.createTool({
        description: "Check Jira connector health.",
        parameters: { type: "object", properties: {} },
        execute: async () => jiraConnector.healthCheck()
      })
    };
  }
  /**
   * Create a full set of tools from multiple connectors
   */
  static createFullToolSet(connectors) {
    let toolSet = {};
    if (connectors.qualys) {
      toolSet = { ...toolSet, ...this.createQualysTools(connectors.qualys) };
    }
    if (connectors.sentinelone) {
      toolSet = { ...toolSet, ...this.createSentinelOneTools(connectors.sentinelone) };
    }
    if (connectors.jira) {
      toolSet = { ...toolSet, ...this.createJiraTools(connectors.jira) };
    }
    return toolSet;
  }
};

// src/ai/openai-agents/OpenAIAgentsAdapter.ts
var OpenAIAgentsAdapter = class {
  // ============================================
  // Create Single Tool
  // ============================================
  static createTool(options) {
    return {
      type: "function",
      function: {
        name: options.name,
        description: options.description,
        parameters: {
          type: "object",
          properties: options.parameters ?? {},
          required: options.required ?? []
        },
        strict: options.strict ?? false
      },
      execute: async (params) => {
        try {
          const result = await options.execute(params);
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return JSON.stringify({
            error: error instanceof Error ? error.message : "Tool failed",
            success: false
          });
        }
      }
    };
  }
  // ============================================
  // Security Analyst Agent
  // ============================================
  static createSecurityAnalystAgent(connectors) {
    const tools = [];
    if (connectors.qualys) {
      tools.push(
        this.createTool({
          name: "get_vulnerabilities",
          description: "Get vulnerability scan results from Qualys",
          parameters: {
            severity: { type: "array", description: "Severity levels 1-5", items: { type: "number" } },
            status: { type: "string", description: "Status filter", enum: ["Active", "Fixed", "New"] }
          },
          execute: async (params) => connectors.qualys.getVulnerabilities(params)
        }),
        this.createTool({
          name: "get_critical_vulnerabilities",
          description: "Get only critical and high severity vulnerabilities",
          execute: async () => connectors.qualys.getCriticalVulnerabilities()
        }),
        this.createTool({
          name: "get_assets",
          description: "Get IT assets from Qualys",
          parameters: {
            hostname: { type: "string", description: "Filter by hostname" },
            limit: { type: "number", description: "Max results" }
          },
          execute: async (params) => connectors.qualys.getAssets(params)
        })
      );
    }
    if (connectors.sentinelone) {
      tools.push(
        this.createTool({
          name: "get_threats",
          description: "Get detected threats from SentinelOne EDR",
          parameters: {
            severity: { type: "string", description: "Severity", enum: ["critical", "high", "medium", "low"] },
            status: { type: "string", description: "Status", enum: ["active", "mitigated", "resolved"] }
          },
          execute: async (params) => connectors.sentinelone.getThreats(params)
        }),
        this.createTool({
          name: "quarantine_threat",
          description: "Quarantine a threat to prevent spread - use for active malware",
          parameters: {
            threatId: { type: "string", description: "Threat ID to quarantine" }
          },
          required: ["threatId"],
          strict: true,
          execute: async (params) => connectors.sentinelone.quarantineThreat(params["threatId"])
        })
      );
    }
    if (connectors.jira) {
      tools.push(
        this.createTool({
          name: "create_security_ticket",
          description: "Create a Jira ticket for a security finding",
          parameters: {
            projectKey: { type: "string", description: "Jira project key" },
            title: { type: "string", description: "Ticket title" },
            description: { type: "string", description: "Detailed description" },
            severity: { type: "string", description: "Severity", enum: ["critical", "high", "medium", "low"] },
            source: { type: "string", description: "Source connector" }
          },
          required: ["projectKey", "title", "description", "severity", "source"],
          strict: true,
          execute: async (params) => connectors.jira.createSecurityTicket(
            params["projectKey"],
            params["title"],
            params["description"],
            params["severity"],
            params["source"]
          )
        })
      );
    }
    return {
      name: "SecurityAnalystAgent",
      instructions: `You are an expert cybersecurity analyst with access to enterprise security tools.
      
Your capabilities:
- Analyze vulnerabilities from Qualys vulnerability management
- Monitor threats and endpoints via SentinelOne EDR
- Create and manage security tickets in Jira
- Correlate findings across multiple security tools

Guidelines:
- Always prioritize critical and high severity findings
- When you find an active threat, recommend quarantine
- Create Jira tickets for findings that need remediation
- Provide clear, actionable security recommendations
- Format your analysis with severity, affected assets, and recommended actions`,
      tools,
      model: "gpt-4o"
    };
  }
  // ============================================
  // Compliance Agent
  // ============================================
  static createComplianceAgent(connectors) {
    const tools = [];
    if (connectors.qualys) {
      tools.push(
        this.createTool({
          name: "get_compliance_controls",
          description: "Get compliance control status from Qualys",
          execute: async () => connectors.qualys.getComplianceControls()
        })
      );
    }
    if (connectors.manageengine) {
      tools.push(
        this.createTool({
          name: "get_missing_patches",
          description: "Get missing security patches from ManageEngine",
          execute: async () => connectors.manageengine.getMissingPatches()
        }),
        this.createTool({
          name: "get_critical_patches",
          description: "Get critical missing patches",
          execute: async () => connectors.manageengine.getCriticalPatches()
        })
      );
    }
    if (connectors.jira) {
      tools.push(
        this.createTool({
          name: "create_compliance_ticket",
          description: "Create a compliance issue ticket in Jira",
          parameters: {
            projectKey: { type: "string", description: "Jira project key" },
            title: { type: "string", description: "Issue title" },
            description: { type: "string", description: "Description" },
            severity: { type: "string", description: "Severity", enum: ["critical", "high", "medium", "low"] }
          },
          required: ["projectKey", "title", "description", "severity"],
          execute: async (params) => connectors.jira.createSecurityTicket(
            params["projectKey"],
            params["title"],
            params["description"],
            params["severity"],
            "compliance"
          )
        })
      );
    }
    return {
      name: "ComplianceAgent",
      instructions: `You are a compliance officer AI assistant with access to security and patch management tools.

Your responsibilities:
- Review compliance control status
- Identify missing critical patches
- Create tickets for compliance violations
- Generate compliance reports
- Prioritize remediation by risk level

Always follow regulatory frameworks like ISO 27001, SOC2, and NIST when making recommendations.`,
      tools,
      model: "gpt-4o"
    };
  }
  // ============================================
  // Format for OpenAI API
  // ============================================
  static toOpenAIFormat(tools) {
    return tools.map((tool) => ({
      type: tool.type,
      function: tool.function
    }));
  }
};

// src/ai/hitl/HITLManager.ts
var HITLManager = class {
  constructor(options) {
    this.requests = /* @__PURE__ */ new Map();
    this.handlers = /* @__PURE__ */ new Map();
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 30 * 60 * 1e3;
    this.autoApproveRiskLevels = options?.autoApproveRiskLevels ?? [];
    this.onApprovalRequired = options?.onApprovalRequired;
    this.onApproved = options?.onApproved;
    this.onRejected = options?.onRejected;
    this.onExpired = options?.onExpired;
    this.onCompleted = options?.onCompleted;
  }
  // ============================================
  // Register Action Handler
  // ============================================
  registerHandler(actionType, handler) {
    this.handlers.set(actionType, handler);
  }
  // ============================================
  // Request Approval
  // ============================================
  async requestApproval(options) {
    const request = {
      id: this.generateId(),
      actionType: options.actionType,
      connector: options.connector,
      description: options.description,
      riskLevel: options.riskLevel,
      params: options.params,
      requestedBy: options.requestedBy,
      requestedAt: /* @__PURE__ */ new Date(),
      expiresAt: new Date(Date.now() + (options.timeoutMs ?? this.defaultTimeoutMs)),
      status: "pending"
    };
    this.requests.set(request.id, request);
    if (this.autoApproveRiskLevels.includes(options.riskLevel)) {
      return this.approve(request.id, "auto-approve");
    }
    this.onApprovalRequired?.(request);
    setTimeout(() => {
      const req = this.requests.get(request.id);
      if (req && req.status === "pending") {
        req.status = "expired";
        this.onExpired?.(req);
      }
    }, options.timeoutMs ?? this.defaultTimeoutMs);
    return request;
  }
  // ============================================
  // Approve Request
  // ============================================
  async approve(requestId, approvedBy) {
    const request = this.requests.get(requestId);
    if (!request) throw new Error(`Request ${requestId} not found`);
    if (request.status === "expired") {
      throw new Error(`Request ${requestId} has expired`);
    }
    if (request.status !== "pending") {
      throw new Error(`Request ${requestId} is already ${request.status}`);
    }
    request.status = "approved";
    request.approvedBy = approvedBy;
    request.approvedAt = /* @__PURE__ */ new Date();
    this.onApproved?.(request);
    return this.execute(request);
  }
  // ============================================
  // Reject Request
  // ============================================
  reject(requestId, rejectedBy, reason) {
    const request = this.requests.get(requestId);
    if (!request) throw new Error(`Request ${requestId} not found`);
    if (request.status !== "pending") {
      throw new Error(`Request ${requestId} is already ${request.status}`);
    }
    request.status = "rejected";
    request.rejectedBy = rejectedBy;
    request.rejectedReason = reason;
    this.onRejected?.(request);
    return request;
  }
  // ============================================
  // Execute Approved Action
  // ============================================
  async execute(request) {
    const handler = this.handlers.get(request.actionType);
    if (!handler) {
      request.status = "failed";
      request.error = `No handler registered for action: ${request.actionType}`;
      return request;
    }
    request.status = "executing";
    request.executedAt = /* @__PURE__ */ new Date();
    try {
      request.result = await handler(request.params);
      request.status = "completed";
      this.onCompleted?.(request);
    } catch (error) {
      request.status = "failed";
      request.error = error instanceof Error ? error.message : "Execution failed";
    }
    return request;
  }
  // ============================================
  // Wait for Approval (async polling)
  // ============================================
  async waitForApproval(requestId, pollIntervalMs = 2e3) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const request = this.requests.get(requestId);
        if (!request) {
          clearInterval(interval);
          reject(new Error(`Request ${requestId} not found`));
          return;
        }
        if (request.status === "completed" || request.status === "rejected" || request.status === "failed" || request.status === "expired") {
          clearInterval(interval);
          resolve(request);
        }
      }, pollIntervalMs);
    });
  }
  // ============================================
  // Query Requests
  // ============================================
  getPendingRequests() {
    return Array.from(this.requests.values()).filter(
      (r) => r.status === "pending"
    );
  }
  getRequestById(id) {
    return this.requests.get(id);
  }
  getRequestsByConnector(connector) {
    return Array.from(this.requests.values()).filter(
      (r) => r.connector === connector
    );
  }
  getRequestsByStatus(status) {
    return Array.from(this.requests.values()).filter(
      (r) => r.status === status
    );
  }
  // ============================================
  // Stats
  // ============================================
  getStats() {
    const all = Array.from(this.requests.values());
    return {
      total: all.length,
      pending: all.filter((r) => r.status === "pending").length,
      approved: all.filter((r) => r.status === "approved").length,
      rejected: all.filter((r) => r.status === "rejected").length,
      completed: all.filter((r) => r.status === "completed").length,
      failed: all.filter((r) => r.status === "failed").length,
      expired: all.filter((r) => r.status === "expired").length
    };
  }
  // ============================================
  // Risk Level Helper
  // ============================================
  static getRiskLevel(actionType) {
    const riskMap = {
      "threat.quarantine": "high",
      "threat.kill": "critical",
      "threat.remediate": "high",
      "policy.change": "critical",
      "policy.delete": "critical",
      "deployment.create": "medium",
      "deployment.cancel": "medium",
      "agent.disconnect": "high",
      "rule.add": "high",
      "rule.delete": "critical",
      "scan.launch": "low"
    };
    return riskMap[actionType] ?? "medium";
  }
  // ============================================
  // Utility
  // ============================================
  generateId() {
    return `hitl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
};
var hitlManager = new HITLManager({
  autoApproveRiskLevels: ["low"],
  onApprovalRequired: (request) => {
    console.warn(
      `[HITL] Approval required: ${request.actionType} on ${request.connector} (Risk: ${request.riskLevel})`
    );
  }
});

// src/ai/orchestration/AgentOrchestrator.ts
var AgentOrchestrator = class {
  constructor() {
    this.workflows = /* @__PURE__ */ new Map();
    this.executions = /* @__PURE__ */ new Map();
    this.connectors = /* @__PURE__ */ new Map();
  }
  // ============================================
  // Register Connector
  // ============================================
  registerConnector(name, connector) {
    this.connectors.set(name, connector);
  }
  // ============================================
  // Register Workflow
  // ============================================
  registerWorkflow(workflow) {
    this.workflows.set(workflow.id, workflow);
  }
  // ============================================
  // Execute Workflow
  // ============================================
  async executeWorkflow(workflowId, metadata) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow '${workflowId}' not found`);
    const executionId = this.generateId();
    const context = {
      workflowId,
      results: /* @__PURE__ */ new Map(),
      errors: /* @__PURE__ */ new Map(),
      startedAt: /* @__PURE__ */ new Date(),
      metadata: metadata ?? {}
    };
    const execution = {
      executionId,
      workflowId,
      status: "running",
      startedAt: /* @__PURE__ */ new Date(),
      context,
      stepResults: new Map(
        workflow.steps.map((s) => [
          s.id,
          { stepId: s.id, status: "pending", retryCount: 0 }
        ])
      )
    };
    this.executions.set(executionId, execution);
    try {
      await this.executeSteps(workflow.steps, execution);
      execution.status = "completed";
      execution.completedAt = /* @__PURE__ */ new Date();
      workflow.onComplete?.(context);
    } catch (error) {
      execution.status = "failed";
      execution.completedAt = /* @__PURE__ */ new Date();
      execution.error = error instanceof Error ? error.message : "Workflow failed";
      workflow.onError?.(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
    }
    return execution;
  }
  // ============================================
  // Execute Steps (with dependency resolution)
  // ============================================
  async executeSteps(steps, execution) {
    const completed = /* @__PURE__ */ new Set();
    const remaining = [...steps];
    while (remaining.length > 0) {
      const ready = remaining.filter((step) => {
        if (!step.dependsOn?.length) return true;
        return step.dependsOn.every((dep) => completed.has(dep));
      });
      if (ready.length === 0) {
        throw new Error("Circular dependency detected in workflow steps");
      }
      await Promise.all(
        ready.map(async (step) => {
          await this.executeStep(step, execution);
          completed.add(step.id);
          remaining.splice(remaining.indexOf(step), 1);
        })
      );
    }
  }
  // ============================================
  // Execute Single Step
  // ============================================
  async executeStep(step, execution) {
    const stepResult = execution.stepResults.get(step.id);
    const { context } = execution;
    if (step.condition && !step.condition(context)) {
      stepResult.status = "skipped";
      return;
    }
    stepResult.status = "running";
    stepResult.startedAt = /* @__PURE__ */ new Date();
    const maxRetries = step.retries ?? 0;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let result;
        if (step.type === "fetch" || step.type === "action") {
          result = await this.executeConnectorStep(step, context);
        } else if (step.type === "transform" && step.transform) {
          const prevResult = context.results.get(step.dependsOn?.[0] ?? "");
          result = step.transform(prevResult, context);
        } else if (step.type === "filter") {
          result = await this.executeFilterStep(step, context);
        } else if (step.type === "parallel") {
          result = await this.executeParallelStep(step, context);
        }
        context.results.set(step.id, result);
        stepResult.data = result;
        stepResult.status = "completed";
        stepResult.completedAt = /* @__PURE__ */ new Date();
        step.onSuccess?.(result, context);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        stepResult.retryCount = attempt;
        if (attempt < maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 1e3);
        }
      }
    }
    stepResult.status = "failed";
    stepResult.error = lastError?.message;
    stepResult.completedAt = /* @__PURE__ */ new Date();
    context.errors.set(step.id, lastError);
    step.onError?.(lastError, context);
    throw lastError;
  }
  // ============================================
  // Execute Connector Step
  // ============================================
  async executeConnectorStep(step, context) {
    if (!step.connector || !step.method) {
      throw new Error(`Step '${step.id}' missing connector or method`);
    }
    const connector = this.connectors.get(step.connector);
    if (!connector) {
      throw new Error(`Connector '${step.connector}' not registered`);
    }
    const method = connector[step.method];
    if (!method) {
      throw new Error(`Method '${step.method}' not found on connector '${step.connector}'`);
    }
    const resolvedParams = this.resolveParams(step.params ?? {}, context);
    return method(resolvedParams);
  }
  // ============================================
  // Execute Filter Step
  // ============================================
  async executeFilterStep(step, context) {
    const sourceStepId = step.dependsOn?.[0];
    if (!sourceStepId) return [];
    const sourceData = context.results.get(sourceStepId);
    if (!Array.isArray(sourceData)) return sourceData;
    if (!step.condition) return sourceData;
    return sourceData.filter(
      (item) => step.condition({ ...context, results: /* @__PURE__ */ new Map([["current", item]]) })
    );
  }
  // ============================================
  // Execute Parallel Step
  // ============================================
  async executeParallelStep(step, context) {
    if (!step.params?.["steps"]) return [];
    const parallelSteps = step.params["steps"];
    return Promise.all(
      parallelSteps.map(async (s) => {
        const result = await this.executeConnectorStep(s, context);
        return result;
      })
    );
  }
  // ============================================
  // Resolve Params (support ${stepId.field} syntax)
  // ============================================
  resolveParams(params, context) {
    const resolved = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && value.startsWith("${")) {
        const match = value.match(/^\$\{(.+?)(?:\.(.+))?\}$/);
        if (match) {
          const stepId = match[1];
          const field = match[2];
          const stepResult = context.results.get(stepId);
          resolved[key] = field ? stepResult?.[field] : stepResult;
        } else {
          resolved[key] = value;
        }
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
  // ============================================
  // Pre-built Security Workflows
  // ============================================
  createVulnerabilityResponseWorkflow() {
    return {
      id: "vulnerability-response",
      name: "Automated Vulnerability Response",
      description: "Fetch critical vulns \u2192 Create Jira tickets \u2192 Notify team",
      steps: [
        {
          id: "fetch-vulns",
          name: "Fetch Critical Vulnerabilities",
          type: "fetch",
          connector: "qualys",
          method: "getCriticalVulnerabilities"
        },
        {
          id: "fetch-threats",
          name: "Fetch Active Threats",
          type: "fetch",
          connector: "sentinelone",
          method: "getCriticalThreats"
        },
        {
          id: "create-tickets",
          name: "Create Jira Tickets",
          type: "action",
          connector: "jira",
          method: "createSecurityTicket",
          dependsOn: ["fetch-vulns", "fetch-threats"],
          params: {
            projectKey: "SEC",
            title: "Critical Security Finding",
            description: "${fetch-vulns}",
            severity: "critical",
            source: "automated-workflow"
          }
        }
      ]
    };
  }
  createThreatResponseWorkflow() {
    return {
      id: "threat-response",
      name: "Automated Threat Response",
      description: "Detect threats \u2192 Quarantine \u2192 Create ticket",
      steps: [
        {
          id: "fetch-threats",
          name: "Fetch Active Threats",
          type: "fetch",
          connector: "sentinelone",
          method: "getCriticalThreats"
        },
        {
          id: "quarantine",
          name: "Quarantine Threats",
          type: "action",
          connector: "sentinelone",
          method: "quarantineThreat",
          dependsOn: ["fetch-threats"],
          params: { threatId: "${fetch-threats.id}" }
        },
        {
          id: "create-ticket",
          name: "Create Jira Ticket",
          type: "action",
          connector: "jira",
          method: "createSecurityTicket",
          dependsOn: ["quarantine"],
          params: {
            projectKey: "SEC",
            title: "Threat Quarantined",
            description: "${fetch-threats}",
            severity: "critical",
            source: "sentinelone"
          }
        }
      ]
    };
  }
  // ============================================
  // Query Executions
  // ============================================
  getExecution(executionId) {
    return this.executions.get(executionId);
  }
  getExecutionsByWorkflow(workflowId) {
    return Array.from(this.executions.values()).filter(
      (e) => e.workflowId === workflowId
    );
  }
  getStats() {
    const all = Array.from(this.executions.values());
    return {
      totalExecutions: all.length,
      completed: all.filter((e) => e.status === "completed").length,
      failed: all.filter((e) => e.status === "failed").length,
      running: all.filter((e) => e.status === "running").length,
      registeredWorkflows: this.workflows.size,
      registeredConnectors: this.connectors.size
    };
  }
  // ============================================
  // Utility
  // ============================================
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  generateId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
};
var orchestrator = new AgentOrchestrator();

// src/ai/semantic/SemanticSearch.ts
var TFIDFIndex = class {
  constructor() {
    this.documents = [];
    this.termFrequency = /* @__PURE__ */ new Map();
    this.documentFrequency = /* @__PURE__ */ new Map();
  }
  addDocument(doc) {
    this.documents.push(doc);
    const terms = this.tokenize(doc.content);
    const termCount = /* @__PURE__ */ new Map();
    for (const term of terms) {
      termCount.set(term, (termCount.get(term) ?? 0) + 1);
    }
    this.termFrequency.set(doc.id, termCount);
    for (const term of termCount.keys()) {
      this.documentFrequency.set(
        term,
        (this.documentFrequency.get(term) ?? 0) + 1
      );
    }
  }
  search(query, topK = 5) {
    const queryTerms = this.tokenize(query);
    const scores = [];
    for (const doc of this.documents) {
      let score = 0;
      const tf = this.termFrequency.get(doc.id) ?? /* @__PURE__ */ new Map();
      const docLength = Array.from(tf.values()).reduce((a, b) => a + b, 0);
      for (const term of queryTerms) {
        const termFreq = (tf.get(term) ?? 0) / (docLength || 1);
        const docFreq = this.documentFrequency.get(term) ?? 0;
        const idf = docFreq > 0 ? Math.log(this.documents.length / docFreq) : 0;
        score += termFreq * idf;
      }
      if (score > 0) scores.push({ doc, score });
    }
    return scores.sort((a, b) => b.score - a.score).slice(0, topK);
  }
  tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
  }
  clear() {
    this.documents = [];
    this.termFrequency.clear();
    this.documentFrequency.clear();
  }
  size() {
    return this.documents.length;
  }
};
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
var SemanticSearch = class {
  constructor(options) {
    this.documents = [];
    this.tfidfIndex = new TFIDFIndex();
    this.embeddingProvider = options?.embeddingProvider;
    this.useVectorSearch = options?.useVectorSearch ?? false;
  }
  // ============================================
  // Index Documents
  // ============================================
  async indexDocument(doc) {
    if (this.useVectorSearch && this.embeddingProvider && !doc.embedding) {
      doc.embedding = await this.embeddingProvider.embed(doc.content);
    }
    this.documents.push(doc);
    this.tfidfIndex.addDocument(doc);
  }
  async indexBatch(docs) {
    if (this.useVectorSearch && this.embeddingProvider) {
      const texts = docs.map((d) => d.content);
      const embeddings = await this.embeddingProvider.embedBatch(texts);
      docs.forEach((doc, i) => {
        doc.embedding = embeddings[i];
      });
    }
    for (const doc of docs) {
      this.documents.push(doc);
      this.tfidfIndex.addDocument(doc);
    }
  }
  // ============================================
  // Search
  // ============================================
  async search(query, options) {
    const topK = options?.topK ?? 10;
    const minScore = options?.minScore ?? 0;
    let results;
    if (this.useVectorSearch && this.embeddingProvider) {
      results = await this.vectorSearch(query, topK);
    } else {
      results = this.keywordSearch(query, topK);
    }
    if (options?.connector) {
      results = results.filter(
        (r) => r.document.metadata.connector === options.connector
      );
    }
    if (options?.type) {
      results = results.filter(
        (r) => r.document.metadata.type === options.type
      );
    }
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        results = results.filter(
          (r) => r.document.metadata[key] === value
        );
      }
    }
    return results.filter((r) => r.score >= minScore);
  }
  // ============================================
  // Keyword Search (TF-IDF)
  // ============================================
  keywordSearch(query, topK) {
    const results = this.tfidfIndex.search(query, topK);
    return results.map(({ doc, score }) => ({
      document: doc,
      score,
      highlights: this.extractHighlights(doc.content, query)
    }));
  }
  // ============================================
  // Vector Search (Cosine Similarity)
  // ============================================
  async vectorSearch(query, topK) {
    if (!this.embeddingProvider) return [];
    const queryEmbedding = await this.embeddingProvider.embed(query);
    const docsWithEmbeddings = this.documents.filter((d) => d.embedding);
    const scored = docsWithEmbeddings.map((doc) => ({
      document: doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));
    return scored.sort((a, b) => b.score - a.score).slice(0, topK).map((r) => ({
      ...r,
      highlights: this.extractHighlights(r.document.content, query)
    }));
  }
  // ============================================
  // Index Connector Data
  // ============================================
  indexVulnerabilities(vulnerabilities) {
    const docs = vulnerabilities.map((vuln) => ({
      id: vuln.id,
      content: `${vuln.title} ${vuln.cve ?? ""} ${vuln.severity} severity vulnerability affecting ${vuln.affectedAsset}`,
      metadata: {
        connector: vuln.source,
        type: "vulnerability",
        severity: vuln.severity,
        source: vuln.source
      }
    }));
    docs.forEach((doc) => {
      this.documents.push(doc);
      this.tfidfIndex.addDocument(doc);
    });
  }
  indexThreats(threats) {
    const docs = threats.map((threat) => ({
      id: threat.id,
      content: `${threat.name} ${threat.severity} threat detected on ${threat.affectedAsset}`,
      metadata: {
        connector: threat.source,
        type: "threat",
        severity: threat.severity,
        source: threat.source
      }
    }));
    docs.forEach((doc) => {
      this.documents.push(doc);
      this.tfidfIndex.addDocument(doc);
    });
  }
  indexAssets(assets) {
    const docs = assets.map((asset) => ({
      id: asset.id,
      content: `${asset.hostname} ${asset.ipAddress} ${asset.os ?? ""} asset from ${asset.source}`,
      metadata: {
        connector: asset.source,
        type: "asset",
        source: asset.source
      }
    }));
    docs.forEach((doc) => {
      this.documents.push(doc);
      this.tfidfIndex.addDocument(doc);
    });
  }
  // ============================================
  // Natural Language Queries
  // ============================================
  async findCriticalThreats() {
    return this.search("critical high severity active threat malware", {
      type: "threat",
      topK: 20
    });
  }
  async findVulnerableAssets(hostname) {
    return this.search(`vulnerability affecting ${hostname}`, {
      type: "vulnerability",
      topK: 10
    });
  }
  async findByKeyword(keyword) {
    return this.search(keyword, { topK: 15 });
  }
  // ============================================
  // Extract Highlights
  // ============================================
  extractHighlights(content, query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]/);
    return sentences.filter(
      (sentence) => queryWords.some(
        (word) => sentence.toLowerCase().includes(word)
      )
    ).slice(0, 3).map((s) => s.trim()).filter((s) => s.length > 0);
  }
  // ============================================
  // Stats
  // ============================================
  getStats() {
    const byConnector = {};
    const byType = {};
    for (const doc of this.documents) {
      const connector = doc.metadata.connector;
      const type = doc.metadata.type;
      byConnector[connector] = (byConnector[connector] ?? 0) + 1;
      byType[type] = (byType[type] ?? 0) + 1;
    }
    return {
      totalDocuments: this.documents.length,
      byConnector,
      byType,
      vectorSearchEnabled: this.useVectorSearch
    };
  }
  clearIndex() {
    this.documents = [];
    this.tfidfIndex.clear();
  }
};
var semanticSearch = new SemanticSearch({
  useVectorSearch: false
  // TF-IDF by default, no API needed
});

// src/ai/workflows/AgentWorkflow.ts
var AgentWorkflow = class {
  constructor(options) {
    this.hitlManager = options?.hitlManager;
    this.orchestrator = options?.orchestrator;
    this.semanticSearch = options?.semanticSearch;
    this.auditLogger = options?.auditLogger;
    this.requireApproval = options?.requireApproval ?? true;
    this.agentName = options?.agentName ?? "SecurityAgent";
  }
  // ============================================
  // Workflow 1: Security Posture Assessment
  // ============================================
  async runSecurityPostureAssessment(connectors) {
    const result = {
      workflowName: "Security Posture Assessment",
      status: "success",
      startedAt: /* @__PURE__ */ new Date(),
      steps: [],
      requiresAction: []
    };
    const healthStep = { name: "Health Check", status: "success", data: {} };
    try {
      const health = {};
      if (connectors.qualys) health["qualys"] = await connectors.qualys.healthCheck();
      if (connectors.sentinelone) health["sentinelone"] = await connectors.sentinelone.healthCheck();
      if (connectors.checkpoint) health["checkpoint"] = await connectors.checkpoint.healthCheck();
      healthStep.data = health;
    } catch (error) {
      healthStep.status = "failed";
    }
    result.steps.push(healthStep);
    if (connectors.qualys) {
      const vulnStep = { name: "Fetch Critical Vulnerabilities", status: "success", data: void 0 };
      try {
        vulnStep.data = await connectors.qualys.getCriticalVulnerabilities();
        if (this.semanticSearch && vulnStep.data) {
          const vulns = vulnStep.data?.data?.data ?? [];
          this.semanticSearch.indexVulnerabilities(vulns);
        }
      } catch (error) {
        vulnStep.status = "failed";
      }
      result.steps.push(vulnStep);
    }
    if (connectors.sentinelone) {
      const threatStep = { name: "Fetch Active Threats", status: "success", data: void 0 };
      try {
        threatStep.data = await connectors.sentinelone.getCriticalThreats();
        if (this.semanticSearch && threatStep.data) {
          const threats = threatStep.data?.data?.data ?? [];
          this.semanticSearch.indexThreats(threats);
        }
        const threatCount = threatStep.data?.data?.pagination?.totalItems ?? 0;
        if (threatCount > 0) {
          result.requiresAction?.push(`${threatCount} active threats require immediate attention`);
        }
      } catch (error) {
        threatStep.status = "failed";
      }
      result.steps.push(threatStep);
    }
    if (connectors.sentinelone) {
      const agentStep = { name: "Fetch Infected Agents", status: "success", data: void 0 };
      try {
        agentStep.data = await connectors.sentinelone.getInfectedAgents();
      } catch (error) {
        agentStep.status = "failed";
      }
      result.steps.push(agentStep);
    }
    result.completedAt = /* @__PURE__ */ new Date();
    result.summary = this.generateAssessmentSummary(result);
    this.auditLogger?.logSuccess("data.fetch", "workflow", {
      workflow: "security-posture-assessment"
    });
    return result;
  }
  // ============================================
  // Workflow 2: Automated Threat Response
  // ============================================
  async runThreatResponse(threatId, connectors, jiraProjectKey = "SEC") {
    const result = {
      workflowName: "Automated Threat Response",
      status: "success",
      startedAt: /* @__PURE__ */ new Date(),
      steps: []
    };
    const fetchStep = { name: "Fetch Threat Details", status: "success", data: void 0 };
    try {
      fetchStep.data = await connectors.sentinelone.getThreats({ ids: [threatId] });
    } catch (error) {
      fetchStep.status = "failed";
      result.status = "failed";
    }
    result.steps.push(fetchStep);
    if (result.status === "failed") return result;
    if (this.requireApproval && this.hitlManager) {
      const approvalStep = { name: "Request Quarantine Approval", status: "success", data: void 0 };
      try {
        const request = await this.hitlManager.requestApproval({
          actionType: "threat.quarantine",
          connector: "sentinelone",
          description: `Quarantine threat ${threatId}`,
          riskLevel: "high",
          params: { threatId },
          requestedBy: this.agentName
        });
        approvalStep.data = request;
        if (request.status === "pending") {
          result.status = "pending_approval";
          result.steps.push(approvalStep);
          return result;
        }
      } catch (error) {
        approvalStep.status = "failed";
      }
      result.steps.push(approvalStep);
    }
    const quarantineStep = { name: "Quarantine Threat", status: "success", data: void 0 };
    try {
      quarantineStep.data = await connectors.sentinelone.quarantineThreat(threatId);
    } catch (error) {
      quarantineStep.status = "failed";
      result.status = "failed";
    }
    result.steps.push(quarantineStep);
    if (connectors.jira) {
      const ticketStep = { name: "Create Jira Ticket", status: "success", data: void 0 };
      try {
        ticketStep.data = await connectors.jira.createSecurityTicket(
          jiraProjectKey,
          `[SentinelOne] Threat Quarantined - ${threatId}`,
          `Threat ${threatId} was automatically quarantined by ${this.agentName}`,
          "critical",
          "sentinelone"
        );
      } catch (error) {
        ticketStep.status = "failed";
      }
      result.steps.push(ticketStep);
    }
    result.completedAt = /* @__PURE__ */ new Date();
    this.auditLogger?.logSuccess("threat.mitigate", "sentinelone", { threatId });
    return result;
  }
  // ============================================
  // Workflow 3: Patch Compliance Check
  // ============================================
  async runPatchComplianceCheck(connectors) {
    const result = {
      workflowName: "Patch Compliance Check",
      status: "success",
      startedAt: /* @__PURE__ */ new Date(),
      steps: [],
      requiresAction: []
    };
    const patchStep = { name: "Fetch Critical Missing Patches", status: "success", data: void 0 };
    try {
      patchStep.data = await connectors.manageengine.getCriticalPatches();
    } catch (error) {
      patchStep.status = "failed";
    }
    result.steps.push(patchStep);
    const computerStep = { name: "Fetch Affected Computers", status: "success", data: void 0 };
    try {
      computerStep.data = await connectors.manageengine.getComputers();
    } catch (error) {
      computerStep.status = "failed";
    }
    result.steps.push(computerStep);
    if (connectors.jira && patchStep.data) {
      const ticketStep = { name: "Create Compliance Ticket", status: "success", data: void 0 };
      try {
        ticketStep.data = await connectors.jira.createSecurityTicket(
          "SEC",
          "[ManageEngine] Critical Patches Missing",
          `Critical patches are missing on multiple systems. Immediate patching required.`,
          "critical",
          "manageengine"
        );
      } catch (error) {
        ticketStep.status = "failed";
      }
      result.steps.push(ticketStep);
    }
    result.completedAt = /* @__PURE__ */ new Date();
    result.summary = `Patch compliance check completed. Review results for action items.`;
    return result;
  }
  // ============================================
  // Workflow 4: Natural Language Security Query
  // ============================================
  async runNLQuery(query, options) {
    const result = {
      workflowName: "Natural Language Security Query",
      status: "success",
      startedAt: /* @__PURE__ */ new Date(),
      steps: []
    };
    if (!this.semanticSearch) {
      result.status = "failed";
      result.steps.push({
        name: "Semantic Search",
        status: "failed",
        error: "SemanticSearch not configured"
      });
      return result;
    }
    const searchStep = { name: "Semantic Search", status: "success", data: void 0 };
    try {
      searchStep.data = await this.semanticSearch.search(query, {
        topK: options?.topK ?? 10
      });
    } catch (error) {
      searchStep.status = "failed";
      result.status = "failed";
    }
    result.steps.push(searchStep);
    result.completedAt = /* @__PURE__ */ new Date();
    result.summary = `Found results for: "${query}"`;
    return result;
  }
  // ============================================
  // Summary Generator
  // ============================================
  generateAssessmentSummary(result) {
    const failed = result.steps.filter((s) => s.status === "failed").length;
    const success = result.steps.filter((s) => s.status === "success").length;
    const actions = result.requiresAction?.length ?? 0;
    return `Security assessment completed: ${success} checks passed, ${failed} failed. ${actions > 0 ? `${actions} items require immediate action.` : "No immediate action required."}`;
  }
};
var agentWorkflow = new AgentWorkflow({
  requireApproval: true,
  agentName: "ComplymentSecurityAgent"
});

// src/index.ts
var SDK_VERSION = "0.1.0";
var SDK_NAME = "@skill-mine/complyment-connectors-sdk";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APIError,
  AgentOrchestrator,
  AgentWorkflow,
  AuditLogger,
  AuthType,
  AuthenticationError,
  BaseConnector,
  CacheLayer,
  CheckpointConnector,
  CircuitBreaker,
  CircuitBreakerOpenError,
  ConfigurationError,
  ConnectionError,
  ConnectorEvent,
  ConnectorRegistry,
  ConnectorStatus,
  DuplicatePluginError,
  EnvHandler,
  HITLManager,
  InvalidCredentialsError,
  JiraConnector,
  LangChainAdapter,
  LogLevel,
  Logger,
  MCPServer,
  ManageEngineConnector,
  NormalizationEngine,
  NotFoundError,
  OpenAIAgentsAdapter,
  PluginNotFoundError,
  QualysConnector,
  QualysScanStatus,
  QualysScanType,
  RateLimitError,
  RateLimiter,
  RetryHandler,
  SDKError,
  SDK_NAME,
  SDK_VERSION,
  SemanticSearch,
  SentinelOneConnector,
  SlidingWindowRateLimiter,
  StreamManager,
  TimeoutError,
  TokenExpiredError,
  Tracer,
  ValidationError,
  VaultHandler,
  VercelAIAdapter,
  WebhookManager,
  ZohoConnector,
  agentWorkflow,
  auditLogger,
  createQualysMCPTools,
  createSentinelOneMCPTools,
  cvssToSeverity,
  detectAssetType,
  envHandler,
  hitlManager,
  isPrivateIP,
  isQualysScanActive,
  isQualysScanTerminal,
  isValidQualysScanStatus,
  logger,
  mcpServer,
  normalizationEngine,
  orchestrator,
  registry,
  semanticSearch,
  tracer,
  validateAssets,
  validateQualysScanStatus,
  validateVulnerabilities,
  withRetry
});
