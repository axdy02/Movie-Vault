import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <span>A shared love for cinema. A vault to keep it.</span>
        <div className="footer-links">
          <Link href="/about">About the project</Link>
          <span className="footer-credit">
            Film data by{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
              className="tmdb-mark"
            >
              <Image
                src="/tmdb.svg"
                alt="TMDB"
                width={77}
                height={10}
                style={{ display: 'inline-block', verticalAlign: 'middle' }}
              />
            </a>
          </span>
          <span className="footer-credit">
            Availability by{' '}
            <a
              href="https://www.justwatch.com/"
              target="_blank"
              rel="noreferrer"
            >
              JustWatch
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
