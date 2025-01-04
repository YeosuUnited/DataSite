let cachedData = null; // 캐싱 데이터를 저장
let token = null;

async function fetchData() {
    const now = new Date().getTime();
    const cachedLastUpdated = localStorage.getItem('lastUpdated');

    if (!cachedLastUpdated || (now - cachedLastUpdated) > 60000) {
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
            ];

            // 병렬 요청 수행
            const responses = await Promise.allSettled(
                files.map((filePath) =>
                    getGitHubFile('YeosuUnited', 'DataSite', filePath, token)
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
            };

            const recordAllSha =
                responses[1].status === 'fulfilled'
                    ? responses[1].value.sha
                    : null;

            const currentYear = new Date().getFullYear();
            data.recordAll = await addMissingYearData(
                data.recordAll,
                currentYear,
                recordAllSha
            );

            // 데이터를 캐싱 변수에 저장
            cachedData = data;
            const lastUpdated = now;

            localStorage.setItem('cachedData', JSON.stringify(cachedData));
            localStorage.setItem('lastUpdated', lastUpdated);
            const thisYearRecords = filterCurrentYearData(cachedData.recordAll, currentYear);

            if (Object.keys(thisYearRecords).length === 0) {
                console.error("올해 데이터가 없습니다.");
                return;
            }

            createCards(cachedData.players, thisYearRecords);

        } catch (error) {
            console.error('Error fetching data:', error);
            useCachedData();
        }
    } else {
        useCachedData();
    }
}

let lastUpdated = null;

function filterCurrentYearData(allTimeRecords, currentYear) {
    const season = currentYear.toString();

    if (!allTimeRecords || typeof allTimeRecords !== 'object') {
        console.error("올바르지 않은 데이터 형식:", allTimeRecords);
        return {};
    }

    // 현재 연도의 데이터를 필터링
    const filteredData = Object.entries(allTimeRecords).reduce((filtered, [playerNumber, yearlyRecords]) => {
        if (yearlyRecords[season]) {
            filtered[playerNumber] = yearlyRecords[season];
        }
        return filtered;
    }, {});

    // 데이터가 없는 경우 로그 및 기본값 반환
    if (Object.keys(filteredData).length === 0) {
        console.warn(`${currentYear} 시즌의 데이터가 없습니다.`);
    }

    return filteredData;
}

function formatTime(date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

function useCachedData() {
    try {
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
            console.log("서버 문제, 캐싱된 데이터를 사용 중입니다.");

            const currentYear = new Date().getFullYear();

            const thisYearRecords = filterCurrentYearData(cachedData.recordAll, currentYear);

            if (Object.keys(thisYearRecords).length === 0) {
                throw new Error("캐싱된 데이터에 현재 연도 데이터가 없습니다.");
            }

            createCards(cachedData.players, thisYearRecords);
        } else {
            throw new Error("캐싱된 데이터가 없습니다.");
        }
    } catch (error) {
        console.error('캐싱 데이터를 사용하는 중 오류 발생:', error);
    }
}

