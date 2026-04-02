<template>
  <view class="page" v-if="show">

    <!-- 背景 -->
    <image class="page-bg" :src="show.backdrop || show.cover" mode="aspectFill" />
    <view class="page-overlay" />
    <view class="status-bar" :style="{ height: statusBarH + 'px' }" />

    <!-- 返回 -->
    <view class="back-btn" :style="{ top: statusBarH + 'px' }" @click="goBack">
      <text>‹</text>
    </view>

    <scroll-view scroll-y class="scroll-body">

      <!-- 头部 -->
      <view class="hero">
        <view class="hero-poster-wrap">
          <image class="hero-poster" :src="show.cover" mode="aspectFill" />
        </view>
        <view class="hero-info">
          <text class="hero-title">{{ show.title }}</text>
          <text class="hero-en" v-if="show.titleEn && show.titleEn !== show.title">{{ show.titleEn }}</text>

          <!-- 评分 -->
          <view class="hero-score" v-if="show.rating > 0">
            <text class="score-star">★</text>
            <text class="score-big">{{ show.rating.toFixed(1) }}</text>
            <text class="score-ten"> /10</text>
            <text class="score-count" v-if="show.ratingCount > 0"> · {{ formatCount(show.ratingCount) }}人评</text>
          </view>

          <!-- 基本信息 -->
          <view class="hero-meta-list">
            <text class="hero-meta-item" v-if="show.firstAirDate">📅 {{ show.firstAirDate.substring(0,10) }}</text>
            <text class="hero-meta-item" v-if="show.seasons > 0">📀 共{{ show.seasons }}季</text>
            <text class="hero-meta-item" v-if="show.episodes > 0">📺 {{ show.episodes }}集</text>
            <text class="hero-meta-item" v-if="detail && detail.contentRating">🔞 {{ detail.contentRating }}</text>
          </view>

          <!-- 播出平台 -->
          <view class="hero-networks" v-if="networkList.length > 0">
            <text class="network-chip" v-for="n in networkList" :key="n">{{ n }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-bar">
        <view v-for="btn in actionBtns" :key="btn.status"
          :class="['action-btn', watchStatus === btn.status ? 'active-' + btn.status : '']"
          @click="onWatchAction(btn.status)">
          <text class="action-btn-icon">{{ btn.icon }}</text>
          <text class="action-btn-label">{{ btn.label }}</text>
        </view>
      </view>

      <!-- 进度追踪（在追状态） -->
      <view class="progress-card" v-if="watchStatus === 'watching'">
        <view class="progress-hd">
          <text class="progress-title">观看进度</text>
          <text class="progress-pos">S{{ currentSeason }}E{{ currentEpisode }}</text>
        </view>
        <view class="season-ep-row">
          <!-- 季数选择 -->
          <view class="season-picker" v-if="detail && detail.seasonList && detail.seasonList.length > 1">
            <text class="picker-label">第</text>
            <picker mode="selector" :range="seasonRange" :value="currentSeason - 1" @change="onSeasonChange">
              <view class="picker-val"><text>{{ currentSeason }}</text><text class="picker-arrow">▾</text></view>
            </picker>
            <text class="picker-label">季</text>
          </view>
          <!-- 集数 -->
          <view class="ep-ctrl">
            <view class="ep-btn" @click="changeEp(-1)">−</view>
            <text class="ep-num">第 {{ currentEpisode }} 集</text>
            <view class="ep-btn inc" @click="changeEp(1)">＋</view>
            <view class="checkin-inline-btn" @click="openCheckin">✅ 打卡</view>
          </view>
        </view>
      </view>

      <!-- 去哪看 -->
      <view class="card">
        <view class="card-title">去哪看</view>
        <view class="platform-list">
          <view class="platform-item" v-for="p in platforms" :key="p.id" @click="copyPlatformSearch(p)">
            <text class="p-icon">{{ p.icon }}</text>
            <view class="p-info">
              <text class="p-name">{{ p.name }}</text>
              <text class="p-tip">{{ p.tip }}</text>
            </view>
            <text class="p-action">复制搜索</text>
          </view>
        </view>
        <view class="platform-hint">
          <text>提示：复制剧名后去对应平台搜索，具体是否有版权以各平台为准</text>
        </view>
      </view>

      <!-- 简介 -->
      <view class="card" v-if="show.overview">
        <view class="card-title">剧情简介</view>
        <text :class="['overview', overviewExpanded ? '' : 'collapsed']">{{ show.overview }}</text>
        <text class="expand-btn" @click="overviewExpanded = !overviewExpanded">
          {{ overviewExpanded ? '收起 ▲' : '展开全文 ▼' }}
        </text>
      </view>

      <!-- 季列表 -->
      <view class="card" v-if="detail && detail.seasonList && detail.seasonList.length > 0">
        <view class="card-title">全部季份</view>
        <scroll-view scroll-x>
          <view class="season-list">
            <view class="season-card" v-for="s in detail.seasonList" :key="s.id" @click="loadSeason(s.number)">
              <image class="season-poster" :src="s.posterPath || show.cover" mode="aspectFill" />
              <text class="season-name">{{ s.name }}</text>
              <text class="season-ep-count">{{ s.episodeCount }}集</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 主演 -->
      <view class="card" v-if="detail && detail.cast && detail.cast.length > 0">
        <view class="card-title">主演阵容</view>
        <scroll-view scroll-x>
          <view class="cast-list">
            <view class="cast-item" v-for="p in detail.cast.slice(0,12)" :key="p.id">
              <view class="cast-photo-wrap">
                <image class="cast-photo" :src="p.photo || ''" mode="aspectFill" />
                <view class="cast-photo-placeholder" v-if="!p.photo"><text>👤</text></view>
              </view>
              <text class="cast-name">{{ p.name }}</text>
              <text class="cast-char" v-if="p.character">{{ p.character }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 相关推荐 -->
      <view class="card" v-if="detail && detail.similar && detail.similar.length > 0">
        <view class="card-title">相关推荐</view>
        <scroll-view scroll-x>
          <view class="similar-list">
            <view class="similar-item" v-for="item in detail.similar" :key="item.id" @click="goDetailNew(item)">
              <image class="similar-cover" :src="item.cover" mode="aspectFill" lazy-load />
              <text class="similar-title">{{ item.title }}</text>
              <text class="similar-score" v-if="item.rating > 0">★ {{ item.rating.toFixed(1) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 打卡记录 -->
      <view class="card" v-if="myCheckins.length > 0">
        <view class="card-title">我的观看记录</view>
        <view class="checkin-list">
          <view class="checkin-row" v-for="ck in myCheckins.slice(0,5)" :key="ck.id">
            <text class="ck-mood">{{ ck.mood }}</text>
            <view class="ck-body">
              <text class="ck-ep">S{{ ck.season }}E{{ ck.episode }}</text>
              <text class="ck-comment" v-if="ck.comment">{{ ck.comment }}</text>
            </view>
            <text class="ck-date">{{ ck.dateStr }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-gap" />
    </scroll-view>

    <!-- 打卡弹窗 -->
    <view class="modal-mask" v-if="showCheckinModal" @click.self="showCheckinModal = false">
      <view class="modal-card">
        <text class="modal-title">为 S{{ currentSeason }}E{{ currentEpisode }} 打卡</text>
        <!-- 心情 -->
        <view class="mood-row">
          <text v-for="m in moods" :key="m"
            :class="['mood-item', checkinMood === m ? 'active' : '']"
            @click="checkinMood = m">{{ m }}</text>
        </view>
        <!-- 评分 -->
        <view class="rating-row">
          <text class="rating-label">评分：</text>
          <text v-for="n in 5" :key="n"
            :class="['rating-star', checkinRating >= n ? 'on' : '']"
            @click="checkinRating = n">★</text>
        </view>
        <!-- 感想 -->
        <textarea class="checkin-ta" v-model="checkinComment" placeholder="写点感想…（可选）" maxlength="150" />
        <view class="modal-btns">
          <view class="modal-cancel" @click="showCheckinModal = false">取消</view>
          <view class="modal-confirm" @click="submitCheckin">确认打卡</view>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import { getTVDetail, formatCount } from '../../utils/api.js'
import { WATCH_PLATFORMS } from '../../utils/config.js'
import { getWatchItem, setWatchStatus, updateProgress, addCheckin, getCheckins } from '../../store/user.js'

export default {
  name: 'DetailPage',
  data() {
    return {
      statusBarH:        44,
      show:              null,
      detail:            null,
      watchStatus:       null,
      currentSeason:     1,
      currentEpisode:    0,
      myCheckins:        [],
      overviewExpanded:  false,
      showCheckinModal:  false,
      checkinMood:       '😊',
      checkinComment:    '',
      checkinRating:     0,
      moods: ['😊', '😭', '🤣', '🤩', '😱', '😡', '😴', '🥺'],
      actionBtns: [
        { status: 'watching', icon: '▶', label: '在追' },
        { status: 'want',     icon: '🔖', label: '想看' },
        { status: 'done',     icon: '✅', label: '看完' },
        { status: 'dropped',  icon: '🚫', label: '弃剧' },
      ],
      platforms: WATCH_PLATFORMS.slice(0, 5),
    }
  },
  computed: {
    networkList() {
      const n = this.detail?.networks || this.show?.networks || []
      return typeof n[0] === 'string' ? n : n.map(x => x.name || x)
    },
    seasonRange() {
      if (!this.detail?.seasonList) return ['第1季']
      return this.detail.seasonList.map(s => s.name)
    },
    formatCount() { return formatCount }
  },
  onLoad() {
    const info = uni.getSystemInfoSync()
    this.statusBarH = info.statusBarHeight || 44

    const g = getApp().globalData || {}
    this.show = g.show || null
    if (!this.show) { uni.navigateBack(); return }

    this.loadUserData()
    this.loadDetail()
  },
  onShareAppMessage() {
    const title = this.show ? `${this.show.title} - 美剧Party` : '美剧Party'
    return { title, path: '/pages/detail/index' }
  },
  onShareTimeline() {
    const title = this.show ? `${this.show.title} - 美剧Party` : '美剧Party'
    return { title }
  },
  methods: {
    loadUserData() {
      const item = getWatchItem(this.show.id)
      if (item) {
        this.watchStatus    = item.status
        this.currentSeason  = item.currentSeason  || 1
        this.currentEpisode = item.currentEpisode || 0
      }
      this.myCheckins = getCheckins(this.show.id)
    },

    async loadDetail() {
      try {
        this.detail = await getTVDetail(this.show.tmdbId)
        // 更新show为详情版
        this.show = { ...this.show, ...this.detail }
      } catch (e) {}
    },

    onWatchAction(status) {
      if (this.watchStatus === status) {
        this.watchStatus = null
        return
      }
      setWatchStatus(this.show, status)
      this.watchStatus = status
      const label = this.actionBtns.find(b => b.status === status)?.label
      uni.showToast({ title: label + ' ✓', icon: 'none' })
    },

    onSeasonChange(e) { this.currentSeason = e.detail.value + 1 },

    changeEp(delta) {
      const val = Math.max(0, this.currentEpisode + delta)
      this.currentEpisode = val
      updateProgress(this.show.id, this.currentSeason, val)
    },

    openCheckin() {
      this.checkinComment = ''
      this.checkinMood    = '😊'
      this.checkinRating  = 0
      this.showCheckinModal = true
    },

    submitCheckin() {
      const result = addCheckin({
        showId:    this.show.id,
        showTitle: this.show.title,
        showCover: this.show.cover,
        season:    this.currentSeason,
        episode:   this.currentEpisode,
        comment:   this.checkinComment,
        mood:      this.checkinMood,
        rating:    this.checkinRating,
      })
      if (result) {
        this.showCheckinModal = false
        this.myCheckins = getCheckins(this.show.id)
        uni.showToast({ title: '打卡成功 🎉', icon: 'none' })
        setTimeout(() => {
          uni.showModal({
            title: '打卡成功！',
            content: '把这集的感想分享给朋友？',
            confirmText: '分享',
            cancelText: '不了',
            success(r) { if (r.confirm) uni.showShareMenu({ withShareTicket: true }) },
          })
        }, 800)
      } else {
        uni.showToast({ title: '这集已打过卡', icon: 'none' })
        this.showCheckinModal = false
      }
    },

    loadSeason(num) {
      this.currentSeason = num
      uni.showToast({ title: `切换到第${num}季`, icon: 'none' })
    },

    copyPlatformSearch(platform) {
      const text = `${this.show.title} ${platform.name}`
      uni.setClipboardData({
        data: text,
        success() { uni.showToast({ title: '已复制，去搜索吧', icon: 'none' }) },
      })
    },

    goDetailNew(item) {
      getApp().globalData.show = item
      // 同页面刷新（用redirectTo替换当前页）
      uni.redirectTo({ url: '/pages/detail/index' })
    },

    goBack() { uni.navigateBack() },

    onShareAppMessage() {
      return {
        title:    `推荐你看《${this.show.title}》，评分${this.show.rating.toFixed(1)}！`,
        path:     '/pages/home/index',
        imageUrl: this.show.cover,
      }
    },
  },
}
</script>

<style scoped>
page { background: #0a0a0f; }
.page { min-height: 100vh; position: relative; background: #0a0a0f; }
.page-bg      { position: fixed; top: 0; left: 0; width: 100%; height: 55vh; opacity: 0.25; filter: blur(30px); z-index: 0; transition: opacity 0.5s ease-out; }
.page-overlay { position: fixed; inset: 0; background: linear-gradient(to bottom, rgba(10,10,15,0.5) 0%, #0a0a0f 45%); z-index: 1; }
.back-btn { position: fixed; left: 24rpx; z-index: 100; width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; background: rgba(10,10,15,0.6); border-radius: 50%; backdrop-filter: blur(8px); transition: background-color 0.2s, transform 0.2s; }
.back-btn:active { background: rgba(10,10,15,0.8); transform: scale(0.95); }
.back-btn text { font-size: 46rpx; color: #fff; }
.scroll-body  { position: relative; z-index: 2; }

/* 头部 */
.hero { display: flex; gap: 24rpx; padding: 20rpx 32rpx 36rpx; }
.hero-poster-wrap { width: 180rpx; height: 270rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; box-shadow: 0 16rpx 40rpx rgba(0,0,0,0.7); }
.hero-poster { width: 100%; height: 100%; }
.hero-info   { flex: 1; padding-top: 8rpx; display: flex; flex-direction: column; gap: 0; }
.hero-title  { font-size: 34rpx; font-weight: 900; color: #fff; display: block; line-height: 1.3; margin-bottom: 8rpx; }
.hero-en     { font-size: 20rpx; color: rgba(255,255,255,0.4); display: block; margin-bottom: 16rpx; }
.hero-score  { display: flex; align-items: baseline; gap: 4rpx; margin-bottom: 16rpx; }
.score-star  { font-size: 28rpx; color: #e8b84b; }
.score-big   { font-size: 48rpx; font-weight: 900; color: #e8b84b; line-height: 1; }
.score-ten   { font-size: 20rpx; color: rgba(255,255,255,0.3); }
.score-count { font-size: 18rpx; color: rgba(255,255,255,0.3); }
.hero-meta-list  { display: flex; flex-direction: column; gap: 6rpx; margin-bottom: 14rpx; }
.hero-meta-item  { font-size: 20rpx; color: rgba(255,255,255,0.5); }
.hero-networks   { display: flex; gap: 8rpx; flex-wrap: wrap; }
.network-chip    { font-size: 18rpx; color: #e8b84b; background: rgba(232,184,75,0.12); border: 1rpx solid rgba(232,184,75,0.3); padding: 4rpx 12rpx; border-radius: 6rpx; }

/* 操作栏 */
.action-bar { display: flex; gap: 14rpx; padding: 0 32rpx 28rpx; }
.action-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; background: #1a1a28; border-radius: 16rpx; padding: 18rpx 0; border: 2rpx solid transparent; transition: transform 0.1s, background-color 0.2s; }
.action-btn:active { transform: scale(0.96); }
.action-btn-icon  { font-size: 30rpx; }
.action-btn-label { font-size: 20rpx; color: rgba(255,255,255,0.45); }
.active-watching { background: rgba(232,184,75,0.15); border-color: #e8b84b; }
.active-watching .action-btn-label { color: #e8b84b; }
.active-want     { background: rgba(64,196,255,0.12); border-color: #40c4ff; }
.active-want .action-btn-label { color: #40c4ff; }
.active-done     { background: rgba(105,240,174,0.12); border-color: #69f0ae; }
.active-done .action-btn-label { color: #69f0ae; }
.active-dropped  { background: rgba(120,144,156,0.1); border-color: #78909c; }
.active-dropped .action-btn-label { color: #78909c; }

/* 进度 */
.progress-card { margin: 0 32rpx 20rpx; background: #1a1a28; border-radius: 20rpx; padding: 24rpx; }
.progress-hd   { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.progress-title { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.progress-pos   { font-size: 26rpx; color: #e8b84b; font-weight: 700; }
.season-ep-row  { display: flex; flex-direction: column; gap: 16rpx; }
.season-picker  { display: flex; align-items: center; gap: 8rpx; }
.picker-label   { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.picker-val     { display: flex; align-items: center; gap: 4rpx; background: rgba(255,255,255,0.08); border-radius: 10rpx; padding: 6rpx 16rpx; }
.picker-val text { font-size: 26rpx; color: #fff; }
.picker-arrow   { font-size: 18rpx; color: rgba(255,255,255,0.4); }
.ep-ctrl        { display: flex; align-items: center; gap: 14rpx; }
.ep-btn         { width: 60rpx; height: 60rpx; border-radius: 50%; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #fff; }
.ep-btn.inc     { background: rgba(232,184,75,0.2); color: #e8b84b; }
.ep-num         { flex: 1; text-align: center; font-size: 28rpx; color: #fff; font-weight: 700; }
.checkin-inline-btn { background: #e8b84b; border-radius: 14rpx; padding: 12rpx 22rpx; font-size: 22rpx; color: #0a0a0f; font-weight: 700; }

/* 卡片 */
.card { margin: 0 32rpx 20rpx; background: #1a1a28; border-radius: 20rpx; padding: 24rpx; border: 1rpx solid rgba(255,255,255,0.05); }
.card-title { font-size: 26rpx; font-weight: 700; color: rgba(255,255,255,0.9); margin-bottom: 16rpx; padding-bottom: 12rpx; border-bottom: 1rpx solid rgba(255,255,255,0.06); }

/* 平台 */
.platform-list { display: flex; flex-direction: column; gap: 0; }
.platform-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid rgba(255,255,255,0.05); }
.platform-item:last-child { border-bottom: none; }
.p-icon   { font-size: 36rpx; flex-shrink: 0; }
.p-name   { display: block; font-size: 26rpx; color: #fff; font-weight: 500; }
.p-tip    { display: block; font-size: 20rpx; color: rgba(255,255,255,0.3); margin-top: 2rpx; }
.p-action { margin-left: auto; font-size: 22rpx; color: #e8b84b; flex-shrink: 0; background: rgba(232,184,75,0.1); padding: 6rpx 16rpx; border-radius: 8rpx; }
.platform-hint { margin-top: 12rpx; }
.platform-hint text { font-size: 20rpx; color: rgba(255,255,255,0.2); line-height: 1.5; }

/* 简介 */
.overview { font-size: 26rpx; color: rgba(255,255,255,0.7); line-height: 1.8; display: block; }
.overview.collapsed { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.expand-btn { display: block; font-size: 22rpx; color: #e8b84b; margin-top: 10rpx; }

/* 季列表 */
.season-list { display: flex; gap: 16rpx; padding-bottom: 4rpx; }
.season-card { flex-shrink: 0; width: 130rpx; }
.season-poster { width: 130rpx; height: 174rpx; border-radius: 10rpx; margin-bottom: 8rpx; background: #2a2a3a; }
.season-name   { display: block; font-size: 20rpx; color: rgba(255,255,255,0.8); text-align: center; }
.season-ep-count { display: block; font-size: 18rpx; color: rgba(255,255,255,0.35); text-align: center; margin-top: 4rpx; }

/* 演员 */
.cast-list { display: flex; gap: 20rpx; padding-bottom: 4rpx; }
.cast-item { flex-shrink: 0; width: 110rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.cast-photo-wrap { position: relative; width: 110rpx; height: 110rpx; }
.cast-photo { width: 110rpx; height: 110rpx; border-radius: 50%; background: #2a2a3a; }
.cast-photo-placeholder { position: absolute; inset: 0; border-radius: 50%; background: #2a2a3a; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.cast-name { font-size: 20rpx; color: rgba(255,255,255,0.8); text-align: center; }
.cast-char { font-size: 18rpx; color: rgba(255,255,255,0.35); text-align: center; }

/* 相关 */
.similar-list { display: flex; gap: 16rpx; padding-bottom: 4rpx; }
.similar-item { flex-shrink: 0; width: 140rpx; }
.similar-cover { width: 140rpx; height: 187rpx; border-radius: 10rpx; margin-bottom: 8rpx; background: #2a2a3a; }
.similar-title { display: block; font-size: 20rpx; color: rgba(255,255,255,0.8); text-align: center; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.similar-score { display: block; font-size: 18rpx; color: #e8b84b; text-align: center; margin-top: 4rpx; }

/* 打卡记录 */
.checkin-list { display: flex; flex-direction: column; }
.checkin-row  { display: flex; gap: 14rpx; padding: 12rpx 0; border-bottom: 1rpx solid rgba(255,255,255,0.05); align-items: flex-start; }
.checkin-row:last-child { border-bottom: none; }
.ck-mood    { font-size: 32rpx; flex-shrink: 0; }
.ck-body    { flex: 1; }
.ck-ep      { display: block; font-size: 22rpx; color: #e8b84b; font-weight: 600; }
.ck-comment { display: block; font-size: 21rpx; color: rgba(255,255,255,0.45); margin-top: 4rpx; line-height: 1.5; }
.ck-date    { font-size: 20rpx; color: rgba(255,255,255,0.2); flex-shrink: 0; }

/* 打卡弹窗 */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 999; display: flex; align-items: flex-end; animation: fadeIn 0.3s forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-card { width: 100%; background: #1a1a28; border-radius: 32rpx 32rpx 0 0; padding: 40rpx 32rpx 80rpx; animation: slideUp 0.3s forwards; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.modal-title { display: block; font-size: 30rpx; font-weight: 700; color: #fff; text-align: center; margin-bottom: 28rpx; }
.mood-row    { display: flex; justify-content: center; gap: 16rpx; margin-bottom: 24rpx; flex-wrap: wrap; }
.mood-item   { font-size: 44rpx; padding: 8rpx; border-radius: 12rpx; transition: transform 0.2s, background-color 0.2s; }
.mood-item.active { background: rgba(232,184,75,0.2); transform: scale(1.2); }
.rating-row  { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-bottom: 24rpx; }
.rating-label { font-size: 24rpx; color: rgba(255,255,255,0.5); }
.rating-star  { font-size: 44rpx; color: rgba(255,255,255,0.2); transition: color 0.2s, transform 0.2s; }
.rating-star.on { color: #e8b84b; transform: scale(1.1); }
.checkin-ta  { width: 100%; background: rgba(255,255,255,0.06); border-radius: 16rpx; padding: 20rpx; color: #fff; font-size: 26rpx; min-height: 110rpx; margin-bottom: 28rpx; }
.modal-btns  { display: flex; gap: 16rpx; }
.modal-cancel  { flex: 1; background: rgba(255,255,255,0.08); border-radius: 16rpx; padding: 24rpx; text-align: center; font-size: 28rpx; color: rgba(255,255,255,0.45); }
.modal-confirm { flex: 2; background: #e8b84b; border-radius: 16rpx; padding: 24rpx; text-align: center; font-size: 28rpx; color: #0a0a0f; font-weight: 900; }

.ad-wrap { padding: 0 32rpx; }
.bottom-gap { height: 60rpx; }
</style>
