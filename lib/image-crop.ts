type CropOptions = {
  width: number
  height: number
  aspectRatio: number
  outputWidth: number
  zoom: number
  positionX: number
  positionY: number
}

export function getImageCropGeometry({ width, height, aspectRatio, outputWidth, zoom, positionX, positionY }: CropOptions) {
  if (![width, height, aspectRatio, outputWidth, zoom].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('圖片尺寸或裁切比例無效。')
  }

  const cropWidth = Math.min(width, height * aspectRatio) / Math.max(1, zoom)
  const cropHeight = cropWidth / aspectRatio
  const clampPosition = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50
  const sourceX = (width - cropWidth) * clampPosition(positionX) / 100
  const sourceY = (height - cropHeight) * clampPosition(positionY) / 100
  // Keep the available detail; enlarging a small crop cannot make it HD.
  const targetWidth = Math.max(1, Math.floor(Math.min(outputWidth, cropWidth)))
  const targetHeight = Math.max(1, Math.round(targetWidth / aspectRatio))

  return {
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    targetWidth,
    targetHeight,
    previewStyle: {
      width: `${width / cropWidth * 100}%`,
      height: `${height / cropHeight * 100}%`,
      left: `${-sourceX / cropWidth * 100}%`,
      top: `${-sourceY / cropHeight * 100}%`,
      maxWidth: 'none',
    },
  }
}
