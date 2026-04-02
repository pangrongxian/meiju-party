<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarH + 'px' }" />

    <!-- 用户信息头部 -->
    <view class="user-hero">
      <view class="avatar-wrap">
        <text class="avatar-emoji">🎬</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ prefs.nickname || '剧迷' }}</text>
        <text class="user-tag">美剧爱好者</text>
      </view>
      <view class="streak-badge" v-if="stats.streak > 0">
        <text class="streak-fire">🔥</text>
        <text class="streak-num">{{ stats.streak }}</text>
        <text class="streak-label">天</text>
      </view>
    </view>

    <!-- 统计卡 -->
    <view class="stats-card">
      <view class="stat" v-for="s in statItems" :key="s.label">
        <text class="stat-val">{{ s.val }}</text>
        <text class="stat-lbl">{{ s.label }}</text>
      </view>
    </view>

    <!-- 追剧列表 -->
    <view class="watch-section">
      <view class="tab-row">
        <view v-for="t in tabs" :key="t.key"
          :class="['tab', activeTab === t.key ? 'active' : '']"
          @click="activeTab = t.key">
          <text>{{ t.label }}</text>
          <text class="tab-cnt" v-if="tabCounts[t.key] > 0">{{ tabCounts[t.key] }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="currentList.length === 0">
        <text class="e-icon">{{ emptyIcons[activeTab] }}</text>
        <text class="e-text">{{ emptyTexts[activeTab] }}</text>
        <button class="e-btn" @click="goSearch">去发现好剧</button>
      </view>

      <view class="watch-list" v-else>
        <view class="watch-item" v-for="item in currentList" :key="item.id" @click="goDetail(item)">
          <image class="w-cover" :src="item.cover" mode="aspectFill" />
          <view class="w-info">
            <text class="w-title">{{ item.title }}</text>
            <view class="w-meta">
              <text class="w-score" v-if="item.rating > 0">★{{ item.rating.toFixed(1) }}</text>
              <text class="w-ep" v-if="item.status === 'watching'">S{{ item.currentSeason }}E{{ item.currentEpisode || 0 }}</text>
            </view>
          </view>
          <view class="w-action" @click.stop="changeStatus(item)">
            <text class="w-status">{{ statusLabels[item.status] }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 功能入口列表 -->
    <view class="menu-list">
      <view class="menu-item" @click="goCheckin">
        <text class="menu-icon">✅</text>
        <view class="menu-body">
          <text class="menu-title">打卡记录</text>
          <text class="menu-sub">共打卡 {{ stats.totalCheckins || 0 }} 次</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="showFollowGuide">
        <text class="menu-icon">📢</text>
        <view class="menu-body">
          <text class="menu-title">关注公众号</text>
          <text class="menu-sub">每周资源整理 · 新剧推荐</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="bottom-gap" />
  </view>
</template>

<script>
import { getWatchList, setWatchStatus, removeFromWatchList, getStats, getPreferences } from '../../store/user.js'

export default {
  name: 'ProfilePage',
  data() {
    return {
      statusBarH: 44,
      prefs:      {},
      stats:      {},
      watchList:  [],
      activeTab:  'watching',
      tabs: [
        { key: 'watching', label: '在追' },
        { key: 'want',     label: '想看' },
        { key: 'done',     label: '看完' },
        { key: 'dropped',  label: '弃剧' },
      ],
      statusLabels: { watching: '追剧中', want: '想看', done: '看完', dropped: '弃剧' },
      emptyIcons:  { watching: '📺', want: '🔖', done: '✅', dropped: '🚫' },
      emptyTexts:  { watching: '还没有在追的剧', want: '还没有想看的剧', done: '还没有看完的剧', dropped: '还没有弃过剧' },
    }
  },
  computed: {
    currentList() { return this.watchList.filter(i => i.status === this.activeTab) },
    tabCounts() {
      const m = {}
      this.tabs.forEach(t => { m[t.key] = this.watchList.filter(i => i.status === t.key).length })
      return m
    },
    statItems() {
      return [
        { val: this.stats.total    || 0, label: '追过的剧' },
        { val: this.stats.watching || 0, label: '正在追'   },
        { val: this.stats.done     || 0, label: '已看完'   },
        { val: this.stats.totalCheckins || 0, label: '打卡次数' },
      ]
    },
  },
  onLoad() {
    const info = uni.getSystemInfoSync()
    this.statusBarH = info.statusBarHeight || 44
  },
  onShow() { this.loadData() },
  onShareAppMessage() {
    return { title: '我的追剧档案 - 美剧Party', path: '/pages/home/index' }
  },
  onShareTimeline() {
    return { title: '我的追剧档案 - 美剧Party' }
  },
  methods: {
    loadData() {
      this.watchList = getWatchList()
      this.stats     = getStats()
      this.prefs     = getPreferences()
    },
    changeStatus(item) {
      uni.showActionSheet({
        itemList: ['追剧中', '想看', '看完', '弃剧', '移除'],
        success: (res) => {
          const acts = ['watching', 'want', 'done', 'dropped', 'remove']
          const act  = acts[res.tapIndex]
          if (act === 'remove') removeFromWatchList(item.id)
          else setWatchStatus(item, act)
          this.loadData()
        },
      })
    },
    showFollowGuide() {
      uni.showModal({
        title:      '关注公众号',
        content:    '微信搜索「美剧Party」公众号\n回复剧名获取最新资源和字幕组整理',
        confirmText: '好的',
        showCancel:  false,
      })
    },
    goDetail(item) {
      getApp().globalData = getApp().globalData || {}
      getApp().globalData.show = item
      uni.navigateTo({ url: '/pages/detail/index' })
    },
    goSearch()  { uni.switchTab({ url: '/pages/search/index' }) },
    goCheckin() { uni.navigateTo({ url: '/pages/checkin/index' }) },
  },
}
</script>

<style scoped>
page { background: #0a0a0f; }
.page { background: #0a0a0f; min-height: 100vh; padding-bottom: 40rpx; }

/* 头部 */
.user-hero { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; background: linear-gradient(180deg, rgba(232,184,75,0.06) 0%, transparent 100%); }
.avatar-wrap { width: 110rpx; height: 110rpx; border-radius: 50%; background: linear-gradient(135deg, #e8b84b, #d4943a); display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 20rpx rgba(232,184,75,0.35); }
.avatar-emoji { font-size: 52rpx; }
.user-info    { flex: 1; }
.user-name    { display: block; font-size: 36rpx; font-weight: 700; color: #fff; }
.user-tag     { display: block; font-size: 22rpx; color: #e8b84b; margin-top: 6rpx; }
.streak-badge { display: flex; align-items: center; gap: 4rpx; background: rgba(232,184,75,0.12); border: 1rpx solid rgba(232,184,75,0.3); border-radius: 20rpx; padding: 8rpx 16rpx; }
.streak-fire  { font-size: 28rpx; }
.streak-num   { font-size: 32rpx; font-weight: 900; color: #e8b84b; }
.streak-label { font-size: 20rpx; color: rgba(255,255,255,0.5); }

.stats-card { display: flex; margin: 0 32rpx 28rpx; background: #1a1a28; border-radius: 20rpx; padding: 24rpx 0; }
.stat       { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; border-right: 1rpx solid rgba(255,255,255,0.06); }
.stat:last-child { border-right: none; }
.stat-val   { font-size: 44rpx; font-weight: 900; color: #e8b84b; }
.stat-lbl   { font-size: 20rpx; color: rgba(255,255,255,0.3); }

.watch-section { padding: 0 32rpx 24rpx; }
.tab-row { display: flex; gap: 8rpx; margin-bottom: 20rpx; }
.tab     { flex: 1; text-align: center; padding: 14rpx 0; background: #1a1a28; border-radius: 12rpx; font-size: 24rpx; color: rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; gap: 6rpx; }
.tab.active { background: rgba(232,184,75,0.18); color: #e8b84b; font-weight: 700; }
.tab-cnt { font-size: 18rpx; background: #e8b84b; color: #0a0a0f; border-radius: 20rpx; padding: 0 8rpx; font-weight: 700; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; gap: 14rpx; }
.e-icon { font-size: 80rpx; }
.e-text { font-size: 26rpx; color: rgba(255,255,255,0.3); }
.e-btn  { background: rgba(232,184,75,0.18); border: 1rpx solid rgba(232,184,75,0.4); border-radius: 40rpx; padding: 12rpx 40rpx; font-size: 24rpx; color: #e8b84b; margin-top: 8rpx; }

.watch-list { display: flex; flex-direction: column; gap: 14rpx; }
.watch-item { display: flex; gap: 18rpx; align-items: center; background: #1a1a28; border-radius: 16rpx; padding: 14rpx; border: 1rpx solid rgba(255,255,255,0.04); transition: all 0.2s; }
.watch-item:active { background: #222234; transform: scale(0.99); }
.w-cover    { width: 72rpx; height: 96rpx; border-radius: 8rpx; flex-shrink: 0; }
.w-info     { flex: 1; overflow: hidden; }
.w-title    { display: block; font-size: 26rpx; color: #fff; font-weight: 600; margin-bottom: 8rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.w-meta     { display: flex; gap: 12rpx; align-items: center; }
.w-score    { font-size: 20rpx; color: #e8b84b; }
.w-ep       { font-size: 20rpx; color: rgba(255,255,255,0.4); }
.w-action   { flex-shrink: 0; background: rgba(255,255,255,0.06); border-radius: 10rpx; padding: 8rpx 14rpx; }
.w-status   { font-size: 20rpx; color: rgba(255,255,255,0.4); }

.menu-list { margin: 0 32rpx; background: #1a1a28; border-radius: 20rpx; overflow: hidden; margin-bottom: 24rpx; }
.menu-item { display: flex; align-items: center; gap: 18rpx; padding: 24rpx 20rpx; border-bottom: 1rpx solid rgba(255,255,255,0.05); }
.menu-item:last-child { border-bottom: none; }
.menu-icon  { font-size: 38rpx; flex-shrink: 0; }
.menu-body  { flex: 1; }
.menu-title { display: block; font-size: 28rpx; color: #fff; font-weight: 600; }
.menu-sub   { display: block; font-size: 22rpx; color: rgba(255,255,255,0.35); margin-top: 4rpx; }
.menu-arrow { font-size: 32rpx; color: rgba(255,255,255,0.2); flex-shrink: 0; }

.ad-wrap { padding: 0 32rpx; }
.bottom-gap { height: 40rpx; }
</style>
