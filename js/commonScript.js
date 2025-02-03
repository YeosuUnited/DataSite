let cachedData = null; // 캐싱 데이터를 저장
let token = null;

async function fetchData() {
    const now = new Date().getTime();
    const cachedLastUpdated = parseInt(localStorage.getItem('lastUpdated'), 10);

    if (!cachedLastUpdated || (now - cachedLastUpdated) > 300000) {
        try {
            const urls = [
                'https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/data/token_1.text',
                'https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/data/token_2.text',
            ];

            const tokenResponses = await Promise.allSettled(
                urls.map(url =>
                    fetch(url)
                        .then(response => {
                            if (!response.ok) {
                                console.error(`네트워크 오류 발생: ${url}`);
                                throw new Error(`네트워크 응답에 문제가 있습니다: ${url}`);
                            }
                            return response.text();
                        })
                )
            );

            // token 파일 내용 합치기
            const token_1 = tokenResponses[0].status === 'fulfilled' ? tokenResponses[0].value.replace(/\n/g, '') : '';
            const token_2 = tokenResponses[1].status === 'fulfilled' ? tokenResponses[1].value.replace(/\n/g, '') : '';
            token = token_1 + token_2;

            // token을 localStorage에 저장
            localStorage.setItem('token', token)

            // 가져올 파일들 (GitHub Contents API를 활용)
            const files = [
                'assets/data/player_data.json',
                'assets/data/records_allTime.json',
                'assets/data/matches_total.json',
                'assets/data/subPlayer_data.json',
                'assets/data/youtube_link.json',
            ];

            // 병렬 요청 수행
            const responses = await Promise.allSettled(
                files.map((filePath) =>
                    getGitHubFile('YeosuUnited', 'DataSite', filePath)
                )
            );

            // 응답 데이터를 개별적으로 처리
            const data = {
                players:
                    responses[0].status === 'fulfilled'
                        ? responses[0].value.content
                        : {},
                recordAll:
                    responses[1].status === 'fulfilled'
                        ? responses[1].value.content
                        : {},
                matchesTotal:
                    responses[2].status === 'fulfilled'
                        ? responses[2].value.content
                        : {},
                subPlayer:
                    responses[3].status === 'fulfilled'
                        ? responses[3].value.content
                        : {},
                youtubeLink:
                    responses[4].status === 'fulfilled'
                        ? responses[4].value.content
                        : {},
            };

            const recordAllSha =
                responses[1].status === 'fulfilled'
                    ? responses[1].value.sha
                    : null;

            const subPlayerSha =
                responses[3].status === 'fulfilled'
                    ? responses[3].value.sha
                    : null;


            const nowYear = new Date().getFullYear();
            data.recordAll = await addMissingYearData(
                nowYear,
                data.recordAll,
                recordAllSha
            );

            data.subPlayer = await addMissingSubYearData(
                nowYear,
                data.subPlayer,
                subPlayerSha
            );

            // 캐싱 데이터 저장
            cachedData = data;
            const lastUpdated = now;
            localStorage.setItem('cachedData', JSON.stringify(cachedData));
            localStorage.setItem('lastUpdated', lastUpdated);
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            useCachedData();
        }
    } else {
        useCachedData();
    }
}

// localStorage 저장 함수
function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// localStorage 읽기 함수
function loadFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    try {
        return JSON.parse(data); // JSON 파싱
    } catch (error) {
        console.error('캐싱된 데이터를 파싱하는 중 오류 발생:', error);
        return null; // 파싱 실패 시 null 반환
    }
}

// 데이터 유효성 검증 함수
function validateCachedData(data) {
    return (
        data &&
        typeof data === 'object' &&
        data.players &&
        data.recordAll &&
        data.matchesTotal&&
        data.youtubeLink
    );
}


// 캐싱 데이터 로드 함수
function useCachedData() {
    const cachedToken = localStorage.getItem('token');
    if (cachedToken) {
        token = cachedToken;
    }
    else {
        console.log("데이터를 불러오는 중 오류가 발생했습니다.");
    }

    const cached = localStorage.getItem('cachedData');
    if (cached) {
        cachedData = JSON.parse(cached);                
        console.log("캐싱된 데이터를 사용 중입니다.");
    } else {
        throw new Error("캐싱된 데이터가 없습니다.");
    }
}

function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours < 12 ? '오전' : '오후';
    const formattedHours = hours % 12 || 12;
    return `${period} ${formattedHours}시${minutes ? ` ${minutes}분` : ''}`;
}

