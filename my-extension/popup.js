const $btn = document.getElementById("login");
const $user = document.getElementById("user");

$btn.addEventListener("click", async () => {
  // React 앱으로 리다이렉트하여 로그인 처리
  const loginUrl = `https://bookmarkhub-5ea6c.web.app?source=extension&extensionId=${chrome.runtime.id}`;
  chrome.tabs.create({ url: loginUrl });

  // 팝업 창 닫기
  window.close();
});

async function refreshUser() {
  try {
    const result = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" });
    if (result?.error) {
      console.error("Storage API 에러:", result.error);
      return;
    }
    if (result?.user) renderUser(result.user);
  } catch (error) {
    console.error("인증 상태 확인 에러:", error);
  }
}
function renderUser(user) {
  $user.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <img src="${
          user.photoURL || ""
        }" width="24" style="border-radius:50%;margin-right:6px;">
        <span>${user.displayName || user.email}</span>
      </div>
      <button id="logout" style="margin-left: 10px; padding: 4px 8px; font-size: 12px;">로그아웃</button>
    </div>`;

  // 로그아웃 버튼 이벤트 리스너 추가
  document.getElementById("logout").addEventListener("click", async () => {
    try {
      const result = await chrome.runtime.sendMessage({ type: "LOGOUT" });
      if (result?.error) {
        console.error("Storage API 에러:", result.error);
        return;
      }
      if (result?.success) {
        $user.innerHTML = "";
        $btn.style.display = "block";
      }
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  });

  // 로그인 버튼 숨기기
  $btn.style.display = "none";
}
refreshUser();
