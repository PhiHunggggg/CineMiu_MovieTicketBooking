const icons = {
  bell: (
    <path d="M15 17H9m8-3v-3a5 5 0 0 0-10 0v3l-2 3h14l-2-3Zm-5 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z" />
  ),
  bookings: (
    <path d="M5 6h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V6Zm5 3v6m4-6v6" />
  ),
  chevronLeft: (
    <path d="m15 18-6-6 6-6" />
  ),
  chevronRight: (
    <path d="m9 18 6-6-6-6" />
  ),
  close: (
    <path d="m6 6 12 12M18 6 6 18" />
  ),
  cinemas: (
    <path d="M4 21h16M6 21V7l6-3 6 3v14M9 21v-7h6v7M9 9h.01M12 8h.01M15 9h.01M9 12h.01M12 11h.01M15 12h.01" />
  ),
  dashboard: (
    <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />
  ),
  edit: (
    <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Zm11-13 3 3" />
  ),
  halls: (
    <path d="M4 6h16v12H4V6Zm3 3h2v2H7V9Zm4 0h2v2h-2V9Zm4 0h2v2h-2V9ZM7 13h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z" />
  ),
  image: (
    <path d="M5 5h14v14H5V5Zm3 10 3-3 2 2 3-4 3 5M9 9.5h.01" />
  ),
  logout: (
    <path d="M10 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2m5 10 5-5-5-5m5 5H9" />
  ),
  movies: (
    <path d="M5 4h14v16H5V4Zm0 4h14M5 16h14M8 4v4m4-4v4m4-4v4M8 16v4m4-4v4m4-4v4" />
  ),
  plus: (
    <path d="M12 5v14M5 12h14" />
  ),
  refresh: (
    <path d="M20 7v5h-5M4 17v-5h5m10.1-4A8 8 0 0 0 5.7 6.1M4.9 16a8 8 0 0 0 13.4 1.9" />
  ),
  save: (
    <path d="M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 20v-6h8v6" />
  ),
  search: (
    <path d="m20 20-4.5-4.5M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
  ),
  showtimes: (
    <path d="M7 3v4M17 3v4M4 8h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 7 3 2 3-2" />
  ),
  trash: (
    <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
  ),
  users: (
    <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m10-9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm8 9v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  ),
  vouchers: (
    <path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V7Zm6 3 4 6m.5-6h.01M9.5 16h.01" />
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
