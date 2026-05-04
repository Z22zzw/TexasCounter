<template>
  <view class="page">
    <text class="title">排行榜</text>

    <view class="section" v-if="items.length > 0">
      <view v-for="(item, i) in items" :key="item.userId" class="rank-item">
        <text class="rank">{{ i + 1 }}</text>
        <view class="info">
          <text class="title-text">{{ item.title || '--' }}</text>
          <text>净盈利: {{ item.netProfit }}</text>
          <text>胜率: {{ (item.winRate * 100).toFixed(0) }}%</text>
          <text>参局: {{ item.handsCount }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty">暂无数据</view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api, setToken } from "../../utils/api.js";

const roomId = ref("");
const items = ref([]);

onMounted(async () => {
  const stored = uni.getStorageSync("token");
  if (stored) setToken(stored);

  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  roomId.value = page?.options?.roomId || "";
  await loadLeaderboard();
});

const loadLeaderboard = async () => {
  const res = await api.getLeaderboard(roomId.value);
  if (res.statusCode === 200) items.value = res.data.items;
};
</script>

<style scoped>
.page { padding: 20rpx; }
.title { font-size: 40rpx; font-weight: bold; margin-bottom: 30rpx; }
.rank-item { display: flex; align-items: center; padding: 20rpx; border-bottom: 1rpx solid #eee; }
.rank { font-size: 40rpx; font-weight: bold; width: 80rpx; }
.info { display: flex; flex-direction: column; gap: 8rpx; }
.title-text { color: #e74c3c; font-weight: bold; }
.empty { text-align: center; color: #999; padding: 80rpx; }
</style>
