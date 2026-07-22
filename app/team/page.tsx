import type { Metadata } from 'next'
import TeamRosterClient from './TeamRosterClient'

export const metadata: Metadata = {
  title: '團隊陣容 - 好運跑班',
  description: '認識好運跑班教練與助教，以及本季度負責班級。',
  alternates: { canonical: '/team' },
}

export default function TeamPage() {
  return <TeamRosterClient />
}
