// ============================================================
// 全局配置
// ============================================================

// TMDB API 配置
// 申请地址：https://www.themoviedb.org/settings/api
// 注册后免费获得 API Key，每天10万次请求
export const TMDB_CONFIG = {
  API_KEY:  '444cdaccde3badb74bd99aef91e1289e',   // 替换为你的API Key
  // 已部署专属 Vercel 代理
  BASE_URL: 'https://tmdb.guiyangju.com/3',
  IMG_BASE: 'https://tmdb.guiyangju.com/t/p',
  LANG:     'zh-CN',               // 优先中文
  LANG_EN:  'en-US',               // 备用英文
}

// 图片尺寸配置
export const IMG_SIZE = {
  poster_sm:  'w185',   // 小封面（列表用）
  poster_md:  'w342',   // 中封面（卡片用）
  poster_lg:  'w500',   // 大封面（详情用）
  backdrop:   'w780',   // 背景图（Banner用）
  backdrop_lg:'w1280',  // 高清背景图
  profile:    'w185',   // 演员头像
}

// 封面图片生成
export function getPosterUrl(path, size = 'poster_md') {
  if (!path) return ''
  return `${TMDB_CONFIG.IMG_BASE}/${IMG_SIZE[size]}${path}`
}

// 美剧主流播出平台（用于"去哪看"功能）
export const WATCH_PLATFORMS = [
  { id: 'netflix',  name: 'Netflix',   icon: '🎬', color: '#E50914', tip: '订阅后可看' },
  { id: 'disney',   name: 'Disney+',   icon: '✨', color: '#113CCF', tip: '订阅后可看' },
  { id: 'hbo',      name: 'HBO Max',   icon: '📺', color: '#9B59B6', tip: '订阅后可看' },
  { id: 'prime',    name: 'Prime',     icon: '📦', color: '#00A8E0', tip: 'Amazon Prime' },
  { id: 'apple',    name: 'Apple TV+', icon: '🍎', color: '#555555', tip: '订阅后可看' },
  { id: 'hulu',     name: 'Hulu',      icon: '🟢', color: '#1CE783', tip: '美区可看' },
  { id: 'youku',    name: '优酷',      icon: '🎥', color: '#00A0E9', tip: '部分独播' },
  { id: 'iqiyi',    name: '爱奇艺',    icon: '💚', color: '#00BE06', tip: '部分独播' },
  { id: 'tencent',  name: '腾讯视频',  icon: '🎮', color: '#FF6600', tip: '部分独播' },
]

// 内容分级映射（TMDB -> 中文）
export const RATING_MAP = {
  'TV-MA':  '限制级',
  'TV-14':  '14+',
  'TV-PG':  '家庭',
  'TV-G':   '全年龄',
  'TV-Y':   '儿童',
  'TV-Y7':  '7+',
  'R':      '限制级',
  'PG-13':  '13+',
  'PG':     '家庭',
  'G':      '全年龄',
  'NR':     '未分级',
}

// 热门搜索词
export const HOT_SEARCH = [
  '权力的游戏', '绝命毒师', '纸牌屋', '黑镜', '怪奇物语',
  '我们这一天', '汉娜斯密斯', '白莲花', '继承之战', '熊家餐馆',
]

// 排行榜类型
export const RANK_TYPES = [
  { key: 'on_the_air',  label: '正在播出', icon: '📡' },
  { key: 'popular',     label: '最受欢迎', icon: '🔥' },
  { key: 'top_rated',   label: '评分最高', icon: '⭐' },
  { key: 'airing_today',label: '今日更新', icon: '📺' },
]

// 类型映射（TMDB genre_id -> 中文）
export const GENRE_MAP = {
  10759: '动作冒险', 16: '动画',    35: '喜剧',  80: '犯罪',
  99:    '纪录片',  18: '剧情',    10751: '家庭', 10762: '儿童',
  9648:  '悬疑',   10763: '新闻',  10764: '真人秀', 10765: '科幻/奇幻',
  10766: '肥皂剧',  10767: '脱口秀', 10768: '战争/政治', 37: '西部',
}
