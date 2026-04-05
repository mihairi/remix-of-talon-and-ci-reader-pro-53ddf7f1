/**
 * Client-side image preprocessing pipeline.
 * Applies contrast enhancement, sharpening, denoising, and deskewing
 * to improve OCR accuracy before sending to the LLM.
 */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function getPixels(ctx: CanvasRenderingContext2D, w: number, h: number): ImageData {
  return ctx.getImageData(0, 0, w, h);
}

function putPixels(ctx: CanvasRenderingContext2D, imageData: ImageData) {
  ctx.putImageData(imageData, 0, 0);
}

/** Convert to grayscale */
function grayscale(imageData: ImageData): ImageData {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
  return imageData;
}

/** Enhance contrast using histogram stretching */
function enhanceContrast(imageData: ImageData, strength: number = 1.5): ImageData {
  const d = imageData.data;
  let min = 255, max = 0;

  // Find min/max luminance
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i]; // already grayscale
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const range = max - min || 1;

  for (let i = 0; i < d.length; i += 4) {
    let v = ((d[i] - min) / range) * 255;
    // Apply strength curve
    v = 128 + (v - 128) * strength;
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  return imageData;
}

/** Apply adaptive thresholding for document binarization */
function adaptiveThreshold(imageData: ImageData, blockSize: number = 15, C: number = 8): ImageData {
  const { width, height, data } = imageData;
  const src = new Uint8Array(width * height);
  const dst = new Uint8Array(width * height);

  // Extract grayscale values
  for (let i = 0; i < src.length; i++) {
    src[i] = data[i * 4];
  }

  // Compute integral image
  const integral = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += src[y * width + x];
      integral[y * width + x] = rowSum + (y > 0 ? integral[(y - 1) * width + x] : 0);
    }
  }

  const half = Math.floor(blockSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - half);
      const y1 = Math.max(0, y - half);
      const x2 = Math.min(width - 1, x + half);
      const y2 = Math.min(height - 1, y + half);

      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      let sum = integral[y2 * width + x2];
      if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
      if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
      if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];

      const mean = sum / count;
      dst[y * width + x] = src[y * width + x] > mean - C ? 255 : 0;
    }
  }

  // Write back
  for (let i = 0; i < dst.length; i++) {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = dst[i];
  }
  return imageData;
}

/** Apply 3x3 unsharp mask sharpening */
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number = 0.5) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const copy = new Uint8ClampedArray(d);

  // Sharpen kernel: center = 1 + 4*amount, neighbors = -amount
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const neighbors =
          copy[((y - 1) * w + x) * 4 + c] +
          copy[((y + 1) * w + x) * 4 + c] +
          copy[(y * w + x - 1) * 4 + c] +
          copy[(y * w + x + 1) * 4 + c];
        d[idx + c] = Math.max(0, Math.min(255, center + amount * (4 * center - neighbors)));
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Simple median filter for denoising (3x3) */
function denoise(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const copy = new Uint8ClampedArray(d);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const values: number[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            values.push(copy[((y + dy) * w + (x + dx)) * 4 + c]);
          }
        }
        values.sort((a, b) => a - b);
        d[(y * w + x) * 4 + c] = values[4]; // median
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Estimate skew angle using projection profile analysis */
function estimateSkewAngle(imageData: ImageData): number {
  const { width, height, data } = imageData;
  let bestAngle = 0;
  let bestScore = -1;

  // Test angles from -5 to +5 degrees in 0.5 steps
  for (let angle = -5; angle <= 5; angle += 0.5) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Horizontal projection profile
    const profile = new Int32Array(height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = Math.round(cos * x - sin * y + width / 2);
        const ny = Math.round(sin * x + cos * y);
        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
          const idx = (y * width + x) * 4;
          if (data[idx] < 128) {
            profile[ny]++;
          }
        }
      }
    }

    // Score = variance of profile (higher = more aligned text lines)
    let sum = 0, sumSq = 0, count = 0;
    for (let i = 0; i < height; i++) {
      if (profile[i] > 0) {
        sum += profile[i];
        sumSq += profile[i] * profile[i];
        count++;
      }
    }
    if (count > 0) {
      const mean = sum / count;
      const variance = sumSq / count - mean * mean;
      if (variance > bestScore) {
        bestScore = variance;
        bestAngle = angle;
      }
    }
  }

  return bestAngle;
}

/** Deskew the image */
function deskew(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const angle = estimateSkewAngle(imageData);

  if (Math.abs(angle) < 0.3) return; // Skip if nearly straight

  console.log(`[Preprocess] Deskew angle: ${angle.toFixed(1)}°`);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCtx.putImageData(imageData, 0, 0);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-angle * Math.PI) / 180);
  ctx.drawImage(tempCanvas, -w / 2, -h / 2);
  ctx.restore();
}

export interface PreprocessOptions {
  grayscale?: boolean;
  contrast?: boolean;
  contrastStrength?: number;
  adaptiveThreshold?: boolean;
  sharpen?: boolean;
  sharpenAmount?: number;
  denoise?: boolean;
  deskew?: boolean;
}

const DEFAULT_OPTIONS: PreprocessOptions = {
  grayscale: true,
  contrast: true,
  contrastStrength: 1.4,
  adaptiveThreshold: false, // can degrade vision model performance
  sharpen: true,
  sharpenAmount: 0.4,
  denoise: true,
  deskew: true,
};

/**
 * Preprocess a document image to improve OCR readability.
 * Returns a new File with the preprocessed image.
 */
export async function preprocessImage(
  file: File,
  options: PreprocessOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const img = await loadImage(file);

  const canvas = document.createElement("canvas");
  // Scale up small images for better OCR
  const scale = Math.max(1, Math.min(2, 2000 / Math.max(img.width, img.height)));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(img.src);

  const w = canvas.width;
  const h = canvas.height;

  console.log(`[Preprocess] Image: ${w}x${h} (scale: ${scale.toFixed(1)}x)`);

  // 1. Grayscale
  if (opts.grayscale) {
    const imageData = getPixels(ctx, w, h);
    grayscale(imageData);
    putPixels(ctx, imageData);
    console.log("[Preprocess] Grayscale applied");
  }

  // 2. Denoise (before sharpening to remove noise first)
  if (opts.denoise) {
    denoise(ctx, w, h);
    console.log("[Preprocess] Denoise applied");
  }

  // 3. Contrast enhancement
  if (opts.contrast) {
    const imageData = getPixels(ctx, w, h);
    enhanceContrast(imageData, opts.contrastStrength);
    putPixels(ctx, imageData);
    console.log("[Preprocess] Contrast enhanced");
  }

  // 4. Adaptive threshold (optional, good for printed text)
  if (opts.adaptiveThreshold) {
    const imageData = getPixels(ctx, w, h);
    adaptiveThreshold(imageData);
    putPixels(ctx, imageData);
    console.log("[Preprocess] Adaptive threshold applied");
  }

  // 5. Sharpen
  if (opts.sharpen) {
    sharpen(ctx, w, h, opts.sharpenAmount);
    console.log("[Preprocess] Sharpen applied");
  }

  // 6. Deskew
  if (opts.deskew) {
    deskew(ctx, canvas, w, h);
    console.log("[Preprocess] Deskew applied");
  }

  // Convert canvas back to File
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95)
  );

  return new File([blob], file.name.replace(/\.[^.]+$/, "_preprocessed.jpg"), {
    type: "image/jpeg",
  });
}
