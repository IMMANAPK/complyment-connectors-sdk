// ============================================
// QUALYS PARSER - Complyment Connectors SDK
// ============================================
// Response parsing utilities for Qualys API
// ============================================

import {
  QualysVulnerability,
  QualysParsedReport,
  QualysHostInfo,
  QualysKBEntry,
  QualysSeverity,
  QualysScan,
  QualysScanStatus,
  QualysScanType,
  QualysWASScan,
  validateQualysScanStatus,
} from './types'
import { QUALYS_SEVERITY_MAP } from './constants'

// ============================================
// Host Detections Parser
// ============================================

export function parseHostDetections(
  response: any,
  scanTitle: string
): QualysParsedReport {
  const vulnerabilities: QualysVulnerability[] = []
  const hosts: QualysHostInfo[] = []
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  }

  // Check if response is QPS JSON format (ServiceResponse)
  const serviceResponse = response?.ServiceResponse || response?.serviceResponse

  if (serviceResponse) {
    // QPS JSON format
    const hostAssets = serviceResponse.data || []
    if (!Array.isArray(hostAssets) || hostAssets.length === 0) {
      return emptyReport(scanTitle)
    }

    // Process each host asset
    for (const hostData of hostAssets) {
      const hostAsset = hostData.HostAsset || hostData

      const hostInfo: QualysHostInfo = {
        id: hostAsset.id,
        ip: hostAsset.address,
        dns: hostAsset.dnsHostName || hostAsset.name,
        os: hostAsset.os,
        trackingMethod: hostAsset.trackingMethod,
        lastScanDatetime: hostAsset.vulnsUpdated || hostAsset.lastVulnScan
          ? new Date(hostAsset.vulnsUpdated || hostAsset.lastVulnScan)
          : undefined,
      }

      hosts.push(hostInfo)

      // Extract vulnerabilities from vuln.list
      const vulnList = hostAsset.vuln?.list || []
      if (!Array.isArray(vulnList) || vulnList.length === 0) {
        continue
      }

      // Process each vulnerability
      for (const vulnData of vulnList) {
        const hostAssetVuln = vulnData.HostAssetVuln || vulnData
        const vulnerability = parseQPSVulnerability(hostAssetVuln, hostInfo)
        vulnerabilities.push(vulnerability)
        incrementSeverityCount(severityCounts, vulnerability.severity)
      }
    }
  } else {
    // Legacy XML format
    const hostList = response?.host_list_vm_detection_output?.response?.host_list?.host

    if (!hostList) {
      return emptyReport(scanTitle)
    }

    // Handle both array and single object
    const hostsArray = Array.isArray(hostList) ? hostList : [hostList]

    // Process each host
    for (const host of hostsArray) {
      const hostInfo: QualysHostInfo = {
        id: host.id,
        ip: host.ip,
        dns: host.dns,
        netbios: host.netbios,
        os: host.os,
        trackingMethod: host.tracking_method,
        lastScanDatetime: host.last_scan_datetime
          ? new Date(host.last_scan_datetime)
          : undefined,
      }

      hosts.push(hostInfo)

      // Extract detections for this host
      const detections = host.detection_list?.detection
      if (!detections) continue

      // Handle both array and single object
      const detectionsArray = Array.isArray(detections) ? detections : [detections]

      // Process each detection (vulnerability)
      for (const detection of detectionsArray) {
        const vulnerability = parseDetection(detection, hostInfo)
        vulnerabilities.push(vulnerability)
        incrementSeverityCount(severityCounts, vulnerability.severity)
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
    hosts,
  }
}

// ============================================
// WAS Findings Parser
// ============================================

export function parseWASFindings(
  response: any,
  scanTitle: string
): QualysParsedReport {
  const vulnerabilities: QualysVulnerability[] = []
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  }

  // Extract findings from response
  const findingsList = response?.ServiceResponse?.data

  if (!findingsList || !Array.isArray(findingsList) || findingsList.length === 0) {
    return emptyReport(scanTitle)
  }

  // Track unique web apps
  const webAppsSet = new Set<string>()

  // Process each finding
  for (const findingWrapper of findingsList) {
    const finding = findingWrapper?.Finding
    if (!finding) continue

    // Track web app
    if (finding.webApp?.url) {
      webAppsSet.add(finding.webApp.url)
    }

    // Parse WAS finding into vulnerability format
    const vulnerability = parseWASFinding(finding)
    vulnerabilities.push(vulnerability)
    incrementSeverityCount(severityCounts, vulnerability.severity)
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
    hosts: Array.from(webAppsSet).map(url => ({ url })),
  }
}

