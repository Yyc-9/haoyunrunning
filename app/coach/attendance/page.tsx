import CoachAttendanceClient from './CoachAttendanceClient'

export const metadata = {
  title: '課程點名 - 好運跑班',
  description: '記錄每堂課的實際到課情況，並由系統核對學員計費起點。',
}

export default function CoachAttendancePage() {
  return <CoachAttendanceClient />
}
