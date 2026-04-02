<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarH + 'px' }" />
    <view class="nav-bar"><text class="nav-title">排行榜</text></view>

    <view class="rank-tabs">
      <view v-for="t in RANK_TYPES" :key="t.key"
        :class="['rank-tab', activeType === t.key ? 'active' : '']"
        @click="switchType(t.key)">
        <text class="rt-icon">{{ t.icon }}</text>
        <text class="rt-label">{{ t.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="list-body" @scrolltolower="loadMore">
      <view v-if="loading && list.length === 0" class="skeleton-wrap">
        <view class="sk-row" v-for="n in 8" :key="n">
          <view class="sk-no" /><view class="sk-cover" />
          <view class="sk-info"><view class="sk-line" /><view class="sk-line short" /></view>
        </view>
      </view>

      <view v-else>
        <!-- 前3名特殊展示 -->
        <view class="top3" v-if="list.length >= 3">
          <view class="top3-bg" />
          <view class="top3-row">
            <view class="top3-item rank2" @click="goDetail(list[1])">
              <text class="t3-medal">🥈</text>
              <image class="t3-cover" :src="list[1].cover" mode="aspectFill" />
              <text class="t3-title">{{ list[1].title }}</text>
              <text class="t3-score">{{ list[1].rating.toFixed(1) }}</text>
            </view>
            <view class="top3-item rank1" @click="goDetail(list[0])">
              <text class="t3-medal">👑</text>
              <image class="t3-cover big" :src="list[0].cover" mode="aspectFill" />
              <text class="t3-title">{{ list[0].title }}</text>
              <text class="t3-score gold">{{ list[0].rating.toFixed(1) }}</text>
            </view>
            <view class="top3-item rank3" @click="goDetail(list[2])">
              <text class="t3-medal">🥉</text>
              <image class="t3-cover" :src="list[2].cover" mode="aspectFill" />
              <text class="t3-title">{{ list[2].title }}</text>
              <text class="t3-score">{{ list[2].rating.toFixed(1) }}</text>
            </view>
          </view>
        </view>

        <!-- 4名以后 -->
        <view class="rank-rows">
          <view class="rank-row" v-for="(item, i) in list.slice(3)" :key="item.id" @click="goDetail(item)">
            <text class="rank-no">{{ i + 4 }}</text>
            <image class="rank-cover" :src="item.cover" mode="aspectFill" lazy-load />
            <view class="rank-info">
              <text class="rank-title">{{ item.title }}</text>
              <text class="rank-en" v-if="item.titleEn !== item.title">{{ item.titleEn }}</text>
              <view class="rank-tags">
                <text class="rank-tag" v-for="g in item.genres.slice(0,2)" :key="g">{{ g }}</text>
                <text class="rank-tag seasons" v-if="item.seasons > 0">{{ item.seasons }}季</text>
              </view>
            </view>
            <view class="rank-right">
              <text class="rank-score">{{ item.rating > 0 ? item.rating.toFixed(1) : '-' }}</text>
              <view class="rank-add-btn" @click.stop="quickAdd(item)">
                <text>{{ watchMap[item.id] ? '✓' : '+' }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="load-more" v-if="hasMore" @click="loadMore">
          <text>{{ loadingMore ? '加载中…' : '加载更多' }}</text>
        </view>
      </view>

      <view class="bottom-gap" />
    </scroll-view>
  </view>
</template>

<script>
import { getTVPopular, getTVTopRated, getTVAiringToday, getTVOnAir } from '../../utils/api.js'
import { RANK_TYPES } from '../../utils/config.js'
import { getWatchList, setWatchStatus } from '../../store/user.js'

export default {
  name: 'RankingPage',
  data() {
    return {
      statusBarH:  44,
      loading:     true,
      loadingMore: false,
      list:        [],
      watchMap:    {},
      activeType:  'on_the_air',
      currentPage: 1,
      hasMore:     false,
      RANK_TYPES,
    }
  },
  onLoad(options) {
    const info = uni.getSystemInfoSync()
    this.statusBarH = info.statusBarHeight || 44
    if (options.type) this.activeType = options.type
    this.loadRanking()
  },
  onShow() { this.refreshWatchMap() },
  onShareAppMessage() {
    return { title: '美剧排行榜 - 美剧Party', path: '/pages/ranking/index' }
  },
  onShareTimeline() {
    return { title: '美剧排行榜 - 美剧Party' }
  },
  methods: {
    async loadRanking() {
      this.loading = true; this.list = []; this.currentPage = 1; this.hasMore = false
      try {
        const res = await this.fetchByType(1)
        this.list    = res.results.filter(i => i.cover)
        this.hasMore = res.totalPages > 1
      } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
      finally { this.loading = false }
      this.refreshWatchMap()
    },
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true; this.currentPage++
      try {
        const res = await this.fetchByType(this.currentPage)
        this.list    = [...this.list, ...res.results.filter(i => i.cover)]
        this.hasMore = this.currentPage < res.totalPages
      } catch (e) {}
      finally { this.loadingMore = false }
    },
    fetchByType(page) {
      if (this.activeType === 'popular')      return getTVPopular(page)
      if (this.activeType === 'top_rated')    return getTVTopRated(page)
      if (this.activeType === 'airing_today') return getTVAiringToday(page)
      return getTVOnAir(page)
    },
    switchType(key) { if (this.activeType !== key) { this.activeType = key; this.loadRanking() } },
    refreshWatchMap() {
      const map = {}; getWatchList().forEach(i => { map[i.id] = i.status }); this.watchMap = map
    },
    quickAdd(show) {
      setWatchStatus(show, 'watching')
      this.watchMap = { ...this.watchMap, [show.id]: 'watching' }
      uni.showToast({ title: '已加入追剧 ✓', icon: 'none' })
    },
    goDetail(item) {
      getApp().globalData = getApp().globalData || {}
      getApp().globalData.show = item
      uni.navigateTo({ url: '/pages/detail/index' })
    },
  },
}
</script>

<style scoped>
page { background: #0a0a0f; }
.page { background: #0a0a0f; min-height: 100vh; display: flex; flex-direction: column; }
.nav-bar { padding: 12rpx 32rpx 16rpx; }
.nav-title { font-size: 44rpx; font-weight: 900; color: #fff; }

.rank-tabs { display: flex; padding: 0 16rpx 20rpx; gap: 10rpx; }
.rank-tab  { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; background: #1a1a28; border-radius: 14rpx; padding: 14rpx 0; }
.rank-tab.active { background: rgba(232,184,75,0.18); }
.rt-icon  { font-size: 28rpx; }
.rt-label { font-size: 20rpx; color: rgba(255,255,255,0.4); }
.rank-tab.active .rt-label { color: #e8b84b; font-weight: 700; }

.list-body { flex: 1; }
.skeleton-wrap { padding: 0 32rpx; display: flex; flex-direction: column; gap: 20rpx; margin-top: 16rpx; }
.sk-row   { display: flex; gap: 16rpx; align-items: center; }
.sk-no    { width: 44rpx; height: 44rpx; background: #1a1a28; border-radius: 8rpx; animation: pulse 1.5s infinite; }
.sk-cover { width: 88rpx; height: 117rpx; background: linear-gradient(90deg, #1a1a28 25%, #2a2a3a 50%, #1a1a28 75%); background-size: 200% 100%; border-radius: 10rpx; animation: shimmer 2s infinite linear; }
.sk-info  { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.sk-line  { height: 22rpx; background: #1a1a28; border-radius: 6rpx; animation: pulse 1.5s infinite; }
.sk-line.short { width: 50%; }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }

/* 前三名 */
.top3     { padding: 24rpx 32rpx 36rpx; background: linear-gradient(to bottom, rgba(232,184,75,0.06), transparent); position: relative; }
.top3-row { display: flex; align-items: flex-end; justify-content: center; gap: 16rpx; }
.top3-item { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.top3-item:active { transform: translateY(4rpx); transition: transform 0.2s; }
.t3-medal { font-size: 40rpx; margin-bottom: 2rpx; z-index: 2; }
.t3-cover { border-radius: 16rpx; object-fit: cover; width: 130rpx; height: 174rpx; border: 1rpx solid rgba(255,255,255,0.05); }
.t3-cover.big { width: 160rpx; height: 213rpx; border: 2rpx solid #e8b84b; box-shadow: 0 0 30rpx rgba(232,184,75,0.4); }
.t3-title { font-size: 22rpx; color: rgba(255,255,255,0.9); text-align: center; max-width: 130rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rank1 .t3-title { max-width: 160rpx; }
.t3-score { font-size: 24rpx; color: rgba(255,255,255,0.6); font-weight: 800; }
.t3-score.gold { color: #e8b84b; font-size: 30rpx; text-shadow: 0 0 10rpx rgba(232,184,75,0.3); }
.rank1 { order: 2; z-index: 10; transform: scale(1.05); } .rank2 { order: 1; } .rank3 { order: 3; }

/* 排行列表 */
.rank-rows { padding: 0 32rpx; }
.rank-row  { display: flex; gap: 18rpx; padding: 20rpx 0; border-bottom: 1rpx solid rgba(255,255,255,0.04); align-items: center; }
.rank-row:last-child { border-bottom: none; }
.rank-no   { font-size: 30rpx; font-weight: 700; color: rgba(255,255,255,0.25); min-width: 44rpx; text-align: center; flex-shrink: 0; }
.rank-cover { width: 80rpx; height: 107rpx; border-radius: 8rpx; flex-shrink: 0; }
.rank-info  { flex: 1; overflow: hidden; }
.rank-title { display: block; font-size: 26rpx; color: #fff; font-weight: 600; margin-bottom: 4rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-en    { display: block; font-size: 19rpx; color: rgba(255,255,255,0.3); margin-bottom: 8rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-tags  { display: flex; gap: 8rpx; flex-wrap: wrap; }
.rank-tag   { font-size: 18rpx; color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); padding: 2rpx 10rpx; border-radius: 4rpx; }
.rank-tag.seasons { color: rgba(232,184,75,0.7); background: rgba(232,184,75,0.08); }
.rank-right { display: flex; flex-direction: column; align-items: center; gap: 10rpx; flex-shrink: 0; }
.rank-score { font-size: 30rpx; color: #e8b84b; font-weight: 700; }
.rank-add-btn { width: 48rpx; height: 48rpx; border-radius: 50%; background: rgba(232,184,75,0.2); display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #e8b84b; font-weight: 700; }

.load-more { text-align: center; padding: 32rpx; font-size: 26rpx; color: rgba(255,255,255,0.3); }
.bottom-gap { height: 40rpx; }
</style>
