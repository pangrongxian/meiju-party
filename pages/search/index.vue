<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarH + 'px' }" />

    <view class="search-bar">
      <view class="input-wrap">
        <text class="s-icon">🔍</text>
        <input class="s-input" v-model="keyword" placeholder="搜索美剧、英剧名称…"
          placeholder-class="s-ph" confirm-type="search"
          @confirm="doSearch" @input="onInput" focus />
        <text class="s-clear" v-if="keyword" @click="clear">✕</text>
      </view>
      <text class="s-cancel" @click="goBack">取消</text>
    </view>

    <!-- 默认态 -->
    <view v-if="!keyword && !searched">
      <view class="sec">
        <view class="sec-hd"><text class="sec-title">热门搜索</text></view>
        <view class="hot-tags">
          <view class="hot-tag" v-for="kw in HOT_SEARCH" :key="kw" @click="selectKw(kw)">
            <text>{{ kw }}</text>
          </view>
        </view>
      </view>
      <view class="sec" v-if="history.length > 0">
        <view class="sec-hd">
          <text class="sec-title">搜索历史</text>
          <text class="sec-clear" @click="clearHistory">清除</text>
        </view>
        <view class="history-list">
          <view class="history-item" v-for="h in history" :key="h" @click="selectKw(h)">
            <text class="h-icon">🕐</text><text class="h-text">{{ h }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 结果 -->
    <scroll-view v-if="searched" scroll-y class="result-body" @scrolltolower="loadMore">
      <view v-if="loading" class="loading-wrap">
        <view class="spinner" /><text class="loading-text">搜索中…</text>
      </view>
      <view v-else-if="results.length === 0" class="empty">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">没有找到「{{ keyword }}」</text>
        <text class="empty-sub">试试英文名称</text>
      </view>
      <view v-else>
        <text class="result-count">约 {{ total }} 个结果</text>
        <view class="result-list">
          <view class="result-item" v-for="item in results" :key="item.id" @click="goDetail(item)">
            <image class="r-cover" :src="item.cover" mode="aspectFill" lazy-load />
            <view class="r-info">
              <text class="r-title">{{ item.title }}</text>
              <text class="r-en" v-if="item.titleEn && item.titleEn !== item.title">{{ item.titleEn }}</text>
              <view class="r-meta">
                <text class="r-score" v-if="item.rating > 0">★ {{ item.rating.toFixed(1) }}</text>
                <text class="r-date" v-if="item.firstAirDate">{{ item.firstAirDate.substring(0,4) }}</text>
                <text class="r-type" v-if="item.mediaType === 'movie'">电影</text>
              </view>
              <view class="r-tags">
                <text class="r-tag" v-for="g in item.genres.slice(0,3)" :key="g">{{ g }}</text>
              </view>
            </view>
            <view :class="['r-add', watchMap[item.id] ? 'tracked' : '']" @click.stop="quickAdd(item)">
              <text>{{ watchMap[item.id] ? '✓' : '+' }}</text>
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
import { searchMulti } from '../../utils/api.js'
import { HOT_SEARCH } from '../../utils/config.js'
import { getWatchList, setWatchStatus } from '../../store/user.js'

export default {
  name: 'SearchPage',
  data() {
    return {
      statusBarH:  44,
      keyword:     '',
      searched:    false,
      loading:     false,
      loadingMore: false,
      results:     [],
      total:       0,
      currentPage: 1,
      hasMore:     false,
      watchMap:    {},
      history:     [],
      timer:       null,
      HOT_SEARCH,
    }
  },
  onLoad() {
    const info = uni.getSystemInfoSync()
    this.statusBarH = info.statusBarHeight || 44
    this.loadHistory()
    this.refreshWatchMap()
  },
  onShareAppMessage() {
    return { title: '找美剧 - 美剧Party', path: '/pages/search/index' }
  },
  onShareTimeline() {
    return { title: '找美剧 - 美剧Party' }
  },
  methods: {
    onInput() {
      if (this.timer) clearTimeout(this.timer)
      if (!this.keyword) { this.searched = false; return }
      this.timer = setTimeout(() => this.doSearch(), 600)
    },
    async doSearch() {
      if (!this.keyword.trim()) return
      this.searched = true; this.loading = true; this.results = []; this.currentPage = 1; this.hasMore = false
      this.saveHistory(this.keyword)
      try {
        const res = await searchMulti(this.keyword, 1)
        this.results = res.results.filter(i => i.cover)
        this.total   = res.total
        this.hasMore = this.results.length < res.total
      } catch (e) { uni.showToast({ title: '搜索失败', icon: 'none' }) }
      finally { this.loading = false }
    },
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true; this.currentPage++
      try {
        const res = await searchMulti(this.keyword, this.currentPage)
        this.results = [...this.results, ...res.results.filter(i => i.cover)]
        this.hasMore = this.results.length < res.total
      } catch (e) {}
      finally { this.loadingMore = false }
    },
    selectKw(kw) { this.keyword = kw; this.doSearch() },
    clear()       { this.keyword = ''; this.searched = false; this.results = [] },
    loadHistory() {
      try { this.history = JSON.parse(uni.getStorageSync('mj_search_hist') || '[]') } catch (e) { this.history = [] }
    },
    saveHistory(kw) {
      this.history = [kw, ...this.history.filter(h => h !== kw)].slice(0, 10)
      try { uni.setStorageSync('mj_search_hist', JSON.stringify(this.history)) } catch (e) {}
    },
    clearHistory() { this.history = []; try { uni.setStorageSync('mj_search_hist', '[]') } catch (e) {} },
    refreshWatchMap() {
      const map = {}; getWatchList().forEach(i => { map[i.id] = i.status }); this.watchMap = map
    },
    quickAdd(item) {
      setWatchStatus(item, 'watching')
      this.watchMap = { ...this.watchMap, [item.id]: 'watching' }
      uni.showToast({ title: '已加入追剧 ✓', icon: 'none' })
    },
    goDetail(item) {
      getApp().globalData = getApp().globalData || {}
      getApp().globalData.show = item
      uni.navigateTo({ url: '/pages/detail/index' })
    },
    goBack() { uni.navigateBack() },
  },
}
</script>

