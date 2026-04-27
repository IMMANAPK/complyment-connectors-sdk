'use strict'

// ============================================================
// CONNECTOR REGISTRY
// ============================================================
// Adding a new connector = add ONE entry here. That's it.
// Ops are auto-discovered from the SDK class at startup.
//
// Each entry needs:
//   sdkClass   - exact export name from dist/index.js
//   label      - display name
//   desc       - short description
//   color      - sidebar dot colour
//   fields     - credential input fields shown in the UI
//
// Optional:
//   excludeOps - op IDs to hide from the playground
//   opsConfig  - per-op overrides: { desc, params, args }
//
// opsConfig.params:
//   (omitted)   → auto-detected: null if method takes no args, {} otherwise
//   null        → method takes no arguments (hides params editor)
//   {}          → method takes an optional filter object
//   { key: v }  → pre-filled default params shown in the UI editor
//
// opsConfig.args:
//   List of param keys to extract as positional arguments before the body.
//   e.g. args: ['userId']        → connector.deleteUser(params.userId)
//        args: ['contactId']     → connector.updateContact(params.contactId, {rest})
//        args: ['name','ip']     → connector.addHost(params.name, params.ip)
// ============================================================

module.exports = {

  qualys: {
    sdkClass: 'QualysConnector',
    label: 'Qualys',
    desc: 'Vulnerability Management',
    color: '#e8430a',
    fields: [
      { key: 'baseUrl',  label: 'Base URL',  type: 'text',     placeholder: 'https://qualysapi.qualys.com', required: true },
      { key: 'username', label: 'Username',  type: 'text',     placeholder: 'your-username',                required: true },
      { key: 'password', label: 'Password',  type: 'password', placeholder: '••••••••',                     required: true },
    ],
    opsConfig: {
      getVulnerabilities: { desc: 'Fetch vulnerabilities with optional filters',  params: { severity: [4, 5], page: 1, limit: 10 } },
      getAssets:          { desc: 'List all managed host assets',                 params: { page: 1, limit: 10 } },
      listVMScans:        { desc: 'List all vulnerability management scans' },
    },
  },

  sentinelone: {
    sdkClass: 'SentinelOneConnector',
    label: 'SentinelOne',
    desc: 'Endpoint Detection & Response',
    color: '#6c3bd5',
    fields: [
      { key: 'baseUrl',  label: 'Console URL', type: 'text',     placeholder: 'https://your-console.sentinelone.net', required: true },
      { key: 'apiToken', label: 'API Token',   type: 'password', placeholder: 'your-api-token',                      required: true },
    ],
    opsConfig: {
      getAgents:          { desc: 'List endpoint agents with optional filters', params: { limit: 10 } },
      getThreats:         { desc: 'List detected threats',                      params: { limit: 10 } },
      getCriticalThreats: { desc: 'List critical-severity threats only' },
      getGroups:          { desc: 'List all agent groups' },
      getSites:           { desc: 'List all managed sites' },
    },
  },

  jira: {
    sdkClass: 'JiraConnector',
    label: 'Jira',
    desc: 'Issue Tracking',
    color: '#0052cc',
    fields: [
      { key: 'baseUrl',  label: 'Jira URL',  type: 'text',     placeholder: 'https://your-org.atlassian.net', required: true },
      { key: 'email',    label: 'Email',     type: 'email',    placeholder: 'user@example.com',               required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-api-token',                 required: true },
    ],
    opsConfig: {
      getProjects: { desc: 'List all accessible Jira projects' },
      getIssues:   { desc: 'Fetch issues with optional JQL filter', params: { jql: 'ORDER BY created DESC', maxResults: 10 } },
    },
  },

  'tenable-io': {
    sdkClass: 'TenableIoConnector',
    label: 'Tenable.io',
    desc: 'Cloud Vulnerability Management',
    color: '#00bcd4',
    fields: [
      { key: 'accessKey', label: 'Access Key', type: 'text',     placeholder: 'your-access-key', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'your-secret-key', required: true },
    ],
    opsConfig: {
      getServerInfo:               { desc: 'Retrieve Tenable.io server information' },
      getWorkbenchVulnerabilities: { desc: 'Fetch vulnerability data from workbench' },
      getWorkbenchAssets:          { desc: 'Fetch asset data from workbench' },
    },
  },

  'tenable-sc': {
    sdkClass: 'TenableScConnector',
    label: 'Tenable.sc',
    desc: 'On-Prem Security Center',
    color: '#00897b',
    fields: [
      { key: 'baseUrl',   label: 'Base URL',   type: 'text',     placeholder: 'https://your-tenable-sc.company.com', required: true },
      { key: 'accessKey', label: 'Access Key', type: 'text',     placeholder: 'your-access-key',                     required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'your-secret-key',                     required: true },
    ],
    opsConfig: {
      getCriticalVulnerabilities: { desc: 'Fetch only severity-critical findings' },
      getVulnerabilitiesBySeverity: { desc: 'Fetch vulnerabilities filtered by severity', args: ['severity'], params: { severity: 'high' } },
      getAssetById:        { desc: 'Fetch a single asset by ID',       args: ['assetId'],  params: { assetId: '' } },
      getPolicyById:       { desc: 'Fetch a single policy by ID',      args: ['policyId'], params: { policyId: '' } },
      getScanById:         { desc: 'Fetch a single scan by ID',        args: ['scanId'],   params: { scanId: '' } },
      getScanResultById:   { desc: 'Fetch a single scan result by ID', args: ['resultId'], params: { resultId: '' } },
      getRepositoryById:   { desc: 'Fetch a single repository by ID',  args: ['repoId'],   params: { repoId: '' } },
      getUserById:         { desc: 'Fetch a single user by ID',        args: ['userId'],   params: { userId: '' } },
      getRoleById:         { desc: 'Fetch a single role by ID',        args: ['roleId'],   params: { roleId: '' } },
      createUser:          { desc: 'Create a new user account',        params: { username: '', password: '', name: '', roleID: 1, authType: 'tns' } },
      updateUser:          { desc: 'Update a user by ID',              args: ['userId'],   params: { userId: '', name: '', roleID: 1 } },
      deleteUser:          { desc: 'Delete a user by ID',              args: ['userId'],   params: { userId: '' } },
    },
  },

  checkpoint: {
    sdkClass: 'CheckpointConnector',
    label: 'Check Point',
    desc: 'Network Security Management',
    color: '#e91e63',
    fields: [
      { key: 'baseUrl',  label: 'Management API URL', type: 'text',     placeholder: 'https://your-checkpoint-mgmt:443', required: true },
      { key: 'username', label: 'Username',            type: 'text',     placeholder: 'admin',                            required: true },
      { key: 'password', label: 'Password',            type: 'password', placeholder: '••••••••',                         required: true },
      { key: 'domain',   label: 'Domain (optional)',   type: 'text',     placeholder: 'leave blank if not required',      required: false },
    ],
    opsConfig: {
      getRules:           { desc: 'List access rules for a policy',                params: { policyName: 'Network', limit: 50, offset: 0 } },
      getHosts:           { desc: 'List managed host objects',                     params: { limit: 50, offset: 0 } },
      getLogs:            { desc: 'Fetch recent firewall logs',                    params: { limit: 10 } },
      getGatewayStatus:   { desc: 'Get status of a gateway by name',              args: ['gatewayName'], params: { gatewayName: '' } },
      addRule:            { desc: 'Add a new access rule to a policy',            args: ['policyName'], params: { policyName: 'Network', name: '', action: 'Accept', enabled: true } },
      updateRule:         { desc: 'Update an existing access rule',               args: ['ruleUid', 'policyName'], params: { ruleUid: '', policyName: 'Network' } },
      deleteRule:         { desc: 'Delete an access rule by UID',                 args: ['ruleUid', 'policyName'], params: { ruleUid: '', policyName: 'Network' } },
      addHost:            { desc: 'Create a new host network object',             args: ['name', 'ipAddress', 'comments'], params: { name: '', ipAddress: '', comments: '' } },
      deleteHost:         { desc: 'Delete a host object by UID',                  args: ['uid'],        params: { uid: '' } },
      blockThreat:        { desc: 'Block a threat by UID',                        args: ['threatUid'],  params: { threatUid: '' } },
      installPolicy:      { desc: 'Install a policy package on target gateways',  args: ['policyName', 'targets'], params: { policyName: '', targets: [] } },
      publishChanges:     { desc: 'Publish all pending management changes' },
      discardChanges:     { desc: 'Discard all unpublished management changes' },
      getNormalizedThreats: { desc: 'Fetch threats in normalized format' },
      getNormalizedAssets:  { desc: 'Fetch assets in normalized format' },
    },
  },

  manageengine: {
    sdkClass: 'ManageEngineConnector',
    label: 'ManageEngine',
    desc: 'IT Service Management',
    color: '#f57c00',
    fields: [
      { key: 'baseUrl',      label: 'Base URL',      type: 'text',     placeholder: 'https://your-manageengine.com', required: true },
      { key: 'clientId',     label: 'Client ID',     type: 'text',     placeholder: 'your-client-id',               required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'your-client-secret',           required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'your-refresh-token',           required: true },
    ],
    opsConfig: {
      getPatches:        { desc: 'List patches with optional filters',           params: { page: 1, limit: 10 } },
      getMissingPatches: { desc: 'List all missing patches across computers' },
      getCriticalPatches: { desc: 'Fetch only critical and important patches' },
      getComputers:      { desc: 'List managed computers with optional filters', params: { page: 1, limit: 10 } },
      getPatchById:      { desc: 'Fetch a single patch by ID', args: ['patchId'], params: { patchId: '' } },
    },
  },

  zoho: {
    sdkClass: 'ZohoConnector',
    label: 'Zoho',
    desc: 'Business & Desk Suite',
    color: '#e53e00',
    fields: [
      { key: 'baseUrl',      label: 'Base URL',      type: 'text',     placeholder: 'https://desk.zoho.com', required: true },
      { key: 'clientId',     label: 'Client ID',     type: 'text',     placeholder: 'your-client-id',       required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'your-client-secret',   required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'your-refresh-token',   required: true },
    ],
    opsConfig: {
      getContacts:       { desc: 'List CRM contacts',                       params: { page: 1, limit: 10 } },
      getContactById:    { desc: 'Fetch a contact by ID',                   args: ['contactId'], params: { contactId: '' } },
      createContact:     { desc: 'Create a new CRM contact',                params: { First_Name: '', Last_Name: '', Email: '', Phone: '' } },
      updateContact:     { desc: 'Update a contact by ID',                  args: ['contactId'], params: { contactId: '', First_Name: '', Last_Name: '' } },
      deleteContact:     { desc: 'Delete a contact by ID',                  args: ['contactId'], params: { contactId: '' } },
      getLeads:          { desc: 'List CRM leads',                          params: { page: 1, limit: 10 } },
      getLeadById:       { desc: 'Fetch a lead by ID',                      args: ['leadId'],    params: { leadId: '' } },
      createLead:        { desc: 'Create a new CRM lead',                   params: { Last_Name: '', Email: '', Company: '', Phone: '' } },
      convertLead:       { desc: 'Convert a lead to an account/deal',       args: ['leadId', 'accountName'], params: { leadId: '', accountName: '' } },
      getAccounts:       { desc: 'List CRM accounts',                       args: ['page', 'perPage'], params: { page: 1, perPage: 50 } },
      getAccountById:    { desc: 'Fetch an account by ID',                  args: ['accountId'], params: { accountId: '' } },
      createAccount:     { desc: 'Create a new CRM account',                params: { Account_Name: '', Phone: '', Website: '' } },
      getDeals:          { desc: 'List CRM deals',                          params: { page: 1, limit: 10 } },
      getDealById:       { desc: 'Fetch a deal by ID',                      args: ['dealId'],    params: { dealId: '' } },
      createDeal:        { desc: 'Create a new CRM deal',                   params: { Deal_Name: '', Stage: 'Qualification', Amount: 0 } },
      updateDeal:        { desc: 'Update a deal by ID',                     args: ['dealId'],    params: { dealId: '', Stage: '', Amount: 0 } },
      createTask:        { desc: 'Create a new CRM task',                   params: { Subject: '', Due_Date: '', Status: 'Not Started', Priority: 'Normal' } },
      searchContacts:    { desc: 'Search contacts by criteria string',      args: ['query'],     params: { query: '' } },
      searchLeads:       { desc: 'Search leads by criteria string',         args: ['query'],     params: { query: '' } },
      searchDeals:       { desc: 'Search deals by criteria string',         args: ['query'],     params: { query: '' } },
      bulkCreateContacts: { desc: 'Bulk-create up to 100 contacts at once', args: ['contacts'],  params: { contacts: [] } },
    },
  },

}
