document.addEventListener('DOMContentLoaded', () => {
  const { jsPDF } = window.jspdf;

  document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const selectedDate = document.getElementById('report-date').value;
    if (!selectedDate) {
      alert('Select a date first');
      return;
    }

    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const filteredSales = sales.filter(sale => {
      return sale && sale.timestamp && sale.timestamp.split('T')[0] === selectedDate;
    });

    if (filteredSales.length === 0) {
      alert('No sales to export for this date');
      return;
    }

    const cashTotal = filteredSales.filter(s => s.payment === 'cash').reduce((sum, s) => sum + s.total, 0);
    const onlineTotal = filteredSales.filter(s => s.payment === 'online').reduce((sum, s) => sum + s.total, 0);
    const grandTotal = cashTotal + onlineTotal;

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Daily Sales Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${selectedDate}`, 20, 30);
    doc.text(`Total Orders: ${filteredSales.length}`, 20, 40);
    doc.text(`Cash Sales: Rs. ${cashTotal}`, 20, 50);
    doc.text(`Online Sales: Rs. ${onlineTotal}`, 20, 60);
    doc.text(`Grand Total: Rs. ${grandTotal}`, 20, 70);

    let y = 85;
    doc.setFontSize(14);
    doc.text('Transactions:', 20, y);
    y += 10;

    filteredSales.forEach(sale => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const time = new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const payment = (sale.payment || 'unknown').toUpperCase();
      doc.setFontSize(12);
      doc.text(`[${time}] Rs. ${sale.total} (${payment})`, 20, y);
      y += 6;
      sale.items.forEach(item => {
        const line = `- ${item.name} x${item.qty} @ Rs. ${item.price}`;
        doc.text(line, 25, y);
        y += 6;
      });
      y += 4;
    });

    doc.save(`Sales_Report_${selectedDate}.pdf`);

    if ('ontouchstart' in window) {
      alert('✅ PDF saved!\n\nOpen WhatsApp → Attach file → Select this PDF.');
    }
  });
});