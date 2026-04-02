// ============================================================
// TMDB API 封装 v1.0
// 文档：https://developer.themoviedb.org/docs
// ============================================================
import { TMDB_CONFIG, getPosterUrl, GENRE_MAP } from './config.js'

const { API_KEY, BASE_URL, LANG } = TMDB_CONFIG

// ─────────────────────────────────────────────
// 请求缓存（10分钟）
// ─────────────────────────────────────────────
const CACHE = {}
const TTL   = 10 * 60 * 1000

function buildUrl(path, params = {}) {
  const query = new URLSearchParams({
    api_key:  API_KEY,
    language: LANG,
    ...params,
  }).toString()
  return `${BASE_URL}${path}?${query}`
}

// URLSearchParams在小程序不可用，手写拼接
function buildUrlMP(path, params = {}) {
  const all = { api_key: API_KEY, language: LANG, ...params }
  const qs  = Object.entries(all)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return `${BASE_URL}${path}?${qs}`
}

function request(path, params = {}, options = {}) {
  const url     = buildUrlMP(path, params)
  const cacheKey = url
  const now      = Date.now()

  if (!options.noCache && CACHE[cacheKey] && now - CACHE[cacheKey].ts < TTL) {
    return Promise.resolve(CACHE[cacheKey].data)
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method:  'GET',
      timeout: 15000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          CACHE[cacheKey] = { data: res.data, ts: now }
          resolve(res.data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      },
      fail(err) { reject(new Error(err.errMsg || '网络请求失败')) },
    })
  })
}

// ─────────────────────────────────────────────
// 核心接口
// ─────────────────────────────────────────────

/**
 * 正在播出（本周更新）
 * 用于放送表和首页"今日更新"
 */
export async function getTVOnAir(page = 1) {
  const data = await request('/tv/on_the_air', { page })
  return {
    results:    (data.results || []).map(normalizeTVItem),
    totalPages: data.total_pages || 1,
    page:       data.page || 1,
  }
}

/**
 * 今日播出
 */
export async function getTVAiringToday(page = 1) {
  const data = await request('/tv/airing_today', { page })
  return {
    results:    (data.results || []).map(normalizeTVItem),
    totalPages: data.total_pages || 1,
  }
}

/**
 * 热门剧集
 */
export async function getTVPopular(page = 1) {
  const data = await request('/tv/popular', { page })
  return {
    results:    (data.results || []).map(normalizeTVItem),
    totalPages: data.total_pages || 1,
  }
}

/**
 * 评分最高
 */
export async function getTVTopRated(page = 1) {
  const data = await request('/tv/top_rated', { page })
  return {
    results:    (data.results || []).map(normalizeTVItem),
    totalPages: data.total_pages || 1,
  }
}

/**
 * 剧集完整详情
 */
export async function getTVDetail(id) {
  const [detail, credits, videos, similar] = await Promise.allSettled([
    request(`/tv/${id}`, { append_to_response: 'content_ratings' }),
    request(`/tv/${id}/credits`),
    request(`/tv/${id}/videos`),
    request(`/tv/${id}/similar`),
  ])

  const d = detail.status === 'fulfilled' ? detail.value : {}
  const c = credits.status === 'fulfilled' ? credits.value : {}
  const v = videos.status === 'fulfilled' ? videos.value : {}
  const s = similar.status === 'fulfilled' ? similar.value : {}

  return {
    ...normalizeTVDetail(d),
    cast:    (c.cast    || []).slice(0, 15).map(normalizeCast),
    trailerKey: getTrailerKey(v.results || []),
    similar: (s.results || []).slice(0, 8).map(normalizeTVItem),
  }
}

/**
 * 某一季详情（含分集列表）
 */
export async function getTVSeason(tvId, seasonNumber) {
  const data = await request(`/tv/${tvId}/season/${seasonNumber}`)
  return {
    id:           data.id,
    name:         data.name || `第${seasonNumber}季`,
    overview:     data.overview || '',
    airDate:      data.air_date || '',
    posterPath:   getPosterUrl(data.poster_path, 'poster_md'),
    episodes:     (data.episodes || []).map(ep => ({
      id:          ep.id,
      number:      ep.episode_number,
      name:        ep.name || `第${ep.episode_number}集`,
      overview:    ep.overview || '',
      airDate:     ep.air_date || '',
      runtime:     ep.runtime || 0,
      stillPath:   getPosterUrl(ep.still_path, 'poster_sm'),
      rating:      ep.vote_average || 0,
    })),
  }
}

/**
 * 搜索剧集
 */
export async function searchTV(query, page = 1) {
  const data = await request('/search/tv', { query, page, include_adult: false })
  return {
    results:    (data.results || []).map(normalizeTVItem),
    totalPages: data.total_pages || 1,
    total:      data.total_results || 0,
  }
}

/**
 * 搜索（剧+电影）多类型
 */
export async function searchMulti(query, page = 1) {
  const data = await request('/search/multi', { query, page, include_adult: false })
  const results = (data.results || [])
    .filter(r => r.media_type === 'tv' || r.media_type === 'movie')
    .map(r => r.media_type === 'tv' ? normalizeTVItem(r) : normalizeMovieItem(r))
  return { results, total: data.total_results || 0 }
}

/**
 * 按类型/网络平台筛选
 */
export async function discoverTV(params = {}) {
  const data = await request('/discover/tv', {
    sort_by:           'popularity.desc',
    'vote_count.gte':  50,
    ...params,
  })
  return {
    results:    (data.results || []).map(normalizeTVItem),
    totalPages: data.total_pages || 1,
  }
}

/**
 * 趋势榜（今日/本周）
 */
