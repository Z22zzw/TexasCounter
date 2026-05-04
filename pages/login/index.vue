<template>
  <view class="page">
    <view class="header">
      <text class="title">德州计分</text>
      <text class="subtitle">朋友局记分工具</text>
    </view>
    <button class="login-btn" type="primary" @click="handleLogin" :loading="loading">
      微信一键登录
    </button>
  </view>
</template>

<script setup>
import { ref } from "vue";
import { api, setToken } from "../../utils/api.js";

const loading = ref(false);

const handleLogin = async () => {
  loading.value = true;
  try {
    const { code } = await uni.login({ provider: "weixin" });
    const res = await api.wechatLogin(code);
    if (res.statusCode === 200) {
      setToken(res.data.token);
      uni.setStorageSync("user", res.data.user);
      uni.setStorageSync("token", res.data.token);
      uni.switchTab({ url: "/pages/rooms/index" });
    }
  } catch (e) {
    // Mock login for dev
    const res = await api.wechatLogin("dev-code");
    if (res.statusCode === 200) {
      setToken(res.data.token);
      uni.setStorageSync("user", res.data.user);
      uni.setStorageSync("token", res.data.token);
      uni.navigateTo({ url: "/pages/rooms/index" });
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40rpx;
}
.header {
  margin-bottom: 80rpx;
  text-align: center;
}
.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
}
.subtitle {
  font-size: 28rpx;
  color: #999;
  margin-top: 16rpx;
}
.login-btn {
  width: 100%;
  max-width: 600rpx;
}
</style>
