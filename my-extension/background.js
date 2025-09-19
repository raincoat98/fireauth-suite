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

// popup → background 메시지 수신
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
      }

      if (msg?.type === "GET_AUTH_STATE") {
        // offscreen document에서 인증 상태 확인
        await setupOffscreen();
        const result = await chrome.runtime.sendMessage({
          target: "offscreen",
          type: "GET_AUTH_STATE",
        });
        await closeOffscreen();
        sendResponse(result);
      }

      if (msg?.type === "LOGOUT") {
        // offscreen document에서 로그아웃 처리
        await setupOffscreen();
        const result = await chrome.runtime.sendMessage({
          target: "offscreen",
          type: "LOGOUT",
        });
        await closeOffscreen();
        sendResponse(result);
      }
    } catch (error) {
      console.error("Background script error:", error);
      sendResponse({ error: error.message });
    }
  })();

  // async 응답을 위해 true
  return true;
});

// 외부 웹사이트에서 로그인 완료 시 호출되는 메시지 처리
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "LOGIN_SUCCESS" && request.user) {
      // Chrome Storage에 사용자 정보 저장
      chrome.storage.local.set({ currentUser: request.user }, () => {
        console.log("User login saved from external site:", request.user);
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === "LOGOUT_SUCCESS") {
      // Chrome Storage에서 사용자 정보 제거
      chrome.storage.local.remove(["currentUser"], () => {
        console.log("User logout completed from external site");
        sendResponse({ success: true });
      });
      return true;
    }
  }
);

// GET_AUTH_STATE를 Chrome Storage에서 직접 처리하도록 수정
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "GET_AUTH_STATE") {
    chrome.storage.local.get(["currentUser"], (result) => {
      sendResponse({ user: result.currentUser || null });
    });
    return true;
  }

  if (msg?.type === "LOGOUT") {
    chrome.storage.local.remove(["currentUser"], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// serializeUser 함수는 offscreen.js에서 처리
