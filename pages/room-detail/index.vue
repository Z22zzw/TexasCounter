<template>
  <view class="page">
    <view v-if="room">
      <text class="room-title">{{ room.room?.name }}</text>
      <text class="room-code">房间码: {{ room.room?.code }}</text>

      <view class="section">
        <text class="section-title">成员 ({{ room.members?.length || 0 }})</text>
        <view v-for="m in room.members" :key="m.id" class="member">
          <text>{{ m.userId }}</text>
          <text class="role">{{ m.role === 'owner' ? '房主' : '成员' }}</text>
        </view>
      </view>

      <view class="actions">
        <button type="primary" @click="startHand" v-if="isOwner">开始一手牌</button>
        <button @click="goHand(currentHandId)" v-if="currentHandId">进入当前牌局</button>
        <button @click="goLeaderboard">排行榜</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { api, setToken } from "../../utils/api.js";

const roomId = "";
const room = ref(null);
const currentHandId = ref("");

onMounted(async () => {
  const stored = uni.getStorageSync("token");
  if (stored) setToken(stored);

  // Get roomId from route params
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  const id = page?.options?.roomId || "";
  await loadRoom(id);
});

const loadRoom = async (id) => {
  const res = await api.getRoom(id);
  if (res.statusCode === 200) room.value = res.data;
};

const isOwner = computed(() => {
  const user = uni.getStorageSync("user");
  return room.value?.room?.ownerUserId === user?.id;
});

const startHand = async () => {
  const res = await api.startHand(room.value.room.id);
  if (res.statusCode === 200) {
    currentHandId.value = res.data.handId;
    uni.navigateTo({ url: `/pages/hand/index?handId=${res.data.handId}` });
  } else {
    uni.showToast({ title: res.data.code || "开始失败", icon: "none" });
  }
};

const goHand = (handId) => {
  uni.navigateTo({ url: `/pages/hand/index?handId=${handId}` });
};

const goLeaderboard = () => {
  uni.navigateTo({ url: `/pages/leaderboard/index?roomId=${room.value.room.id}` });
};
</script>

<style scoped>
.page { padding: 20rpx; }
.room-title { font-size: 40rpx; font-weight: bold; }
.room-code { color: #666; margin-left: 20rpx; }
.section { margin-top: 40rpx; }
.section-title { font-size: 32rpx; font-weight: bold; margin-bottom: 16rpx; }
.member { padding: 12rpx; display: flex; justify-content: space-between; }
.role { color: #999; font-size: 24rpx; }
.actions { margin-top: 60rpx; display: flex; flex-direction: column; gap: 20rpx; }
</style>
