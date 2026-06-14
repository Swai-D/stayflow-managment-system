import QRCode from 'qrcode'

export async function generateRoomQR(roomId: string) {
  try {
    // URL for room details in guest portal
    const url = `${window.location.origin}/book?room=${roomId}`
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 120,
      color: {
        dark: '#1a2b4a',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error(err)
    return ''
  }
}
