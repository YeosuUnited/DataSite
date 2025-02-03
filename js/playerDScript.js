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
async function renderPlayerList() {
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
        GK: "Goal Keeper",
        DF: "Defender",
        MF: "Midfielder",
        FW: "Foward"
    };

    // 포지션별 섹션 생성
    // 포지션별 섹션 생성
    for (const position of Object.keys(positionMapping)) {
        // 섹션 생성
        const section = document.createElement('div');
        section.className = 'position-section';
    
        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'position-title-wrapper';
    
        // 큰 타이틀 (GK, DF, MF, FW)
        const title = document.createElement('span');                
        title.className = 'position-title';
        title.textContent = position;
    
        // 작은 설명 (Goal Keeper 등)
        const subtitle = document.createElement('span');
        subtitle.className = 'position-subtitle';
        subtitle.textContent = positionMapping[position];
    
        // 타이틀과 설명을 묶음
        titleWrapper.appendChild(title);
        titleWrapper.appendChild(subtitle);
    
        section.appendChild(titleWrapper);
    
        const playerList = document.createElement('div');
        playerList.className = 'player-position-list';
        // 해당 포지션 선수 카드 생성
        for (const [number, player] of Object.entries(cachedData.players)) {
            // 포지션 분류
            const playerPosition = classifyPosition(player.posi || "");
            if (playerPosition === position) {
                const card = document.createElement('div');
                card.className = 'player-card';
    
                // 클릭 이벤트 추가
                card.addEventListener('click', async function () {
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
    
                const playerImage = loadPlayerCardImage(player) || document.createElement('img');
                playerImage.classList.add('player-list-Img');
                card.appendChild(playerImage);
    
                const playerText = document.createElement('div');
                playerText.className = 'player-text';
    
                // 이름과 뱃지를 감쌀 div 생성
                const nameGroup = document.createElement('div');
                nameGroup.className = 'name-group';
    
                const playerName = document.createElement('div');
                playerName.className = 'player-name';
                playerName.textContent = player.name;
    
                const playerInfo = document.createElement('div');
                playerInfo.className = 'player-info';
                playerInfo.textContent = `${player.number}`;
    
                // role이 captain인 경우
                if (player.role && player.role === "captain") {
                    const captainBadge = document.createElement('div');
                    captainBadge.textContent = "C";
                    captainBadge.classList.add('captain-badge');
                    nameGroup.appendChild(playerName);
                    nameGroup.appendChild(captainBadge);
                } else if (player.role && player.role === "vice-captain") {
                    const captainBadge = document.createElement('div');
                    captainBadge.textContent = "VC";
                    captainBadge.classList.add('viceCaptain-badge');
                    nameGroup.appendChild(playerName);
                    nameGroup.appendChild(captainBadge);
                } else {
                    nameGroup.appendChild(playerName);
                }
    
                playerText.appendChild(playerInfo);
                playerText.appendChild(nameGroup);
                card.appendChild(playerText);
    
                playerList.appendChild(card);
            }
        }
    
        section.appendChild(playerList);
        container.appendChild(section);
    }
}

async function displayPlayerDetails(player) {
    document.getElementById('loader').style.display = 'flex';
    const playerDetailsElement = document.getElementById('player-details');
    playerDetailsElement.innerHTML = ''; // 기존 내용 초기화

    playerDetailsElement.style.display = 'block'; // 상세 정보 표시
    document.getElementById('player-list').style.display = 'none'; // 선수 목록 숨김

    history.pushState(
        { page: "playerDetails", number: player.number },
        "", 
        "#player" + player.number
    );

    const imageContainer = document.createElement('div');
    imageContainer.classList.add('profileImg-container');
    const profileImg = loadPlayerProfileImage(player) || document.createElement('img');
    profileImg.classList.add('player-info-photo');            
    imageContainer.appendChild(profileImg);

    // 주장 또는 부주장 배지 추가
    if (player.role) {
        const roleBadge = document.createElement('div');
        roleBadge.classList.add('role-badge');
        roleBadge.textContent = player.role === 'captain' ? '주장' : '부주장';
        imageContainer.appendChild(roleBadge);
    }

    // 정보 섹션
    const playerInfoText = document.createElement('div');
    playerInfoText.classList.add('player-info-text');

    // 정보 추가 함수 수정
    const addInfoRow = (label, value, parent = playerInfoText) => {
        const row = document.createElement('div');
        row.classList.add('info-item'); // 줄 정렬을 위한 클래스 추가

        const labelSpan = document.createElement('span');
        labelSpan.classList.add('label');
        labelSpan.innerHTML = label + '<br>'; // 줄바꿈 추가

        const valueSpan = document.createElement('span');
        valueSpan.classList.add('value');
        valueSpan.textContent = value;

        row.appendChild(labelSpan);
        row.appendChild(valueSpan);
        parent.appendChild(row);
    };

    // 출생
    addInfoRow('출생', formatBirthdate(player.birth));

    // 이름과 혈액형을 한 줄에 배치할 컨테이너 생성
    const nameBloodContainer = document.createElement('div');
    nameBloodContainer.classList.add('info-row'); // 가로 정렬을 위한 클래스 추가

    // 이름 추가
    const nameRow = document.createElement('div');
    addInfoRow('이름', player.name, nameRow);
    nameBloodContainer.appendChild(nameRow);

    // 혈액형 추가
    const bloodRow = document.createElement('div');
    bloodRow.classList.add('info-item', 'offset');
    addInfoRow('혈액형', player.bloodType, bloodRow);
    nameBloodContainer.appendChild(bloodRow);

    // 컨테이너를 playerInfoText에 추가
    playerInfoText.appendChild(nameBloodContainer);

    // 포지션과 번호을 한 줄에 배치할 컨테이너 생성
    const positionNumContainer = document.createElement('div');
    positionNumContainer.classList.add('info-row'); // 줄 정렬을 위한 클래스 추가

    // 포지션 추가
    const positionRow = document.createElement('div');
    addInfoRow('포지션', player.posi, positionRow);
    positionNumContainer.appendChild(positionRow);

    // 번호 추가
    const numberRow = document.createElement('div');
    numberRow.classList.add('info-item', 'offset'); // 왼쪽에서 40% 위치 조정
    addInfoRow('등번호', player.number, numberRow);
    positionNumContainer.appendChild(numberRow);

    // 컨테이너를 playerInfoText에 추가
    playerInfoText.appendChild(positionNumContainer);

    // 신체 정보
    addInfoRow('신체', `${player.height}cm, ${player.weight}kg`);

    // 전화번호
    addInfoRow('번호', formatPhoneNumber(player.phone));

    // 요소 조립
    playerDetailsElement.appendChild(imageContainer);
    playerDetailsElement.appendChild(playerInfoText);

    // 구분선 추가
    const divider = document.createElement('div');
    divider.classList.add('divider');
    playerDetailsElement.appendChild(divider);            
    document.getElementById('loader').style.display = 'none';
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

document.addEventListener("DOMContentLoaded", function () {            
    const playerDetailsElement = document.getElementById('player-details');

    // 뒤로가기 버튼 감지하여 선수 목록으로 돌아가기
    window.addEventListener("popstate", function (event) {
        if (event.state && event.state.page === "playerDetails") {
            document.getElementById('player-details').style.display = 'block';
            document.getElementById('player-list').style.display = 'none';
        } else {
            document.getElementById('player-details').style.display = 'none';
            document.getElementById('player-list').style.display = 'block';
           history.replaceState({ page: "playerList" }, "", location.pathname);
        }
    });

    window.addEventListener("hashchange", function () {
        if (!location.hash.includes("player")) {
            document.getElementById('player-details').style.display = 'none';
            document.getElementById('player-list').style.display = 'block';
            history.replaceState({ page: "playerList" }, "", location.pathname);
        }
    });

    window.onload = async function () {
        try {
            // 공통 요소 로드
            await fetchData();
            await loadCommonBody();
            initManagerPopup();

            await renderPlayerList();
        } catch (error) {
            console.error('초기화 중 오류 발생:', error);
        }
        // 페이지 새로고침 시 기본 목록 표시
        if (!history.state) {
            history.replaceState({ page: "playerList" }, "", location.pathname);
        }

        document.getElementById('loader').style.display = 'none';
    };
});
