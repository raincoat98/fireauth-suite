// Chrome Extension MV3에서는 Firebase SDK를 직접 import할 수 없음
// 모든 Firebase 로직은 offscreen document에서 처리

// Offscreen 문서 경로 상수
const OFFSCREEN_PATH = "offscreen.html";

// 동시 생성 방지
let creatingOffscreen;

async function hasOffscreen() {
  const clientsList = await self.clients.matchAll();
  return clientsList.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_PATH)
  );
}

async function setupOffscreen() {
  if (await hasOffscreen()) return;
  if (creatingOffscreen) return creatingOffscreen;

  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification: "Firebase signInWithPopup in iframe (MV3 limitation)",
  });
  await creatingOffscreen;
}

async function closeOffscreen() {
  if (await hasOffscreen()) {
    await chrome.offscreen.closeDocument();
  }
}

// 외부 웹사이트에서 로그인 완료 시 호출되는 메시지 처리
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "LOGIN_SUCCESS" && request.user) {
      // Chrome Storage에 사용자 정보 저장
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ currentUser: request.user }, () => {
          console.log("User login saved from external site:", request.user);
          sendResponse({ success: true });
        });
      } else {
        console.error("Chrome Storage API가 사용할 수 없습니다");
        sendResponse({ success: false, error: "Storage API unavailable" });
      }
      return true;
    }

    if (request.type === "LOGOUT_SUCCESS") {
      // Chrome Storage에서 사용자 정보 제거
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(["currentUser"], () => {
          console.log("User logout completed from external site");
          sendResponse({ success: true });
        });
      } else {
        console.error("Chrome Storage API가 사용할 수 없습니다");
        sendResponse({ success: false, error: "Storage API unavailable" });
      }
      return true;
    }
  }
);

// popup → background 메시지 수신 (통합된 단일 리스너)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "LOGIN_GOOGLE") {
        await setupOffscreen();
        // offscreen으로 위임
        const result = await chrome.runtime.sendMessage({
          target: "offscreen",
          type: "START_POPUP_AUTH",
        });
        await closeOffscreen();
        sendResponse(result);
        return;
      }

      if (msg?.type === "GET_AUTH_STATE") {
        // Chrome Storage에서 직접 사용자 정보 조회
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(["currentUser"], (result) => {
            sendResponse({ user: result.currentUser || null });
          });
        } else {
          console.error("Chrome Storage API가 사용할 수 없습니다");
          sendResponse({ user: null, error: "Storage API unavailable" });
        }
        return;
      }

      if (msg?.type === "LOGOUT") {
        // Chrome Storage에서 사용자 정보 제거
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(["currentUser"], () => {
            sendResponse({ success: true });
          });
        } else {
          console.error("Chrome Storage API가 사용할 수 없습니다");
          sendResponse({ success: false, error: "Storage API unavailable" });
        }
        return;
      }
    } catch (error) {
      console.error("Background script error:", error);
      sendResponse({ error: error.message });
    }
  })();

  // async 응답을 위해 true
  return true;
});

// serializeUser 함수는 offscreen.js에서 처리
