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

  async generateInvoice(bookingId: string, type: 'invoice' | 'folio' = 'invoice'): Promise<Buffer> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        company: true,
        room: true,
        hotel: true,
        roomCharges: { include: { items: true } },
        addons: { include: { addon: true } }
      }
    })

    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    try {
      return await this.buildInvoicePdf(booking, type)
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

  private formatInvoiceMoney(amount: number) {
    return `TZS ${Number(amount).toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
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

  private async buildInvoicePdf(booking: any, docType: 'invoice' | 'folio' = 'invoice'): Promise<Buffer> {
    const { hotel, guest, company, room, roomCharges, addons } = booking
    const isCompany = !!company
    const billToName = isCompany ? company.name : guest.fullName
    const billToEmail = isCompany ? company.email : guest.email
    const billToPhone = isCompany ? company.phone : guest.phone
    const billToTin = isCompany ? company.tinNumber : null
    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    )
    const roomTotal = Number(booking.roomTotal)
    const paidAmount = Number(booking.paidAmount)
    const totalAmount = Number(booking.totalAmount)
    const balanceDue = Number(booking.balanceDue)

    const rows: Array<{ desc: string; sub?: string; qty: string; rate: string; amount: string }> = [
      {
        desc: `Accommodation: ${room.type}`,
        sub: isCompany
          ? `Guest: ${guest.fullName} · Company: ${company.name}`
          : `Stay for ${guest.fullName}`,
        qty: String(nights),
        rate: this.formatInvoiceMoney(roomTotal / nights),
        amount: this.formatInvoiceMoney(roomTotal)
      }
    ]

    ;(addons || []).forEach((a: any) => {
      rows.push({
        desc: a.addon.name,
        sub: 'Add-on',
        qty: String(a.quantity),
        rate: this.formatInvoiceMoney(Number(a.unitPrice)),
        amount: this.formatInvoiceMoney(Number(a.subtotal))
      })
    })

    ;(roomCharges || []).flatMap((c: any) => c.items || []).forEach((i: any) => {
      rows.push({
        desc: i.itemName,
        sub: `Posted ${format(new Date(i.createdAt || Date.now()), 'dd/MM/yyyy')}`,
        qty: String(i.quantity),
        rate: this.formatInvoiceMoney(i.unitPrice),
        amount: this.formatInvoiceMoney(i.totalPrice)
      })
    })

    return this.buildBuffer(doc => {
      const pageWidth = doc.page.width
      const margin = 50
      const contentWidth = pageWidth - margin * 2
      const rightX = pageWidth - margin
      let y = margin

      // ── Header ───────────────────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(26).fillColor('#E67E22')
      const hotelName = (hotel.name || 'Hotel').toUpperCase()
      doc.text(hotelName, margin, y)
      const hotelNameHeight = doc.heightOfString(hotelName, { width: contentWidth * 0.6 })
      y += hotelNameHeight + 4

      doc.font('Helvetica-Oblique').fontSize(11).fillColor('#7F8C8D')
      doc.text('Comfort in every stay', margin, y)
      y += 16

      doc.font('Helvetica').fontSize(10).fillColor('#7F8C8D')
      doc.text(hotel.address || 'Moshi, Tanzania', margin, y)
      y += 14
      doc.text(`${hotel.phone || '+255765068295'} | ${hotel.email || ''}`, margin, y)
      y += 22

      // Right side invoice meta
      const metaY = margin + 4
      const titleText = docType === 'folio' ? 'GUEST FOLIO' : 'INVOICE'
      doc.font('Helvetica-Bold').fontSize(docType === 'folio' ? 24 : 28).fillColor('#2C3E50')
      const titleWidth = doc.widthOfString(titleText)
      doc.text(titleText, rightX - titleWidth, metaY)

      doc.font('Helvetica').fontSize(11).fillColor('#7F8C8D')
      const refText = `#${booking.bookingRef}`
      const refWidth = doc.widthOfString(refText)
      doc.text(refText, rightX - refWidth, metaY + 38)

      const dateText = format(new Date(), 'MMMM dd, yyyy')
      const dateWidth = doc.widthOfString(dateText)
      doc.text(dateText, rightX - dateWidth, metaY + 56)

      // Orange divider line
      const lineY = Math.max(y, metaY + 90)
      doc.moveTo(margin, lineY).lineTo(rightX, lineY).lineWidth(3).stroke('#E67E22')
      y = lineY + 30

      // ── Bill To & Stay Details boxes ─────────────────────────────────────────
      const boxHeight = 96
      const boxWidth = (contentWidth - 20) / 2

      // Bill to
      doc.rect(margin, y, boxWidth, boxHeight).fill('#F8F9FA')
      doc.fillColor('#7F8C8D').font('Helvetica-Bold').fontSize(10)
      doc.text('BILL TO', margin + 14, y + 12)
      doc.fillColor('#2C3E50').font('Helvetica-Bold').fontSize(12)
      doc.text(billToName, margin + 14, y + 34)
      doc.font('Helvetica').fontSize(10).fillColor('#555555')
      if (isCompany && billToTin) {
        doc.text(`TIN: ${billToTin}`, margin + 14, y + 50)
        doc.text(billToEmail || '', margin + 14, y + 64)
        doc.text(billToPhone || '', margin + 14, y + 78)
      } else {
        doc.text(billToEmail || '', margin + 14, y + 52)
        doc.text(billToPhone || '', margin + 14, y + 70)
      }

      // Stay details
      doc.rect(margin + boxWidth + 20, y, boxWidth, boxHeight).fill('#F8F9FA')
      doc.fillColor('#7F8C8D').font('Helvetica-Bold').fontSize(10)
      doc.text('STAY DETAILS', margin + boxWidth + 34, y + 12)
      doc.fillColor('#2C3E50').font('Helvetica-Bold').fontSize(11)
      doc.text(`Check-in: ${format(new Date(booking.checkIn), 'MMM dd, yyyy')}`, margin + boxWidth + 34, y + 34)
      doc.text(`Check-out: ${format(new Date(booking.checkOut), 'MMM dd, yyyy')}`, margin + boxWidth + 34, y + 52)
      doc.text(`Duration: ${nights} Night${nights > 1 ? 's' : ''}`, margin + boxWidth + 34, y + 70)

      y += boxHeight + 28

      // ── Items table ──────────────────────────────────────────────────────────
      const colDesc = contentWidth * 0.45
      const colQty = contentWidth * 0.15
      const colRate = contentWidth * 0.20
      const colAmount = contentWidth * 0.20

      const tableTop = y
      doc.rect(margin, tableTop, contentWidth, 36).fill('#2C3E50')
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10)
      doc.text('DESCRIPTION', margin + 12, tableTop + 12)
      doc.text('QTY', margin + colDesc + 12, tableTop + 12, { width: colQty, align: 'center' })
      doc.text('RATE', margin + colDesc + colQty + 12, tableTop + 12, { width: colRate, align: 'right' })
      doc.text('AMOUNT', margin + colDesc + colQty + colRate + 12, tableTop + 12, { width: colAmount - 12, align: 'right' })

      y = tableTop + 36 + 10
      rows.forEach(row => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#2C3E50')
        doc.text(row.desc, margin + 12, y, { width: colDesc - 24 })
        const descHeight = doc.heightOfString(row.desc, { width: colDesc - 24 })
        let rowHeight = Math.max(28, descHeight + 8)

        if (row.sub) {
          doc.font('Helvetica').fontSize(9).fillColor('#7F8C8D')
          doc.text(row.sub, margin + 12, y + descHeight + 4)
          rowHeight = Math.max(rowHeight, descHeight + 20)
        }

        doc.font('Helvetica').fontSize(10).fillColor('#333333')
        doc.text(row.qty, margin + colDesc + 12, y, { width: colQty, align: 'center' })
        doc.text(row.rate, margin + colDesc + colQty + 12, y, { width: colRate - 12, align: 'right' })
        doc.text(row.amount, margin + colDesc + colQty + colRate + 12, y, { width: colAmount - 12, align: 'right' })

        doc.moveTo(margin, y + rowHeight).lineTo(rightX, y + rowHeight).lineWidth(0.5).stroke('#E5E7EB')
        y += rowHeight + 8
      })

      y += 24

      // ── Policies & Totals ────────────────────────────────────────────────────
      const totalsBoxWidth = 220
      const totalsBoxHeight = 126

      // Policies (left)
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#2C3E50')
      doc.text('Policies', margin, y)
      doc.font('Helvetica').fontSize(10).fillColor('#7F8C8D')
      doc.text('• 50% deposit required for confirmation.', margin, y + 22)
      doc.text('• Full cancellation allowed 30 days before arrival.', margin, y + 38)

      // Totals box (right)
      const totalsBoxX = rightX - totalsBoxWidth
      doc.rect(totalsBoxX, y, totalsBoxWidth, totalsBoxHeight).fill('#F8F9FA')
      let ty = y + 16
      const addTotalLine = (label: string, value: string, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor(bold ? '#2C3E50' : '#7F8C8D')
        doc.text(label, totalsBoxX + 16, ty)
        doc.text(value, totalsBoxX + 100, ty, { width: totalsBoxWidth - 120, align: 'right' })
        ty += bold ? 28 : 22
      }
      addTotalLine('Subtotal', this.formatInvoiceMoney(totalAmount))
      addTotalLine('Amount Paid', this.formatInvoiceMoney(paidAmount))
      doc.moveTo(totalsBoxX + 16, ty - 8).lineTo(totalsBoxX + totalsBoxWidth - 16, ty - 8).lineWidth(1).stroke('#D1D5DB')
      addTotalLine('TOTAL DUE', this.formatInvoiceMoney(balanceDue), true)

      y += Math.max(totalsBoxHeight, 60) + 24

      // ── Footer ───────────────────────────────────────────────────────────────
      const footerY = doc.page.height - margin - 40
      doc.font('Helvetica').fontSize(10).fillColor('#7F8C8D')
      doc.text(`Thank you for choosing ${hotel.name || 'us'}. We look forward to your stay.`, margin, footerY, { align: 'center', width: contentWidth })
      doc.font('Helvetica').fontSize(9).fillColor('#7F8C8D')
      doc.text(process.env.POWERED_BY || 'Powered by Odessa Lab', margin, footerY + 20, { align: 'center', width: contentWidth })
    })
  }

  async generateCompanyInvoicePdf(invoice: any): Promise<Buffer> {
    const { hotel, company, amount, totalAmount, paidAmount, invoiceNumber, createdAt, notes } = invoice

    const bookings = company?.bookings || []
    const rows = bookings.map((b: any) => ({
      desc: `Accommodation — ${b.guest?.fullName || 'Guest'} (${b.room?.roomNumber || '-'})`,
      qty: `${Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)))} nights`,
      amount: Number(b.totalAmount)
    }))

    return this.buildBuffer(doc => {
      const pageWidth = doc.page.width
      const margin = 50
      const contentWidth = pageWidth - margin * 2
      const rightX = pageWidth - margin
      let y = margin

      doc.font('Helvetica-Bold').fontSize(26).fillColor('#2563EB')
      doc.text((hotel.name || 'Hotel').toUpperCase(), margin, y)
      y += 30

      doc.font('Helvetica').fontSize(10).fillColor('#6B7280')
      doc.text(hotel.address || '', margin, y)
      y += 14
      doc.text(`${hotel.phone || ''} | ${hotel.email || ''}`, margin, y)
      y += 30

      doc.font('Helvetica-Bold').fontSize(24).fillColor('#111827')
      const title = 'COMPANY INVOICE'
      const titleWidth = doc.widthOfString(title)
      doc.text(title, rightX - titleWidth, margin)

      doc.font('Helvetica').fontSize(11).fillColor('#6B7280')
      const refText = `#${invoiceNumber}`
      const refWidth = doc.widthOfString(refText)
      doc.text(refText, rightX - refWidth, margin + 32)

      const dateText = format(new Date(createdAt || Date.now()), 'MMMM dd, yyyy')
      const dateWidth = doc.widthOfString(dateText)
      doc.text(dateText, rightX - dateWidth, margin + 50)

      doc.moveTo(margin, y).lineTo(rightX, y).lineWidth(2).stroke('#2563EB')
      y += 24

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#6B7280')
      doc.text('BILL TO', margin, y)
      y += 16
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827')
      doc.text(company.name, margin, y)
      y += 18
      doc.font('Helvetica').fontSize(10).fillColor('#4B5563')
      if (company.address) { doc.text(company.address, margin, y); y += 14 }
      if (company.phone) { doc.text(`Phone: ${company.phone}`, margin, y); y += 14 }
      if (company.email) { doc.text(`Email: ${company.email}`, margin, y); y += 14 }
      if (company.tinNumber) { doc.text(`TIN: ${company.tinNumber}`, margin, y); y += 14 }
      y += 16

      if (notes) {
        doc.font('Helvetica').fontSize(10).fillColor('#6B7280')
        doc.text(`Notes: ${notes}`, margin, y, { width: contentWidth })
        y += 24
      }

      const colDesc = contentWidth * 0.55
      const colQty = contentWidth * 0.20
      const colAmount = contentWidth * 0.25
      const tableTop = y
      doc.rect(margin, tableTop, contentWidth, 32).fill('#F3F4F6')
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(10)
      doc.text('DESCRIPTION', margin + 12, tableTop + 10)
      doc.text('QTY', margin + colDesc + 12, tableTop + 10, { width: colQty, align: 'center' })
      doc.text('AMOUNT', margin + colDesc + colQty + 12, tableTop + 10, { width: colAmount - 12, align: 'right' })

      y = tableTop + 32
      rows.forEach((row: any) => {
        doc.font('Helvetica').fontSize(10).fillColor('#111827')
        doc.text(row.desc, margin + 12, y + 8, { width: colDesc - 24 })
        doc.text(row.qty, margin + colDesc + 12, y + 8, { width: colQty, align: 'center' })
        doc.text(this.formatInvoiceMoney(row.amount), margin + colDesc + colQty + 12, y + 8, { width: colAmount - 12, align: 'right' })
        doc.moveTo(margin, y + 28).lineTo(rightX, y + 28).stroke('#F3F4F6')
        y += 34
      })

      y += 20
      const totalsWidth = 220
      const totalsX = rightX - totalsWidth
      doc.rect(totalsX, y, totalsWidth, 120).fill('#F8F9FA')
      let ty = y + 16
      const addTotalLine = (label: string, value: string, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor(bold ? '#111827' : '#6B7280')
        doc.text(label, totalsX + 16, ty)
        doc.text(value, totalsX + 100, ty, { width: totalsWidth - 120, align: 'right' })
        ty += bold ? 28 : 22
      }
      addTotalLine('Total', this.formatInvoiceMoney(totalAmount))
      addTotalLine('Paid', this.formatInvoiceMoney(paidAmount))
      doc.moveTo(totalsX + 16, ty - 8).lineTo(totalsX + totalsWidth - 16, ty - 8).stroke('#D1D5DB')
      addTotalLine('DUE', this.formatInvoiceMoney(amount), true)

      y += 140
      const footerY = doc.page.height - margin - 40
      doc.font('Helvetica').fontSize(10).fillColor('#6B7280')
      doc.text(`Thank you for choosing ${hotel.name || 'us'}.`, margin, footerY, { align: 'center', width: contentWidth })
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
