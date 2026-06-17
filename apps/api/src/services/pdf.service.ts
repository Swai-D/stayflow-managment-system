import puppeteer from 'puppeteer'
import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'
import { format } from 'date-fns'

const prisma = new PrismaClient()

export class PdfService {
  async generateReceipt(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            guest: true,
            room: true,
            hotel: true,
            addons: { include: { addon: true } }
          }
        },
        receivedBy: true
      }
    })

    if (!payment) throw ApiError.notFound('Malipo hayakupatikana')

    const html = this.renderReceiptHtml(payment)

    // Note: In a real production environment, you'd use a cloud function or a dedicated PDF microservice
    // but for local/VPS development we use Puppeteer.
    try {
      const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      })
      const page = await browser.newPage()
      await page.setContent(html)
      const pdfBuffer = await page.pdf({ 
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      })
      await browser.close()
      
      // Here you would upload pdfBuffer to Cloudinary
      // For now we simulate the URL
      const pdfUrl = `https://cloudinary.com/stayflow/receipts/${payment.id}.pdf`
      
      const receiptNumber = await this.generateReceiptNumber()
      
      return await prisma.receipt.create({
        data: {
          bookingId: payment.bookingId,
          paymentId: payment.id,
          receiptNumber,
          pdfUrl,
          issuedById: payment.receivedById
        }
      })
    } catch (err) {
      console.error('PDF Generation Error:', err)
      throw ApiError.internal('Imeshindwa kutengeneza risiti ya PDF')
    }
  }

  private async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await prisma.receipt.count({
      where: {
        issuedAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    })
    const num = String(count + 1).padStart(3, '0')
    return `RCP-${year}-${num}`
  }

  async generateInvoice(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        room: true,
        hotel: true,
        roomCharges: { include: { items: true } },
        addons: { include: { addon: true } }
      }
    })

    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    const html = this.renderInvoiceHtml(booking)

    try {
      const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      })
      const page = await browser.newPage()
      await page.setContent(html)
      const pdfBuffer = await page.pdf({ 
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      })
      await browser.close()
      
      // In a real app, upload to Cloudinary and return URL
      return pdfBuffer
    } catch (err) {
      console.error('Invoice PDF Error:', err)
      throw ApiError.internal('Imeshindwa kutengeneza invoice ya PDF')
    }
  }

  private renderInvoiceHtml(booking: any) {
    const { hotel, guest, room, roomCharges, addons } = booking
    const balanceDue = Number(booking.balanceDue)
    const nights = Math.max(1, Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    
    const currencyFormatter = new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    })

    const posItems = roomCharges.flatMap((c: any) => c.items.map((i: any) => ({
      date: c.createdAt,
      name: i.itemName,
      qty: i.quantity,
      price: i.unitPrice,
      total: i.totalPrice
    })))

    const rowsHtml = `
      <tr>
        <td>${format(new Date(booking.checkIn), 'dd/MM')}</td>
        <td>Accommodation (${nights} nights)</td>
        <td>${room.roomNumber}</td>
        <td>1</td>
        <td style="text-align: right;">${currencyFormatter.format(Number(booking.roomTotal) / nights)}</td>
        <td style="text-align: right;">${currencyFormatter.format(Number(booking.roomTotal))}</td>
      </tr>
      ${addons.map((a: any) => `
        <tr>
          <td>${format(new Date(booking.createdAt), 'dd/MM')}</td>
          <td>${a.addon.name}</td>
          <td>-</td>
          <td>${a.quantity}</td>
          <td style="text-align: right;">${currencyFormatter.format(Number(a.unitPrice))}</td>
          <td style="text-align: right;">${currencyFormatter.format(Number(a.subtotal))}</td>
        </tr>
      `).join('')}
      ${posItems.map((i: any) => `
        <tr>
          <td>${format(new Date(i.date), 'dd/MM')}</td>
          <td>${i.name}</td>
          <td>-</td>
          <td>${i.qty}</td>
          <td style="text-align: right;">${currencyFormatter.format(i.price)}</td>
          <td style="text-align: right;">${currencyFormatter.format(i.total)}</td>
        </tr>
      `).join('')}
    `

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', sans-serif; color: #111827; line-height: 1.5; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .hotel-info h1 { margin: 0; color: #2563EB; font-size: 24px; }
          .hotel-info p { margin: 4px 0; font-size: 12px; color: #6B7280; }
          .invoice-meta { text-align: right; }
          .invoice-meta h2 { margin: 0; font-size: 20px; }
          
          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; letter-spacing: 1px; margin-bottom: 8px; }
          .info-block p { margin: 2px 0; font-size: 13px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #F9FAFB; border-bottom: 1px solid #E5E7EB; padding: 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6B7280; }
          td { padding: 12px; border-bottom: 1px solid #F3F4F6; font-size: 13px; }
          
          .totals { margin-left: auto; width: 250px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .total-row.grand { border-top: 2px solid #E5E7EB; margin-top: 8px; padding-top: 12px; font-weight: 700; font-size: 18px; color: #2563EB; }
          
          .footer { margin-top: 60px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 20px; font-size: 12px; color: #9CA3AF; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-info">
            <h1>${hotel.name}</h1>
            <p>${hotel.address || ''}</p>
            <p>${hotel.phone || ''} | ${hotel.email || ''}</p>
          </div>
          <div class="invoice-meta">
            <h2>GUEST INVOICE</h2>
            <p>No: INV-${booking.bookingRef.split('-').pop()}</p>
            <p>Date: ${format(new Date(), 'dd/MM/yyyy')}</p>
          </div>
        </div>

        <div class="grid">
          <div class="info-block">
            <div class="section-title">Bill To</div>
            <p><strong>${guest.fullName}</strong></p>
            <p>${guest.phone}</p>
            <p>${guest.email || ''}</p>
          </div>
          <div class="info-block">
            <div class="section-title">Stay Details</div>
            <p><strong>Ref:</strong> ${booking.bookingRef}</p>
            <p><strong>Room:</strong> ${room.roomNumber} (${room.type})</p>
            <p><strong>Period:</strong> ${format(new Date(booking.checkIn), 'dd/MM')} - ${format(new Date(booking.checkOut), 'dd/MM')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Ref</th>
              <th>Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${currencyFormatter.format(Number(booking.totalAmount))}</span>
          </div>
          <div class="total-row">
            <span>Tax (0%)</span>
            <span>TZS 0</span>
          </div>
          <div class="total-row">
            <span>Amount Paid</span>
            <span>${currencyFormatter.format(Number(booking.paidAmount))}</span>
          </div>
          <div class="total-row grand">
            <span>Balance Due</span>
            <span>${currencyFormatter.format(balanceDue)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Asante kwa kutembelea ${hotel.name} | Thank you for visiting ${hotel.name}</p>
        </div>
      </body>
      </html>
    `
  }

  private renderReceiptHtml(payment: any) {
    const { booking, amount, method, paidAt, receivedBy } = payment
    const { hotel, guest, room, addons } = booking
    const balanceDue = Number(booking.balanceDue)
    
    const currencyFormatter = new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    })

    const itemsHtml = `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">Accommodation (${room.roomNumber} - ${room.type})</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${currencyFormatter.format(Number(booking.roomTotal))}</td>
      </tr>
      ${addons.map((a: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${a.addon.name} (x${a.quantity})</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${currencyFormatter.format(Number(a.subtotal))}</td>
        </tr>
      `).join('')}
    `

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', sans-serif; color: #111827; line-height: 1.5; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .hotel-info h1 { margin: 0; color: #2563EB; font-size: 24px; }
          .hotel-info p { margin: 4px 0; font-size: 12px; color: #6B7280; }
          .receipt-meta { text-align: right; }
          .receipt-meta h2 { margin: 0; font-size: 20px; }
          .receipt-meta p { margin: 4px 0; font-size: 12px; color: #6B7280; }
          
          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9CA3AF; letter-spacing: 1px; margin-bottom: 8px; }
          .info-block p { margin: 2px 0; font-size: 13px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #F9FAFB; padding: 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6B7280; }
          
          .totals { margin-left: auto; width: 250px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .total-row.grand { border-top: 2px solid #E5E7EB; margin-top: 8px; padding-top: 12px; font-weight: 700; font-size: 18px; color: #2563EB; }
          
          .watermark { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px; font-weight: 900; opacity: 0.1; pointer-events: none;
            color: ${balanceDue === 0 ? '#10B981' : '#F59E0B'};
          }
          
          .footer { margin-top: 60px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 20px; font-size: 12px; color: #9CA3AF; }
        </style>
      </head>
      <body>
        <div class="watermark">${balanceDue === 0 ? 'PAID' : 'DEPOSIT'}</div>

        <div class="header">
          <div class="hotel-info">
            <h1>${hotel.name}</h1>
            <p>${hotel.address || ''}</p>
            <p>${hotel.phone || ''} | ${hotel.email || ''}</p>
          </div>
          <div class="receipt-meta">
            <h2>RECEIPT</h2>
            <p>No: RCP-XXXX</p>
            <p>Date: ${format(new Date(paidAt || Date.now()), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </div>

        <div class="grid">
          <div class="info-block">
            <div class="section-title">Guest Details</div>
            <p><strong>${guest.fullName}</strong></p>
            <p>${guest.phone}</p>
            <p>${guest.email || ''}</p>
            <p>${guest.nationality || ''} ${guest.idNumber ? `(${guest.idNumber})` : ''}</p>
          </div>
          <div class="info-block">
            <div class="section-title">Stay Details</div>
            <p><strong>Booking Ref:</strong> ${booking.bookingRef}</p>
            <p><strong>Room:</strong> ${room.roomNumber} (${room.type})</p>
            <p><strong>Period:</strong> ${format(new Date(booking.checkIn), 'dd/MM/yyyy')} - ${format(new Date(booking.checkOut), 'dd/MM/yyyy')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Total Amount</span>
            <span>${currencyFormatter.format(Number(booking.totalAmount))}</span>
          </div>
          <div class="total-row">
            <span>Paid to date</span>
            <span>${currencyFormatter.format(Number(booking.paidAmount))}</span>
          </div>
          <div class="total-row grand">
            <span>Balance Due</span>
            <span>${currencyFormatter.format(balanceDue)}</span>
          </div>
        </div>

        <div style="margin-top: 40px; font-size: 12px;">
          <p><strong>Payment Method:</strong> ${method.toUpperCase()}</p>
          <p><strong>Staff:</strong> ${receivedBy?.fullName || 'System'}</p>
        </div>

        <div class="footer">
          <p>Asante kwa kuchagua ${hotel.name}</p>
          <p>Thank you for choosing ${hotel.name}</p>
        </div>
      </body>
      </html>
    `
  }
}

export const pdfService = new PdfService()
