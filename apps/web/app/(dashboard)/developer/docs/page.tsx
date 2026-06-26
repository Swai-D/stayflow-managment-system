'use client'

import { Copy, CheckCircle, Terminal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function DeveloperDocsPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(null), 2000)
  }

  const baseUrl = 'http://localhost:5000/api/v1/ext'

  const codeBlock = (code: string, key: string) => (
    <div className="relative bg-[#1a2b4a] rounded-lg p-3 mb-3 group">
      <pre className="text-[11px] font-mono text-gray-100 overflow-x-auto"><code>{code}</code></pre>
      <button
        onClick={() => copy(code, key)}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied === key ? <CheckCircle size={14} className="text-green-400"/> : <Copy size={14}/>}
      </button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h2 className="text-[14px] font-bold text-blue-900 mb-1">Buffalo Hotel External API</h2>
        <p className="text-[12px] text-blue-700">
          Use the endpoints below to integrate Buffalo Hotel with accounting systems, channel managers,
          CRMs, or custom dashboards. Authentication is via API keys.
        </p>
      </div>

      <section>
        <h3 className="text-[14px] font-bold text-gray-900 mb-2">Authentication</h3>
        <p className="text-[12px] text-gray-600 mb-2">
          Include your API key in the <code>Authorization</code> header as a Bearer token, or use the <code>X-API-Key</code> header.
        </p>
        {codeBlock(`curl ${baseUrl}/bookings \\\n  -H "Authorization: Bearer sf_your_api_key_here"`, 'auth')}
      </section>

      <section>
        <h3 className="text-[14px] font-bold text-gray-900 mb-2">Available Endpoints</h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-[12px]">
          <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b border-gray-100 font-semibold text-gray-600">
            <span className="col-span-2">Method</span>
            <span className="col-span-5">Path</span>
            <span className="col-span-5">Description</span>
          </div>
          {[
            ['GET', '/bookings', 'List bookings (max 100)'],
            ['GET', '/bookings/:id', 'Get booking details'],
            ['GET', '/guests', 'List guests'],
            ['GET', '/rooms', 'List rooms'],
            ['GET', '/availability?checkIn=&checkOut=', 'Available rooms for dates'],
            ['GET', '/invoices', 'List invoices'],
            ['GET', '/payments', 'List payments'],
          ].map(([method, path, desc]) => (
            <div key={path} className="grid grid-cols-12 px-4 py-2 border-b border-gray-100 last:border-0">
              <span className="col-span-2 font-mono text-[#2563EB]">{method}</span>
              <span className="col-span-5 font-mono text-gray-700">{path}</span>
              <span className="col-span-5 text-gray-600">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[14px] font-bold text-gray-900 mb-2">Example: Get bookings</h3>
        {codeBlock(`fetch('${baseUrl}/bookings', {
  headers: {
    'Authorization': 'Bearer sf_your_api_key_here',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log(data.data))`, 'example')}
      </section>

      <section>
        <h3 className="text-[14px] font-bold text-gray-900 mb-2">Webhooks</h3>
        <p className="text-[12px] text-gray-600 mb-2">
          Buffalo Hotel can POST to your URL when events happen. Configure webhooks in the Webhooks tab.
          Each request includes an <code>X-Buffalo-Hotel-Event</code> header and, if a secret is set,
          an <code>X-Buffalo-Hotel-Signature</code> HMAC-SHA256 signature.
        </p>
        {codeBlock(`// Verify signature (Node.js)
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== req.headers['x-buffalo-hotel-signature']) {
  return res.status(401).send('Invalid signature');
}`, 'verify')}
      </section>

      <section>
        <h3 className="text-[14px] font-bold text-gray-900 mb-2">Webhook Events</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'booking.created', 'booking.updated', 'booking.checked_in',
            'booking.checked_out', 'booking.cancelled', 'payment.received',
            'invoice.paid', 'room_charge.created', 'guest.created'
          ].map(e => (
            <span key={e} className="text-[11px] px-2 py-1 bg-gray-100 text-gray-700 rounded">{e}</span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[14px] font-bold text-gray-900 mb-2">Security Best Practices</h3>
        <ul className="list-disc list-inside text-[12px] text-gray-600 space-y-1">
          <li>Store API keys in environment variables, never in client-side code.</li>
          <li>Use the minimum scopes needed for each integration.</li>
          <li>Set an expiry date for keys used by third-party vendors.</li>
          <li>Always verify webhook signatures using the secret.</li>
          <li>Rotate keys periodically and revoke unused keys.</li>
        </ul>
      </section>
    </div>
  )
}