async function addMissingYearData(recordAll, year, sha) {
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

// 공통 유틸리티 함수: GitHub 파일 가져오기
async function getGitHubFile(repoOwner, repoName, filePath) {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
        headers: {
            Authorization: `token ${token}`,
        },
    });

    if (response.ok) {
        const fileData = await response.json();
        return {
            sha: fileData.sha,
            content: JSON.parse(base64ToUtf8(fileData.content)),
        };
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

function createCards(players, thisYearRecords) {
    if (!thisYearRecords || typeof thisYearRecords !== 'object' || Object.keys(thisYearRecords).length === 0) {
        console.error("올해 데이터가 없습니다.");
        return;
    }

    const thisYearData = Object.entries(thisYearRecords).map(([playerNumber, record]) => {
        const playerProfile = players[playerNumber] || {};
        return {
            number: playerNumber,
            name: playerProfile.name || "Unknown",
            posi: playerProfile.posi || "N/A",
            goals: record.goals || 0,
            assists: record.assists || 0,
            attackP: record.attackP || 0,
            matches: record.matches || 0
        };
    });

    const topGoals = getSortedPlayers(thisYearData, 'goals').slice(0, 5);
    createCard(document.getElementById('goal-card'), topGoals, 'goals', '골');

    const topAssists = getSortedPlayers(thisYearData, 'assists').slice(0, 5);
    createCard(document.getElementById('assist-card'), topAssists, 'assists', '도움');

    const topAttackPoints = getSortedPlayers(thisYearData, 'attackP').slice(0, 5);
    createCard(document.getElementById('attack-point-card'), topAttackPoints, 'attackP', 'P');

    const topMatches = getSortedPlayers(thisYearData, 'matches').slice(0, 5);
    createCard(document.getElementById('match-card'), topMatches, 'matches', '경기');
}

function createCard(container, players, key, unit) {
    const card = document.createElement('div');
    card.className = 'card';

    players.forEach((player, index) => {
        if (index === 0) {
            // 1등 특별 스타일
            const firstPlace = document.createElement('div');
            firstPlace.className = 'first-place';

            const badge = document.createElement('img');
            badge.src = 'https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/first.png';
            badge.alt = '1등 배지';
            badge.className = 'badge';
            firstPlace.appendChild(badge);

            const imageContainer = document.createElement('div');
            imageContainer.className = 'player-image-container';

            const playerImage = document.createElement('img');
            playerImage.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/${player.number || 'default'}.png`;
            playerImage.alt = player.name;
            playerImage.className = 'player-image';
            playerImage.onerror = () => {
                playerImage.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default.png`;
            };

            imageContainer.appendChild(playerImage);

            const playerNameContainer = document.createElement('div');
            playerNameContainer.className = 'player-name-container';

            const playerName = document.createElement('span');
            playerName.className = 'player-name';
            playerName.textContent = player.name;

            const playerPosition = document.createElement('span');
            playerPosition.className = 'player-position-first';
            playerPosition.textContent = player.posi;

            playerNameContainer.appendChild(playerName);
            playerNameContainer.appendChild(playerPosition);

            const statValue = document.createElement('div');
            statValue.className = 'stat-value';
            statValue.textContent = `${player[key]} ${unit}`;

            firstPlace.appendChild(imageContainer);
            firstPlace.appendChild(playerNameContainer);
            firstPlace.appendChild(statValue);

            card.appendChild(firstPlace);
        } else {
            // 2등 이하 기본 스타일
            const playerInfo = document.createElement('div');
            playerInfo.className = 'player-info';

            const rank = document.createElement('span');
            rank.textContent = player.rank;
            rank.className = 'rank-number';

            const playerImage = document.createElement('img');
            playerImage.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/${player.number || 'default'}.png`;
            playerImage.alt = player.name;
            playerImage.className = 'player-image-small';
            playerImage.onerror = () => {
                playerImage.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default.png`;
            };

            const nameAndPositionContainer = document.createElement('div');
            nameAndPositionContainer.style.display = 'flex';
            nameAndPositionContainer.style.flexDirection = 'column';

            const playerName = document.createElement('span');
            playerName.className = 'player-name';
            playerName.textContent = player.name;

            const playerPosition = document.createElement('span');
            playerPosition.className = 'player-position';
            playerPosition.textContent = player.posi;

            nameAndPositionContainer.appendChild(playerName);
            nameAndPositionContainer.appendChild(playerPosition);

            const statValue = document.createElement('span');
            statValue.className = 'stat-value-right';
            statValue.textContent = `${player[key]} ${unit}`;

            const inlineContainer = document.createElement('div');
            inlineContainer.className = 'inline-container';
            inlineContainer.appendChild(rank);
            inlineContainer.appendChild(playerImage);
            inlineContainer.appendChild(nameAndPositionContainer);

            playerInfo.appendChild(inlineContainer);
            playerInfo.appendChild(statValue);

            card.appendChild(playerInfo);
        }
    });

    container.appendChild(card);
}

