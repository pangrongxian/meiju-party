<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarH + 'px' }" />
    <view class="nav-bar">
      <view class="back-btn" @click="goBack"><text>‹</text></view>
      <text class="nav-title">打卡记录</text>
      <text class="nav-cnt">{{ checkins.length }} 次</text>
    </view>

    <!-- 连续打卡 -->
    <view class="streak-card" v-if="streak > 0">
      <text class="sk-fire">🔥</text>
      <view>
        <text class="sk-big">{{ streak }}</text>
        <text class="sk-unit"> 天连续打卡</text>
      </view>
      <text class="sk-tip">继续保持！</text>
    </view>

    <!-- 月度热图 -->
    <view class="heatmap">
      <text class="heatmap-title">本月打卡</text>
      <view class="heatmap-grid">
        <view v-for="d in calDays" :key="d.date"
          :class="['hm-cell', d.count > 0 ? 'on' : '', d.isToday ? 'today' : '']">
          <text class="hm-day">{{ d.day }}</text>
          <view class="hm-dot" v-if="d.count > 0" />
        </view>
      </view>
    </view>

    <!-- 打卡列表 -->
    <scroll-view scroll-y class="list-body">
      <view v-if="checkins.length === 0" class="empty">
        <text class="e-icon">✅</text>
        <text class="e-text">还没有打卡记录</text>
        <text class="e-sub">在剧集详情页追剧打卡吧</text>
      </view>
      <view v-else>
        <view class="ck-item" v-for="ck in checkins" :key="ck.id">
          <text class="ck-mood">{{ ck.mood }}</text>
          <image class="ck-cover" :src="ck.showCover" mode="aspectFill" />
          <view class="ck-body">
            <text class="ck-title">{{ ck.showTitle }}</text>
            <text class="ck-ep">S{{ ck.season }}E{{ ck.episode }}</text>
            <view class="ck-stars" v-if="ck.rating > 0">
              <text v-for="n in 5" :key="n" :class="['star', ck.rating >= n ? 'on' : '']">★</text>
            </view>
            <text class="ck-comment" v-if="ck.comment">{{ ck.comment }}</text>
          </view>
          <text class="ck-date">{{ ck.dateStr }}</text>
        </view>
      </view>
      <view class="bottom-gap" />
    </scroll-view>
  </view>
</template>

<script>
import { getCheckins, getStreakDays } from '../../store/user.js'

export default {
  name: 'CheckinPage',
  data() {
    return {
      statusBarH: 44,
      checkins:   [],
      streak:     0,
      calDays:    [],
    }
  },
  onLoad() {
    const info = uni.getSystemInfoSync()
    this.statusBarH = info.statusBarHeight || 44
    this.loadData()
  },
  onShareAppMessage() {
    return { title: '我的打卡日历 - 美剧Party', path: '/pages/checkin/index' }
  },
  onShareTimeline() {
    return { title: '我的打卡日历 - 美剧Party' }
  },
  methods: {
    loadData() {
      this.checkins = getCheckins()
      this.streak   = getStreakDays()
      this.buildCal()
    },
    buildCal() {
      const now   = new Date()
      const y     = now.getFullYear()
      const m     = now.getMonth()
      const total = new Date(y, m + 1, 0).getDate()
      const today = now.getDate()
      const cntMap = {}
      this.checkins.forEach(ck => {
        const d = new Date(ck.createdAt)
        if (d.getFullYear() === y && d.getMonth() === m) {
          const day = d.getDate()
          cntMap[day] = (cntMap[day] || 0) + 1
        }
      })
      this.calDays = Array.from({ length: total }, (_, i) => ({
        date: `${y}-${m+1}-${i+1}`, day: i + 1,
        count: cntMap[i+1] || 0, isToday: i + 1 === today,
      }))
    },
    goBack() { uni.navigateBack() },
  },
}
</script>

<style scoped>
page { background: #0a0a0f; }
.page { background: #0a0a0f; min-height: 100vh; display: flex; flex-direction: column; }
.nav-bar   { display: flex; align-items: center; gap: 14rpx; padding: 10rpx 28rpx 18rpx; }
.back-btn  { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }
.back-btn text { font-size: 46rpx; color: #fff; }
.nav-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #fff; }
.nav-cnt   { font-size: 22rpx; color: rgba(255,255,255,0.3); }

.streak-card { display: flex; align-items: center; gap: 14rpx; margin: 0 28rpx 20rpx; background: linear-gradient(135deg, rgba(232,184,75,0.18), rgba(232,184,75,0.06)); border: 1rpx solid rgba(232,184,75,0.3); border-radius: 20rpx; padding: 22rpx; }
.sk-fire { font-size: 48rpx; }
.sk-big  { font-size: 48rpx; font-weight: 900; color: #e8b84b; }
.sk-unit { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.sk-tip  { margin-left: auto; font-size: 22rpx; color: rgba(255,255,255,0.35); }

.heatmap { margin: 0 28rpx 24rpx; background: #1a1a28; border-radius: 20rpx; padding: 22rpx; }
.heatmap-title { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 14rpx; font-weight: 600; }
.heatmap-grid  { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8rpx; }
.hm-cell  { display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 6rpx 0; border-radius: 8rpx; }
.hm-cell.today { background: rgba(232,184,75,0.12); }
.hm-day   { font-size: 18rpx; color: rgba(255,255,255,0.22); }
.hm-dot   { width: 10rpx; height: 10rpx; border-radius: 50%; background: #e8b84b; }
.hm-cell.on .hm-day { color: rgba(255,255,255,0.8); }

.list-body { flex: 1; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; gap: 14rpx; }
.e-icon { font-size: 80rpx; }
.e-text { font-size: 28rpx; color: rgba(255,255,255,0.3); }
.e-sub  { font-size: 22rpx; color: rgba(255,255,255,0.2); }

.ck-item { display: flex; gap: 14rpx; padding: 18rpx 28rpx; border-bottom: 1rpx solid rgba(255,255,255,0.04); align-items: flex-start; }
.ck-mood  { font-size: 34rpx; flex-shrink: 0; }
.ck-cover { width: 64rpx; height: 85rpx; border-radius: 8rpx; flex-shrink: 0; background: #1a1a28; }
.ck-body  { flex: 1; overflow: hidden; }
.ck-title { display: block; font-size: 26rpx; color: #fff; font-weight: 600; margin-bottom: 4rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ck-ep    { display: block; font-size: 22rpx; color: #e8b84b; margin-bottom: 6rpx; }
.ck-stars { display: flex; gap: 4rpx; margin-bottom: 6rpx; }
.star     { font-size: 22rpx; color: rgba(255,255,255,0.15); }
.star.on  { color: #e8b84b; }
.ck-comment { display: block; font-size: 22rpx; color: rgba(255,255,255,0.45); line-height: 1.5; }
.ck-date  { font-size: 19rpx; color: rgba(255,255,255,0.2); flex-shrink: 0; }
.bottom-gap { height: 40rpx; }
</style>
