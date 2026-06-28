import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Receives CSP violation reports from browsers.
// report-uri sends { "csp-report": {...} }; report-to sends the object directly.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const report = body['csp-report'] ?? body
    console.error('[CSP Violation]', JSON.stringify({
      blockedUri:         report['blocked-uri']          ?? report.blockedURL,
      violatedDirective:  report['violated-directive']   ?? report.effectiveDirective,
      documentUri:        report['document-uri']         ?? report.documentURL,
      sourceFile:         report['source-file']          ?? report.sourceFile,
      lineNumber:         report['line-number']          ?? report.lineNumber,
    }))
  } catch {
    // ignore malformed payloads
  }
  return new NextResponse(null, { status: 204 })
}