async function addMissingYearData(year, recordAll, sha,) {
    let isModify = false;

    for (const playerNumber in recordAll) {
        // 해당 선수에 year 키가 없으면 추가
        if (!recordAll[playerNumber][year]) {
            isModify = true;
            recordAll[playerNumber][year] = {
                goals: 0,
                assists: 0,
                attackP: 0,
                matches: 0,
            };
        }
    }

    // 누락된 연도가 하나라도 있었다면 GitHub에 저장
    if (isModify) {
        await saveGitHubFile(
            'YeosuUnited',
            'DataSite',
            'assets/data/records_allTime.json',
            recordAll,
            sha, // 기존 파일의 sha
            `Add ${year} data if missing`
        );
        console.log(`"${year}" 데이터가 없던 선수에게 기본값을 추가하고, GitHub에 업로드했습니다.`);
    }

    return recordAll;
}

async function addMissingSubYearData(year, subPlayer, subSha) {
    let isSubModify = false;

    for (const playerName in subPlayer) {
        if (!subPlayer[playerName][year]) {
            isSubModify = true;
            subPlayer[playerName][year] = {
                goals: 0,
                assists: 0,
                attackP: 0,
                matches: 0,
            }
        }
    }

    if (isSubModify) {
        await saveGitHubFile(
            'YeosuUnited',
            'DataSite',
            'assets/data/subPlayer_data.json',
            subPlayer,
            subSha, // 기존 파일의 sha
            `Add ${year} data if missing`
        );
        console.log(`"${year}" 데이터가 없던 선수에게 기본값을 추가하고, GitHub에 업로드했습니다.`);
    }

    return subPlayer;
}

// 공통 유틸리티 함수: GitHub 파일 가져오기
async function getGitHubFile(repoOwner, repoName, filePath) {
    //const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
    //    headers: {
    //        Authorization: `token ${token}`,
    //    },
    //});

    //if (response.ok) {
    //    const fileData = await response.json();
    //    return {
    //        sha: fileData.sha,
    //        content: JSON.parse(base64ToUtf8(fileData.content)),
    //    };
    //} else {
    //    console.warn(`파일을 찾을 수 없습니다: ${filePath}`);
    //    return { sha: null, content: {} };
    //}
    
    const response = await fetch(`https://raw.githubusercontent.com/YeosuUnited/DataSite/main/${filePath}`);

    if (response.ok) {
            try {
                const fileData = await response.json(); // Base64 변환 제거
                return {
                    sha: null, // raw.githubusercontent.com에서는 sha 제공 안 함
                    content: fileData,
                };
            } catch (error) {
                console.error(`JSON 파싱 오류 발생: ${filePath}`, error);
                return { sha: null, content: {} };
            }
        } else {
            console.warn(`파일을 찾을 수 없습니다: ${filePath}`);
            return { sha: null, content: {} };
        }
}

// 공통 유틸리티 함수: GitHub 파일 저장
async function saveGitHubFile(repoOwner, repoName, filePath, content, sha, message) {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
        method: "PUT",
        headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message,
            content: utf8ToBase64(JSON.stringify(content, null, 2)),
            sha: sha || null, // 새 파일인 경우 sha를 null로 처리
        }),
    });

    if (!response.ok) {
        throw new Error(`파일 저장에 실패했습니다: ${filePath}`);
    }

    return await response.json();
}

// UTF-8 문자열을 Base64로 변환
function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

// Base64 문자열을 UTF-8로 변환
function base64ToUtf8(str) {
    return decodeURIComponent(escape(atob(str)));
}

