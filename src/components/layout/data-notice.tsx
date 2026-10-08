import { AlertCircle } from 'lucide-react'
import type { VaultData } from '@/types/domain'

export function DataNotice({ vault }: { vault: VaultData }) {
  if (!vault.error && vault.configured) return null
  return (
    <div className="data-notice" role={vault.error ? 'alert' : 'status'}>
      <AlertCircle size={16} />
      <span>
        {vault.error ??
          'The vault is waiting for its first connection. You can explore the interface; saved films will appear when setup is complete.'}
      </span>
    </div>
  )
}
