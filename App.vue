<script>
export default {
  onLaunch() { console.log('美剧Party Launch') },
  onShow()   { console.log('美剧Party Show') },
}
</script>

<style>
/* 全局公共样式 */
page {
  background-color: #0a0a0f;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica,
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 全局滚动条隐藏 */
::-webkit-scrollbar { display: none; }

/* 通用卡片 */
.g-card {
  background: #1a1a28;
  border-radius: 16rpx;
  border: 1rpx solid rgba(255,255,255,0.06);
}

/* 金色主题色 */
.g-gold { color: #e8b84b; }

/* 段落标题 */
.g-section-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1rpx;
}
</style>
