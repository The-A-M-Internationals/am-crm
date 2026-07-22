const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const dataBuffer = fs.readFileSync('C:\\Users\\Surya.VICTUS\\Downloads\\AM-Quotation-Edify-Kids.pdf');

async function run() {
  try {
    const parser = new PDFParse({ data: dataBuffer });
    const info = await parser.getInfo();
    console.log("PDF Info:", info);
    
    // We can also parse text coordinates or structures if needed.
    // Let's print out the text elements of Page 1 in order.
    const textObj = await parser.getText();
    console.log("Pages:", textObj.pages.length);
    console.log("Page 1 Text items:");
    console.log(textObj.pages[0].text.split('\n'));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
