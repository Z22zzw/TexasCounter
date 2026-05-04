<template>
  <view class="page">
    <view class="actions">
      <button type="primary" size="mini" @click="showCreate = true">创建房间</button>
      <button size="mini" @click="showJoin = true">加入房间</button>
    </view>

    <view class="list">
      <view v-for="room in rooms" :key="room.id" class="room-card" @click="goRoom(room)">
        <text class="room-name">{{ room.name }}</text>
        <text class="room-code">{{ room.code }}</text>
        <text class="room-status">{{ room.status === 'active' ? '进行中' : '已关闭' }}</text>
      </view>
      <view v-if="rooms.length === 0" class="empty">暂无房间</view>
    </view>

    <!-- Create Room Dialog -->
    <view v-if="showCreate" class="mask" @click="showCreate = false">
      <view class="dialog" @click.stop>
        <text class="dialog-title">创建房间</text>
        <input v-model="newName" placeholder="房间名称" class="input" />
        <input v-model="newPassword" placeholder="密码 (可选)" class="input" password />
        <button type="primary" @click="createRoom">确认创建</button>
        <button @click="showCreate = false">取消</button>
      </view>
    </view>

    <!-- Join Room Dialog -->
    <view v-if="showJoin" class="mask" @click="showJoin = false">
      <view class="dialog" @click.stop>
        <text class="dialog-title">加入房间</text>
        <input v-model="joinCode" placeholder="房间码" class="input" />
        <input v-model="joinPassword" placeholder="密码 (如有)" class="input" password />
        <button type="primary" @click="joinRoom">加入</button>
        <button @click="showJoin = false">取消</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api, setToken, getToken } from "../../utils/api.js";

const rooms = ref([]);
const showCreate = ref(false);
const showJoin = ref(false);
const newName = ref("");
const newPassword = ref("");
const joinCode = ref("");
const joinPassword = ref("");

onMounted(async () => {
  const stored = uni.getStorageSync("token");
  if (stored) setToken(stored);
  await loadRooms();
});

const loadRooms = async () => {
  const res = await api.listRooms();
  if (res.statusCode === 200) rooms.value = res.data.items;
};

const createRoom = async () => {
  const res = await api.createRoom(newName.value, newPassword.value || undefined);
  if (res.statusCode === 200) {
    showCreate.value = false;
    newName.value = "";
    newPassword.value = "";
    await loadRooms();
    uni.navigateTo({ url: `/pages/room-detail/index?roomId=${res.data.id}` });
  }
};

const joinRoom = async () => {
  let res;
  if (joinPassword.value) {
    res = await api.joinByList(joinCode.value, joinPassword.value);
  } else {
    res = await api.joinByCode(joinCode.value, joinCode.value);
  }
  if (res.statusCode === 200) {
    showJoin.value = false;
    joinCode.value = "";
    joinPassword.value = "";
    uni.navigateTo({ url: `/pages/room-detail/index?roomId=${res.data.roomId || joinCode.value}` });
  } else {
    uni.showToast({ title: res.data.code || "加入失败", icon: "none" });
  }
};

const goRoom = (room) => {
  uni.navigateTo({ url: `/pages/room-detail/index?roomId=${room.id}` });
};
</script>

<style scoped>
.page { padding: 20rpx; }
.actions { display: flex; gap: 20rpx; margin-bottom: 30rpx; }
.room-card {
  padding: 24rpx;
  border-bottom: 1rpx solid #eee;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.room-name { font-size: 32rpx; font-weight: bold; flex: 1; }
.room-code { color: #666; font-family: monospace; }
.room-status { color: #999; font-size: 24rpx; }
.empty { text-align: center; color: #999; padding: 80rpx; }
.mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; border-radius: 16rpx; padding: 40rpx;
  width: 600rpx; display: flex; flex-direction: column; gap: 20rpx;
}
.dialog-title { font-size: 36rpx; font-weight: bold; text-align: center; }
.input { border: 1rpx solid #ddd; border-radius: 8rpx; padding: 16rpx; }
</style>
