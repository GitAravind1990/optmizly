'use client'

export function PrintButton() {
  return (
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
      <button
        onClick={() => window.print()}
        style={{
          background: '#6366f1',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Print / Save PDF
      </button>
    </div>
  )
}
