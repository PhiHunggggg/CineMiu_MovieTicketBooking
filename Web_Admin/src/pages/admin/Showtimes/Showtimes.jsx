import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { cinemaApi, movieApi, showtimeApi, ticketPriceApi } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'

const PAGE_SIZE = 8

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'upcoming', label: 'Sắp chiếu' },
  { value: 'showing', label: 'Đang chiếu' },
  { value: 'ended', label: 'Đã kết thúc' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const formStatusOptions = [
  { value: 'upcoming', label: 'Sắp chiếu' },
  { value: 'showing', label: 'Đang chiếu' },
  { value: 'ended', label: 'Đã kết thúc' },
]

const persistedStatusByDisplayStatus = {
  upcoming: 'scheduled',
  showing: 'selling',
  ended: 'completed',
}

const languageOptions = [
  { value: 'subtitled', label: 'Phụ đề' },
  { value: 'dubbed', label: 'Lồng tiếng' },
  { value: 'original', label: 'Nguyên bản' },
]

const initialForm = {
  movieId: '',
  cinemaId: '',
  hallId: '',
  startTime: '',
  endTime: '',
  languageType: 'subtitled',
  status: 'upcoming',
  isSpecial: false,
}

const initialGenerateForm = {
  movieId: '',
  dateFrom: getTodayInputValue(),
  dateTo: getTodayInputValue(),
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data

  if (typeof data === 'string') return data

  return data?.message || data?.title || error?.message || fallback
}

function getShowtimeInfo(item) {
  return item?.showtime ?? item ?? {}
}

function getItems(data) {
  return data?.items || data?.data || data || []
}

async function getAllTicketPriceItems() {
  const firstResponse = await ticketPriceApi.getAll({ page: 1, pageSize: 50 })
  const firstData = firstResponse.data ?? {}
  const totalPages = Math.max(Number(firstData.totalPages) || 1, 1)

  if (totalPages === 1) return getItems(firstData)

  const remainingResponses = await Promise.all(
    Array.from(
      { length: totalPages - 1 },
      (_, index) => ticketPriceApi.getAll({ page: index + 2, pageSize: 50 }),
    ),
  )

  return [
    ...getItems(firstData),
    ...remainingResponses.flatMap((response) => getItems(response.data)),
  ]
}

function toInteger(value) {
  const numberValue = Number(value)
  return Number.isInteger(numberValue) ? numberValue : NaN
}

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

function isValidDateParts(year, month, day) {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
}

function toDisplayFilterDate(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${padDatePart(day)}/${padDatePart(month)}/${year}`
  }

  const displayMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (displayMatch) {
    const [, day, month, year] = displayMatch
    return `${padDatePart(day)}/${padDatePart(month)}/${year}`
  }

  return trimmed
}

function toApiFilterDate(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const [, yearValue, monthValue, dayValue] = isoMatch
    const year = Number(yearValue)
    const month = Number(monthValue)
    const day = Number(dayValue)
    return isValidDateParts(year, month, day)
      ? `${yearValue}-${padDatePart(month)}-${padDatePart(day)}`
      : ''
  }

  const displayMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!displayMatch) return ''

  const [, dayValue, monthValue, yearValue] = displayMatch
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)

  return isValidDateParts(year, month, day)
    ? `${yearValue}-${padDatePart(month)}-${padDatePart(day)}`
    : ''
}

function toDateTimeLocal(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16)
  }

  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`,
  ].join('T')
}

function toApiDateTime(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null

  return trimmed.length === 16 ? `${trimmed}:00` : trimmed
}

function formatDate(value) {
  if (!value) return 'Chưa đặt'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa đặt'

  return new Intl.DateTimeFormat('vi-VN').format(date)
}

function formatTime(value) {
  if (!value) return '--:--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(startTime, endTime) {
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 'Chưa rõ thời lượng'
  }

  return `${Math.round((end.getTime() - start.getTime()) / 60000)} phút`
}

function formatCurrency(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'Chưa có giá'

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numericValue)
}

