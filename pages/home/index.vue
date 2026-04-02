<template>
  <view class="page">

    <!-- 顶部导航 -->
    <view class="nav-bar" :class="{ scrolled: isScrolled }" :style="{ paddingTop: statusBarH + 'px' }">
      <view class="nav-logo">
        <text class="logo-text">美剧</text>
        <text class="logo-accent">Party</text>
        <view class="logo-dot" />
      </view>
    </view>

    <!-- 加载中/错误/缺API Key 提示 -->
    <view class="status-overlay" v-if="loading || (isApiKeyMissing && todayList.length === 0)">
      <view class="status-content">
        <text class="status-icon" v-if="loading">⏳</text>
        <text class="status-icon" v-else-if="isApiKeyMissing">⚠️</text>
        <text class="status-icon" v-else>📡</text>
        
        <text class="status-text" v-if="loading">正在加载大片...</text>
        <view v-else-if="isApiKeyMissing" class="error-box">
          <text class="status-text title">未配置 TMDB API Key</text>
          <text class="status-desc">请在 utils/config.js 中填写你的 API Key</text>
          <text class="status-link" @click="copyApiUrl">去申请 API Key ›</text>
        </view>
        <text class="status-text" v-else>数据加载失败，请检查网络</text>
        
        <button class="retry-btn" v-if="!loading" @click="loadData">重试一下</button>
      </view>
    </view>

    <scroll-view v-else scroll-y class="body" @scroll="onScroll" @scrolltolower="loadMoreSeason">

      <!-- Banner：趋势剧集 -->
      <view class="banner-wrap">
        <swiper class="banner" circular autoplay :interval="5000" @change="e => bannerIdx = e.detail.current">
          <swiper-item v-for="item in bannerList" :key="item.id" @click="goDetail(item)">
            <view class="banner-item">
              <image class="banner-bg" :src="item.backdrop || item.cover" mode="aspectFill" />
              <view class="banner-gradient" />
              <view class="banner-content">
                <view class="banner-network-wrap">
                  <text class="banner-network" v-for="n in (item.networks||[]).slice(0,2)" :key="n">{{ n }}</text>
                </view>
                <text class="banner-title">{{ item.title }}</text>
                <text class="banner-en" v-if="item.titleEn && item.titleEn !== item.title">{{ item.titleEn }}</text>
                <view class="banner-meta">
                  <view class="banner-score" v-if="item.rating > 0">
                    <text class="score-star">★</text>
                    <text class="score-num">{{ item.rating.toFixed(1) }}</text>
                  </view>
                  <view class="banner-genres">
                    <text class="banner-genre" v-for="g in item.genres.slice(0,2)" :key="g">{{ g }}</text>
                  </view>
                </view>
              </view>
            </view>
          </swiper-item>
        </swiper>
        <!-- 自定义指示器 -->
        <view class="banner-dots">
          <view v-for="(_, i) in bannerList" :key="i" :class="['dot', bannerIdx === i ? 'on' : '']" />
        </view>
      </view>

      <!-- 今日更新 -->
      <view class="section" v-if="todayList.length > 0">
        <view class="sec-hd">
          <view class="sec-title-wrap">
            <view class="sec-bar" />
            <text class="sec-title">今日更新</text>
            <text class="sec-badge">{{ todayCount }}部</text>
          </view>
          <text class="sec-more" @click="goSchedule">播出表 ›</text>
        </view>
        <scroll-view scroll-x class="row-scroll">
          <view class="row-list">
            <view class="show-sm" v-for="item in todayList" :key="item.id" @click="goDetail(item)">
              <view class="show-sm-img-wrap">
                <image class="show-sm-img" :src="item.cover" mode="aspectFill" lazy-load />
                <view class="show-sm-score" v-if="item.rating > 0">
                  <text>{{ item.rating.toFixed(1) }}</text>
                </view>
                <!-- 追剧状态 -->
                <view v-if="watchMap[item.id]" :class="['watch-dot', watchMap[item.id]]" />
              </view>
              <text class="show-sm-title">{{ item.title }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 本周热播 -->
      <view class="section">
        <view class="sec-hd">
          <view class="sec-title-wrap">
            <view class="sec-bar" />
            <text class="sec-title">本周热播</text>
          </view>
          <text class="sec-more" @click="goRanking">完整榜单 ›</text>
        </view>

        <!-- 骨架屏 -->
        <view class="sk-grid" v-if="loading && trendList.length === 0">
          <view class="sk-card" v-for="n in 6" :key="n">
            <view class="sk-img" /><view class="sk-line" /><view class="sk-line short" />
          </view>
        </view>

        <view class="show-grid" v-else>
          <view class="show-card" v-for="item in trendList" :key="item.id" @click="goDetail(item)">
            <view class="show-card-img-wrap">
              <image class="show-card-img" :src="item.cover" mode="aspectFill" lazy-load />
              <view v-if="watchMap[item.id]" :class="['watch-badge', watchMap[item.id]]">
                <text>{{ statusLabel[watchMap[item.id]] }}</text>
              </view>
              <view class="show-card-score" v-if="item.rating > 0">
                <text>★ {{ item.rating.toFixed(1) }}</text>
              </view>
            </view>
            <text class="show-card-title">{{ item.title }}</text>
            <text class="show-card-sub" v-if="item.genres.length > 0">{{ item.genres.slice(0,2).join(' · ') }}</text>
          </view>
        </view>
      </view>

      <!-- 高分经典 -->
      <view class="section">
        <view class="sec-hd">
          <view class="sec-title-wrap">
            <view class="sec-bar" />
            <text class="sec-title">高分经典</text>
          </view>
          <text class="sec-more" @click="goRankingTopRated">查看更多 ›</text>
        </view>
        <view class="rank-list">
          <view class="rank-item" v-for="(item, i) in topRated" :key="item.id" @click="goDetail(item)">
            <text :class="['rank-no', i < 3 ? 'gold' : '']">{{ i + 1 }}</text>
            <image class="rank-cover" :src="item.cover" mode="aspectFill" lazy-load />
            <view class="rank-info">
              <text class="rank-title">{{ item.title }}</text>
              <text class="rank-en" v-if="item.titleEn !== item.title">{{ item.titleEn }}</text>
              <view class="rank-genres">
                <text class="rank-genre" v-for="g in item.genres.slice(0,3)" :key="g">{{ g }}</text>
              </view>
            </view>
            <view class="rank-score-wrap">
              <text class="rank-score">{{ item.rating.toFixed(1) }}</text>
              <text class="rank-score-sub">评分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 我的追剧（有数据才显示） -->
      <view class="section" v-if="watchingList.length > 0">
        <view class="sec-hd">
          <view class="sec-title-wrap">
            <view class="sec-bar" />
            <text class="sec-title">继续追剧</text>
          </view>
          <text class="sec-more" @click="goProfile">全部 ›</text>
        </view>
        <scroll-view scroll-x class="row-scroll">
          <view class="row-list">
            <view class="watching-card" v-for="item in watchingList" :key="item.id" @click="goDetail(item)">
              <image class="watching-cover" :src="item.cover" mode="aspectFill" />
              <view class="watching-info">
                <text class="watching-title">{{ item.title }}</text>
                <text class="watching-ep">S{{ item.currentSeason }}E{{ item.currentEpisode || 0 }}</text>
              </view>
              <view class="watching-checkin-btn" @click.stop="quickCheckin(item)">
                <text>✓</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 公众号引流卡 -->
      <view class="follow-card" @click="showFollowGuide">
        <view class="follow-left">
          <text class="follow-icon">📢</text>
          <view>
            <text class="follow-title">关注「美剧Party」公众号</text>
            <text class="follow-sub">每周资源整理 · 新剧推荐 · 字幕组速递</text>
          </view>
        </view>
        <text class="follow-arrow">›</text>
      </view>

      <view class="bottom-gap" />
    </scroll-view>

  </view>
</template>

<script>
import { getTrending, getTVAiringToday, getTVTopRated } from '../../utils/api.js'
import { getWatchList, addCheckin } from '../../store/user.js'

export default {
  name: 'HomePage',
  data() {
    return {
      statusBarH:   44,
      isScrolled:   false,
      bannerIdx:    0,
      loading:      true,
      isApiKeyMissing: false,
      bannerList:   [],
      trendList:    [],
      todayList:    [],
      todayCount:   0,
      topRated:     [],
      watchingList: [],
      watchMap:     {},
      statusLabel:  { watching: '追', want: '想', done: '完', dropped: '弃' },
    }
  },
  onLoad() {
    console.log('[Home] onLoad started')
    const info = uni.getSystemInfoSync()
    this.statusBarH = info.statusBarHeight || 44
    
    // 检查 API Key
    const { TMDB_CONFIG } = require('../../utils/config.js')
    if (!TMDB_CONFIG.API_KEY || TMDB_CONFIG.API_KEY.includes('your-tmdb-api-key')) {
      console.warn('[Home] TMDB API Key is missing or default')
      this.isApiKeyMissing = true
      this.loading = false
      return
    }

    this.loadData()
  },
  onShow() { this.refreshWatchMap() },
  onShareAppMessage() {
    return { title: '美剧Party - 记录追剧时光', path: '/pages/home/index' }
  },
  onShareTimeline() {
    return { title: '美剧Party - 记录追剧时光' }
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [trend, today, top] = await Promise.allSettled([
          getTrending('week'),
          getTVAiringToday(),
          getTVTopRated(),
        ])

        if (trend.status === 'fulfilled') {
          const list = trend.value.filter(i => i.cover)
          this.trendList  = list.slice(0, 12)
          this.bannerList = list.filter(i => i.backdrop || i.cover).slice(0, 5)
        }
        if (today.status === 'fulfilled') {
          this.todayList  = today.value.results.slice(0, 10)
          this.todayCount = today.value.results.length
        }
        if (top.status === 'fulfilled') {
          this.topRated = top.value.results.slice(0, 5)
        }
      } catch (e) {
        uni.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        this.loading = false
      }
      this.refreshWatchMap()
    },

    refreshWatchMap() {
      const map = {}
      getWatchList().forEach(i => { map[i.id] = i.status })
      this.watchMap     = map
      this.watchingList = getWatchList('watching').slice(0, 8)
    },

    onScroll(e) { this.isScrolled = e.detail.scrollTop > 60 },

    quickCheckin(item) {
      const ep = (item.currentEpisode || 0) + 1
      addCheckin({
        showId:    item.id,
        showTitle: item.title,
        showCover: item.cover,
        season:    item.currentSeason || 1,
        episode:   ep,
        mood:      '😊',
      })
      uni.showToast({ title: `S${item.currentSeason}E${ep} 打卡 ✓`, icon: 'none' })
      this.refreshWatchMap()
    },

    showFollowGuide() {
      uni.showModal({
        title:       '关注公众号',
        content:     '微信搜索「美剧Party」公众号，回复剧名获取最新资源和字幕组整理',
        confirmText: '好的',
        showCancel:  false,
      })
    },

    loadMoreSeason() {},

    goDetail(item) {
      getApp().globalData       = getApp().globalData || {}
      getApp().globalData.show  = item
      uni.navigateTo({ url: '/pages/detail/index' })
    },
    goSchedule()        { uni.switchTab({ url: '/pages/schedule/index' }) },
    goRanking()         { uni.switchTab({ url: '/pages/ranking/index' }) },
    goRankingTopRated() { uni.switchTab({ url: '/pages/ranking/index?type=top_rated' }) },
    goProfile()         { uni.switchTab({ url: '/pages/profile/index' }) },
    copyApiUrl() {
      uni.setClipboardData({
        data: 'https://www.themoviedb.org/settings/api',
        success: () => uni.showToast({ title: '链接已复制', icon: 'none' })
      })
    }
  },
}
</script>

