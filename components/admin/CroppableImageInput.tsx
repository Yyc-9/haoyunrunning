'use client'

import Image from 'next/image'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Crop, Loader2, X } from 'lucide-react'

type CroppableImageInputProps = {
  children: React.ReactNode
  className: string
  disabled?: boolean
  aspectRatio?: number
  aspectLabel?: string
  outputWidth?: number
  onCroppedFile: (file: File) => void | Promise<void>
}

type ImageSize = {
  width: number
  height: number
}

function croppedFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '-')
  return `${baseName || 'image'}-cropped.webp`
}

async function createCroppedFile(
  file: File,
  image: HTMLImageElement,
  aspectRatio: number,
  outputWidth: number,
  zoom: number,
  positionX: number,
  positionY: number
) {
  const naturalWidth = image.naturalWidth
  const naturalHeight = image.naturalHeight
  const naturalAspect = naturalWidth / naturalHeight
  const baseCropWidth = naturalAspect > aspectRatio ? naturalHeight * aspectRatio : naturalWidth
  const baseCropHeight = naturalAspect > aspectRatio ? naturalHeight : naturalWidth / aspectRatio
  const cropWidth = baseCropWidth / zoom
  const cropHeight = baseCropHeight / zoom
  const sourceX = (naturalWidth - cropWidth) * (positionX / 100)
  const sourceY = (naturalHeight - cropHeight) * (positionY / 100)
  const outputHeight = Math.max(1, Math.round(outputWidth / aspectRatio))
  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const context = canvas.getContext('2d')

  if (!context) throw new Error('瀏覽器無法建立圖片裁切畫布。')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('裁切圖片輸出失敗。')),
      'image/webp',
      0.92
    )
  })

  return new File([blob], croppedFileName(file.name), {
    type: 'image/webp',
    lastModified: Date.now(),
  })
}

export default function CroppableImageInput({
  children,
  className,
  disabled = false,
  aspectRatio = 16 / 9,
  aspectLabel = '16:9',
  outputWidth = 1600,
  onCroppedFile,
}: CroppableImageInputProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageSize, setImageSize] = useState<ImageSize | null>(null)
  const [zoom, setZoom] = useState(1)
  const [positionX, setPositionX] = useState(50)
  const [positionY, setPositionY] = useState(50)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const close = useCallback(() => {
    setFile(null)
    setPreviewUrl('')
    setImageSize(null)
    setZoom(1)
    setPositionX(50)
    setPositionY(50)
    setProcessing(false)
    setError('')
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!file) return
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !processing) close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, file, processing])

  async function confirmCrop() {
    if (!file || !imageRef.current || !imageSize) return
    setProcessing(true)
    setError('')
    try {
      const cropped = await createCroppedFile(
        file,
        imageRef.current,
        aspectRatio,
        outputWidth,
        zoom,
        positionX,
        positionY
      )
      await onCroppedFile(cropped)
      close()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '圖片裁切失敗。')
      setProcessing(false)
    }
  }

  return (
    <>
      <label className={className}>
        {children}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const selectedFile = event.target.files?.[0]
            event.target.value = ''
            if (!selectedFile) return
            setFile(selectedFile)
          }}
        />
      </label>

      {file && previewUrl ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl outline-none sm:max-w-3xl sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <p id={titleId} className="flex items-center gap-2 text-lg font-black text-apple-gray-950">
                  <Crop className="h-5 w-5" />
                  裁切圖片
                </p>
                <p className="mt-1 text-xs font-semibold text-apple-gray-500">
                  建議比例 {aspectLabel}，完成後才會上傳。
                </p>
              </div>
              <button
                type="button"
                aria-label="關閉圖片裁切"
                disabled={processing}
                onClick={close}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-apple-gray-100 text-apple-gray-700 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div
                className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-black"
                style={{ aspectRatio }}
              >
                <Image
                  src={previewUrl}
                  alt="待裁切圖片預覽"
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-150"
                  style={{
                    objectPosition: `${positionX}% ${positionY}%`,
                    transform: `scale(${zoom})`,
                  }}
                  onLoad={(event) => {
                    imageRef.current = event.currentTarget
                    setImageSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    })
                  }}
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/50" />
                <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-dashed border-white/45" />
                <div className="pointer-events-none absolute inset-y-0 right-1/3 border-l border-dashed border-white/45" />
                <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-white/45" />
                <div className="pointer-events-none absolute inset-x-0 bottom-1/3 border-t border-dashed border-white/45" />
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-3">
                <label className="text-sm font-bold text-apple-gray-700">
                  縮放
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="mt-3 w-full accent-black"
                  />
                </label>
                <label className="text-sm font-bold text-apple-gray-700">
                  左右位置
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={positionX}
                    onChange={(event) => setPositionX(Number(event.target.value))}
                    className="mt-3 w-full accent-black"
                  />
                </label>
                <label className="text-sm font-bold text-apple-gray-700">
                  上下位置
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={positionY}
                    onChange={(event) => setPositionY(Number(event.target.value))}
                    className="mt-3 w-full accent-black"
                  />
                </label>
              </div>

              {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" disabled={processing} onClick={close} className="apple-button-outline min-h-12 px-6 disabled:opacity-40">
                  取消
                </button>
                <button
                  type="button"
                  disabled={processing || !imageSize}
                  onClick={() => void confirmCrop()}
                  className="apple-button-primary min-h-12 gap-2 px-6 disabled:opacity-40"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
                  {processing ? '裁切並上傳中' : '套用裁切並上傳'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
