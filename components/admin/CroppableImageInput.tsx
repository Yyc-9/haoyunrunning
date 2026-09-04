'use client'

import Image from 'next/image'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Crop, Loader2, X } from 'lucide-react'
import { getImageCropGeometry } from '@/lib/image-crop'

type CroppableImageInputProps = {
  children: React.ReactNode
  className: string
  disabled?: boolean
  aspectRatio?: number
  aspectLabel?: string
  outputWidth?: number
  previewShape?: 'rectangle' | 'circle'
  minOutputWidth?: number
  cropHint?: string
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
  crop: ReturnType<typeof getImageCropGeometry>
) {
  const canvas = document.createElement('canvas')
  canvas.width = crop.targetWidth
  canvas.height = crop.targetHeight
  const context = canvas.getContext('2d')

  if (!context) throw new Error('瀏覽器無法建立圖片裁切畫布。')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    crop.sourceX,
    crop.sourceY,
    crop.cropWidth,
    crop.cropHeight,
    0,
    0,
    crop.targetWidth,
    crop.targetHeight
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
  previewShape = 'rectangle',
  minOutputWidth = 0,
  cropHint,
  onCroppedFile,
}: CroppableImageInputProps) {
  const titleId = useId()
  const descriptionId = useId()
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
  const crop = imageSize ? getImageCropGeometry({ ...imageSize, aspectRatio, outputWidth, zoom, positionX, positionY }) : null

  const close = useCallback(() => {
    setFile(null)
    setPreviewUrl('')
    setImageSize(null)
    imageRef.current = null
    setZoom(1)
    setPositionX(50)
    setPositionY(50)
    setProcessing(false)
    setError('')
  }, [])

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!file || !previewUrl) return
    const previousOverflow = document.body.style.overflow
    const triggerInput = inputRef.current
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      triggerInput?.focus()
    }
  }, [file, previewUrl])

  async function confirmCrop() {
    if (!file || !imageRef.current || !crop) return
    setProcessing(true)
    setError('')
    try {
      const cropped = await createCroppedFile(file, imageRef.current, crop)
      await onCroppedFile(cropped)
      close()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '圖片裁切失敗。')
      setProcessing(false)
    }
  }

  return (
    <>
      <label className={`${className} focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-apple-blue`}>
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

      {file && previewUrl ? createPortal(
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !processing) close() }}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !processing) { event.preventDefault(); close() }
              if (event.key !== 'Tab') return
              const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
              const first = focusable[0]
              const last = focusable[focusable.length - 1]
              if (!first) { event.preventDefault(); return }
              if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
                event.preventDefault(); last.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first.focus()
              }
            }}
            className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl outline-none sm:max-w-3xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p id={titleId} className="flex items-center gap-2 text-lg font-black text-apple-gray-950">
                  <Crop className="h-5 w-5" />
                  裁切圖片
                </p>
                <p id={descriptionId} className="mt-1 text-sm leading-6 text-apple-gray-600">
                  {cropHint || `裁切比例 ${aspectLabel}，確認後才會上傳。`}
                </p>
              </div>
              <button
                type="button"
                aria-label="關閉圖片裁切"
                disabled={processing}
                onClick={close}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-apple-gray-100 text-apple-gray-700 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div
                className={`relative mx-auto w-full overflow-hidden rounded-xl bg-black ${previewShape === 'circle' ? 'max-w-sm' : 'max-w-2xl'}`}
                style={{ aspectRatio }}
              >
                <Image
                  src={previewUrl}
                  alt="待裁切圖片預覽"
                  width={imageSize?.width ?? outputWidth}
                  height={imageSize?.height ?? Math.round(outputWidth / aspectRatio)}
                  unoptimized
                  className="absolute"
                  style={crop?.previewStyle ?? { width: '100%', height: '100%', objectFit: 'contain' }}
                  onLoad={(event) => {
                    imageRef.current = event.currentTarget
                    setImageSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    })
                  }}
                  onError={() => setError('無法讀取這張圖片，請重新選擇 JPG、PNG 或 WebP 圖片。')}
                />
                <div className={`pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/50 ${previewShape === 'circle' ? 'rounded-full shadow-[0_0_0_200px_rgba(0,0,0,0.55)]' : 'rounded-xl'}`} />
                <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-dashed border-white/45" />
                <div className="pointer-events-none absolute inset-y-0 right-1/3 border-l border-dashed border-white/45" />
                <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-white/45" />
                <div className="pointer-events-none absolute inset-x-0 bottom-1/3 border-t border-dashed border-white/45" />
              </div>

              {crop ? (
                <div className="mt-3 text-center text-xs leading-6 text-apple-gray-600" aria-live="polite">
                  <p>原圖 {imageSize?.width} × {imageSize?.height} px · 裁切輸出 {crop.targetWidth} × {crop.targetHeight} px</p>
                  {previewShape === 'circle' ? <p>圓框為課程顯示效果，儲存為 1:1 圖片。</p> : null}
                  {crop.targetWidth < minOutputWidth ? <p className="font-bold text-amber-800">裁切後解析度偏低，建議減少放大或選用更高解析度原圖。</p> : null}
                </div>
              ) : null}

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
        </div>, document.body
      ) : null}
    </>
  )
}