<style scoped>
page { background: #0a0a0f; }
.page { background: #0a0a0f; min-height: 100vh; }

.search-bar { display: flex; gap: 14rpx; align-items: center; padding: 10rpx 28rpx 20rpx; }
.input-wrap { flex: 1; display: flex; align-items: center; gap: 12rpx; background: #1a1a28; border-radius: 20rpx; padding: 14rpx 18rpx; border: 1.5rpx solid transparent; transition: border-color 0.2s; }
.input-wrap:focus-within { border-color: rgba(232,184,75,0.4); }
.s-icon { font-size: 28rpx; flex-shrink: 0; }
.s-input { flex: 1; font-size: 28rpx; color: #fff; }
.s-ph { color: rgba(255,255,255,0.2); }
.s-clear { font-size: 24rpx; color: rgba(255,255,255,0.3); flex-shrink: 0; }
.s-cancel { font-size: 28rpx; color: #e8b84b; flex-shrink: 0; }

.sec { padding: 16rpx 32rpx 28rpx; }
.sec-hd { display: flex; justify-content: space-between; margin-bottom: 18rpx; }
.sec-title { font-size: 28rpx; font-weight: 700; color: rgba(255,255,255,0.7); }
.sec-clear { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.hot-tags { display: flex; flex-wrap: wrap; gap: 14rpx; }
.hot-tag  { background: #1a1a28; border-radius: 40rpx; padding: 12rpx 24rpx; border: 1rpx solid rgba(255,255,255,0.06); transition: all 0.2s; }
.hot-tag:active { background: rgba(232,184,75,0.15); border-color: rgba(232,184,75,0.4); transform: scale(0.97); }
.hot-tag text { font-size: 24rpx; color: rgba(255,255,255,0.7); }
.history-list { display: flex; flex-direction: column; }
.history-item { display: flex; align-items: center; gap: 14rpx; padding: 14rpx 0; border-bottom: 1rpx solid rgba(255,255,255,0.04); }
.h-icon { font-size: 24rpx; }
.h-text { font-size: 26rpx; color: rgba(255,255,255,0.6); }

.result-body { height: calc(100vh - 160rpx); }
.loading-wrap { display: flex; flex-direction: column; align-items: center; padding: 80rpx; gap: 20rpx; }
.spinner { width: 60rpx; height: 60rpx; border-radius: 50%; border: 4rpx solid rgba(232,184,75,0.25); border-top-color: #e8b84b; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: rgba(255,255,255,0.4); }
.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; gap: 14rpx; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: rgba(255,255,255,0.35); }
.empty-sub  { font-size: 22rpx; color: rgba(255,255,255,0.2); }
.result-count { display: block; font-size: 22rpx; color: rgba(255,255,255,0.2); padding: 14rpx 32rpx; }
.result-list { display: flex; flex-direction: column; }
.result-item { display: flex; gap: 20rpx; padding: 20rpx 32rpx; border-bottom: 1rpx solid rgba(255,255,255,0.04); align-items: flex-start; transition: background 0.2s; }
.result-item:active { background: rgba(255,255,255,0.04); }
.r-cover { width: 88rpx; height: 117rpx; border-radius: 10rpx; flex-shrink: 0; background: #1a1a28; }
.r-info  { flex: 1; overflow: hidden; }
.r-title { display: block; font-size: 28rpx; color: #fff; font-weight: 600; margin-bottom: 4rpx; }
.r-en    { display: block; font-size: 20rpx; color: rgba(255,255,255,0.3); margin-bottom: 10rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.r-meta  { display: flex; gap: 14rpx; margin-bottom: 10rpx; align-items: center; }
.r-score { font-size: 20rpx; color: #e8b84b; font-weight: 600; }
.r-date  { font-size: 20rpx; color: rgba(255,255,255,0.3); }
.r-type  { font-size: 18rpx; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.08); padding: 2rpx 8rpx; border-radius: 4rpx; }
.r-tags  { display: flex; gap: 8rpx; flex-wrap: wrap; }
.r-tag   { font-size: 18rpx; color: rgba(232,184,75,0.75); background: rgba(232,184,75,0.1); padding: 2rpx 10rpx; border-radius: 6rpx; }
.r-add   { width: 52rpx; height: 52rpx; border-radius: 50%; background: rgba(232,184,75,0.2); display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #e8b84b; font-weight: 700; flex-shrink: 0; margin-top: 8rpx; }
.r-add.tracked { background: rgba(105,240,174,0.15); color: #69f0ae; }
.load-more { text-align: center; padding: 32rpx; color: rgba(255,255,255,0.3); font-size: 26rpx; }
.bottom-gap { height: 40rpx; }
</style>