// ============================================
// VMDR Findings Parser (VMDR REST API)
// ============================================

/**
 * Parse response from VMDR REST API: GET /rest/2.0/fo/finding/
 * Response format: { count, hasMore, responseCode, data: [{ Finding: {...} }] }
 */
export function parseVMDRFindings(
  response: any,
  title = 'VMDR Findings',
): QualysParsedReport {
  const findingsList: any[] = response?.data || []

  if (!Array.isArray(findingsList) || findingsList.length === 0) {
    return emptyReport(title)
  }

  const vulnerabilities: QualysVulnerability[] = []
  const hostsSet = new Set<string>()
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }

  for (const item of findingsList) {
    const finding = item.Finding || item
    if (!finding) continue

    const qid = parseInt(finding.qid || '0')
    if (qid === 0) continue

    const severity = parseInt(finding.severity || '1') as QualysSeverity
    const hostIp: string = finding.hostIp || finding.ip || ''
    const hostFqdn: string = finding.hostFqdn || finding.fqdn || finding.dns || ''

    if (hostIp) hostsSet.add(hostIp)

    // VMDR returns CVE IDs as a comma-separated string
    const cveList: string[] = finding.cveIds
      ? String(finding.cveIds).split(',').map((s: string) => s.trim()).filter(Boolean)
      : []

    const vulnerability: QualysVulnerability = {
      qid,
      title: finding.title || finding.name || `QID-${qid}`,
      severity,
      ip: hostIp,
      dns: hostFqdn,
      os: finding.os || '',
      port: finding.port ? parseInt(finding.port) : undefined,
      protocol: finding.protocol,
      ssl: finding.ssl === true || finding.ssl === 'true',
      firstFound: finding.firstFound ? new Date(finding.firstFound) : undefined,
      lastFound: finding.lastFound ? new Date(finding.lastFound) : undefined,
      lastUpdate: finding.lastFound ? new Date(finding.lastFound) : undefined,
      timesFound: parseInt(finding.timesFound || '1'),
      status: finding.status || 'ACTIVE',
      results: finding.results || '',
      cvssBase: finding.cvssScore ? parseFloat(finding.cvssScore) : undefined,
      cvss3Base: finding.cvss3Score ? parseFloat(finding.cvss3Score) : undefined,
      cveList,
      solution: finding.solution,
      diagnosis: finding.diagnosis,
      category: finding.category,
      pciFlag: finding.pciFlag === true || finding.pciFlag === 'true',
    }

    vulnerabilities.push(vulnerability)
    incrementSeverityCount(severityCounts, severity)
  }

  return {
    scanTitle: title,
    hostsScanned: hostsSet.size,
    totalVulnerabilities: vulnerabilities.length,
    criticalCount: severityCounts.critical,
    highCount: severityCounts.high,
    mediumCount: severityCounts.medium,
    lowCount: severityCounts.low,
    infoCount: severityCounts.info,
    vulnerabilities,
    hosts: Array.from(hostsSet).map((ip) => ({ ip })),
  }
}

// ============================================
// KB Parser
// ============================================

