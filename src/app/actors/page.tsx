import type { Metadata } from 'next'
import { PeopleDirectory } from '@/features/discovery/people-directory'
import { getVault } from '@/server/queries/vault.queries'

export const metadata: Metadata = { title: 'The actors' }
export default async function ActorsPage() {
  return <PeopleDirectory vault={await getVault()} />
}
