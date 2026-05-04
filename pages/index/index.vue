<template>
  <view class="content">
    <image class="logo" src="/static/logo.png"></image>
    <view class="text-area">
      <text class="title">德州计分</text>
      <text class="sub">朋友局记分工具</text>
    </view>
    <button type="primary" @click="goLogin">开始使用</button>
  </view>
</template>

<script>
export default {
  methods: {
    goLogin() {
      const token = uni.getStorageSync("token");
      if (token) {
        uni.navigateTo({ url: "/pages/rooms/index" });
      } else {
        uni.navigateTo({ url: "/pages/login/index" });
      }
    },
  },
};
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40rpx;
}
.logo { height: 200rpx; width: 200rpx; margin-bottom: 50rpx; }
.text-area { display: flex; flex-direction: column; align-items: center; margin-bottom: 80rpx; }
.title { font-size: 48rpx; font-weight: bold; color: #333; }
.sub { font-size: 28rpx; color: #999; margin-top: 16rpx; }
</style>