export function parseVulnerabilityKB(response: any): Map<number, QualysKBEntry> {
  const kbMap = new Map<number, QualysKBEntry>()

  // Extract vulnerability list from response
  const vulnList = response?.knowledge_base_vuln_list_output?.response?.vuln_list?.vuln

  if (!vulnList) {
    return kbMap
  }

  // Handle both array and single object
  const vulnsArray = Array.isArray(vulnList) ? vulnList : [vulnList]

  // Process each vulnerability KB entry
  for (const vuln of vulnsArray) {
    const qid = parseInt(vuln.qid || '0')
    if (qid === 0) continue

    const kbEntry: QualysKBEntry = {
      qid,
      title: vuln.title || `QID-${qid}`,
      vulnType: vuln.vuln_type,
      severityLevel: parseInt(vuln.severity_level || '1'),
      category: vuln.category,
      publishedDatetime: vuln.published_datetime,
      patchable: vuln.patchable === 'true' || vuln.patchable === true,
      diagnosis: vuln.diagnosis,
      consequence: vuln.consequence,
      solution: vuln.solution,
      cvssBase: vuln.cvss?.base ? parseFloat(vuln.cvss.base) : undefined,
      cvssTemporal: vuln.cvss?.temporal ? parseFloat(vuln.cvss.temporal) : undefined,
      cvss3Base: vuln.cvss_v3?.base ? parseFloat(vuln.cvss_v3.base) : undefined,
      cvss3Temporal: vuln.cvss_v3?.temporal ? parseFloat(vuln.cvss_v3.temporal) : undefined,
      cveList: extractCVEList(vuln.cve_list),
      vendorReferenceList: extractVendorReferences(vuln.vendor_reference_list),
      bugtraqList: extractBugtraqList(vuln.bugtraq_list),
      pciFlag: vuln.pci_flag === 'true' || vuln.pci_flag === true,
      pciReasons: extractPCIReasons(vuln.pci_reasons),
      exploitability: vuln.correlation?.exploits ? 'Available' : 'Unknown',
      associatedMalware: extractMalware(vuln.correlation?.malware),
    }

    kbMap.set(qid, kbEntry)
  }

  return kbMap
}

export function enrichVulnerabilitiesWithKB(
  vulnerabilities: QualysVulnerability[],
  kbMap: Map<number, QualysKBEntry>
): QualysVulnerability[] {
  return vulnerabilities.map((vuln) => {
    const kbEntry = kbMap.get(vuln.qid)
    if (!kbEntry) return vuln

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
      patchable: kbEntry.patchable,
    }
  })
}

// ============================================
// Scan List Parsers
// ============================================

export function parseVMScanList(response: any): QualysScan[] {
  const scans: QualysScan[] = []

  // Check if response is QPS-style JSON format (from hostasset API)
  const serviceResponse = response?.ServiceResponse || response?.serviceResponse
  if (serviceResponse) {
    let hostAssets = serviceResponse.data || []

    if (serviceResponse.data?.HostAsset) {
      hostAssets = Array.isArray(serviceResponse.data.HostAsset)
        ? serviceResponse.data.HostAsset
        : [serviceResponse.data.HostAsset]
    }

    if (!Array.isArray(hostAssets)) {
      hostAssets = [hostAssets]
    }

    // Transform QPS host asset data to scan format
    for (const host of hostAssets) {
      let asset = host.HostAsset || host

      const assetId = asset.id || asset.ID || asset.assetId
      const assetName = asset.name || asset.Name || asset.hostname || asset.hostName
      const assetAddress = asset.address || asset.Address || asset.ip || asset.IP
      const assetDns = asset.dnsHostName || asset.dns || asset.DNS || asset.fqdn
      const osName = asset.operatingSystem || asset.os || asset.OS
      const lastScan = asset.lastVulnScan || asset.lastVulnerabilitysScan || asset.lastScan

      const scan: QualysScan = {
        id: assetId || '',
        scanRef: `asset/${assetId || 'unknown'}`,
        title: assetName || `Host: ${assetAddress || assetDns || 'Unknown'}`,
        type: QualysScanType.VM,
        target: assetAddress || assetDns || 'unknown',
        launchDatetime: lastScan ? new Date(lastScan) : undefined,
        status: lastScan ? QualysScanStatus.FINISHED : QualysScanStatus.SUBMITTED,
        state: lastScan ? 'FINISHED' : 'UNKNOWN',
        totalVulnerabilities: asset.vulnerabilityStats?.count || asset.vulnCount || 0,
      }

      scans.push(scan)
    }

    return scans
  }

  // Legacy XML format
  const scanListOutput = response?.scan_list_output || response?.SCAN_LIST_OUTPUT
  if (!scanListOutput) return scans

  const responseData = scanListOutput?.response || scanListOutput?.RESPONSE
  if (!responseData) return scans

  const scanList = responseData?.scan_list || responseData?.SCAN_LIST
  if (!scanList) return scans

  const scanArray = scanList?.scan || scanList?.SCAN
  if (!scanArray) return scans

  const scansToProcess = Array.isArray(scanArray) ? scanArray : [scanArray]

  for (const scanData of scansToProcess) {
    const scan: QualysScan = {
      id: scanData?.ref || scanData?.REF || '',
      scanRef: scanData?.ref || scanData?.REF || '',
      title: scanData?.title || scanData?.TITLE || '',
      type: QualysScanType.VM,
      status: mapQualysStateToStatus(scanData?.state || scanData?.STATE),
      state: scanData?.state || scanData?.STATE,
      target: scanData?.target || scanData?.TARGET,
      userLogin: scanData?.user_login || scanData?.USER_LOGIN,
      assetGroupTitle: scanData?.asset_group_title || scanData?.ASSET_GROUP_TITLE,
      launchDatetime: scanData?.launch_datetime
        ? new Date(scanData.launch_datetime)
        : undefined,
      duration: scanData?.duration ? parseInt(scanData.duration) : undefined,
      processed: scanData?.processed ? parseInt(scanData.processed) : undefined,
      total: scanData?.total ? parseInt(scanData.total) : undefined,
    }

    scans.push(scan)
  }

  return scans
}