function getSortedPlayers(data, key) {
    const sorted = [...data].sort((a, b) => {
        if (b[key] !== a[key]) return b[key] - a[key]; // 주요 키 기준 내림차순
        return b['matches'] - a['matches']; // 동률일 경우 경기 수 기준 내림차순
    });

    let rank = 0; // 현재 순위
    let prevValue = null; // 이전 값 저장
    let skipCount = 0; // 건너뛸 순위 수

    sorted.forEach((data, index) => {
        if (prevValue !== null && data[key] === prevValue) {
            // 현재 값이 이전 값과 같으면 동일 순위
            data.rank = rank; // 동일 순위 유지
            skipCount++; // 동률 수 증가
        } else {
            // 값이 달라지면 새로운 순위
            rank += skipCount + 1; // 동률 수만큼 건너뛰고 다음 순위로
            data.rank = rank; // 새로운 순위 설정
            skipCount = 0; // 동률 수 초기화
        }
        prevValue = data[key]; // 이전 값 업데이트
    });

    return sorted;
}

function enableDragScroll() {
    const cardSectionContainer = document.querySelector('.card-section-container');
    let isDown = false;
    let startX;
    let scrollLeft;

    cardSectionContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - cardSectionContainer.offsetLeft;
        scrollLeft = cardSectionContainer.scrollLeft;
        cardSectionContainer.style.cursor = 'grabbing'; // 커서 변경
    });

    cardSectionContainer.addEventListener('mouseleave', () => {
        isDown = false;
        cardSectionContainer.style.cursor = 'grab';
    });

    cardSectionContainer.addEventListener('mouseup', () => {
        isDown = false;
        cardSectionContainer.style.cursor = 'grab';
    });

    cardSectionContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return; // 드래그 상태가 아니면 종료
        e.preventDefault();
        const x = e.pageX - cardSectionContainer.offsetLeft;
        const walk = (x - startX) * 2; // 드래그 속도 조정
        cardSectionContainer.scrollLeft = scrollLeft - walk;
    });
}

window.onload = function () {
    fetchData();
    enableDragScroll();

    // 팝업 관련 요소 초기화
    const popup = document.getElementById('password-popup');
    const closeBtn = document.querySelector('.close-btn');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');

    const errorMessage = document.createElement('div');
    errorMessage.classList.add('error-message');
    popup.querySelector('.popup-content').appendChild(errorMessage);

    document.querySelector('.fixed-top-right').addEventListener('click', () => {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        if (isAuthenticated === 'true') {
            // 이미 인증된 경우 바로 managerMain.html로 이동
            window.location.href = 'managerMain.html';
        }
        popup.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        popup.classList.add('hidden');
        clearPopup();
    });

    popup.addEventListener('click', (e) => {
        if (e.target.id === 'password-popup') {
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

    function handleLogin() {
        const password = passwordInput.value;

        if (password === 'dutndusgkq1990') {
            localStorage.setItem('isAuthenticated', 'true'); // 인증 상태 저장
            window.location.href = 'managerMain.html';
        } else {
            errorMessage.textContent = '비밀번호가 틀렸습니다.';
            errorMessage.style.display = 'block';

            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 2000);
        }
    }

    // 페이지 로드 시 인증 상태 확인
    function checkAuthentication() {
        const isAuthenticated = localStorage.getItem('isAuthenticated');

        if (isAuthenticated !== 'true') { // 인증되지 않은 경우
            alert('인증되지 않은 접근입니다.');
            window.location.href = 'index.html'; // 메인 페이지로 이동
        }
    }

    function clearPopup() {
        passwordInput.value = '';
        errorMessage.style.display = 'none';
    }
};
