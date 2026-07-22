const fs = require('fs');
const { PDFParse } = require('pdf-parse');

try {
  const filePath = 'C:/Users/Surya.VICTUS/Downloads/AM-Quotation-Edify-Kids.pdf';
  const dataBuffer = fs.readFileSync(filePath);

  const pdf = new PDFParse({ data: dataBuffer });
  pdf.load().then(async () => {
      console.log('--- DOCUMENT STATS ---');
      console.log('Page count:', pdf.doc.numPages);
      
      console.log('--- PAGE 1 TEXT ---');
      const page1 = await pdf.doc.getPage(1);
      const text = await pdf.getPageText(page1, {});
      console.log(text);
      
      console.log('--- ALL PAGES TEXT SUMMARY ---');
      for (let i = 1; i <= pdf.doc.numPages; i++) {
        const page = await pdf.doc.getPage(i);
        const txt = await pdf.getPageText(page, {});
        console.log(`\n--- Page ${i} ---`);
        console.log(txt.slice(0, 300) + '...');
      }
  }).catch(err => {
      console.error('Error parsing PDF:', err);
  });
} catch (err) {
  console.error('Error reading file:', err);
}
