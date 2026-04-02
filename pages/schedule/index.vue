<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarH + 'px' }" />
    <view class="nav-bar">
      <text class="nav-title">播出表</text>
      <text class="nav-sub">{{ currentWeek }}</text>
    </view>

    <!-- 标签切换 -->
    <view class="tabs">
      <view v-for="t in tabs" :key="t.key"
        :class="['tab', activeTab === t.key ? 'active' : '']"
        @click="switchTab(t.key)">
        <text>{{ t.label }}</text>
      </view>
    </view>

    <!-- 今日特殊横幅 -->
    <view class="today-tip" v-if="activeTab === 'today'">
      <text>📺 今日共有 {{ list.length }} 部剧集更新</text>
    </view>

    <scroll-view scroll-y class="list-body" @scrolltolower="loadMore">

      <!-- 骨架屏 -->
      <view v-if="loading" class="skeleton-wrap">
        <view class="sk-row" v-for="n in 5" :key="n">
          <view class="sk-cover" /><view class="sk-info"><view class="sk-line" /><view class="sk-line short" /></view>
        </view>
      </view>

      <!-- 空 -->
      <view class="empty" v-else-if="list.length === 0">
        <text class="empty-icon">📺</text>
        <text class="empty-text">暂无播出数据</text>
        <button class="retry-btn" @click="loadData">重新加载</button>
      </view>

      <!-- 列表 -->
      <view v-else>
        <view class="show-row" v-for="item in list" :key="item.id" @click="goDetail(item)">
          <view class="show-cover-wrap">
            <image class="show-cover" :src="item.cover" mode="aspectFill" lazy-load />
            <view class="cover-score" v-if="item.rating > 0">
              <text>{{ item.rating.toFixed(1) }}</text>
            </view>
          </view>
          <view class="show-info">
            <text class="show-title">{{ item.title }}</text>
            <text class="show-en" v-if="item.titleEn && item.titleEn !== item.title">{{ item.titleEn }}</text>
            <view class="show-meta">
              <text class="show-date">{{ item.firstAirDate ? item.firstAirDate.substring(0,10) : '' }}</text>
              <text class="show-sep" v-if="item.firstAirDate && item.seasons > 0"> · </text>
              <text class="show-seasons" v-if="item.seasons > 0">{{ item.seasons }}季</text>
            </view>
            <view class="show-tags">
              <text class="show-tag" v-for="g in item.genres.slice(0,3)" :key="g">{{ g }}</text>
            </view>
          </view>
          <view class="show-watch-wrap">
            <view :class="['watch-btn', watchMap[item.id] ? 'tracked' : '']" @click.stop="toggleWatch(item)">
              <text>{{ watchMap[item.id] ? statusShort[watchMap[item.id]] : '+ 追' }}</text>
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
import { getTVAiringToday, getTVOnAir, getTVPopular } from '../../utils/api.js'
import { getWatchList, setWatchStatus, removeFromWatchList } from '../../store/user.js'

function getWeekStr() {
  const days  = ['周日','周一','周二','周三','周四','周五','周六']
  const today = new Date()
  return `${today.getMonth()+1}月${today.getDate()}日 ${days[today.getDay()]}`
}

export default {
  name: 'SchedulePage',
  data() {
    return {
      statusBarH:  44,
      loading:     true,
      loadingMore: false,
      activeTab:   'today',
      currentPage: 1,
      hasMore:     false,
      list:        [],
      watchMap:    {},
      currentWeek: getWeekStr(),
      tabs: [
        { key: 'today',   label: '今日更新' },
        { key: 'on_air',  label: '播出中'   },
        { key: 'popular', label: '热门新剧'  },
      ],
      statusShort: { watching: '追剧中', want: '想看', done: '看完', dropped: '弃剧' },
    }
  },
  onLoad() {
    const info = uni.getSystemInfoSync()
    this.statusBarH = info.statusBarHeight || 44
    this.loadData()
  },
  onShow() { this.refreshWatchMap() },
  onShareAppMessage() {
    return { title: '美剧播出表 - 美剧Party', path: '/pages/schedule/index' }
  },
  onShareTimeline() {
    return { title: '美剧播出表 - 美剧Party' }
  },
  methods: {
    async loadData() {
      this.loading     = true
      this.list        = []
      this.currentPage = 1
      this.hasMore     = false
      try {
        let res
        if      (this.activeTab === 'today')   res = await getTVAiringToday(1)
        else if (this.activeTab === 'on_air')  res = await getTVOnAir(1)
        else                                   res = await getTVPopular(1)
        this.list    = res.results.filter(i => i.cover)
        this.hasMore = res.totalPages > 1
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
      this.refreshWatchMap()
    },

    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true
      this.currentPage++
      try {
        let res
        if      (this.activeTab === 'today')   res = await getTVAiringToday(this.currentPage)
        else if (this.activeTab === 'on_air')  res = await getTVOnAir(this.currentPage)
        else                                   res = await getTVPopular(this.currentPage)
        this.list    = [...this.list, ...res.results.filter(i => i.cover)]
        this.hasMore = this.currentPage < res.totalPages
      } catch (e) {}
      finally { this.loadingMore = false }
    },

    switchTab(key) {
      if (this.activeTab === key) return
      this.activeTab = key
      this.loadData()
    },

    refreshWatchMap() {
      const map = {}
      getWatchList().forEach(i => { map[i.id] = i.status })
      this.watchMap = map
    },

    toggleWatch(show) {
      if (this.watchMap[show.id]) {
        uni.showActionSheet({
          itemList: ['追剧中', '想看', '看完', '弃剧', '移除'],
          success: (res) => {
            const acts = ['watching', 'want', 'done', 'dropped', 'remove']
            const act  = acts[res.tapIndex]
            if (act === 'remove') removeFromWatchList(show.id)
            else setWatchStatus(show, act)
            this.refreshWatchMap()
          },
        })
      } else {
        setWatchStatus(show, 'watching')
        this.refreshWatchMap()
        uni.showToast({ title: '已加入追剧 ✓', icon: 'none' })
      }
    },

    goDetail(item) {
      getApp().globalData      = getApp().globalData || {}
      getApp().globalData.show = item
      uni.navigateTo({ url: '/pages/detail/index' })
    },
  },
}
</script>

