const mapping = {
  plus: 'fa-plus',
  search: 'fa-search',
  refresh: 'fa-sync',
  movies: 'fa-film',
  edit: 'fa-edit',
  trash: 'fa-trash',
  chevronLeft: 'fa-chevron-left',
  chevronRight: 'fa-chevron-right',
  close: 'fa-times',
  save: 'fa-save',
}

export default function Icon({ name, className = '', ...props }) {
  const fa = mapping[name] || name
  return <i className={`fa ${fa} ${className}`} {...props} />
}
