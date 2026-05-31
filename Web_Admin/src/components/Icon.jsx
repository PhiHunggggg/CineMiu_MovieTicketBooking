const icons = {
  bell: (
    <path d="M15 17H9m8-3v-3a5 5 0 0 0-10 0v3l-2 3h14l-2-3Zm-5 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z" />
  ),
  bookings: (
    <path d="M5 6h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V6Zm5 3v6m4-6v6" />
  ),
  dashboard: (
    <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />
  ),
  logout: (
    <path d="M10 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2m5 10 5-5-5-5m5 5H9" />
  ),
  movies: (
    <path d="M5 4h14v16H5V4Zm0 4h14M5 16h14M8 4v4m4-4v4m4-4v4M8 16v4m4-4v4m4-4v4" />
  ),
  search: (
    <path d="m20 20-4.5-4.5M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
  ),
  users: (
    <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m10-9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm8 9v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  ),
}

function Icon({ name, className = 'icon' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  )
}

export default Icon
