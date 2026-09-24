import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Universal multi-page A4 PDF export utility.
 * Renders any long HTML container into high-resolution, perfectly-sliced A4 PDF pages.
 */
export async function exportElementToMultiPagePDF(
  element: HTMLElement,
  fileName: string,
  options?: { scale?: number; quality?: number }
): Promise<void> {
  const scale = options?.scale ?? 2;
  const quality = options?.quality ?? 0.95;

  // 1. Capture high-resolution raster of the element
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

  // Calculate the pixel height on the canvas that matches an A4 page aspect ratio
  const pageCanvasHeight = Math.floor((canvas.width * pageHeight) / pageWidth);
  const totalPages = Math.ceil(canvas.height / pageCanvasHeight);

  // 2. Slice canvas into exact A4 pages
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }

    const srcY = page * pageCanvasHeight;
    const sliceCanvasHeight = Math.min(pageCanvasHeight, canvas.height - srcY);

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageCanvasHeight;

    const ctx = pageCanvas.getContext("2d");
    if (ctx) {
      // Crisp white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvasHeight);

      // Draw slice
      ctx.drawImage(
        canvas,
        0,
        srcY,
        canvas.width,
        sliceCanvasHeight,
        0,
        0,
        canvas.width,
        sliceCanvasHeight
      );

      const sliceData = pageCanvas.toDataURL("image/jpeg", quality);
      pdf.addImage(sliceData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    }
  }

  pdf.save(fileName);
}
