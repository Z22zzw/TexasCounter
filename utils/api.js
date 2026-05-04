const BASE_URL = "http://1.14.183.170:3000"; // configure per environment

let _token = "";

export function setToken(token) {
  _token = token;
}

export function getToken() {
  return _token;
}

function headers() {
  const h = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  return h;
}

async function request(method, path, data) {
  const res = await uni.request({
    url: `${BASE_URL}${path}`,
    method,
    header: headers(),
    data,
  });
  return res[1] || res;
}

export const api = {
  wechatLogin(code) {
    return request("POST", "/api/auth/wechat-login", { code });
  },

  createRoom(name, password) {
    return request("POST", "/api/rooms", { name, password });
  },

  listRooms() {
    return request("GET", "/api/rooms");
  },

  getRoom(roomId) {
    return request("GET", `/api/rooms/${roomId}`);
  },

  joinByCode(roomId, roomCode) {
    return request("POST", `/api/rooms/${roomId}/join-by-code`, { roomCode });
  },

  joinByList(roomId, password) {
    return request("POST", `/api/rooms/${roomId}/join-by-list`, { password });
  },

  startHand(roomId) {
    return request("POST", `/api/rooms/${roomId}/hands/start`);
  },

  placeBet(handId, amountInt, roundIndex) {
    return request("POST", `/api/hands/${handId}/bets`, { amountInt, roundIndex });
  },

  markResult(handId, result) {
    return request("POST", `/api/hands/${handId}/mark-result`, { result });
  },

  settleHand(handId) {
    return request("POST", `/api/hands/${handId}/settle`);
  },

  getHandLedger(handId) {
    return request("GET", `/api/hands/${handId}/ledger`);
  },

  getLeaderboard(roomId) {
    return request("GET", `/api/rooms/${roomId}/leaderboard`);
  },

  getTitles(roomId) {
    return request("GET", `/api/rooms/${roomId}/titles`);
  },
};