async function loadPlayerImage(player) {
    const img = document.createElement('img');
    const imageUrl = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/${player.number || 'default'}.png`;

    if ('caches' in window) {
        try {
            const cache = await caches.open('my-image-cache');
            let response = await cache.match(imageUrl);
            let blob;
            if (response) {
                blob = await response.blob();
            } else {
                const networkResponse = await fetch(imageUrl);
                blob = await networkResponse.blob();
                cache.put(imageUrl, networkResponse.clone());
            }
            img.src = URL.createObjectURL(blob);
        } catch (error) {
            img.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default.png`;
        }
    } else {
        try {
            const networkResponse = await fetch(imageUrl);
            const blob = await networkResponse.blob();
            img.src = URL.createObjectURL(blob);
        } catch (error) {
            img.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default.png`;
        }
    }
    return img;
}

// 페이지 상단이나 초기화 시 실행 (전역에 추가)
function debugLog(message) {
  let debugDiv = document.getElementById("debug-container");
  if (!debugDiv) {
    debugDiv = document.createElement("div");
    debugDiv.id = "debug-container";
    debugDiv.style.cssText = "position: fixed; bottom: 0; left: 0; width: 100%; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.8); color: #fff; font-size: 14px; z-index: 10000; padding: 10px;";
    document.body.appendChild(debugDiv);
  }
  const p = document.createElement("div");
  p.textContent = message;
  debugDiv.appendChild(p);
}

function loadPlayerProfileImage(player) {
    const img = document.createElement('img');
    const imageUrl = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/${player.number || 'default'}_P.png`;

    caches.open('my-image-cache').then(cache => {
        cache.match(imageUrl).then(response => {
            if (response) return response.blob();
            return fetch(imageUrl).then(networkResponse => {
                cache.put(imageUrl, networkResponse.clone());
                return networkResponse.blob();
            });
        }).then(blob => {
            const objectURL = URL.createObjectURL(blob);
            img.src = objectURL;
        }).catch(() => {
            img.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default.png`;
        });
    });
    return img;
}

function loadPlayerCardImage(player) {
    const img = document.createElement('img');
    const imageUrl = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/card/${player.number || 'default'}_C_.png`;

    caches.open('my-image-cache').then(cache => {
        cache.match(imageUrl).then(response => {
            if (response) return response.blob();
            return fetch(imageUrl).then(networkResponse => {
                cache.put(imageUrl, networkResponse.clone());
                return networkResponse.blob();
            });
        }).then(blob => {
            const objectURL = URL.createObjectURL(blob);
            img.src = objectURL;
        }).catch(() => {
            img.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default.png`;
        });
    });
    return img;
}

async function getCachedImageUrl(imageUrl) {
    const cache = await caches.open('my-image-cache');
    let response = await cache.match(imageUrl);
    if (!response) {
        response = await fetch(imageUrl);
        await cache.put(imageUrl, response.clone());
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

function toggleMenu() {
    const menu = document.getElementById('fullMenu');
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
}

window.addEventListener("scroll", function () {
    const header = document.querySelector(".header");
    const sponserListHeight = document.querySelector(".sponserList").offsetHeight;
    
    if (window.scrollY > sponserListHeight) {
        header.style.position = "fixed";
        header.style.top = "0";
    } else {
        header.style.position = "absolute";
        header.style.top = sponserListHeight + "px";
    }
});

window.addEventListener("scroll", function () {
    const fullMenu = document.querySelector(".full-menu");
    const sponserListHeight = document.querySelector(".sponserList").offsetHeight;

    if (window.scrollY > sponserListHeight) {
        fullMenu.classList.add("fixed");
    } else {
        fullMenu.classList.remove("fixed");
    }
});

function initManagerPopup() {
    const popup = document.getElementById('password-managerPopup');
    const closeBtn = document.querySelector('.mg-popup-close-btn');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');

    if (!popup || !closeBtn || !passwordInput || !loginButton) {
        console.error("🚨 관리자 팝업 관련 요소를 찾을 수 없습니다.");
        return;
    }

    const errorMessage = document.createElement('div');
    errorMessage.classList.add('error-message');
    popup.querySelector('.managerPopup-content').appendChild(errorMessage);

    document.querySelector('.managerPage').addEventListener('click', () => {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        if (isAuthenticated === 'true') {
            window.location.href = 'managerMain.html';
        }
        popup.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        popup.classList.add('hidden');
        clearPopup();
    });

    popup.addEventListener('click', (e) => {
        if (e.target.id === 'password-managerPopup') {
            popup.classList.add('hidden');
            clearPopup();
        }
    });

    loginButton.addEventListener('click', () => handleLogin());

    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    popup.classList.add('hidden'); // 팝업에 기본적으로 hidden 클래스 추가
}

function handleLogin() {
    const passwordInput = document.getElementById('password-input');
    const errorMessage = document.querySelector('#password-managerPopup .error-message');
    const password = passwordInput.value;

    if (password === 'dutndusgkq1990') {
        localStorage.setItem('isAuthenticated', 'true');
        window.location.href = 'managerMain.html';
    } else {
        errorMessage.textContent = '비밀번호가 틀렸습니다.';
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 2000);
    }
}

function clearPopup() {
    document.getElementById('password-input').value = '';
    const errorMessage = document.querySelector('#password-managerPopup .error-message');
    if(errorMessage) errorMessage.style.display = 'none';
}

async function loadCommonBody() {
    try {
        const version = new Date().getTime(); // 캐싱 방지용 타임스탬프 추가
        const response = await fetch(`https://yeosuunited.com/js/commonBody.html?v=${version}`);
        if (!response.ok) throw new Error("공통 요소 로드 실패");
        
        const html = await response.text();
        const commonContainer = document.getElementById('common-container');
        if (commonContainer) {
            commonContainer.innerHTML = html;
        } else {
            console.error("🚨 'common-container' 요소를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('공통 요소를 불러오는 데 실패했습니다:', error);
    }
}