export async function getTrending(timeWindow = 'week') {
  const data = await request(`/trending/tv/${timeWindow}`)
  return (data.results || []).map(normalizeTVItem)
}

/**
 * 类型列表
 */
export async function getGenres() {
  const data = await request('/genre/tv/list')
  return data.genres || []
}

// ─────────────────────────────────────────────
// 数据标准化
// ─────────────────────────────────────────────

const { IMG_BASE } = TMDB_CONFIG

export function normalizeTVItem(item) {
  const title = item.name || item.original_name || ''
  const titleEn = item.original_name || ''

  return {
    id:           `tmdb_${item.id}`,
    tmdbId:       item.id,
    mediaType:    'tv',
    title,
    titleEn,
    titleOriginal: item.original_name || '',
    cover:        item.poster_path    ? `${TMDB_CONFIG.IMG_BASE}/w342${item.poster_path}` : '',
    backdrop:     item.backdrop_path  ? `${TMDB_CONFIG.IMG_BASE}/w780${item.backdrop_path}` : '',
    rating:       item.vote_average   || 0,
    ratingCount:  item.vote_count     || 0,
    overview:     item.overview       || '',
    firstAirDate: item.first_air_date || '',
    genres:       (item.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean),
    genreIds:     item.genre_ids      || [],
    popularity:   item.popularity     || 0,
    status:       item.status         || '',
    networks:     (item.networks      || []).map(n => n.name),
    seasons:      item.number_of_seasons || 0,
    episodes:     item.number_of_episodes || 0,
    source:       'tmdb',
  }
}

function normalizeTVDetail(item) {
  const base = normalizeTVItem(item)
  return {
    ...base,
    tagline:       item.tagline        || '',
    homepage:      item.homepage       || '',
    status:        item.status         || '',
    type:          item.type           || '',
    inProduction:  item.in_production  || false,
    lastAirDate:   item.last_air_date  || '',
    lastEpisode:   item.last_episode_to_air ? {
      number:  item.last_episode_to_air.episode_number,
      name:    item.last_episode_to_air.name,
      airDate: item.last_episode_to_air.air_date,
    } : null,
    nextEpisode:   item.next_episode_to_air ? {
      number:  item.next_episode_to_air.episode_number,
      name:    item.next_episode_to_air.name,
      airDate: item.next_episode_to_air.air_date,
    } : null,
    seasonList:    (item.seasons || []).map(s => ({
      id:          s.id,
      number:      s.season_number,
      name:        s.name,
      episodeCount: s.episode_count,
      airDate:     s.air_date || '',
      posterPath:  s.poster_path ? `${TMDB_CONFIG.IMG_BASE}/w185${s.poster_path}` : '',
      overview:    s.overview || '',
    })).filter(s => s.number > 0),  // 过滤掉特别篇（season 0）
    creators:      (item.created_by || []).map(c => ({
      id:    c.id,
      name:  c.name,
      photo: c.profile_path ? `${TMDB_CONFIG.IMG_BASE}/w185${c.profile_path}` : '',
    })),
    networks:      (item.networks || []).map(n => ({
      id:   n.id,
      name: n.name,
      logo: n.logo_path ? `${TMDB_CONFIG.IMG_BASE}/w92${n.logo_path}` : '',
    })),
    productionCompanies: (item.production_companies || []).map(c => c.name),
    contentRating: getContentRating(item.content_ratings),
    genres:        (item.genres || []).map(g => g.name),
    spokenLanguages: (item.spoken_languages || []).map(l => l.name),
    originCountry: (item.origin_country || []).join(', '),
  }
}

function normalizeMovieItem(item) {
  return {
    id:           `tmdb_movie_${item.id}`,
    tmdbId:       item.id,
    mediaType:    'movie',
    title:        item.title || item.original_title || '',
    titleEn:      item.original_title || '',
    cover:        item.poster_path   ? `${TMDB_CONFIG.IMG_BASE}/w342${item.poster_path}` : '',
    backdrop:     item.backdrop_path ? `${TMDB_CONFIG.IMG_BASE}/w780${item.backdrop_path}` : '',
    rating:       item.vote_average  || 0,
    ratingCount:  item.vote_count    || 0,
    overview:     item.overview      || '',
    firstAirDate: item.release_date  || '',
    genres:       (item.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean),
    source:       'tmdb',
  }
}

function normalizeCast(person) {
  return {
    id:        person.id,
    name:      person.name,
    character: person.character || '',
    photo:     person.profile_path ? `${TMDB_CONFIG.IMG_BASE}/w185${person.profile_path}` : '',
    order:     person.order || 0,
  }
}

function getContentRating(contentRatings) {
  if (!contentRatings?.results) return ''
  const cn = contentRatings.results.find(r => r.iso_3166_1 === 'CN')
  const us = contentRatings.results.find(r => r.iso_3166_1 === 'US')
  const target = cn || us
  return target?.rating || ''
}

function getTrailerKey(videos) {
  if (!videos || !videos.length) return ''
  const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube')
  return trailer?.key || ''
}

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

/**
 * 格式化日期
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`
}

/**
 * 格式化评分（10分制 → 显示1位小数）
 */
export function formatRating(score) {
  if (!score || score === 0) return '-'
  return score.toFixed(1)
}

/**
 * 格式化播出时间
 */
export function formatAirDate(dateStr) {
  if (!dateStr) return '待定'
  const d   = new Date(dateStr)
  const now = new Date()
  const diff = d - now
  if (diff > 0 && diff < 7 * 86400000) {
    const days = Math.ceil(diff / 86400000)
    return days === 0 ? '今天' : `${days}天后`
  }
  return `${d.getMonth()+1}/${d.getDate()}`
}

/**
 * 数字格式化（大数字缩写）
 */
export function formatCount(n) {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000)  return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}
