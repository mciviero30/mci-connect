import { useState, useEffect, useRef } from 'react';

/**
 * FASE A2.3: Blueprint Diff Overlay Hook
 * Detects visual changes between two blueprint versions using canvas comparison.
 * 
 * READ-ONLY: No DB writes, no persistence, temporary state only.
 */

export function useBlueprintDiffOverlay(isEnabled, currentImageUrl, compareImageUrl, imageSize) {
  const [changeRegions, setChangeRegions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const canvasRefCurrent = useRef(null);
  const canvasRefCompare = useRef(null);

  useEffect(() => {
    if (!isEnabled || !currentImageUrl || !compareImageUrl || !imageSize.width || !imageSize.height) {
      setChangeRegions([]);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    const detectChanges = async () => {
      try {
        // Load both images
        const [imgCurrent, imgCompare] = await Promise.all([
          loadImage(currentImageUrl),
          loadImage(compareImageUrl)
        ]);

        // Create canvases
        const canvasCurrent = document.createElement('canvas');
        const canvasCompare = document.createElement('canvas');
        
        // Use lower resolution for performance (1/2 scale)
        const scale = 0.5;
        const width = Math.floor(imageSize.width * scale);
        const height = Math.floor(imageSize.height * scale);
        
        canvasCurrent.width = width;
        canvasCurrent.height = height;
        canvasCompare.width = width;
        canvasCompare.height = height;

        const ctxCurrent = canvasCurrent.getContext('2d', { willReadFrequently: true });
        const ctxCompare = canvasCompare.getContext('2d', { willReadFrequently: true });

        // Draw images scaled
        ctxCurrent.drawImage(imgCurrent, 0, 0, width, height);
        ctxCompare.drawImage(imgCompare, 0, 0, width, height);

        // Get image data
        const dataCurrent = ctxCurrent.getImageData(0, 0, width, height);
        const dataCompare = ctxCompare.getImageData(0, 0, width, height);

        // Compare by blocks (50x50 tiles)
        const blockSize = 50;
        const threshold = 0.15; // 15% difference threshold
        const regions = [];

        for (let y = 0; y < height; y += blockSize) {
          for (let x = 0; x < width; x += blockSize) {
            const blockWidth = Math.min(blockSize, width - x);
            const blockHeight = Math.min(blockSize, height - y);
            
            const diff = compareBlock(
              dataCurrent.data,
              dataCompare.data,
              x, y,
              blockWidth, blockHeight,
              width
            );

            if (diff > threshold) {
              // Convert back to original scale
              regions.push({
                x: (x / scale) / imageSize.width * 100,
                y: (y / scale) / imageSize.height * 100,
                width: (blockWidth / scale) / imageSize.width * 100,
                height: (blockHeight / scale) / imageSize.height * 100,
                intensity: Math.min(diff, 1)
              });
            }
          }
        }

        setChangeRegions(regions);
        setChangeCount(regions.length);
        setIsProcessing(false);

      } catch (error) {
        console.error('Error detecting changes:', error);
        setChangeRegions([]);
        setChangeCount(0);
        setIsProcessing(false);
      }
    };

    detectChanges();

    // Cleanup
    return () => {
      setChangeRegions([]);
      setChangeCount(0);
    };
  }, [isEnabled, currentImageUrl, compareImageUrl, imageSize.width, imageSize.height]);

  return { changeRegions, isProcessing, changeCount };
}

// Helper: Load image
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Helper: Compare block of pixels
function compareBlock(data1, data2, startX, startY, blockWidth, blockHeight, canvasWidth) {
  let totalDiff = 0;
  let pixelCount = 0;

  for (let y = 0; y < blockHeight; y++) {
    for (let x = 0; x < blockWidth; x++) {
      const px = startX + x;
      const py = startY + y;
      const idx = (py * canvasWidth + px) * 4;

      const r1 = data1[idx];
      const g1 = data1[idx + 1];
      const b1 = data1[idx + 2];

      const r2 = data2[idx];
      const g2 = data2[idx + 1];
      const b2 = data2[idx + 2];

      // RGB difference
      const diff = (Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)) / (255 * 3);
      totalDiff += diff;
      pixelCount++;
    }
  }

  return totalDiff / pixelCount;
}