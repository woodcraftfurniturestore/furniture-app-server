const PDFDocument = require("pdfkit");
const axios = require("axios");
const mongoose = require("mongoose");
const ShopSettings = require('../models/ShopSettings');
const generateInvoicePDFBuffer = async (order, matchingDeliveryItem, shopSettings) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      const invoiceDate = new Date().toLocaleDateString();
      const invoiceNumber = `INV-${order._id}`;
      doc.rect(0, 0, doc.page.width, 80).fill("#2E86C1");
      if (shopSettings.profileImage) {
        try {
          const logoResponse = await axios.get(shopSettings.profileImage, {
            responseType: "arraybuffer",
          });
          const logoBuffer = Buffer.from(logoResponse.data, "base64");
          doc.save();
          doc.circle(75, 45, 25).clip();
          doc.image(logoBuffer, 50, 20, { width: 50, height: 50 });
          doc.restore();
        } catch (err) {
          console.error("Failed to load profile image:", err.message);
        }
      }
      doc.fillColor("#ffffff")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(shopSettings.name || "N/A", 110, 30, { align: "left" })
        .fontSize(14)
        .font("Helvetica")
        .text("TAX INVOICE", 400, 40, { align: "right" });
      doc.fillColor("#000000")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Invoice Number:", 10, 100)
        .font("Helvetica")
        .text(`${invoiceNumber}`, 180, 100)
        .font("Helvetica-Bold")
        .text("Order Date:", 10, 115)
        .font("Helvetica")
        .text(`${order.createdAt.toLocaleDateString()}`, 180, 115)
        .font("Helvetica-Bold")
        .text("Invoice Date:", 10, 130)
        .font("Helvetica")
        .text(`${invoiceDate}`, 180, 130)
        .font("Helvetica-Bold")
        .text("Payment Method:", 10, 145)
        .font("Helvetica")
        .text(`${order.paymentMethod.toUpperCase()}`, 180, 145);
      doc.moveTo(10, 165).lineTo(550, 165).strokeColor("#cccccc").stroke();
      const fromAddressTop = 180;
      doc.fillColor("#2E86C1")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("From Address:", 10, fromAddressTop)
        .fillColor("#000000")
        .font("Helvetica")
        .fontSize(10)
        .text(shopSettings.name || "N/A", 10, fromAddressTop + 15)
        .text(shopSettings.address || "No Address Provided", 10, fromAddressTop + 30)
        .text(`Phone: ${shopSettings.phoneNumber || "N/A"}`, 10, fromAddressTop + 45)
        .text(`Email: ${shopSettings.email || "N/A"}`, 10, fromAddressTop + 60);
      doc.fillColor("#2E86C1")
        .font("Helvetica-Bold")
        .text("Billing Address:", 410, fromAddressTop)
        .fillColor("#000000")
        .font("Helvetica")
        .text(`${matchingDeliveryItem.username}`, 410, fromAddressTop + 15)
        .text(
          `${matchingDeliveryItem.houseNo}, ${matchingDeliveryItem.streetName}`,
          410,
          fromAddressTop + 30
        )
        .text(
          `${matchingDeliveryItem.city}, ${matchingDeliveryItem.state} - ${matchingDeliveryItem.pinCode}`,
          410,
          fromAddressTop + 45
        )
        .text(`Phone: ${matchingDeliveryItem.phoneNo}`, 410, fromAddressTop + 60);
      doc.fillColor("#2E86C1")
        .font("Helvetica-Bold")
        .text("Shipping Address:", 410, fromAddressTop + 90)
        .fillColor("#000000")
        .font("Helvetica")
        .text(`${matchingDeliveryItem.username}`, 410, fromAddressTop + 105)
        .text(
          `${matchingDeliveryItem.houseNo}, ${matchingDeliveryItem.streetName}`,
          410,
          fromAddressTop + 120
        )
        .text(
          `${matchingDeliveryItem.city}, ${matchingDeliveryItem.state} - ${matchingDeliveryItem.pinCode}`,
          410,
          fromAddressTop + 135
        )
        .text(`Phone: ${matchingDeliveryItem.phoneNo}`, 410, fromAddressTop + 150);
      doc.moveTo(10, fromAddressTop + 180)
        .lineTo(550, fromAddressTop + 180)
        .strokeColor("#cccccc")
        .stroke();
      const tableTop = fromAddressTop + 190;
      doc.fillColor("#2E86C1")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Product", 20, tableTop)
        .text("Qty", 100, tableTop, { align: "center" })
        .text("Unit Price", 200, tableTop, { align: "center" })
        .text("GST %", 300, tableTop, { align: "center" })
        .text("GST Amt", 400, tableTop, { align: "center" })
        .text("Total", 480, tableTop, { align: "right" });
      doc.moveTo(10, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .strokeColor("#cccccc")
        .stroke();
      let y = tableTop + 25;
      let subtotal = 0;
      let gstTotal = 0;
      order.items.forEach((item, index) => {
        const product = item.product;
        const unitPrice = product.offerPrice || product.price || 0;
        const qty = item.quantity;
        const gstPct = product.gstRate || 5;
        const taxable = unitPrice * qty;
        const gstAmt = (taxable * gstPct) / 100;
        const lineTotal = taxable + gstAmt;
        subtotal += taxable;
        gstTotal += gstAmt;
        if (index % 2 === 0) {
          doc.rect(10, y - 2, 530, 20).fill("#f4f6f7").fillColor("#000000");
        }
        doc.fillColor("#000000")
          .font("Helvetica")
          .fontSize(10)
          .text(product.title, 20, y)
          .text(qty.toString(), 100, y, { align: "center" })
          .text(unitPrice.toFixed(2), 200, y, { align: "center" })
          .text(`${gstPct}%`, 300, y, { align: "center" })
          .text(gstAmt.toFixed(2), 400, y, { align: "center" })
          .text(lineTotal.toFixed(2), 480, y, { align: "right" });
        y += 20;
      });
      const grandTotal = subtotal + gstTotal;
      doc.moveTo(10, y).lineTo(550, y).strokeColor("#cccccc").stroke();
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000");
      doc.text(`Subtotal: ${subtotal.toFixed(2)}`, 400, y + 25, { align: "right" });
      y += 20;
      doc.text(`GST Total: ${gstTotal.toFixed(2)}`, 300, y - 10, { align: "right" });
      y += 20;
      doc.text(`Grand Total: ${grandTotal.toFixed(2)}`, 400, y - 2, { align: "right" });
      const footerHeight = 80;
const requiredSpace = footerHeight + 30;
const currentPageRemainingSpace = doc.page.height - y - 10;
if (currentPageRemainingSpace < requiredSpace) {
  doc.addPage();
  y = 50;
}
doc
  .fillColor('#000000ff')
  .fontSize(10)
  .font('Helvetica')
  .text('Thank you for your business!', 20, y + 15, { align: 'center' })
  .text(
    `Contact: ${shopSettings.phoneNumber || 'N/A'} | ${shopSettings.email || 'N/A'}`,
    10,
    y + 30,
    { align: 'center' }
  )
  .text(`Follow us: ${shopSettings.name || 'N/A'}`, 10, y + 45, { align: 'center' });
    if (y > 300) {
      doc
        .rotate(45, { origin: [300, y - 100] })
        .opacity(0.05)
        .fontSize(80)
        .font('Helvetica-Bold')
        .text('PAID', 100, y - 150, { align: 'center' })
        .opacity(1)
        .rotate(-45, { origin: [300, y - 100] });
    }
    doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
module.exports = generateInvoicePDFBuffer;
