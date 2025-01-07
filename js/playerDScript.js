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

            // 캐싱 데이터 저장
            cachedData = data;
            const lastUpdated = now;
            localStorage.setItem('cachedData', JSON.stringify(cachedData));
            localStorage.setItem('lastUpdated', lastUpdated);

            renderPlayerList();
        } catch (error) {
            console.error('Error fetching data:', error);
            useCachedData();
        }
    } else {
        useCachedData();
    }
}

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
        const data = JSON.parse(cached);
        cachedData = data;
        console.log("서버 문제, 캐싱된 데이터를 사용 중입니다.");
        const lastUpdated = parseInt(localStorage.getItem('lastUpdated'), 10);
        renderPlayerList();
    } else {
        console.log("캐싱된 데이터가 없습니다.");
    }
}

function formatTime(date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
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

// (예) 데이터 로딩(fetchData)이 끝난 후, 로드가 완료되면 호출할 함수를 하나 추가합니다.
function renderPlayerList() {
    const container = document.createElement('div');
    container.id = 'player-list';
    container.style.padding = '20px';
    container.style.backgroundColor = '#f9f9f9';

    // 기존 내용 초기화
    const existingContainer = document.getElementById('player-list');
    if (existingContainer) {
        existingContainer.remove();
    }

    document.body.appendChild(container);

    if (!cachedData || !cachedData.players) {
        container.innerHTML = '<p>선수 데이터가 없습니다.</p>';
        return;
    }

    // 선수 리스트 생성
    Object.entries(cachedData.players).forEach(([number, player]) => {
        const playerImage = document.createElement('img');
        playerImage.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/${player.number || 'default'}.png`;
        playerImage.alt = player.name;
        playerImage.className = 'player-image';
        playerImage.style.width = '25px';
        playerImage.style.height = '25px';
        playerImage.style.borderRadius = '50%';
        playerImage.style.objectFit = 'cover';
        playerImage.style.marginRight = '10px';
        playerImage.onerror = () => {
            playerImage.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default.png`;
        };

        const playerRow = document.createElement('div');
        playerRow.className = 'player-row';
        playerRow.style.display = 'flex';
        playerRow.style.justifyContent = 'space-between';
        playerRow.style.padding = '10px 0';
        playerRow.style.borderBottom = '1px solid #ccc';

        const playerInfo = document.createElement('span');
        playerInfo.style.display = 'flex';
        playerInfo.style.alignItems = 'center'; // 이미지를 텍스트와 수직 정렬
        playerInfo.innerHTML = `
                        <span style="font-weight: bold;">${player.name}</span>
                        <span style="color: gray; font-size: 0.9em; margin-left: 5px;">${player.posi}</span>
                        <span style="color: gray; font-size: 0.9em; position: absolute; left: 160px;">no.<span style="font-weight: bold;">${number}</span>
                       `;

        // 이미지 노드를 playerInfo의 가장 앞에 추가
        playerInfo.prepend(playerImage);

        const modifyButton = document.createElement('button');
        modifyButton.textContent = '상세기록';
        modifyButton.className = 'modify-button';
        modifyButton.style.backgroundColor = '#4CAF50';
        modifyButton.style.color = 'white';
        modifyButton.style.border = 'none';
        modifyButton.style.padding = '5px 10px';
        modifyButton.style.cursor = 'pointer';
        modifyButton.style.borderRadius = '5px';

        // 클릭 이벤트 추가
        modifyButton.addEventListener('click', function () {
            const playerNumber = this.getAttribute('data-player-number'); // 버튼에 설정된 번호 가져오기
            if (cachedData && cachedData.players) {
                const player = cachedData.players[playerNumber]; // 등번호로 직접 접근
                if (player) {
                    displayPlayerDetails(player); // 선수 상세 정보 표시
                    displayPlayerRecord(player); // 선수 기록 표시
                    document.getElementById('player-details').style.display = 'block'; // 상세 정보 숨김
                    document.getElementById('player-list').style.display = 'none'; // 선수 목록 표시
                } else {
                    console.error(`Player not found for number: ${playerNumber}`);
                }
            } else {
                console.error('Cached data or players not available');
            }
        });

        modifyButton.setAttribute('data-player-number', number);

        playerRow.appendChild(playerInfo);
        playerRow.appendChild(modifyButton);
        container.appendChild(playerRow);
    });
}

