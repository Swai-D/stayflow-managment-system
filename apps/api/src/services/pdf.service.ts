import PDFDocument from 'pdfkit'
import { PassThrough } from 'stream'
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

    try {
      // Generate PDF to validate the receipt data can be rendered.
      await this.buildReceiptPdf(payment)

      const receiptNumber = await this.generateReceiptNumber()

      return await prisma.receipt.create({
        data: {
          bookingId: payment.bookingId,
          paymentId: payment.id,
          receiptNumber,
          pdfUrl: `https://cloudinary.com/stayflow/receipts/${payment.id}.pdf`,
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

  async generateInvoice(bookingId: string): Promise<Buffer> {
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

    try {
      return await this.buildInvoicePdf(booking)
    } catch (err) {
      console.error('Invoice PDF Error:', err)
      throw ApiError.internal('Imeshindwa kutengeneza invoice ya PDF')
    }
  }

  private formatMoney(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount)
  }

  private async buildBuffer(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' })
      const stream = new PassThrough()
      const chunks: Buffer[] = []

      stream.on('data', chunk => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
      doc.on('error', reject)

      doc.pipe(stream)
      draw(doc)
      doc.end()
    })
  }

  private drawHeader(doc: PDFKit.PDFDocument, hotel: any, title: string, metaLines: string[]) {
    const left = doc.page.margins.left
    const right = doc.page.width - doc.page.margins.right
    const top = doc.y

    doc.fontSize(22).fillColor('#2563EB').font('Helvetica-Bold')
    doc.text(hotel.name, left, top)

    doc.fontSize(10).fillColor('#6B7280').font('Helvetica')
    doc.text(hotel.address || '', left, doc.y + 2)
    doc.text(`${hotel.phone || ''} | ${hotel.email || ''}`, left, doc.y + 2)

    const metaTop = top
    doc.fontSize(18).fillColor('#111827').font('Helvetica-Bold')
    metaLines.forEach((line, i) => {
      doc.text(line, right - 180, metaTop + i * 22, { align: 'right', width: 180 })
    })

    doc.y = Math.max(doc.y, metaTop + metaLines.length * 22 + 10)
    doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke('#E5E7EB')
    doc.moveDown(1.5)
  }

  private drawInfoGrid(doc: PDFKit.PDFDocument, leftTitle: string, leftLines: string[], rightTitle: string, rightLines: string[]) {
    const left = doc.page.margins.left
    const mid = doc.page.width / 2
    const top = doc.y

    doc.fontSize(10).fillColor('#9CA3AF').font('Helvetica-Bold')
    doc.text(leftTitle.toUpperCase(), left, top)
    doc.text(rightTitle.toUpperCase(), mid, top)

    doc.fontSize(11).fillColor('#111827').font('Helvetica')
    let y = top + 14
    leftLines.forEach(line => {
      doc.text(line, left, y, { width: mid - left - 20 })
      y += 14
    })

    y = top + 14
    rightLines.forEach(line => {
      doc.text(line, mid, y, { width: mid - doc.page.margins.left - 20 })
      y += 14
    })

    doc.y = Math.max(y, doc.y) + 10
    doc.moveDown(0.5)
  }

  private drawTable(
    doc: PDFKit.PDFDocument,
    headers: string[],
    rows: string[][],
    colWidths: number[],
    aligns: Array<'left' | 'right' | 'center'> = []
  ) {
    const startX = doc.page.margins.left
    const right = doc.page.width - doc.page.margins.right
    const rowHeight = 22
    let y = doc.y

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#6B7280')
    let x = startX
    headers.forEach((h, i) => {
      doc.text(h.toUpperCase(), x + 4, y + 6, { width: colWidths[i] - 8, align: aligns[i] || 'left' })
      x += colWidths[i]
    })
    y += rowHeight
    doc.moveTo(startX, y - 2).lineTo(right, y - 2).stroke('#E5E7EB')

    doc.font('Helvetica').fontSize(10).fillColor('#111827')
    rows.forEach(row => {
      x = startX
      row.forEach((cell, i) => {
        doc.text(cell, x + 4, y + 6, { width: colWidths[i] - 8, align: aligns[i] || 'left' })
        x += colWidths[i]
      })
      y += rowHeight
      doc.moveTo(startX, y - 2).lineTo(right, y - 2).stroke('#F3F4F6')
    })

    doc.y = y + 10
  }

  private drawTotals(doc: PDFKit.PDFDocument, rows: { label: string; value: string; grand?: boolean }[]) {
    const right = doc.page.width - doc.page.margins.right
    const width = 220
    const left = right - width
    let y = doc.y

    rows.forEach(row => {
      if (row.grand) {
        doc.moveTo(left, y).lineTo(right, y).stroke('#E5E7EB')
        y += 10
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#2563EB')
      } else {
        doc.font('Helvetica').fontSize(12).fillColor('#111827')
      }
      doc.text(row.label, left, y, { width: width / 2, align: 'left' })
      doc.text(row.value, left + width / 2, y, { width: width / 2, align: 'right' })
      y += row.grand ? 26 : 20
    })

    doc.y = y + 10
  }

  private drawWatermark(doc: PDFKit.PDFDocument, text: string, color: string) {
    const cx = doc.page.width / 2
    const cy = doc.page.height / 2

    doc.save()
    doc.translate(cx, cy)
    doc.rotate(-45)
    doc.fontSize(80).fillColor(color).opacity(0.1).font('Helvetica-Bold')
    doc.text(text, -doc.widthOfString(text) / 2, -30)
    doc.restore()
    doc.opacity(1)
  }

  private async buildInvoicePdf(booking: any): Promise<Buffer> {
    const { hotel, guest, room, roomCharges, addons } = booking
    const balanceDue = Number(booking.balanceDue)
    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    )

    const posItems = (roomCharges || []).flatMap((c: any) =>
      (c.items || []).map((i: any) => ({
        date: c.createdAt,
        name: i.itemName,
        qty: i.quantity,
        price: i.unitPrice,
        total: i.totalPrice
      }))
    )

    const rows: string[][] = [
      [
        format(new Date(booking.checkIn), 'dd/MM'),
        `Accommodation (${nights} nights)`,
        room.roomNumber,
        '1',
        this.formatMoney(Number(booking.roomTotal) / nights),
        this.formatMoney(Number(booking.roomTotal))
      ]
    ]

    ;(addons || []).forEach((a: any) => {
      rows.push([
        format(new Date(booking.createdAt), 'dd/MM'),
        a.addon.name,
        '-',
        String(a.quantity),
        this.formatMoney(Number(a.unitPrice)),
        this.formatMoney(Number(a.subtotal))
      ])
    })

    posItems.forEach((i: any) => {
      rows.push([
        format(new Date(i.date), 'dd/MM'),
        i.name,
        '-',
        String(i.qty),
        this.formatMoney(i.price),
        this.formatMoney(i.total)
      ])
    })

    const invoiceNo = `INV-${booking.bookingRef.split('-').pop()}`

    return this.buildBuffer(doc => {
      this.drawHeader(doc, hotel, 'GUEST INVOICE', [
        invoiceNo,
        `Date: ${format(new Date(), 'dd/MM/yyyy')}`
      ])

      this.drawInfoGrid(
        doc,
        'Bill To',
        [guest.fullName, guest.phone, guest.email || ''],
        'Stay Details',
        [
          `Ref: ${booking.bookingRef}`,
          `Room: ${room.roomNumber} (${room.type})`,
          `Period: ${format(new Date(booking.checkIn), 'dd/MM')} - ${format(new Date(booking.checkOut), 'dd/MM')}`
        ]
      )

      this.drawTable(
        doc,
        ['Date', 'Description', 'Ref', 'Qty', 'Unit Price', 'Total'],
        rows,
        [60, 180, 70, 40, 80, 80],
        ['left', 'left', 'left', 'left', 'right', 'right']
      )

      this.drawTotals(doc, [
        { label: 'Subtotal', value: this.formatMoney(Number(booking.totalAmount)) },
        { label: 'Tax (0%)', value: this.formatMoney(0) },
        { label: 'Amount Paid', value: this.formatMoney(Number(booking.paidAmount)) },
        { label: 'Balance Due', value: this.formatMoney(balanceDue), grand: true }
      ])

      doc.moveDown(2)
      doc.fontSize(11).fillColor('#9CA3AF').font('Helvetica')
      doc.text(`Asante kwa kutembelea ${hotel.name} | Thank you for visiting ${hotel.name}`, {
        align: 'center'
      })
    })
  }

  private async buildReceiptPdf(payment: any): Promise<Buffer> {
    const { booking, amount, method, paidAt, receivedBy } = payment
    const { hotel, guest, room, addons } = booking
    const balanceDue = Number(booking.balanceDue)
    const watermarkText = balanceDue === 0 ? 'PAID' : 'DEPOSIT'
    const watermarkColor = balanceDue === 0 ? '#10B981' : '#F59E0B'

    const rows: string[][] = [
      [`Accommodation (${room.roomNumber} - ${room.type})`, this.formatMoney(Number(booking.roomTotal))]
    ]

    ;(addons || []).forEach((a: any) => {
      rows.push([
        `${a.addon.name} (x${a.quantity})`,
        this.formatMoney(Number(a.subtotal))
      ])
    })

    return this.buildBuffer(doc => {
      this.drawWatermark(doc, watermarkText, watermarkColor)

      this.drawHeader(doc, hotel, 'RECEIPT', [
        `No: RCP-XXXX`,
        `Date: ${format(new Date(paidAt || Date.now()), 'dd/MM/yyyy HH:mm')}`
      ])

      this.drawInfoGrid(
        doc,
        'Guest Details',
        [
          guest.fullName,
          guest.phone,
          guest.email || '',
          `${guest.nationality || ''} ${guest.idNumber ? `(${guest.idNumber})` : ''}`.trim()
        ],
        'Stay Details',
        [
          `Booking Ref: ${booking.bookingRef}`,
          `Room: ${room.roomNumber} (${room.type})`,
          `Period: ${format(new Date(booking.checkIn), 'dd/MM/yyyy')} - ${format(new Date(booking.checkOut), 'dd/MM/yyyy')}`
        ]
      )

      this.drawTable(
        doc,
        ['Description', 'Amount'],
        rows,
        [350, 160],
        ['left', 'right']
      )

      this.drawTotals(doc, [
        { label: 'Total Amount', value: this.formatMoney(Number(booking.totalAmount)) },
        { label: 'Paid to date', value: this.formatMoney(Number(booking.paidAmount)) },
        { label: 'Balance Due', value: this.formatMoney(balanceDue), grand: true }
      ])

      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#111827').font('Helvetica')
      doc.text(`Payment Method: ${method.toUpperCase()}`)
      doc.text(`Staff: ${receivedBy?.fullName || 'System'}`)

      doc.moveDown(1.5)
      doc.fontSize(11).fillColor('#9CA3AF').font('Helvetica')
      doc.text(`Asante kwa kuchagua ${hotel.name}`, { align: 'center' })
      doc.text(`Thank you for choosing ${hotel.name}`, { align: 'center' })
    })
  }
}

export const pdfService = new PdfService()
