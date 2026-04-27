import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PaymentEntity } from './entities/payment.entity';

export interface InvoiceContext {
  payment: PaymentEntity;
  buyer: { firstName: string; lastName: string; email: string } | null;
}

@Injectable()
export class InvoiceService {
  /** Generates a one-page PDF invoice and returns the bytes. */
  render(ctx: InvoiceContext): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { payment } = ctx;
      const buyerName = ctx.buyer
        ? `${ctx.buyer.firstName} ${ctx.buyer.lastName}`.trim()
        : 'Anonymous';
      const amountFormatted = (payment.amount / 100).toFixed(2);
      const issuedAt = payment.createdAt.toISOString().slice(0, 10);
      const invoiceNo = `INV-${payment.id.slice(0, 8).toUpperCase()}`;

      // Header
      doc
        .fillColor('#0F766E')
        .fontSize(28)
        .text('Aqarat', { align: 'left' })
        .moveDown(0.2);
      doc
        .fillColor('#52525B')
        .fontSize(10)
        .text('Aqarat — Saudi Real Estate Marketplace', { align: 'left' })
        .text('https://aqarat.sa', { link: 'https://aqarat.sa', underline: true })
        .moveDown(2);

      // Title row
      doc
        .fillColor('#18181B')
        .fontSize(18)
        .text('Invoice', { align: 'right' })
        .fontSize(10)
        .fillColor('#52525B')
        .text(`Number: ${invoiceNo}`, { align: 'right' })
        .text(`Issued: ${issuedAt}`, { align: 'right' })
        .text(`Status: ${payment.status}`, { align: 'right' })
        .moveDown(2);

      // Bill-to
      doc
        .fillColor('#18181B')
        .fontSize(11)
        .text('Bill to:', { underline: true })
        .moveDown(0.3)
        .fontSize(10)
        .fillColor('#52525B')
        .text(buyerName)
        .text(ctx.buyer?.email ?? '')
        .moveDown(2);

      // Line item table — single row
      const tableTop = doc.y;
      doc
        .fillColor('#18181B')
        .fontSize(11)
        .text('Description', 50, tableTop)
        .text('Qty', 380, tableTop, { width: 40, align: 'right' })
        .text('Amount', 430, tableTop, { width: 110, align: 'right' });
      doc
        .moveTo(50, tableTop + 18)
        .lineTo(540, tableTop + 18)
        .strokeColor('#E4E4E7')
        .stroke();

      const desc = payment.description ?? `Aqarat ${payment.purpose}`;
      const lineY = tableTop + 28;
      doc
        .fillColor('#52525B')
        .fontSize(10)
        .text(desc, 50, lineY, { width: 320 })
        .text('1', 380, lineY, { width: 40, align: 'right' })
        .text(`${amountFormatted} ${payment.currency}`, 430, lineY, {
          width: 110,
          align: 'right',
        });

      // Total
      const totalY = lineY + 40;
      doc
        .moveTo(50, totalY)
        .lineTo(540, totalY)
        .strokeColor('#E4E4E7')
        .stroke();
      doc
        .fillColor('#18181B')
        .fontSize(12)
        .text('Total', 380, totalY + 10, { width: 40, align: 'right' })
        .text(`${amountFormatted} ${payment.currency}`, 430, totalY + 10, {
          width: 110,
          align: 'right',
        });

      // Footer
      doc
        .fillColor('#A1A1AA')
        .fontSize(9)
        .text(
          `Provider reference: ${payment.providerPaymentId ?? '—'}`,
          50,
          780,
          { align: 'center', width: 490 },
        )
        .text('Thank you for using Aqarat.', { align: 'center', width: 490 });

      doc.end();
    });
  }
}