function displayPlayerDetails(player) {
    const playerDetailsElement = document.getElementById('player-details');
    playerDetailsElement.style.display = 'block'; // 상세 정보 표시
    document.getElementById('player-list').style.display = 'none'; // 선수 목록 숨김

    playerDetailsElement.innerHTML = `
                                <button id="back-to-list" class="back-button" style="margin-bottom: 10px;">선수 목록</button>
                                <div class="divider"></div>
                                 <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px; margin-bottom: -10px">
                                 <!-- 정보 섹션 -->
                                    <div style="flex: 1; margin-right: 20px; margin-left: -10px;">
                                        <div>
                                            <span class="label">신체: </span><span class="value">${player.height}cm</span>, <span class="value">${player.weight}kg</span>
                                        </div>
                                        <div>
                                            <span class="label">이름: </span><span class="value">${player.name}</span> <span class="label">NO.${player.number}</span>
                                        </div>
                                        <div>
                                            <span class="label">출생: </span><span class="value">${formatBirthdate(player.birth)}</span>
                                        </div>
                                        <div>
                                            <span class="label">포지션: </span><span class="value">${player.posi}</span>
                                        </div>                                                                                                
                                        <div>
                                            <span class="label">혈액형: </span><span class="value">${player.bloodType}</span>
                                        </div>
                                        <div>
                                            <span class="label">번호: </span><span class="value">${formatPhoneNumber(player.phone)}</span>
                                        </div>
                                    </div>
                                <!-- 사진 섹션 -->
                                    <div style="flex-shrink: 0;">
                                        <img
                                            src="https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/${player.number || 'default'}.png" 
                                            alt="${player.name}" 
                                            style="width: 120px; height: 150px; border-radius: 10px; object-fit: cover; margin-top:-10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"
                                            onerror="this.src='https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default.png';">
                                        </div>
                                    </div>
                                </div>
                                <div class="divider"></div>
                            `;

    // "선수 목록" 버튼 이벤트 리스너 등록
    const backButton = document.getElementById('back-to-list');
    backButton.addEventListener('click', function () {
        playerDetailsElement.style.display = 'none'; // 상세 정보 숨김
        document.getElementById('player-list').style.display = 'block'; // 선수 목록 표시
    });
}

