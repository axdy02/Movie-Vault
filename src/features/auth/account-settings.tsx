'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/server/actions/vault.actions'
import { REGIONS, REGION_STORAGE_KEY } from '@/lib/regions'
import type { ActionResult } from '@/types/domain'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}
function storedRegion() {
  try {
    const region = localStorage.getItem(REGION_STORAGE_KEY)
    return REGIONS.some((entry) => entry.code === region) ? region! : 'IN'
  } catch {
    return 'IN'
  }
}
export function AccountSettings() {
  const router = useRouter()
  const region = useSyncExternalStore(subscribe, storedRegion, () => 'IN')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  function changeRegion(value: string) {
    try {
      localStorage.setItem(REGION_STORAGE_KEY, value)
      window.dispatchEvent(new StorageEvent('storage'))
      setSaved(true)
    } catch {
      setResult({
        ok: false,
        message: 'This browser could not save your preference.',
      })
    }
  }
  function signOut() {
    setResult(null)
    startTransition(async () => {
      try {
        const response = await logout()
        setResult(response)
        if (response.ok) {
          router.replace('/')
          router.refresh()
        }
      } catch {
        setResult({
          ok: false,
          message: 'Could not sign out. Please try again.',
        })
      }
    })
  }
  return (
    <>
      <div className="detail-panel">
        <h2>Where you watch</h2>
        <p className="settings-copy">
          Choose a country for streaming availability. This preference is saved
          in this browser.
        </p>
        <label className="field" style={{ marginTop: 20 }}>
          Viewing region
          <select
            value={region}
            onChange={(event) => changeRegion(event.target.value)}
          >
            {REGIONS.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {saved && (
          <p role="status" className="settings-copy">
            Viewing region saved.
          </p>
        )}
      </div>
      <div className="detail-panel">
        <h2>Your session</h2>
        <p className="settings-copy">
          Your watched state, ratings and watch history belong to your account.
          Sign out when using a shared device.
        </p>
        <Button
          variant="outline"
          disabled={pending}
          onClick={signOut}
          style={{ marginTop: 24 }}
        >
          <LogOut size={15} />
          {pending ? 'Signing out…' : 'Sign out'}
        </Button>
        {result && (
          <p role={result.ok ? 'status' : 'alert'} className="settings-copy">
            {result.message}
          </p>
        )}
      </div>
    </>
  )
}
