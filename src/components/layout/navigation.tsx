'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  Clapperboard,
  Film,
  House,
  Layers3,
  LockKeyhole,
  Menu,
  Search,
  Users,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { EditorProfile } from '@/types/domain'

const links = [
  { href: '/', label: 'Home', icon: House },
  { href: '/library', label: 'Library', icon: Film },
  { href: '/actors', label: 'Actors', icon: Users },
  { href: '/directors', label: 'Directors', icon: Video },
  { href: '/collections', label: 'Collections', icon: Layers3 },
  { href: '/activity', label: 'Activity', icon: Activity },
]

export function Navigation({ editor }: { editor: EditorProfile | null }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Movie Vault home">
          <Clapperboard className="brand-mark" strokeWidth={1.5} />
          <span>
            MOVIE <span>VAULT</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href || (href !== '/' && pathname.startsWith(href))
                  ? 'page'
                  : undefined
              }
              className={`nav-link ${href === '/activity' ? 'nav-activity' : ''} ${pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'nav-link-active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="header-search-button"
          >
            <Link href="/search" aria-label="Search movies and people">
              <Search size={18} />
            </Link>
          </Button>
          {editor ? (
            <Link href="/settings" className="account-link">
              <span className="avatar" style={{ width: 25, height: 25 }}>
                {editor.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="account-name">{editor.displayName}</span>
            </Link>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="account-link"
            >
              <LockKeyhole size={13} />
              Member login
              <ArrowUpRight size={12} />
            </Link>
          )}
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mobile-menu-button"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Explore the vault</DialogTitle>
              <DialogDescription>
                A shared space for good cinema.
              </DialogDescription>
              <nav
                className="mobile-nav"
                aria-label="Mobile navigation"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a'))
                    setMenuOpen(false)
                }}
              >
                {links.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={pathname === href ? 'page' : undefined}
                  >
                    <Icon size={17} />
                    {label}
                  </Link>
                ))}
                <Link href="/genres">
                  <Film size={17} />
                  Genres
                </Link>
                <Link href="/search">
                  <Search size={17} />
                  Search
                </Link>
                <Link href="/about">About this project</Link>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