function formatBirthdate(birthdate) {
    if (!/^\d{8}$/.test(birthdate)) return birthdate; // 입력값이 YYYYMMDD 형식이 아니면 그대로 반환
    const year = birthdate.substring(0, 4);
    const month = birthdate.substring(4, 6);
    const day = birthdate.substring(6, 8);
    return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

function formatPhoneNumber(phoneNumber) {
    if (!/^\d{11}$/.test(phoneNumber)) return phoneNumber; // 입력값이 11자리 숫자가 아니면 그대로 반환
    const part1 = phoneNumber.substring(0, 3); // 앞 3자리
    const part2 = phoneNumber.substring(3, 7); // 중간 4자리
    const part3 = phoneNumber.substring(7, 11); // 마지막 4자리
    return `${part1}-${part2}-${part3}`;
}

function displayPlayerRecord(player) {
    const playerDetailsElement = document.getElementById('player-details'); // 요소를 함수 내부에서 다시 가져옴
    const allRecords = { ...cachedData.recordAll?.[player.number] || {} };
    if (Object.keys(allRecords).length === 0) {
        return; // 기록이 없으면 함수 종료
    }

    let summary = {
        경기수: 0,
        득점: 0,
        도움: 0,
        공격P: 0,
    };

    const yearRecords = Object.entries(allRecords);

    // 통산 기록 계산
    yearRecords.forEach(([year, record]) => {
        summary.경기수 += parseInt(record.matches, 10);
        summary.득점 += parseInt(record.goals, 10);
        summary.도움 += parseInt(record.assists, 10);
        summary.공격P += parseInt(record.attackP, 10);
    });

    let recordHtml = `
                <div class="record-container">
                    <div class="record-header">
                        <span class="title">통산기록</span>
                        <span class="subtitle">최근 10년 데이터</span>
                    </div>
                    <table class="record-table">
                        <thead>
                            <tr>
                                <th>시즌</th>
                                <th>경기수</th>
                                <th>득점</th>
                                <th>도움</th>
                                <th>공격P</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="summary">
                                <td>통산</td>
                                <td>${summary.경기수}</td>
                                <td>${summary.득점}</td>
                                <td>${summary.도움}</td>
                                <td>${summary.공격P}</td>
                            </tr>
            `;

    yearRecords
        .sort((a, b) => parseInt(b[0], 10) - parseInt(a[0], 10))
        .forEach(([year, record], index) => {
            const rowClass = index < 1 ? 'year-data' : 'other-year-data';
            recordHtml += `
                    <tr class="${rowClass}">
                        <td>${year}</td>
                        <td>${record.matches}</td>
                        <td>${record.goals}</td>
                        <td>${record.assists}</td>
                        <td>${record.attackP}</td>
                    </tr>
                `;
        });

    recordHtml += `
            </tbody>
                </table>
            </div>
            `;

    playerDetailsElement.insertAdjacentHTML('beforeend', recordHtml);
}

// "선수 목록" 버튼 클릭 시 동작
document.addEventListener('DOMContentLoaded', function () {
    const backButton = document.getElementById('back-to-list');
    backButton.addEventListener('click', function () {
        document.getElementById('player-details').style.display = 'none'; // 상세 정보 숨김
        document.getElementById('player-list').style.display = 'block'; // 선수 목록 표시
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const searchInputElement = document.getElementById('search-input');
    const searchResultsElement = document.getElementById('search-results');
    const logoElement = document.getElementById('logo');
    const playerDetailsElement = document.getElementById('player-details');

    // 로고 클릭 시 index 화면으로 이동
    logoElement.addEventListener('click', function () {
        window.location.href = 'index.html';
    });

    // 검색 입력 이벤트 리스너
    searchInputElement.addEventListener('input', function () {
        const searchTerm = searchInputElement.value.trim().toLowerCase();
        if (cachedData && cachedData.players) {
            const filteredPlayers = Object.entries(cachedData.players)
                .filter(([_, player]) => player.name.toLowerCase().includes(searchTerm))
                .slice(0, 5);
            if (filteredPlayers.length > 0) {
                let resultsHtml = "<ul>";
                filteredPlayers.forEach(([_, player]) => {
                    resultsHtml += `<li data-player-name="${player.name}">${player.name} - NO.${player.number}</li>`;
                });
                resultsHtml += "</ul>";
                searchResultsElement.innerHTML = resultsHtml;
                searchResultsElement.style.display = 'block';
            } else {
                searchResultsElement.innerHTML = "";
                searchResultsElement.style.display = 'none';
            }
        } else {
            searchResultsElement.innerHTML = "";
            searchResultsElement.style.display = 'none';
        }
    });


    // 검색 결과 클릭 이벤트 리스너 수정
    searchResultsElement.addEventListener('click', function (event) {
        if (event.target && event.target.tagName === 'LI') {
            const playerName = event.target.getAttribute('data-player-name');
            if (cachedData && cachedData.players) {
                const player = Object.values(cachedData.players).find(p => p.name === playerName);
                if (player) {
                    displayPlayerDetails(player);
                    displayPlayerRecord(player);
                    searchResultsElement.innerHTML = ""; // 검색 결과 닫기
                    searchResultsElement.style.display = 'none'; // 검색 결과 숨기기
                    searchInputElement.style.display = ""; // 검색창 숨기기
                    searchInputElement.value = ""; // 검색창 비우기
                }
            }
        }
    });

    // 검색창에서 Enter 키 입력 시 선수 세부 정보 표시
    searchInputElement.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            const searchTerm = searchInputElement.value;
            if (cachedData && cachedData.players) {
                const player = Object.values(cachedData.players).find(p => p.name.includes(searchTerm));
                if (player) {
                    displayPlayerDetails(player);
                    displayPlayerRecord(player);
                    searchResultsElement.innerHTML = ""; // 검색 결과 닫기
                    searchResultsElement.style.display = 'none'; // 검색 결과 숨기기
                    searchInputElement.value = ""; // 검색창 비우기
                } else {
                    alert('선수를 찾을 수 없습니다.');
                }
            }
        }
    });

    window.onload = function () {
        fetchData();
    };
});
