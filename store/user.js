// ============================================================
// 用户数据管理（本地Storage）
// 追剧列表、打卡记录、观看历史、偏好设置
// ============================================================

const KEYS = {
  WATCH_LIST:  'mj_watchlist',
  CHECKINS:    'mj_checkins',
  HISTORY:     'mj_history',
  PREFERENCES: 'mj_prefs',
  STATS:       'mj_stats',
}

// ─────────────────────────────────────────────
// 追剧列表
// status: watching=在追 | want=想看 | done=看完 | dropped=弃剧
// ─────────────────────────────────────────────

export function getWatchList(status = null) {
  try {
    const list = JSON.parse(uni.getStorageSync(KEYS.WATCH_LIST) || '[]')
    return status ? list.filter(i => i.status === status) : list
  } catch (e) { return [] }
}

export function getWatchItem(showId) {
  return getWatchList().find(i => i.id === showId) || null
}

export function setWatchStatus(show, status) {
  const list = getWatchList()
  const idx  = list.findIndex(i => i.id === show.id)
  const now  = Date.now()

  const entry = {
    id:        show.id,
    tmdbId:    show.tmdbId,
    title:     show.title,
    cover:     show.cover,
    rating:    show.rating,
    seasons:   show.seasons,
    status,
    addedAt:   idx >= 0 ? list[idx].addedAt : now,
    updatedAt: now,
    // 进度：记录到哪季哪集
    currentSeason:  idx >= 0 ? (list[idx].currentSeason  || 1) : 1,
    currentEpisode: idx >= 0 ? (list[idx].currentEpisode || 0) : 0,
  }

  if (idx >= 0) list[idx] = entry
  else          list.unshift(entry)

  _save(KEYS.WATCH_LIST, list)
  _updateStats()
  return entry
}

export function removeFromWatchList(showId) {
  _save(KEYS.WATCH_LIST, getWatchList().filter(i => i.id !== showId))
  _updateStats()
}

export function updateProgress(showId, season, episode) {
  const list = getWatchList()
  const idx  = list.findIndex(i => i.id === showId)
  if (idx >= 0) {
    list[idx].currentSeason  = season
    list[idx].currentEpisode = episode
    list[idx].updatedAt      = Date.now()
    _save(KEYS.WATCH_LIST, list)
  }
}

// ─────────────────────────────────────────────
// 打卡记录
// ─────────────────────────────────────────────

export function getCheckins(showId = null) {
  try {
    const all = JSON.parse(uni.getStorageSync(KEYS.CHECKINS) || '[]')
    return showId ? all.filter(c => c.showId === showId) : all
  } catch (e) { return [] }
}

export function addCheckin({ showId, showTitle, showCover, season, episode, comment = '', mood = '😊', rating = 0 }) {
  const checkins = getCheckins()
  const now = Date.now()

  // 同集防重复
  if (checkins.find(c => c.showId === showId && c.season === season && c.episode === episode)) {
    return null
  }

  const checkin = {
    id:        `ck_${now}`,
    showId,
    showTitle,
    showCover,
    season,
    episode,
    comment,
    mood,
    rating,     // 用户对这集的评分 1-5
    createdAt:  now,
    dateStr:    new Date(now).toLocaleDateString('zh-CN'),
  }

  checkins.unshift(checkin)
  _save(KEYS.CHECKINS, checkins)
  _updateStats()
  return checkin
}

export function getTodayCheckins() {
  const today = new Date().toLocaleDateString('zh-CN')
  return getCheckins().filter(c => c.dateStr === today)
}

export function getStreakDays() {
  const dateSet = new Set(getCheckins().map(c => c.dateStr))
  let streak = 0
  const now = new Date()
  while (streak <= 365) {
    const d = new Date(now)
    d.setDate(d.getDate() - streak)
    if (dateSet.has(d.toLocaleDateString('zh-CN'))) streak++
    else break
  }
  return streak
}

// ─────────────────────────────────────────────
// 浏览历史
// ─────────────────────────────────────────────

export function addHistory(show) {
  try {
    let h = JSON.parse(uni.getStorageSync(KEYS.HISTORY) || '[]')
    h = h.filter(i => i.id !== show.id)
    h.unshift({ id: show.id, title: show.title, cover: show.cover, visitAt: Date.now() })
    _save(KEYS.HISTORY, h.slice(0, 50))
  } catch (e) {}
}

export function getHistory() {
  try { return JSON.parse(uni.getStorageSync(KEYS.HISTORY) || '[]') } catch (e) { return [] }
}

export function clearHistory() {
  _save(KEYS.HISTORY, [])
}

// ─────────────────────────────────────────────
// 偏好设置
// ─────────────────────────────────────────────

export function getPreferences() {
  try {
    return JSON.parse(uni.getStorageSync(KEYS.PREFERENCES) || JSON.stringify({
      nickname:       '剧迷',
      avatar:         '',
      favoriteGenres: [],
    }))
  } catch (e) {
    return { nickname: '剧迷', avatar: '', favoriteGenres: [] }
  }
}

export function savePreferences(prefs) {
  _save(KEYS.PREFERENCES, prefs)
}

// ─────────────────────────────────────────────
// 统计
// ─────────────────────────────────────────────

function _updateStats() {
  const list     = getWatchList()
  const checkins = getCheckins()
  const stats = {
    total:         list.length,
    watching:      list.filter(i => i.status === 'watching').length,
    done:          list.filter(i => i.status === 'done').length,
    want:          list.filter(i => i.status === 'want').length,
    dropped:       list.filter(i => i.status === 'dropped').length,
    totalCheckins: checkins.length,
    streak:        getStreakDays(),
    updatedAt:     Date.now(),
  }
  _save(KEYS.STATS, stats)
  return stats
}

export function getStats() {
  try { return JSON.parse(uni.getStorageSync(KEYS.STATS) || '{}') || _updateStats() }
  catch (e) { return _updateStats() }
}

function _save(key, data) {
  try { uni.setStorageSync(key, JSON.stringify(data)) } catch (e) {}
}
