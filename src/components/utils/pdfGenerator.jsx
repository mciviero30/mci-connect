import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Genera un PDF optimizado desde un elemento HTML
 * @param {string} elementId - ID del elemento HTML a convertir
 * @param {string} filename - Nombre del archivo PDF (sin extensión)
 * @returns {Promise<void>}
 */
export const generateOptimizedPDF = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Configuración optimizada para reducir tamaño
  const canvas = await html2canvas(element, {
    scale: 2, // Balance entre calidad y tamaño
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    imageTimeout: 0,
    removeContainer: true,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.75); // JPEG con 75% calidad para reducir tamaño
  
  // Configuración PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    compress: true, // Compresión interna del PDF
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Primera página
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Páginas adicionales si es necesario
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  // Descargar directamente
  pdf.save(`${filename}.pdf`);
};