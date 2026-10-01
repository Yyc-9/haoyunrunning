import { notFound } from 'next/navigation'
import CoachLeavePreview from './preview-client'

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <CoachLeavePreview />
}
