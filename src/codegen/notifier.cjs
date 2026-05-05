'use strict'
const https = require('https')

// Sends email notification about the connector PR.
// Configure via env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL, NOTIFY_FROM.

async function notify(opts) {
  const { connectorName, branch, prUrl, reviewResult, testResult, dryRun = true, sendNotifications = false } = opts
  const results = []

  if (dryRun || !sendNotifications) {
    return [{ channel: 'preview', status: 'ready', message: preview({ connectorName, branch, prUrl, reviewResult, testResult }) }]
  }

  if (process.env.SMTP_HOST && process.env.NOTIFY_EMAIL) {
    try {
      await sendSmtpEmail({ connectorName, branch, prUrl, reviewResult, testResult })
      results.push({ channel: 'email', status: 'sent', to: process.env.NOTIFY_EMAIL })
    } catch (e) {
      results.push({ channel: 'email', status: 'failed', error: e.message })
    }
  }

  if (results.length === 0) {
    results.push({ channel: 'console', status: 'sent',
      message: `Connector ready: ${connectorName} | PR: ${prUrl || 'n/a'}` })
    console.log(`\n[Notify] Connector ready: ${connectorName}\nBranch: ${branch}\nPR: ${prUrl || 'n/a'}\nScore: ${reviewResult?.score ?? '—'}/100\n`)
  }

  return results
}

function preview({ connectorName, branch, prUrl, reviewResult, testResult }) {
  return `Connector : ${connectorName}
Branch    : ${branch}
PR        : ${prUrl || 'n/a'}
Tests     : ${testResult?.summary || 'not run'}
Score     : ${reviewResult?.score ?? 'n/a'}/100
Status    : Ready for review`
}

async function sendSmtpEmail({ connectorName, branch, prUrl, reviewResult, testResult }) {
  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER || process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })

  await transporter.sendMail({
    to: process.env.NOTIFY_EMAIL,
    from: process.env.NOTIFY_FROM || process.env.SMTP_USER || 'generator@complyment.io',
    subject: `[Connector Ready] ${connectorName}`,
    text: preview({ connectorName, branch, prUrl, reviewResult, testResult }),
  })
}

function post(url, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders } },
      res => { let d = ''; res.on('data', c => (d += c)); res.on('end', () => resolve(d)) }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

module.exports = { notify, preview, sendSmtpEmail }
