import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Genera un PDF optimizado desde un elemento HTML con paginación controlada
 * @param {string} elementId - ID del elemento HTML a convertir
 * @param {string} filename - Nombre del archivo PDF (sin extensión)
 * @returns {Promise<void>}
 */
export const generateOptimizedPDF = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Configuración optimizada para calidad y tamaño
  const canvas = await html2canvas(element, {
    scale: 2.5, // Mayor escala para mejor calidad de texto
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    imageTimeout: 0,
    removeContainer: true,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  // Usar PNG para mejor calidad de texto
  const imgData = canvas.toDataURL('image/png');
  
  // Configuración PDF - Letter size (US standard)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // 215.9 x 279.4 mm
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  // Calcular dimensiones respetando proporciones
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;
  
  // Márgenes para evitar cortes en los bordes
  const margin = 0;
  const contentHeight = pdfHeight - (margin * 2);
  
  let heightLeft = imgHeight;
  let position = 0;

  // Primera página
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Páginas adicionales con lógica mejorada
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  // Descargar directamente
  pdf.save(`${filename}.pdf`);
};