export function parseWASScanList(response: any): QualysScan[] {
  const scans: QualysScan[] = []

  const scanData = response?.ServiceResponse?.data
  if (!scanData || !Array.isArray(scanData)) return scans

  for (const item of scanData) {
    const wasScan = item.WasScan
    if (!wasScan) continue

    const scan: QualysScan = {
      id: wasScan.id || '',
      scanRef: wasScan.reference || `was/${wasScan.id}`,
      title: wasScan.name || 'Unnamed WAS Scan',
      type: QualysScanType.WAS,
      status: mapWASStatusToStatus(wasScan.status),
      state: wasScan.consolidatedStatus || wasScan.status,
      target: wasScan.target?.webApp?.url || 'N/A',
      wasScanId: wasScan.id,
      wasScanType: wasScan.type || 'VULNERABILITY',
      webAppId: wasScan.target?.webApp?.id,
      webAppName: wasScan.target?.webApp?.name,
      webAppUrl: wasScan.target?.webApp?.url,
      launchDatetime: wasScan.launchedDate ? new Date(wasScan.launchedDate) : undefined,
      duration: wasScan.summary?.testDuration || 0,
      userLogin: wasScan.launchedBy?.username || 'Unknown',
      processed: wasScan.summary?.nbRequests || 0,
      total: wasScan.summary?.linksCrawled || 0,
    }

    scans.push(scan)
  }

  return scans
}

// ============================================
// Scan Status Parser
// ============================================

export function parseScanStatusResponse(response: any, scanRef: string): {
  status: QualysScanStatus
  state: string
  processed: number
  total: number
  userLogin?: string
  startDatetime?: Date
  duration?: number
} {
  const scanList = response?.scan_list_output?.response?.scan_list?.scan

  if (!scanList) {
    throw new Error('No scan list found in response')
  }

  const scans = Array.isArray(scanList) ? scanList : [scanList]
  const scan = scans.find((s: any) => s.ref === scanRef)

  if (!scan) {
    throw new Error(`Scan with reference ${scanRef} not found in response`)
  }

  const state = scan.status?.state || 'Unknown'
  const status = mapQualysStateToStatus(state)

  let duration: number | undefined
  if (scan.duration) {
    if (typeof scan.duration === 'string' && scan.duration.includes(':')) {
      const parts = scan.duration.split(':')
      duration = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
    } else {
      duration = parseInt(scan.duration)
    }
  }

  return {
    status,
    state,
    processed: parseInt(scan.processed || '0'),
    total: parseInt(scan.target?.ip?.split(',').length || '0'),
    userLogin: scan.user_login,
    startDatetime: scan.launch_datetime ? new Date(scan.launch_datetime) : undefined,
    duration,
  }
}

