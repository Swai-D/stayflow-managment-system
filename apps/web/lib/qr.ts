import QRCode from 'qrcode'

const GUEST_PORTAL_URL = process.env.NEXT_PUBLIC_GUEST_PORTAL_URL || 'http://localhost:5501'

export async function generateRoomQR(qrToken?: string | null) {
  if (!qrToken) return ''

  try {
    const url = `${GUEST_PORTAL_URL}/login.html?qr=${qrToken}`
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 120,
      color: {
        dark: '#26120c',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error(err)
    return ''
  }
}
