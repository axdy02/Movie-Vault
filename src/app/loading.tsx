export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading movie vault">
      <div className="skeleton skeleton-title" />
      <div
        className="skeleton skeleton-line"
        style={{ width: 320, maxWidth: '80%', marginBottom: 36 }}
      />
      <div className="poster-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}>
            <div className="skeleton skeleton-poster" />
            <div className="skeleton skeleton-line" style={{ width: '70%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
