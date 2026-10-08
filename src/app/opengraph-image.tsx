import { ImageResponse } from 'next/og'
export const alt = 'Movie Vault — Good films. Better company.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: '#08090b',
        color: '#f5f7fa',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 90,
      }}
    >
      <div
        style={{
          display: 'flex',
          color: '#e7ff5e',
          fontSize: 24,
          letterSpacing: 5,
          marginBottom: 45,
        }}
      >
        MOVIE VAULT
      </div>
      <div style={{ display: 'flex', fontSize: 78, fontWeight: 700 }}>
        Good films.
      </div>
      <div
        style={{
          display: 'flex',
          color: '#e7ff5e',
          fontSize: 78,
          fontWeight: 700,
        }}
      >
        Better company.
      </div>
      <div
        style={{
          display: 'flex',
          color: '#a9b0ba',
          fontSize: 26,
          marginTop: 40,
        }}
      >
        A shared space for cinema.
      </div>
    </div>,
    size,
  )
}
