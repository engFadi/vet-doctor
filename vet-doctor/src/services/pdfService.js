// ----------------------------------------------------------------------
// PDF service (Task 15)
// Generates an invoice PDF (SR6.14, Invoice.downloadPDF in the class model)
// and streams it to the HTTP response.
// ----------------------------------------------------------------------
const PDFDocument = require('pdfkit');
const { paymentMethodLabel, paymentStatusLabel } = require('./invoiceService');

// appointment must include: service, veterinarian, animal, invoice (with items + payment)
function streamInvoicePdf(res, { appointment, invoice, currency }) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.id}.pdf"`);
  doc.pipe(res);

  const money = (n) => `${Number(n).toFixed(2)} ${currency}`;

  // Header
  doc.fontSize(22).fillColor('#2e7d6b').text('Vet Doctor', { align: 'left' });
  doc.fontSize(12).fillColor('#000').text('Veterinary home & farm visits');
  doc.moveDown();
  doc.fontSize(16).text(`Invoice #${invoice.id}`);
  doc.fontSize(10).fillColor('#555')
    .text(`Issue date: ${invoice.issueDate}`)
    .text(`Service date: ${new Date(appointment.appointmentDateTime).toLocaleDateString()}`)
    .text(`Veterinarian: ${appointment.veterinarian ? 'Dr. ' + appointment.veterinarian.fullName : '-'}`)
    .text(`Service: ${appointment.service ? appointment.service.name : '-'}`)
    .text(`Animal: ${appointment.animal ? appointment.animal.name : '-'}`);
  doc.moveDown();

  // Charges (SR6.9)
  doc.fillColor('#000').fontSize(12).text('Charges', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);

  const baseLabel = appointment.service ? `${appointment.service.name} (base charge)` : 'Base charge';
  doc.text(baseLabel, { continued: true }).text(money(invoice.baseAmount), { align: 'right' });

  (invoice.items || []).forEach((item) => {
    doc.text(item.description, { continued: true }).text(money(item.amount), { align: 'right' });
  });

  doc.moveDown(0.5);
  doc.fontSize(12).text('Total', { continued: true })
    .text(money(invoice.totalAmount), { align: 'right' });
  doc.moveDown();

  // Payment status
  doc.fontSize(10).fillColor('#555');
  doc.text(`Status: ${paymentStatusLabel(invoice.status)}`);
  if (invoice.payment) {
    doc.text(`Method: ${paymentMethodLabel(invoice.payment.paymentMethod)}`);
    if (invoice.payment.maskedCardReference) {
      doc.text(`Card: ${invoice.payment.maskedCardReference}`);
    }
    if (invoice.payment.paymentDate) {
      doc.text(`Paid on: ${new Date(invoice.payment.paymentDate).toLocaleString()}`);
    }
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#999')
    .text('Vet Doctor - Software Engineering (COMP433) project, Group 10.', { align: 'center' });

  doc.end();
}

// Stream a monthly performance report PDF (SR8.14).
function streamReportPdf(res, { report, currency }) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${report.period}.pdf"`);
  doc.pipe(res);

  const money = (n) => `${Number(n).toFixed(2)} ${currency}`;

  doc.fontSize(22).fillColor('#2e7d6b').text('Vet Doctor');
  doc.fontSize(14).fillColor('#000').text(`Monthly Report - ${report.period}`);
  doc.moveDown();

  doc.fontSize(12).text('Summary', { underline: true });
  doc.fontSize(10)
    .text(`Total bookings: ${report.totalBookings}`)
    .text(`Total revenue: ${money(report.totalRevenue)}`)
    .text(`Profit margin: ${money(report.profitMargin)}`)
    .text(`New clients: ${report.newClients}`)
    .text(`Active clients: ${report.activeClients}`)
    .text(`Retention rate: ${report.retentionRate}%`);
  doc.moveDown();

  doc.fontSize(12).text('Bookings by service type', { underline: true });
  doc.fontSize(10);
  Object.entries(report.bookingsByService).forEach(([name, count]) => {
    doc.text(name, { continued: true }).text(String(count), { align: 'right' });
  });
  if (Object.keys(report.bookingsByService).length === 0) doc.text('No bookings.');
  doc.moveDown();

  doc.fontSize(12).text('Revenue by veterinarian', { underline: true });
  doc.fontSize(10);
  Object.entries(report.revenueByVet).forEach(([name, amount]) => {
    doc.text(name, { continued: true }).text(money(amount), { align: 'right' });
  });
  if (Object.keys(report.revenueByVet).length === 0) doc.text('No revenue.');

  doc.end();
}

module.exports = { streamInvoicePdf, streamReportPdf };