<style scoped>
page { background: #0a0a0f; }
.page { background: #0a0a0f; min-height: 100vh; }

/* 导航 */
.nav-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 16rpx; padding-left: 32rpx; padding-right: 32rpx;
  transition: background .3s;
}
.nav-bar.scrolled { background: rgba(10,10,15,0.92); backdrop-filter: blur(12px); }
.nav-logo   { display: flex; align-items: center; gap: 4rpx; }
.logo-text  { font-size: 44rpx; font-weight: 900; color: #fff; }
.logo-accent{ font-size: 44rpx; font-weight: 900; color: #e8b84b; }
.logo-dot   { width: 10rpx; height: 10rpx; background: #e8b84b; border-radius: 50%; margin-left: 4rpx; margin-bottom: 24rpx; }
.nav-btn    { width: 64rpx; height: 64rpx; background: rgba(255,255,255,0.08); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }

.body { height: 100vh; }

/* Banner */
.banner-wrap { position: relative; }
.banner      { height: 620rpx; }
.banner-item { position: relative; height: 100%; }
.banner-bg   { width: 100%; height: 100%; }
.banner-gradient {
  position: absolute; inset: 0;
  background: linear-gradient(to top, #0a0a0f 0%, rgba(10,10,15,0.7) 30%, rgba(10,10,15,0.1) 70%, transparent 100%);
}
.banner-content { position: absolute; bottom: 80rpx; left: 0; right: 0; padding: 0 32rpx; }
.banner-network-wrap { display: flex; gap: 10rpx; margin-bottom: 14rpx; flex-wrap: wrap; }
.banner-network {
  font-size: 20rpx; color: #e8b84b; font-weight: 700;
  background: rgba(232,184,75,0.15); border: 1rpx solid rgba(232,184,75,0.4);
  padding: 4rpx 14rpx; border-radius: 6rpx;
}
.banner-title  { display: block; font-size: 48rpx; font-weight: 900; color: #fff; line-height: 1.2; margin-bottom: 8rpx; text-shadow: 0 2rpx 12rpx rgba(0,0,0,0.8); }
.banner-en     { display: block; font-size: 22rpx; color: rgba(255,255,255,0.5); margin-bottom: 16rpx; }
.banner-meta   { display: flex; align-items: center; gap: 16rpx; }
.banner-score  { display: flex; align-items: center; gap: 6rpx; background: rgba(232,184,75,0.15); padding: 6rpx 14rpx; border-radius: 20rpx; }
.score-star    { font-size: 20rpx; color: #e8b84b; }
.score-num     { font-size: 24rpx; color: #e8b84b; font-weight: 800; }
.banner-genres { display: flex; gap: 10rpx; }
.banner-genre  { font-size: 20rpx; color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.08); padding: 4rpx 12rpx; border-radius: 6rpx; }
.banner-dots   { position: absolute; bottom: 28rpx; left: 32rpx; display: flex; gap: 8rpx; }
.dot           { width: 10rpx; height: 6rpx; background: rgba(255,255,255,0.3); border-radius: 3rpx; transition: all .3s; }
.dot.on        { width: 28rpx; background: #e8b84b; }

/* 通用Section */
.section { padding: 36rpx 0 0; }
.sec-hd  { display: flex; justify-content: space-between; align-items: center; padding: 0 32rpx; margin-bottom: 20rpx; }
.sec-title-wrap { display: flex; align-items: center; gap: 12rpx; }
.sec-bar    { width: 6rpx; height: 30rpx; background: #e8b84b; border-radius: 3rpx; }
.sec-title  { font-size: 32rpx; font-weight: 800; color: #fff; }
.sec-badge  { font-size: 20rpx; color: #e8b84b; background: rgba(232,184,75,0.15); padding: 4rpx 14rpx; border-radius: 20rpx; }
.sec-more   { font-size: 24rpx; color: rgba(255,255,255,0.35); }

/* 骨架屏 */
.sk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; padding: 0 32rpx; }
.sk-card { display: flex; flex-direction: column; gap: 8rpx; }
.sk-img  { width: 100%; aspect-ratio: 2/3; background: linear-gradient(90deg, #1a1a28 25%, #2a2a3a 50%, #1a1a28 75%); background-size: 200% 100%; border-radius: 12rpx; animation: shimmer 2s infinite linear; }
.sk-line { height: 20rpx; background: #1a1a28; border-radius: 6rpx; animation: pulse 1.5s infinite; }
.sk-line.short { width: 55%; }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.8} }

/* 横向滚动 */
.row-scroll { padding: 0 32rpx; }
.row-list   { display: flex; gap: 20rpx; }

/* 小卡片 */
.show-sm { flex-shrink: 0; width: 160rpx; }
.show-sm-img-wrap { position: relative; width: 160rpx; height: 213rpx; border-radius: 12rpx; overflow: hidden; margin-bottom: 10rpx; box-shadow: 0 6rpx 18rpx rgba(0,0,0,0.4); }
.show-sm-img   { width: 100%; height: 100%; }
.show-sm-score { position: absolute; top: 8rpx; right: 8rpx; background: rgba(10,10,15,0.8); border-radius: 6rpx; padding: 3rpx 8rpx; }
.show-sm-score text { font-size: 18rpx; color: #e8b84b; font-weight: 700; }
.show-sm-title { font-size: 22rpx; color: rgba(255,255,255,0.85); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.watch-dot { position: absolute; top: 8rpx; left: 8rpx; width: 16rpx; height: 16rpx; border-radius: 50%; }
.watch-dot.watching { background: #e8b84b; }
.watch-dot.want     { background: #40c4ff; }
.watch-dot.done     { background: #69f0ae; }
.watch-dot.dropped  { background: #78909c; }

/* 主网格 */
.show-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; padding: 0 32rpx; }
.show-card { }
.show-card-img-wrap { position: relative; width: 100%; aspect-ratio: 2/3; border-radius: 12rpx; overflow: hidden; margin-bottom: 10rpx; box-shadow: 0 6rpx 18rpx rgba(0,0,0,0.4); }
.show-card-img   { width: 100%; height: 100%; transition: transform 0.3s; }
.show-card:active .show-card-img { transform: scale(0.96); opacity: 0.8; }
.show-card:active { transform: translateY(2rpx); transition: all 0.1s; }
.show-card-score { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(10,10,15,0.95), transparent); padding: 16rpx 10rpx 8rpx; }
.show-card-score text { font-size: 18rpx; color: #e8b84b; font-weight: 700; }
.watch-badge {
  position: absolute; top: 8rpx; left: 8rpx; border-radius: 50%;
  width: 38rpx; height: 38rpx; display: flex; align-items: center; justify-content: center;
}
.watch-badge text { font-size: 18rpx; color: #fff; font-weight: 900; }
.watch-badge.watching { background: #e8b84b; }
.watch-badge.want     { background: #40c4ff; }
.watch-badge.done     { background: #69f0ae; }
.watch-badge.dropped  { background: #78909c; }
.show-card-title { font-size: 22rpx; color: rgba(255,255,255,0.9); display: block; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }
.show-card-sub   { font-size: 19rpx; color: rgba(255,255,255,0.4); margin-top: 4rpx; display: block; }

/* 排行 */
.rank-list { padding: 0 32rpx; }
.rank-item { display: flex; gap: 20rpx; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid rgba(255,255,255,0.05); }
.rank-item:last-child { border-bottom: none; }
.rank-no   { font-size: 38rpx; font-weight: 900; color: rgba(255,255,255,0.2); min-width: 52rpx; text-align: center; font-style: italic; }
.rank-no.gold { color: #e8b84b; }
.rank-cover { width: 88rpx; height: 117rpx; border-radius: 10rpx; flex-shrink: 0; }
.rank-info  { flex: 1; overflow: hidden; }
.rank-title { display: block; font-size: 28rpx; color: #fff; font-weight: 700; margin-bottom: 6rpx; }
.rank-en    { display: block; font-size: 20rpx; color: rgba(255,255,255,0.35); margin-bottom: 10rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-genres { display: flex; gap: 8rpx; flex-wrap: wrap; }
.rank-genre  { font-size: 18rpx; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.06); padding: 2rpx 10rpx; border-radius: 4rpx; }
.rank-score-wrap { text-align: center; flex-shrink: 0; }
.rank-score     { display: block; font-size: 34rpx; font-weight: 800; color: #e8b84b; }
.rank-score-sub { display: block; font-size: 18rpx; color: rgba(255,255,255,0.3); margin-top: 4rpx; }

/* 在追 */
.watching-card { flex-shrink: 0; width: 280rpx; display: flex; align-items: center; gap: 16rpx; background: #1a1a28; border-radius: 16rpx; padding: 16rpx; }
.watching-cover { width: 72rpx; height: 96rpx; border-radius: 8rpx; flex-shrink: 0; }
.watching-info  { flex: 1; overflow: hidden; }
.watching-title { display: block; font-size: 24rpx; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.watching-ep    { display: block; font-size: 20rpx; color: #e8b84b; margin-top: 6rpx; }
.watching-checkin-btn { width: 52rpx; height: 52rpx; border-radius: 50%; background: #e8b84b; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.watching-checkin-btn text { font-size: 26rpx; color: #0a0a0f; font-weight: 900; }

/* 公众号引流 */
.follow-card { display: flex; align-items: center; margin: 32rpx 32rpx 0; background: linear-gradient(135deg, rgba(232,184,75,0.12), rgba(232,184,75,0.04)); border: 1rpx solid rgba(232,184,75,0.25); border-radius: 20rpx; padding: 24rpx; }
.follow-left  { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.follow-icon  { font-size: 40rpx; flex-shrink: 0; }
.follow-title { display: block; font-size: 26rpx; color: #fff; font-weight: 600; }
.follow-sub   { display: block; font-size: 20rpx; color: rgba(255,255,255,0.4); margin-top: 4rpx; }
.follow-arrow { font-size: 32rpx; color: rgba(255,255,255,0.2); flex-shrink: 0; }

.bottom-gap { height: 40rpx; }

/* 状态遮罩 */
.status-overlay {
  position: fixed; inset: 0; 
  display: flex; align-items: center; justify-content: center;
  background: #0a0a0f; z-index: 50;
}
.status-content { display: flex; flex-direction: column; align-items: center; padding: 40rpx; text-align: center; }
.status-icon { font-size: 80rpx; margin-bottom: 30rpx; display: block; }
.status-text { font-size: 32rpx; color: #fff; font-weight: 600; margin-bottom: 20rpx; }
.status-desc { font-size: 24rpx; color: rgba(255,255,255,0.4); margin-bottom: 10rpx; }
.status-link { font-size: 24rpx; color: #e8b84b; margin-bottom: 40rpx; text-decoration: underline; }
.error-box { background: rgba(255,255,255,0.03); padding: 30rpx; border-radius: 20rpx; border: 1rpx solid rgba(255,255,255,0.05); margin-bottom: 40rpx; }
.retry-btn { 
  background: #e8b84b; color: #0a0a0f; 
  padding: 20rpx 60rpx; border-radius: 50rpx; 
  font-size: 28rpx; font-weight: 900; 
}
</style>
