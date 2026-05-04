<template>
  <view class="page">
    <text class="title">当前牌局</text>

    <view class="section">
      <text class="section-title">下注</text>
      <view class="bet-row">
        <input v-model="betAmount" type="number" placeholder="下注整数分" class="input" />
        <button type="primary" size="mini" @click="placeBet">下注</button>
      </view>
    </view>

    <view class="section">
      <text class="section-title">标记结果</text>
      <view class="mark-row">
        <button type="primary" size="mini" @click="mark('win')">我是胜者</button>
        <button type="warn" size="mini" @click="mark('lose')">我是败者</button>
      </view>
    </view>

    <view class="section" v-if="isOwner">
      <button type="primary" @click="settle">结束并结算</button>
    </view>

    <view class="section" v-if="payouts.length > 0">
      <text class="section-title">结算结果</text>
      <view v-for="p in payouts" :key="p.userId" class="payout">
        <text>{{ p.userId }}: +{{ p.amount }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">流水</text>
      <view v-for="e in ledger" :key="e.id" class="ledger-item">
        <text class="entry-type">{{ e.entryType }}</text>
        <text>{{ e.userId }}</text>
        <text class="amount">{{ e.amount }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { api, setToken } from "../../utils/api.js";

const handId = ref("");
const betAmount = ref(5);
const payouts = ref([]);
const ledger = ref([]);

onMounted(async () => {
  const stored = uni.getStorageSync("token");
  if (stored) setToken(stored);

  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  handId.value = page?.options?.handId || "";
  await loadLedger();
});

const isOwner = computed(() => {
  const user = uni.getStorageSync("user");
  return true; // simplified; real check needs room owner comparison
});

const loadLedger = async () => {
  const res = await api.getHandLedger(handId.value);
  if (res.statusCode === 200) ledger.value = res.data.items;
};

const placeBet = async () => {
  const res = await api.placeBet(handId.value, parseInt(betAmount.value));
  if (res.statusCode === 200) {
    await loadLedger();
    betAmount.value = 5;
  } else {
    uni.showToast({ title: res.data.code || "下注失败", icon: "none" });
  }
};

const mark = async (result) => {
  const res = await api.markResult(handId.value, result);
  if (res.statusCode !== 200) {
    uni.showToast({ title: res.data.code || "标记失败", icon: "none" });
  }
};

const settle = async () => {
  const res = await api.settleHand(handId.value);
  if (res.statusCode === 200) {
    payouts.value = res.data.payouts;
    await loadLedger();
  } else {
    uni.showToast({ title: res.data.code || "结算失败", icon: "none" });
  }
};
</script>

<style scoped>
.page { padding: 20rpx; }
.title { font-size: 40rpx; font-weight: bold; }
.section { margin-top: 40rpx; }
.section-title { font-size: 32rpx; font-weight: bold; margin-bottom: 16rpx; }
.bet-row { display: flex; gap: 20rpx; align-items: center; }
.mark-row { display: flex; gap: 20rpx; }
.input { border: 1rpx solid #ddd; border-radius: 8rpx; padding: 16rpx; width: 200rpx; }
.payout { padding: 8rpx; }
.ledger-item { padding: 12rpx; border-bottom: 1rpx solid #eee; display: flex; gap: 20rpx; }
.entry-type { color: #999; min-width: 80rpx; }
.amount { font-weight: bold; }
</style>
