const fs = require('fs');

try {
  const filePath = 'C:/Users/Surya.VICTUS/Downloads/AM-Quotation-Edify-Kids.pdf';
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('binary');

  // Let's find all text blocks in the PDF by searching for text streams
  // Standard PDF text is enclosed in BT (Begin Text) and ET (End Text) blocks.
  // Although they can be compressed, we decompressed streams earlier.
  // Let's extract decompressed text streams and print them.
  const zlib = require('zlib');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let count = 0;
  
  console.log('--- DECOMPRESSED TEXT STREAMS ---');
  while ((match = streamRegex.exec(str)) !== null) {
    count++;
    const streamContent = match[1];
    const binaryContent = Buffer.from(streamContent, 'binary');
    
    try {
      const decompressed = zlib.unzipSync(binaryContent);
      const text = decompressed.toString('utf-8');
      
      // Look for text operators like Tj or TJ (e.g., '(Hello) Tj' or '[ (Hel) 10 (lo) ] TJ')
      const textMatches = text.match(/\(([^)]+)\)\s*(Tj|TJ)/g);
      if (textMatches) {
        console.log(`\n--- Stream #${count} Text matches:`);
        textMatches.forEach(tm => {
          // Extract the text inside parentheses
          const cleanText = tm.substring(tm.indexOf('(') + 1, tm.lastIndexOf(')'));
          console.log(cleanText);
        });
      }
    } catch (e) {
      // Not compressed or failed, skip
    }
  }
} catch (err) {
  console.error('Error:', err);
}