// ============================================
// Launch Response Parser
// ============================================

export function extractScanRefFromLaunchResponse(response: any): string {
  const itemList = response?.simple_return?.response?.item_list?.item

  if (!itemList) {
    throw new Error('Invalid launch response: missing item_list')
  }

  const items = Array.isArray(itemList) ? itemList : [itemList]
  const scanRefItem = items.find((item: any) =>
    item.key?.toLowerCase() === 'id' || item.key === 'ID'
  )

  if (!scanRefItem || !scanRefItem.value) {
    throw new Error('Invalid launch response: scan reference not found')
  }

  return scanRefItem.value
}

// ============================================
// Helper Functions
// ============================================

export function emptyReport(scanTitle: string): QualysParsedReport {
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
    hosts: [],
  }
}

function parseQPSVulnerability(
  hostAssetVuln: any,
  hostInfo: QualysHostInfo
): QualysVulnerability {
  const qid = parseInt(hostAssetVuln.qid || '0')
  const severity = hostAssetVuln.severity
    ? parseInt(hostAssetVuln.severity) as QualysSeverity
    : 3 as QualysSeverity

  return {
    qid,
    title: `QID-${qid}`,
    severity,
    ip: hostInfo.ip,
    dns: hostInfo.dns,
    netbios: hostInfo.netbios,
    os: hostInfo.os,
    port: hostAssetVuln.port ? parseInt(hostAssetVuln.port) : undefined,
    protocol: hostAssetVuln.protocol,
    ssl: hostAssetVuln.ssl === 'true' || hostAssetVuln.ssl === true,
    firstFound: hostAssetVuln.firstFound ? new Date(hostAssetVuln.firstFound) : undefined,
    lastFound: hostAssetVuln.lastFound ? new Date(hostAssetVuln.lastFound) : undefined,
    lastUpdate: hostAssetVuln.lastFound ? new Date(hostAssetVuln.lastFound) : undefined,
    timesFound: 1,
    results: hostAssetVuln.results || '',
    status: hostAssetVuln.status || 'Active',
  }
}

function parseDetection(detection: any, hostInfo: QualysHostInfo): QualysVulnerability {
  const qid = parseInt(detection.qid || '0')
  const severity = parseInt(detection.severity || '1') as QualysSeverity
  const ssl = detection.ssl === 'true' || detection.ssl === true

  let port: number | undefined
  let protocol: string | undefined

  if (detection.results) {
    const portMatch = detection.results.match(/port\s+(\d+)/i)
    if (portMatch) port = parseInt(portMatch[1])

    const protocolMatch = detection.results.match(/(tcp|udp)/i)
    if (protocolMatch) protocol = protocolMatch[1].toUpperCase()
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
    firstFound: detection.first_found_datetime
      ? new Date(detection.first_found_datetime)
      : undefined,
    lastFound: detection.last_found_datetime
      ? new Date(detection.last_found_datetime)
      : undefined,
    lastUpdate: detection.last_update_datetime
      ? new Date(detection.last_update_datetime)
      : undefined,
    timesFound: parseInt(detection.times_found || '1'),
    results: detection.results,
    status: detection.status || 'Unknown',
  }
}

function parseWASFinding(finding: any): QualysVulnerability {
  const qid = parseInt(finding.qid || '0')
  const severity = parseInt(finding.severity || '1') as QualysSeverity

  return {
    qid,
    title: finding.name || `QID-${qid}`,
    severity,
    ip: finding.webApp?.url,
    dns: finding.webApp?.name,
    os: 'Web Application',
    protocol: 'HTTPS',
    ssl: true,
    firstFound: finding.firstDetectedDate
      ? new Date(finding.firstDetectedDate)
      : undefined,
    lastFound: finding.lastDetectedDate
      ? new Date(finding.lastDetectedDate)
      : undefined,
    lastUpdate: finding.lastTestedDate
      ? new Date(finding.lastTestedDate)
      : undefined,
    timesFound: 1,
    results: `Finding Type: ${finding.type}, Finding ID: ${finding.id || finding.uniqueId}, Potential: ${finding.potential || 'false'}`,
    status: finding.status || 'Unknown',
  }
}