function getPriceEntity(item) {
  return item?.price || item?.Price || item || {}
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeSlot(value) {
  return normalizeText(value || 'all_day').replace(/\s+/g, '_')
}

function toDateOnly(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

function getTodayInputValue() {
  const today = new Date()
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`
}

function resolveTimeSlot(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'all_day'

  const hour = date.getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return hour < 23 ? 'evening' : 'late_night'
}

function resolveDayType(value, isSpecial) {
  if (isSpecial) return 'holiday'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'weekday'

  return date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : 'weekday'
}

function priceEffectiveOn(price, showDate) {
  if (!showDate) return true

  const effectiveFrom = toDateOnly(price?.effectiveFrom ?? price?.EffectiveFrom)
  const effectiveToValue = price?.effectiveTo ?? price?.EffectiveTo
  const effectiveTo = effectiveToValue ? toDateOnly(effectiveToValue) : null

  return (!effectiveFrom || effectiveFrom <= showDate) && (!effectiveTo || effectiveTo >= showDate)
}

function priceMatchesDayType(item, dayType) {
  const price = getPriceEntity(item)
  const dayTypeId = Number(price?.dayTypeId ?? price?.DayTypeId)
  const dayTypeText = normalizeText([
    item?.dayType?.typeName,
    item?.dayType?.TypeName,
    item?.dayType?.description,
    item?.dayType?.Description,
  ].filter(Boolean).join(' '))

  if (dayType === 'weekday') {
    return dayTypeId === 1 || dayTypeText.includes('weekday') || dayTypeText.includes('ngay thuong')
  }

  if (dayType === 'weekend') {
    return dayTypeId === 2 || dayTypeText.includes('weekend') || dayTypeText.includes('cuoi tuan')
  }

  return dayTypeId === 3 ||
    dayTypeText.includes('holiday') ||
    dayTypeText.includes('special') ||
    dayTypeText.includes('ngay le') ||
    dayTypeText.includes('ngay dac biet')
}

function priceMatchesTimeSlot(price, timeSlot) {
  const priceSlot = normalizeSlot(price?.timeSlot ?? price?.TimeSlot)
  return priceSlot === 'all_day' || priceSlot === timeSlot
}

function getStatusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label ?? 'Chưa rõ'
}

function resolveShowtimeStatus(showtime, nowValue) {
  if (showtime?.status === 'cancelled') return 'cancelled'
  if (showtime?.status === 'completed' || showtime?.status === 'ended') return 'ended'
  if (showtime?.status === 'selling' || showtime?.status === 'showing') return 'showing'

  const now = new Date(nowValue ?? 0)
  const start = new Date(showtime?.startTime)
  const end = new Date(showtime?.endTime)

  if (!Number.isNaN(end.getTime()) && end <= now) return 'ended'
  if (!Number.isNaN(start.getTime()) && start <= now && !Number.isNaN(end.getTime()) && end > now) {
    return 'showing'
  }
  if (!Number.isNaN(start.getTime()) && start > now) return 'upcoming'

  return 'upcoming'
}

function getLanguageLabel(value) {
  return languageOptions.find((option) => option.value === value)?.label ?? 'Chưa rõ'
}

function toForm(item) {
  const showtime = getShowtimeInfo(item)
  const hall = item?.hall ?? {}
  const cinema = item?.cinema ?? {}

  return {
    movieId: showtime.movieId ? String(showtime.movieId) : '',
    cinemaId: hall.cinemaId || cinema.cinemaId ? String(hall.cinemaId ?? cinema.cinemaId) : '',
    hallId: showtime.hallId ? String(showtime.hallId) : '',
    startTime: toDateTimeLocal(showtime.startTime),
    endTime: toDateTimeLocal(showtime.endTime),
    languageType: showtime.languageType ?? 'subtitled',
    status: resolveShowtimeStatus(showtime, Date.now()),
    isSpecial: Boolean(showtime.isSpecial),
  }
}

function buildPayload(form) {
  return {
    movieId: Number(form.movieId),
    hallId: Number(form.hallId),
    startTime: toApiDateTime(form.startTime),
    endTime: toApiDateTime(form.endTime),
    languageType: form.languageType,
    isSpecial: Boolean(form.isSpecial),
    status: persistedStatusByDisplayStatus[form.status] ?? 'scheduled',
  }
}

function getSuggestionKey(item, index) {
  return [item.hallId, item.startTime, item.endTime, index].join('|')
}

function validateForm(form, halls) {
  const errors = {}
  const movieId = toInteger(form.movieId)
  const cinemaId = toInteger(form.cinemaId)
  const hallId = toInteger(form.hallId)
  const start = form.startTime ? new Date(form.startTime) : null
  const end = form.endTime ? new Date(form.endTime) : null
  const validStatuses = formStatusOptions.map((option) => option.value)
  const validLanguages = languageOptions.map((option) => option.value)
  const selectedHall = halls.find((hall) => hall.hallId === hallId)

  if (!Number.isInteger(movieId) || movieId <= 0) {
    errors.movieId = 'Vui lòng chọn phim.'
  }

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    errors.cinemaId = 'Vui lòng chọn rạp.'
  }

  if (!Number.isInteger(hallId) || hallId <= 0) {
    errors.hallId = 'Vui lòng chọn phòng chiếu.'
  }

  if (selectedHall && selectedHall.status !== 'active') {
    errors.hallId = 'Phòng đã chọn không hoạt động.'
  }

  if (selectedHall && Number.isInteger(cinemaId) && selectedHall.cinemaId !== cinemaId) {
    errors.hallId = 'Phòng không thuộc rạp đã chọn.'
  }

  if (!form.startTime || !start || Number.isNaN(start.getTime())) {
    errors.startTime = 'Vui lòng chọn giờ bắt đầu.'
  }

  if (form.endTime && (!end || Number.isNaN(end.getTime()) || (start && end <= start))) {
    errors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu.'
  }

  if (!validLanguages.includes(form.languageType)) {
    errors.languageType = 'Ngôn ngữ suất chiếu không hợp lệ.'
  }

  if (!validStatuses.includes(form.status)) {
    errors.status = 'Trạng thái suất chiếu không hợp lệ.'
  }

  return errors
}

function Showtimes() {
  const { user, isCinemaManager } = useAuth()
  const [searchParams] = useSearchParams()
  const isManagerScoped = isCinemaManager()
  const assignedCinemaId = isManagerScoped ? String(user?.cinemaId || '') : ''
  const todayInputValue = getTodayInputValue()
  const initialDate = toApiFilterDate(searchParams.get('date')) || todayInputValue
  const initialStatus = searchParams.get('status') || (searchParams.get('upcoming') === '1' ? 'upcoming' : '')
  const queryAppliedRef = useRef(false)
  const [showtimes, setShowtimes] = useState([])
  const [movies, setMovies] = useState([])
  const [cinemas, setCinemas] = useState([])
  const [halls, setHalls] = useState([])
  const [ticketPrices, setTicketPrices] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  })
  const [page, setPage] = useState(1)
  const [cinemaInput, setCinemaInput] = useState(assignedCinemaId || searchParams.get('cinemaId') || '')
  const [hallInput, setHallInput] = useState(searchParams.get('hallId') || '')
  const [dateInput, setDateInput] = useState(toDisplayFilterDate(initialDate))
  const [cinemaFilter, setCinemaFilter] = useState(assignedCinemaId || searchParams.get('cinemaId') || '')
  const [hallFilter, setHallFilter] = useState(searchParams.get('hallId') || '')
  const [dateFilter, setDateFilter] = useState(initialDate)
  const [statusInput, setStatusInput] = useState(initialStatus)
  const [status, setStatus] = useState(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const [isLookupsLoading, setIsLookupsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingShowtime, setEditingShowtime] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [generateForm, setGenerateForm] = useState(initialGenerateForm)
  const [generatePreview, setGeneratePreview] = useState(null)
  const [generateErrors, setGenerateErrors] = useState({})
  const [selectedGenerateKeys, setSelectedGenerateKeys] = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const [statusClock, setStatusClock] = useState(null)

  const fetchLookups = useCallback(async () => {
    setIsLookupsLoading(true)

    try {
      const [movieResponse, cinemaResponse, priceItems] = await Promise.all([
        movieApi.getAll({ page: 1, pageSize: 100 }),
        cinemaApi.getAll({ activeOnly: true }),
        getAllTicketPriceItems(),
      ])

      const movieItems = getItems(movieResponse.data)
      const cinemaItems = getItems(cinemaResponse.data).filter((cinema) => (
        !isManagerScoped || (assignedCinemaId && String(cinema.cinemaId || cinema.id) === assignedCinemaId)
      ))
      const hallResponses = await Promise.all(
        cinemaItems.map(async (cinema) => {
          const cinemaId = cinema.cinemaId || cinema.id
          try {
            const response = await cinemaApi.getHalls(cinemaId)
            return getItems(response.data).map((hall) => ({
              ...hall,
              cinemaId,
              cinemaName: cinema.cinemaName || cinema.name,
              cinemaCity: cinema.city,
            }))
          } catch {
            return []
          }
        }),
      )

      setMovies(movieItems.filter((movie) => movie.status !== 'ended'))
      setCinemas(cinemaItems)
      setHalls(hallResponses.flat())
      setTicketPrices(isManagerScoped
        ? priceItems.filter((item) => assignedCinemaId && String(item.cinemaId || item.CinemaId) === assignedCinemaId)
        : priceItems)
    } catch (lookupError) {
      setMovies([])
      setCinemas([])
      setHalls([])
      setTicketPrices([])
      setError(getErrorMessage(lookupError, 'Không tải được dữ liệu phim, rạp hoặc phòng chiếu.'))
    } finally {
      setIsLookupsLoading(false)
    }
  }, [assignedCinemaId, isManagerScoped])

  const fetchShowtimes = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await showtimeApi.getAll({
        cinemaId: isManagerScoped ? assignedCinemaId || -1 : cinemaFilter || undefined,
        hallId: hallFilter || undefined,
        date: dateFilter || undefined,
        status: status || undefined,
        page,
        pageSize: PAGE_SIZE,
      })

      const data = response.data ?? {}
      setShowtimes(Array.isArray(data.items) ? data.items : [])
      setPagination({
        page: data.page ?? page,
        pageSize: data.pageSize ?? PAGE_SIZE,
        totalCount: data.totalCount ?? 0,
        totalPages: Math.max(data.totalPages ?? 1, 1),
      })
    } catch (showtimeError) {
      setShowtimes([])
      setError(getErrorMessage(showtimeError, 'Không tải được danh sách suất chiếu.'))
    } finally {
      setIsLoading(false)
    }
  }, [assignedCinemaId, cinemaFilter, dateFilter, hallFilter, isManagerScoped, page, status])

  useEffect(() => {
    fetchLookups()
  }, [fetchLookups])

  useEffect(() => {
    fetchShowtimes()
  }, [fetchShowtimes])

  useEffect(() => {
    setStatusClock(Date.now())
    const timer = window.setInterval(() => setStatusClock(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const shownRange = useMemo(() => {
    if (pagination.totalCount === 0) return '0'

    const start = (pagination.page - 1) * pagination.pageSize + 1
    const end = Math.min(pagination.page * pagination.pageSize, pagination.totalCount)

    return `${start}-${end}`
  }, [pagination])

  const formHallOptions = useMemo(
    () => halls.filter((hall) => (
      hall.status === 'active'
      && (!form.cinemaId || String(hall.cinemaId) === form.cinemaId)
    )),
    [form.cinemaId, halls],
  )

  const filterHallOptions = useMemo(
    () => halls.filter((hall) => !cinemaInput || String(hall.cinemaId) === cinemaInput),
    [cinemaInput, halls],
  )

  const selectedMovie = useMemo(
    () => movies.find((movie) => String(movie.movieId) === form.movieId),
    [form.movieId, movies],
  )

  const selectedGenerateMovie = useMemo(
    () => movies.find((movie) => String(movie.movieId) === generateForm.movieId),
    [generateForm.movieId, movies],
  )

  const selectedHall = useMemo(
    () => halls.find((hall) => String(hall.hallId) === form.hallId),
    [form.hallId, halls],
  )

  const matchingPriceRules = useMemo(() => {
    if (!selectedHall || !form.cinemaId) return []

    const showDate = toDateOnly(form.startTime || new Date())
    const dayType = resolveDayType(form.startTime || new Date(), form.isSpecial)
    const timeSlot = resolveTimeSlot(form.startTime || new Date())

    return ticketPrices.filter((item) => {
      const price = getPriceEntity(item)

      return Number(price?.cinemaId) === Number(form.cinemaId)
        && Number(price?.hallTypeId) === Number(selectedHall.hallTypeId)
        && priceEffectiveOn(price, showDate)
        && priceMatchesDayType(item, dayType)
        && priceMatchesTimeSlot(price, timeSlot)
    })
  }, [form.cinemaId, form.isSpecial, form.startTime, selectedHall, ticketPrices])

  const matchingPriceRange = useMemo(() => {
    const prices = matchingPriceRules
      .map((item) => {
        const price = getPriceEntity(item)
        return Number(price?.basePrice ?? price?.BasePrice)
      })
      .filter(Number.isFinite)

    if (prices.length === 0) return null

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    }
  }, [matchingPriceRules])

  const dependencyCounts = useMemo(() => ({
    movies: movies.length,
    cinemas: cinemas.length,
    halls: halls.filter((hall) => hall.status === 'active').length,
    prices: ticketPrices.length,
  }), [cinemas.length, halls, movies.length, ticketPrices.length])

  const openCreateForm = (overrides = {}) => {
    setEditingShowtime(null)
    setForm({ ...initialForm, ...overrides, cinemaId: assignedCinemaId || overrides.cinemaId || '' })
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  useEffect(() => {
    if (isLookupsLoading || queryAppliedRef.current || searchParams.get('create') !== '1') return

    queryAppliedRef.current = true
    const movieId = searchParams.get('movieId') || ''
    const cinemaId = isManagerScoped ? assignedCinemaId : searchParams.get('cinemaId') || ''
    const hallId = searchParams.get('hallId') || ''
    const matchingHalls = halls.filter((hall) => hall.status === 'active' && String(hall.cinemaId) === cinemaId)
    const selectedQueryHall = matchingHalls.find((hall) => String(hall.hallId) === hallId)

    openCreateForm({
      movieId: movies.some((movie) => String(movie.movieId) === movieId) ? movieId : '',
      cinemaId: cinemas.some((cinema) => String(cinema.cinemaId || cinema.id) === cinemaId) ? cinemaId : '',
      hallId: selectedQueryHall
        ? String(selectedQueryHall.hallId)
        : matchingHalls.length === 1
          ? String(matchingHalls[0].hallId)
          : '',
    })
  }, [assignedCinemaId, cinemas, halls, isLookupsLoading, isManagerScoped, movies, searchParams])

  const openEditForm = (showtime) => {
    setEditingShowtime(showtime)
    setForm(toForm(showtime))
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return

    setIsFormOpen(false)
    setEditingShowtime(null)
    setForm({ ...initialForm, cinemaId: assignedCinemaId })
    setFormErrors({})
  }

  const handleFieldChange = (event) => {
    const { checked, name, type, value } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setForm((current) => {
      const next = { ...current, [name]: nextValue }

      if (name === 'cinemaId') {
        next.hallId = ''
      }

      if (name === 'hallId') {
        const nextHall = halls.find((hall) => String(hall.hallId) === value)
        if (nextHall) {
          next.cinemaId = String(nextHall.cinemaId)
        }
      }

      return next
    })

    setFormErrors((current) => {
      if (!current[name] && !(name === 'cinemaId' && current.hallId) && !(name === 'hallId' && current.cinemaId)) {
        return current
      }

      const next = { ...current }
      delete next[name]

      if (name === 'cinemaId') {
        delete next.hallId
      }

      if (name === 'hallId') {
        delete next.cinemaId
      }

      return next
    })
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const nextDateFilter = toApiFilterDate(dateInput)
    if (dateInput.trim() && !nextDateFilter) {
      setError('Ngay chieu phai co dinh dang dd/mm/yyyy.')
      return
    }

    setCinemaFilter(assignedCinemaId || cinemaInput)
    setHallFilter(hallInput)
    setDateFilter(nextDateFilter)
    setStatus(statusInput)
    setPage(1)
  }

  const resetFilters = () => {
    setCinemaInput(assignedCinemaId)
    setHallInput('')
    setDateInput(toDisplayFilterDate(todayInputValue))
    setCinemaFilter(assignedCinemaId)
    setHallFilter('')
    setDateFilter(todayInputValue)
    setStatusInput('')
    setStatus('')
    setPage(1)
  }

  const openGenerateModal = () => {
    setGenerateForm({
      movieId: movies[0]?.movieId ? String(movies[0].movieId) : '',
      dateFrom: todayInputValue,
      dateTo: todayInputValue,
    })
    setGeneratePreview(null)
    setGenerateErrors({})
    setSelectedGenerateKeys([])
    setError('')
    setNotice('')
    setIsGenerateModalOpen(true)
  }

  const closeGenerateModal = () => {
    if (isGenerating) return
    setIsGenerateModalOpen(false)
    setGeneratePreview(null)
    setGenerateErrors({})
    setSelectedGenerateKeys([])
  }

  const validateGenerateForm = () => {
    const errors = {}
    const movieId = toInteger(generateForm.movieId)
    const dateFrom = generateForm.dateFrom ? new Date(generateForm.dateFrom) : null
    const dateTo = generateForm.dateTo ? new Date(generateForm.dateTo) : null

    if (!Number.isInteger(movieId) || movieId <= 0) errors.movieId = 'Vui lòng chọn phim.'
    if (!generateForm.dateFrom || !dateFrom || Number.isNaN(dateFrom.getTime())) errors.dateFrom = 'Vui lòng chọn ngày bắt đầu.'
    if (!generateForm.dateTo || !dateTo || Number.isNaN(dateTo.getTime())) errors.dateTo = 'Vui lòng chọn ngày kết thúc.'
    if (dateFrom && dateTo && dateTo < dateFrom) errors.dateTo = 'Ngày kết thúc phải sau ngày bắt đầu.'
    if (dateFrom && dateTo && (dateTo - dateFrom) / 86400000 > 30) errors.dateTo = 'Chỉ tạo tối đa 31 ngày mỗi lần.'

    return errors
  }

  const buildGeneratePayload = () => ({
    movieId: Number(generateForm.movieId),
    dateFrom: generateForm.dateFrom,
    dateTo: generateForm.dateTo,
    cinemaId: isManagerScoped && assignedCinemaId ? Number(assignedCinemaId) : undefined,
  })

  const handlePreviewGenerateSchedule = async (event) => {
    event.preventDefault()
    const nextErrors = validateGenerateForm()
    if (Object.keys(nextErrors).length > 0) {
      setGenerateErrors(nextErrors)
      setGeneratePreview(null)
      setSelectedGenerateKeys([])
      return
    }

    setIsGenerating(true)
    setError('')
    setNotice('')
    setGenerateErrors({})

    try {
      const response = await showtimeApi.previewGenerate(buildGeneratePayload())
      const preview = response.data ?? { suggestions: [], suggestedCount: 0, warnings: [] }
      setGeneratePreview(preview)
      setSelectedGenerateKeys((preview.suggestions || []).map((item, index) => getSuggestionKey(item, index)))
    } catch (generateError) {
      setError(getErrorMessage(generateError, 'Không tạo được gợi ý lịch chiếu.'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConfirmGenerateSchedule = async () => {
    const nextErrors = validateGenerateForm()
    if (Object.keys(nextErrors).length > 0) {
      setGenerateErrors(nextErrors)
      return
    }

    setIsGenerating(true)
    setError('')
    setNotice('')

    try {
      const selectedSuggestions = (generatePreview?.suggestions || [])
        .filter((item, index) => selectedGenerateKeys.includes(getSuggestionKey(item, index)))
      if (selectedSuggestions.length === 0) {
        setError('Vui lòng chọn ít nhất một suất chiếu để tạo.')
        return
      }

      const response = await showtimeApi.generate({
        ...buildGeneratePayload(),
        suggestions: selectedSuggestions,
      })
      const createdCount = getItems(response.data).length
      setNotice(createdCount > 0
        ? 'Đã tạo ' + createdCount + ' suất chiếu cho phim ' + (selectedGenerateMovie?.title || '') + '.'
        : 'Không có suất chiếu mới cần tạo trong khoảng ngày này.')
      setIsGenerateModalOpen(false)
      setGeneratePreview(null)
      setSelectedGenerateKeys([])
      await fetchShowtimes()
    } catch (generateError) {
      setError(getErrorMessage(generateError, 'Không tạo được lịch chiếu tự động.'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(form, halls)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = buildPayload(form)

      if (editingShowtime) {
        await showtimeApi.update(getShowtimeInfo(editingShowtime).showtimeId, payload)
        setNotice('Đã cập nhật suất chiếu.')
      } else {
        await showtimeApi.create(payload)
        setNotice('Đã thêm suất chiếu mới.')
      }

      closeForm()
      await fetchShowtimes()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không lưu được suất chiếu.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item) => {
    const showtime = getShowtimeInfo(item)
    const movieTitle = item.movie?.title ?? 'suất chiếu này'
    const confirmed = window.confirm(`Xóa suất chiếu "${movieTitle}" lúc ${formatTime(showtime.startTime)} ngày ${formatDate(showtime.startTime)}?`)
    if (!confirmed) return

    setDeletingId(showtime.showtimeId)
    setError('')
    setNotice('')

    try {
      await showtimeApi.delete(showtime.showtimeId)
      setNotice('Đã xóa suất chiếu.')

      if (showtimes.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await fetchShowtimes()
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không xóa được suất chiếu.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="admin-page showtimes-page" aria-label="Quản lý suất chiếu">
      <div className="page-surface movies-surface showtimes-surface">
        <div className="movies-toolbar">
          <div>
            <p className="section-kicker">Lịch chiếu</p>
            <h2>Quản lý suất chiếu</h2>
            <p className="section-subtitle">
              Hiển thị {shownRange} trong {pagination.totalCount} suất chiếu
            </p>
          </div>

          <div className="toolbar-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={openGenerateModal}
              disabled={isGenerating || isLookupsLoading}
            >
              <i className="fas fa-wand-magic-sparkles" />
              {isGenerating ? 'Đang tạo...' : 'Tạo tự động'}
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={openCreateForm}
              disabled={isLookupsLoading}
            >
              <Icon name="plus" />
              Thêm suất chiếu
            </button>
          </div>
        </div>

        <div className="showtime-dependency-grid" aria-label="Dữ liệu liên kết lịch chiếu">
          <div className={`dependency-card ${dependencyCounts.movies ? 'ready' : 'missing'}`}>
            <span><i className="fas fa-film" /></span>
            <div><strong>{dependencyCounts.movies} phim</strong><small>Thêm và cập nhật phim</small></div>
          </div>
          <div className={`dependency-card ${dependencyCounts.cinemas ? 'ready' : 'missing'}`}>
            <span><i className="fas fa-building" /></span>
            <div><strong>{dependencyCounts.cinemas} chi nhánh</strong><small>Quản lý địa điểm chiếu</small></div>
          </div>
          <Link className={`dependency-card ${dependencyCounts.halls ? 'ready' : 'missing'}`} to="/admin/halls">
            <span><i className="fas fa-door-open" /></span>
            <div><strong>{dependencyCounts.halls} phòng hoạt động</strong><small>Tạo phòng trước khi xếp lịch</small></div>
            <i className="fas fa-arrow-right" />
          </Link>
          <Link className={`dependency-card ${dependencyCounts.prices ? 'ready' : 'missing'}`} to="/admin/ticket-prices">
            <span><i className="fas fa-tags" /></span>
            <div><strong>{dependencyCounts.prices} mức giá</strong><small>Giá áp dụng theo rạp và loại phòng</small></div>
            <i className="fas fa-arrow-right" />
          </Link>
        </div>

        <form className="showtimes-filters" onSubmit={handleSearch}>
          <select
            value={cinemaInput}
            onChange={(event) => {
              if (isManagerScoped) return
              setCinemaInput(event.target.value)
              setHallInput('')
            }}
            aria-label="Lọc chi nhánh"
            disabled={isManagerScoped}
          >
            {!isManagerScoped && <option value="">Tất cả chi nhánh</option>}
            {cinemas.map((cinema) => (
              <option key={cinema.cinemaId || cinema.id} value={cinema.cinemaId || cinema.id}>
                {cinema.cinemaName || cinema.name}
              </option>
            ))}
          </select>

          <select
            value={hallInput}
            onChange={(event) => {
              const nextHallId = event.target.value
              const nextHall = halls.find((hall) => String(hall.hallId) === nextHallId)
              setHallInput(nextHallId)
              if (nextHall) setCinemaInput(String(nextHall.cinemaId))
            }}
            aria-label="Lọc phòng chiếu"
          >
            <option value="">Tất cả phòng chiếu</option>
            {filterHallOptions.map((hall) => (
              <option key={hall.hallId} value={hall.hallId}>
                {hall.hallName || hall.name} - {hall.cinemaName}
              </option>
            ))}
          </select>

          <select
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
            aria-label="Lọc trạng thái suất chiếu"
          >
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateInput}
            onChange={(event) => setDateInput(event.target.value)}
            aria-label="Tìm theo ngày chiếu"
            title="Ngày chiếu"
          />

          <button className="secondary-button" type="submit">
            <Icon name="search" />
            Tìm kiếm
          </button>
          <button className="ghost-button" type="button" onClick={resetFilters}>
            <Icon name="refresh" />
            Đặt lại
          </button>
        </form>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {notice ? <div className="alert alert-success">{notice}</div> : null}

        <div className="list-heading">
          <i className="fas fa-table-cells-large" />
          Danh sách lịch chiếu
        </div>

        <div className="movies-table-wrap">
          <table className="movies-table showtimes-table">
            <thead>
              <tr>
                <th>Giờ bắt đầu</th>
                <th>Giờ kết thúc</th>
                <th>Phim</th>
                <th>Phòng chiếu</th>
                <th>Giá vé từ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="table-state">
                    Đang tải danh sách suất chiếu...
                  </td>
                </tr>
              ) : showtimes.length > 0 ? (
                showtimes.map((item) => {
                  const showtime = getShowtimeInfo(item)
                  const effectiveStatus = resolveShowtimeStatus(showtime, statusClock)
                  const movie = item.movie ?? {}
                  const hall = item.hall ?? {}
                  const cinema = item.cinema ?? {}

                  return (
                    <tr key={showtime.showtimeId}>
                      <td>
                        <div className="showtime-date-cell">
                          <strong>{formatTime(showtime.startTime)}</strong>
                          <span>{formatDate(showtime.startTime)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="showtime-date-cell">
                          <strong>{formatTime(showtime.endTime)}</strong>
                          <span>{formatDate(showtime.endTime || showtime.startTime)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="showtime-movie-cell">
                          <strong>{movie.title || 'Chưa có phim'}</strong>
                          <span>
                            {getLanguageLabel(showtime.languageType)}
                            {' · '}
                            {formatDuration(showtime.startTime, showtime.endTime)}
                            {showtime.isSpecial ? ' · Suất đặc biệt' : ''}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="showtime-location-cell">
                          <strong>{hall.hallName || hall.name || '-'}</strong>
                          <span>{cinema.cinemaName || hall.cinemaName || 'Chưa có rạp'}</span>
                          <small>{hall.hallTypeName || cinema.city || ''}</small>
                        </div>
                      </td>
                      <td>
                        <div className="showtime-price-cell">
                          <strong className="price-value">{formatCurrency(showtime.basePrice)}</strong>
                          <span>Ghế thường</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-${effectiveStatus}`}>
                          {getStatusLabel(effectiveStatus)}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button table-action"
                            type="button"
                            onClick={() => openEditForm(item)}
                            aria-label={`Sửa suất chiếu ${movie.title || showtime.showtimeId}`}
                            title="Sửa suất chiếu"
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="icon-button table-action danger"
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === showtime.showtimeId}
                            aria-label={`Xóa suất chiếu ${movie.title || showtime.showtimeId}`}
                            title="Xóa suất chiếu"
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="7" className="table-state">
                    Chưa có suất chiếu phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <span>
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <div className="pagination-actions">
            <button
              className="icon-button"
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page <= 1 || isLoading}
              aria-label="Trang trước"
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
              disabled={page >= pagination.totalPages || isLoading}
              aria-label="Trang sau"
            >
              <Icon name="chevronRight" />
            </button>
          </div>
        </div>
      </div>

      {isGenerateModalOpen ? (
        <div className="modal-backdrop">
          <section className="modal-panel showtime-form-modal generate-showtimes-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>Tạo lịch chiếu tự động</h2>
              <button className="close" type="button" onClick={closeGenerateModal} disabled={isGenerating} aria-label="Đóng form tạo lịch chiếu tự động">
                <Icon name="close" />
              </button>
            </div>

            <form className="movie-form showtime-form" onSubmit={handlePreviewGenerateSchedule}>
              <div className="form-grid">
                <label className="form-field required">
                  <span>Phim</span>
                  <select value={generateForm.movieId} onChange={(event) => { setGenerateForm((current) => ({ ...current, movieId: event.target.value })); setGeneratePreview(null); setSelectedGenerateKeys([]) }}>
                    <option value="">Chọn phim</option>
                    {movies.map((movie) => <option key={movie.movieId} value={movie.movieId}>{movie.title}</option>)}
                  </select>
                  {selectedGenerateMovie ? <small className="form-hint">{selectedGenerateMovie.durationMins} phút</small> : null}
                  {generateErrors.movieId ? <em>{generateErrors.movieId}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Từ ngày</span>
                  <input type="date" value={generateForm.dateFrom} onChange={(event) => { setGenerateForm((current) => ({ ...current, dateFrom: event.target.value })); setGeneratePreview(null); setSelectedGenerateKeys([]) }} />
                  {generateErrors.dateFrom ? <em>{generateErrors.dateFrom}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Đến ngày</span>
                  <input type="date" value={generateForm.dateTo} onChange={(event) => { setGenerateForm((current) => ({ ...current, dateTo: event.target.value })); setGeneratePreview(null); setSelectedGenerateKeys([]) }} />
                  {generateErrors.dateTo ? <em>{generateErrors.dateTo}</em> : null}
                </label>
              </div>

              {generatePreview ? (
                <div className="generate-preview">
                  {(generatePreview.warnings || []).map((warning) => <div key={warning} className="alert alert-warning">{warning}</div>)}
                  <div className="generate-preview__summary">
                    <strong>{selectedGenerateKeys.length} / {generatePreview.suggestedCount || 0} suất được chọn</strong>
                    <span>Hệ thống bỏ qua các khung giờ trùng phòng, ngoài giờ hoạt động hoặc quá sát hiện tại.</span>
                  </div>
                  <div className="generate-preview__actions">
                    <button className="btn btn-secondary" type="button" onClick={() => setSelectedGenerateKeys((generatePreview.suggestions || []).map((item, index) => getSuggestionKey(item, index)))}>Chọn tất cả</button>
                    <button className="btn btn-secondary" type="button" onClick={() => setSelectedGenerateKeys([])}>Bỏ chọn tất cả</button>
                  </div>
                  <div className="generate-preview__list">
                    {(generatePreview.suggestions || []).map((item, index) => (
                      <label className="generate-preview__item" key={String(item.hallId) + '-' + item.startTime + '-' + index}>
                        <input
                          type="checkbox"
                          checked={selectedGenerateKeys.includes(getSuggestionKey(item, index))}
                          onChange={(event) => {
                            const key = getSuggestionKey(item, index)
                            setSelectedGenerateKeys((current) => event.target.checked
                              ? [...current, key]
                              : current.filter((value) => value !== key))
                          }}
                        />
                        <div><strong>{formatTime(item.startTime)} - {formatTime(item.endTime)}</strong><span>{formatDate(item.startTime)}</span></div>
                        <div><strong>{item.hallName}</strong><span>{item.cinemaName}</span></div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="form-actions">
                <button className="btn btn-secondary" type="button" onClick={closeGenerateModal} disabled={isGenerating}>Đóng</button>
                <button className="btn btn-secondary" type="submit" disabled={isGenerating || isLookupsLoading}>{isGenerating ? 'Đang gợi ý...' : 'Xem gợi ý'}</button>
                <button className="btn btn-primary" type="button" onClick={handleConfirmGenerateSchedule} disabled={isGenerating || !generatePreview || selectedGenerateKeys.length === 0}>{isGenerating ? 'Đang tạo...' : 'Tạo các suất đã chọn'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="modal-backdrop">
          <section className="modal-panel showtime-form-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>{editingShowtime ? `Sửa lịch chiếu: ${itemTitle(editingShowtime)}` : 'Thêm lịch chiếu'}</h2>
              <button
                className="close"
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                aria-label="Đóng form"
              >
                <Icon name="close" />
              </button>
            </div>

            <form className="movie-form showtime-form" onSubmit={handleSubmit}>
              {error ? <div className="alert alert-error">{error}</div> : null}

              <div className="form-grid">
                <label className="form-field required">
                  <span>Phim</span>
                  <select name="movieId" value={form.movieId} onChange={handleFieldChange}>
                    <option value="">Chọn phim</option>
                    {movies.map((movie) => (
                      <option key={movie.movieId} value={movie.movieId}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                  {selectedMovie ? <small className="form-hint">{selectedMovie.durationMins} phút</small> : null}
                  {movies.length === 0 ? (
                    <small className="form-hint">Chưa có phim khả dụng. Vui lòng liên hệ Admin toàn hệ thống để cập nhật danh mục phim.</small>
                  ) : null}
                  {formErrors.movieId ? <em>{formErrors.movieId}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Rạp</span>
                  <select name="cinemaId" value={form.cinemaId} onChange={handleFieldChange} disabled={isManagerScoped}>
                    <option value="">Chọn rạp</option>
                    {cinemas.map((cinema) => (
                      <option key={cinema.cinemaId} value={cinema.cinemaId}>
                        {cinema.cinemaName}
                      </option>
                    ))}
                  </select>
                  {cinemas.length === 0 ? (
                    <small className="form-hint">Tài khoản chưa được gán chi nhánh. Vui lòng liên hệ Admin toàn hệ thống.</small>
                  ) : null}
                  {formErrors.cinemaId ? <em>{formErrors.cinemaId}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Phòng chiếu</span>
                  <select name="hallId" value={form.hallId} onChange={handleFieldChange}>
                    <option value="">Chọn phòng chiếu</option>
                    {formHallOptions.map((hall) => (
                      <option key={hall.hallId} value={hall.hallId}>
                        {hall.hallName || hall.name} - {hall.hallTypeName || 'Phòng chiếu'}
                      </option>
                    ))}
                  </select>
                  {selectedHall ? (
                    <small className="form-hint">
                      {selectedHall.totalSeats} ghế, trạng thái {selectedHall.status}
                    </small>
                  ) : null}
                  {form.cinemaId && formHallOptions.length === 0 ? (
                    <Link className="form-create-link" to={`/admin/halls?create=1&cinemaId=${form.cinemaId}`}>
                      <i className="fas fa-plus" /> Tạo phòng cho chi nhánh này
                    </Link>
                  ) : null}
                  {formErrors.hallId ? <em>{formErrors.hallId}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Trạng thái</span>
                  <select name="status" value={form.status} onChange={handleFieldChange}>
                    {formStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="form-hint">Trạng thái cũng được tự động cập nhật theo thời gian bắt đầu và kết thúc.</small>
                  {formErrors.status ? <em>{formErrors.status}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Bắt đầu</span>
                  <input
                    name="startTime"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={handleFieldChange}
                  />
                  {formErrors.startTime ? <em>{formErrors.startTime}</em> : null}
                </label>

                <label className="form-field">
                  <span>Kết thúc</span>
                  <input
                    name="endTime"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={handleFieldChange}
                  />
                  <small className="form-hint">Để trống khi thêm mới để tự tính theo thời lượng phim.</small>
                  {formErrors.endTime ? <em>{formErrors.endTime}</em> : null}
                </label>

                <label className="form-field">
                  <span>Ngôn ngữ</span>
                  <select name="languageType" value={form.languageType} onChange={handleFieldChange}>
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.languageType ? <em>{formErrors.languageType}</em> : null}
                </label>

                <label className="form-field checkbox-field showtime-special-field">
                  <input
                    name="isSpecial"
                    type="checkbox"
                    checked={form.isSpecial}
                    onChange={handleFieldChange}
                  />
                  <span>Suất chiếu đặc biệt</span>
                </label>

                {selectedHall ? (
                  <div className={`showtime-price-status ${matchingPriceRules.length ? 'ready' : 'missing'}`}>
                    <i className={`fas ${matchingPriceRules.length ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
                    <div>
                      <strong>
                        {matchingPriceRules.length
                          ? `Giá vé từ ${formatCurrency(matchingPriceRange?.min)}`
                          : 'Chưa có bảng giá cho loại phòng này'}
                      </strong>
                      <small>
                        {matchingPriceRules.length
                          ? `${matchingPriceRules.length} mức giá phù hợp, tối đa ${formatCurrency(matchingPriceRange?.max)} theo loại ghế, ngày và khung giờ.`
                          : 'Nếu vẫn lưu, hệ thống dùng giá mặc định 75.000 đ.'}
                      </small>
                    </div>
                    <Link to={`/admin/ticket-prices?create=1&cinemaId=${form.cinemaId}&hallTypeId=${selectedHall.hallTypeId}`}>
                      {matchingPriceRules.length ? 'Xem bảng giá' : 'Thêm giá'}
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="form-actions">
                <button className="btn btn-secondary" type="button" onClick={closeForm} disabled={isSaving}>
                  Đóng
                </button>
                <button className="btn btn-primary" type="submit" disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function itemTitle(item) {
  const showtime = getShowtimeInfo(item)
  const movieTitle = item?.movie?.title ?? 'Suất chiếu'

  return `${movieTitle} - ${formatTime(showtime.startTime)} ${formatDate(showtime.startTime)}`
}

export default Showtimes