<style scoped>
page { background: #0a0a0f; }
.page { background: #0a0a0f; min-height: 100vh; display: flex; flex-direction: column; }
.nav-bar { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 32rpx 16rpx; }
.nav-title { font-size: 44rpx; font-weight: 900; color: #fff; }
.nav-sub   { font-size: 22rpx; color: #e8b84b; background: rgba(232,184,75,0.12); padding: 6rpx 20rpx; border-radius: 20rpx; }

.tabs    { display: flex; padding: 0 24rpx 20rpx; gap: 10rpx; }
.tab     { flex: 1; text-align: center; padding: 14rpx 0; background: #1a1a28; border-radius: 12rpx; font-size: 24rpx; color: rgba(255,255,255,0.4); transition: all .2s; }
.tab.active { background: rgba(232,184,75,0.18); color: #e8b84b; font-weight: 700; }

.today-tip { margin: 0 32rpx 20rpx; background: rgba(232,184,75,0.08); border-left: 5rpx solid #e8b84b; padding: 14rpx 20rpx; border-radius: 6rpx; }
.today-tip text { font-size: 24rpx; color: #e8b84b; }

.list-body { flex: 1; }

.skeleton-wrap { padding: 0 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-row  { display: flex; gap: 20rpx; align-items: center; }
.sk-cover { width: 110rpx; height: 147rpx; background: linear-gradient(90deg, #1a1a28 25%, #2a2a3a 50%, #1a1a28 75%); background-size: 200% 100%; border-radius: 12rpx; flex-shrink: 0; animation: shimmer 2s infinite linear; }
.sk-info  { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.sk-line  { height: 22rpx; background: #1a1a28; border-radius: 6rpx; animation: pulse 1.5s infinite; }
.sk-line.short { width: 55%; }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.8} }

.empty      { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; gap: 16rpx; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: rgba(255,255,255,0.3); }
.retry-btn  { background: rgba(232,184,75,0.2); color: #e8b84b; border: 1rpx solid rgba(232,184,75,0.4); border-radius: 40rpx; padding: 12rpx 40rpx; font-size: 26rpx; margin-top: 8rpx; }

.show-row { display: flex; gap: 20rpx; padding: 20rpx 32rpx; border-bottom: 1rpx solid rgba(255,255,255,0.04); align-items: center; transition: background 0.2s; }
.show-row:active { background: rgba(255,255,255,0.04); }
.show-cover-wrap { position: relative; width: 110rpx; height: 147rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; box-shadow: 0 6rpx 16rpx rgba(0,0,0,0.4); transition: transform 0.2s; }
.show-cover  { width: 100%; height: 100%; }
.cover-score { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(10,10,15,0.9), transparent); padding: 8rpx 8rpx 6rpx; text-align: center; }
.cover-score text { font-size: 18rpx; color: #e8b84b; font-weight: 700; }
.show-info   { flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
.show-title  { display: block; font-size: 28rpx; color: #fff; font-weight: 700; margin-bottom: 6rpx; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.show-en     { display: block; font-size: 20rpx; color: rgba(255,255,255,0.35); margin-bottom: 10rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.show-meta   { display: flex; align-items: center; margin-bottom: 10rpx; }
.show-date   { font-size: 20rpx; color: rgba(255,255,255,0.4); }
.show-sep    { font-size: 20rpx; color: rgba(255,255,255,0.2); }
.show-seasons { font-size: 20rpx; color: rgba(255,255,255,0.4); }
.show-tags   { display: flex; gap: 8rpx; flex-wrap: wrap; }
.show-tag    { font-size: 18rpx; color: #e8b84b; background: rgba(232,184,75,0.1); padding: 3rpx 10rpx; border-radius: 6rpx; }
.show-watch-wrap { flex-shrink: 0; display: flex; align-items: center; }
.watch-btn { background: rgba(232,184,75,0.18); border: 1rpx solid rgba(232,184,75,0.4); border-radius: 20rpx; padding: 10rpx 20rpx; }
.watch-btn text { font-size: 22rpx; color: #e8b84b; font-weight: 700; }
.watch-btn.tracked { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
.watch-btn.tracked text { color: rgba(255,255,255,0.4); font-weight: 500; }

.load-more { text-align: center; padding: 32rpx; color: rgba(255,255,255,0.3); font-size: 26rpx; }
.bottom-gap { height: 40rpx; }
</style>
