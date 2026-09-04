import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getCourseCoachAvatarPresentation } from '../lib/course-coach-avatar.ts'
import { getImageCropGeometry } from '../lib/image-crop.ts'

test('課程依訓練營、地點、教練、藍圖順序閱讀，沒有無功能定位方框', () => {
  const source = readFileSync(new URL('../app/courses/[slug]/CourseDetailClient.tsx', import.meta.url), 'utf8')
  const sections = [...source.matchAll(/data-course-section="([^"]+)"/g)].map((match) => match[1])
  assert.deepEqual(sections, ['running-camp', 'location', 'coaches', 'blueprint'])
  assert.doesNotMatch(source, /<Navigation\b|courseAvatarFrames/)
  assert.match(source, /<CourseCoachAvatar\b/)
})

test('舊頭像依實際放大尺寸要求圖片解析度', () => {
  const avatar = getCourseCoachAvatarPresentation('/coaches/2026/avatars/liu-cheng-en.jpg')
  assert.equal(avatar.sizes, '260px')
  assert.equal(avatar.frameStyle.width, '270%')
})

test('管理員上傳的頭像不套用舊的二次放大', () => {
  for (const src of ['/uploads/liu-cheng-en.jpg', 'https://example.com/coaches/2026/avatars/liu-cheng-en.jpg']) {
    const avatar = getCourseCoachAvatarPresentation(src, 96, 50, 50)
    assert.equal(avatar.sizes, '96px')
    assert.equal(avatar.frameStyle.width, '100%')
    assert.equal(avatar.frameStyle.left, '0%')
    assert.equal(avatar.objectPosition, '50% 50%')
  }
})

test('已知舊上半身照片保留臉部取景，新上傳檔案不受影響', () => {
  const legacy = 'https://vmnbthmssiizbsvzeahz.supabase.co/storage/v1/object/public/site-media/coaches/2026-07-25/b2ee4282-cd7b-41bb-9163-b2e3c3fb9b8e.webp'
  assert.equal(getCourseCoachAvatarPresentation(legacy).frameStyle.width, '215%')
  assert.equal(getCourseCoachAvatarPresentation(legacy.replace('b2ee4282-cd7b-41bb-9163-b2e3c3fb9b8e', 'new-cropped-avatar')).frameStyle.width, '100%')
})

test('裁切預覽與輸出共用同一個縮放及偏移計算', () => {
  const crop = getImageCropGeometry({ width: 2400, height: 1600, aspectRatio: 1, outputWidth: 1200, zoom: 2, positionX: 25, positionY: 75 })
  assert.equal(crop.cropWidth, 800)
  assert.equal(crop.cropHeight, 800)
  assert.equal(crop.sourceX, 400)
  assert.equal(crop.sourceY, 600)
  assert.equal(crop.previewStyle.width, '300%')
  assert.equal(crop.previewStyle.left, '-50%')
  assert.equal(crop.previewStyle.top, '-75%')
  assert.equal(crop.targetWidth, 800)
})

test('橫直原圖在邊緣裁切時不超出原圖', () => {
  for (const [width, height] of [[2400, 1600], [1600, 2400]]) {
    for (const aspectRatio of [1, 3 / 2, 16 / 9]) {
      for (const position of [-10, 0, 50, 100, 110]) {
        const crop = getImageCropGeometry({ width, height, aspectRatio, outputWidth: 1200, zoom: 3, positionX: position, positionY: position })
        assert.ok(crop.sourceX >= 0 && crop.sourceY >= 0)
        assert.ok(crop.sourceX + crop.cropWidth <= width + 0.00001)
        assert.ok(crop.sourceY + crop.cropHeight <= height + 0.00001)
        assert.ok(Math.abs(crop.cropWidth / crop.cropHeight - aspectRatio) < 0.00001)
      }
    }
  }
})

test('小圖不人工放大成假高清，無效尺寸會明確拒絕', () => {
  const crop = getImageCropGeometry({ width: 300, height: 300, aspectRatio: 1, outputWidth: 1200, zoom: 2, positionX: 50, positionY: 50 })
  assert.equal(crop.targetWidth, 150)
  assert.equal(crop.targetHeight, 150)
  assert.throws(() => getImageCropGeometry({ width: 0, height: 300, aspectRatio: 1, outputWidth: 1200, zoom: 1, positionX: 50, positionY: 50 }))
})

test('後台與前台共用頭像預覽，裁切上傳重設焦點並沿用受保護儲存', () => {
  const admin = readFileSync(new URL('../components/admin/AdminContentManager.tsx', import.meta.url), 'utf8')
  const crop = readFileSync(new URL('../components/admin/CroppableImageInput.tsx', import.meta.url), 'utf8')
  const api = readFileSync(new URL('../app/api/admin/upload/route.ts', import.meta.url), 'utf8')
  assert.match(admin, /preview=\{<CourseCoachAvatar/)
  assert.match(admin, /avatarUrl, avatarFocusX: 50, avatarFocusY: 50/)
  assert.match(admin, /save_coach_public_profile/)
  assert.match(crop, /createCroppedFile\(file, imageRef.current, crop\)/)
  assert.match(crop, /style=\{crop\?\.previewStyle/)
  assert.match(crop, /createPortal/)
  assert.match(api, /getAdminProfile\(user\)/)
  assert.match(api, /只有超級管理員可以上傳網站媒體/)
})