function incrementSeverityCount(counts: any, severity: number): void {
  switch (severity) {
    case 5: counts.critical++; break
    case 4: counts.high++; break
    case 3: counts.medium++; break
    case 2: counts.low++; break
    case 1: counts.info++; break
  }
}

function mapQualysStateToStatus(state: string): QualysScanStatus {
  if (!state) return QualysScanStatus.SUBMITTED
  const stateUpper = state.toUpperCase()

  switch (stateUpper) {
    case 'FINISHED': return QualysScanStatus.FINISHED
    case 'RUNNING':
    case 'PROCESSING': return QualysScanStatus.RUNNING
    case 'PAUSED': return QualysScanStatus.PAUSED
    case 'CANCELED':
    case 'CANCELLED': return QualysScanStatus.CANCELED
    case 'ERROR': return QualysScanStatus.ERROR
    case 'QUEUED':
    case 'LOADING':
    case 'SUBMITTED': return QualysScanStatus.SUBMITTED
    default: return QualysScanStatus.SUBMITTED
  }
}

function mapWASStatusToStatus(status: string): QualysScanStatus {
  if (!status) return QualysScanStatus.SUBMITTED
  const statusUpper = status.toUpperCase()

  switch (statusUpper) {
    case 'FINISHED':
    case 'SUCCESS': return QualysScanStatus.FINISHED
    case 'RUNNING':
    case 'PROCESSING':
    case 'SUBMITTED':
    case 'QUEUED': return QualysScanStatus.RUNNING
    case 'PAUSED': return QualysScanStatus.PAUSED
    case 'CANCELED':
    case 'CANCELLED': return QualysScanStatus.CANCELED
    case 'ERROR':
    case 'FAILED': return QualysScanStatus.ERROR
    default: return QualysScanStatus.SUBMITTED
  }
}

function extractCVEList(cveList: any): string[] {
  if (!cveList || !cveList.cve) return []
  const cves = Array.isArray(cveList.cve) ? cveList.cve : [cveList.cve]
  return cves.map((cve: any) => cve.id || cve).filter(Boolean)
}

function extractVendorReferences(vendorRefList: any): string[] {
  if (!vendorRefList || !vendorRefList.vendor_reference) return []
  const refs = Array.isArray(vendorRefList.vendor_reference)
    ? vendorRefList.vendor_reference
    : [vendorRefList.vendor_reference]
  return refs.map((ref: any) => ref.id || ref).filter(Boolean)
}

function extractBugtraqList(bugtraqList: any): string[] {
  if (!bugtraqList || !bugtraqList.bugtraq) return []
  const ids = Array.isArray(bugtraqList.bugtraq) ? bugtraqList.bugtraq : [bugtraqList.bugtraq]
  return ids.map((bug: any) => bug.id || bug).filter(Boolean)
}

function extractPCIReasons(pciReasons: any): string[] {
  if (!pciReasons || !pciReasons.pci_reason) return []
  return Array.isArray(pciReasons.pci_reason)
    ? pciReasons.pci_reason
    : [pciReasons.pci_reason]
}

function extractMalware(malware: any): string | undefined {
  if (!malware || !malware.mw_src) return undefined

  const sources = Array.isArray(malware.mw_src) ? malware.mw_src : [malware.mw_src]
  const malwareNames: string[] = []

  for (const src of sources) {
    if (src.mw_list?.mw_info) {
      const infos = Array.isArray(src.mw_list.mw_info)
        ? src.mw_list.mw_info
        : [src.mw_list.mw_info]
      infos.forEach((info: any) => {
        if (info.mw_alias) malwareNames.push(info.mw_alias)
      })
    }
  }

  return malwareNames.length > 0 ? malwareNames.join(', ') : undefined
}
