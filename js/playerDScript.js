const positionMapping = {
    FW: ["ST", "CF", "SS", "LWF", "RWF", "LW", "RW", "FW"],
    MF: ["CM", "LCM", "RCM", "CDM", "AM", "CAM", "RM", "LM", "DM", "MF"],
    DF: ["CB", "LCB", "RCB", "RB", "LB", "LWB", "RWB", "DF"],
    GK: ["GK"]
};

// 포지션을 분류하는 함수
function classifyPosition(position) {
    position = position.toUpperCase();
    return Object.keys(positionMapping).find(key => positionMapping[key].includes(position)) || "MF";
}

// (예) 데이터 로딩(fetchData)이 끝난 후, 로드가 완료되면 호출할 함수를 하나 추가합니다.
function renderPlayerList() {
    const container = document.createElement('div');
    container.id = 'player-list';

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

    // 포지션 매핑 및 한글 이름
    const positionMapping = {
        GK: "골키퍼",
        DF: "수비수",
        MF: "미드필더",
        FW: "공격수"
    };

    // 포지션별 섹션 생성
    Object.keys(positionMapping).forEach(position => {
        // 섹션 생성
        const section = document.createElement('div');
        section.className = 'position-section';
        section.style.marginBottom = '20px';

        const title = document.createElement('h2');                
        title.className = 'position-title'
        title.textContent = positionMapping[position];

        section.appendChild(title);

        // 해당 포지션 선수 카드 생성
        Object.entries(cachedData.players).forEach(([number, player]) => {
            // 포지션 분류
            const playerPosition = classifyPosition(player.posi || "");
            if (playerPosition === position) {
                const card = document.createElement('div');
                card.className = 'player-card';

                // 클릭 이벤트 추가
                card.addEventListener('click', function () {
                    if (cachedData && cachedData.players) {
                        const player = cachedData.players[number];
                        if (player) {
                            displayPlayerDetails(player); // 선수 상세 정보 표시
                            displayPlayerRecord(player); // 선수 기록 표시
                            document.getElementById('player-details').style.display = 'block'; // 상세 정보 표시
                            document.getElementById('player-list').style.display = 'none'; // 선수 목록 숨김
                        } else {
                            console.error(`Player not found for number: ${number}`);
                        }
                    } else {
                        console.error('Cached data or players not available');
                    }
                });

                const playerImage = document.createElement('img');
                playerImage.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/${player.number || 'default'}_P.png`;
                playerImage.alt = player.name;
                playerImage.onerror = () => {
                    playerImage.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default_P.png`;
                };

                const playerName = document.createElement('div');
                playerName.className = 'player-name';
                playerName.textContent = player.name;

                const playerInfo = document.createElement('div');
                playerInfo.className = 'player-info';
                playerInfo.textContent = `no.${number}`;

                card.appendChild(playerImage);
                card.appendChild(playerName);
                card.appendChild(playerInfo);
                section.appendChild(card);
            }
        });

        container.appendChild(section);
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

    // 화면 빈 여백 클릭 시 검색 결과 닫기
    document.addEventListener('click', function (event) {
        // 클릭한 요소가 검색 결과나 검색창이 아닌 경우 닫기
        if (!searchResultsElement.contains(event.target) && event.target !== searchInputElement) {
            searchResultsElement.style.display = 'none';
        }
    });

    // 검색 입력 이벤트 리스너
    searchInputElement.addEventListener('input', function () {
        const searchTerm = searchInputElement.value.trim().toLowerCase();
        if (cachedData && cachedData.players) {
            const filteredPlayers = Object.entries(cachedData.players)
                .filter(([_, player]) => player.name.toLowerCase().includes(searchTerm))
                .slice(0, 5);
            if (filteredPlayers.length > 0) {
                let resultsHtml = '<ul class="search-results-list">';
                filteredPlayers.forEach(([_, player]) => {
                    resultsHtml += `
            <li class="search-results-item" data-player-name="${player.name}">
                ${player.name}     no.${player.number}
            </li>`;
                });
                resultsHtml += '</ul>';
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
        const target = event.target.closest('li'); // 클릭한 LI 요소 찾기
        if (target) {
            const playerName = target.getAttribute('data-player-name');
            if (cachedData && cachedData.players) {
                const player = Object.values(cachedData.players).find(p => p.name === playerName);
                if (player) {
                    displayPlayerDetails(player);
                    displayPlayerRecord(player);
                    searchResultsElement.innerHTML = ""; // 검색 결과 닫기
                    searchResultsElement.style.display = 'none'; // 검색 결과 숨기기
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

    window.onload = async function () {
        try {
            await fetchData();

            renderPlayerList();
        } catch (error) {
            console.error('초기화 중 오류 발생:', error);
        }
    };
});
