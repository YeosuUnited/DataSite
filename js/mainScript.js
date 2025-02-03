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

async function createCards(players, thisYearRecords) {
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

            const playerImage = loadPlayerImage(player) || document.createElement('img'); // null 방지                    
            playerImage.className = 'player-image';

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

            const playerImage = loadPlayerImage(player) || document.createElement('img'); // null 방지    
            playerImage.className = 'player-image-small';

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

async function updateMatchCards(matchesTotal) {
    const serverTime = new Date(); // 현재 서버 시간
    let upcomingMatch = null;
    let lastMatch = null;

    Object.values(matchesTotal).forEach(match => {
        const matchDate = new Date(match.date);

        if (matchDate >= serverTime) {
            if (!upcomingMatch || matchDate < new Date(upcomingMatch.date)) {
                upcomingMatch = match;
            }
        } else {
            if (!lastMatch || matchDate > new Date(lastMatch.date)) {
                lastMatch = match;
            }
        }
    });

    // 다음 경기 카드 업데이트
    const upcomingMatchInfo = document.getElementById('upcoming-match-info');
    if (upcomingMatch) {
        upcomingMatchInfo.innerHTML = generateMatchCardHTML(upcomingMatch, true);
    } else {
        upcomingMatchInfo.innerHTML = `<span class="no-match">다음 예정 경기 없음</span>`;
    }

    // 마지막 경기 카드 업데이트
    const lastMatchInfo = document.getElementById('last-match-info');
    if (lastMatch) {
        lastMatchInfo.innerHTML = generateMatchCardHTML(lastMatch, false);
    }
}

function generateMatchCardHTML(match, isUpcoming) {
    const typeLabels = { "0": "축구", "1": "풋살", "2": "자체전" };
    const typeText = typeLabels[match.type] || "기타";

    let scoreHTML = `<span class="match-vs">VS</span>`;
    if (match.type === "0") {
        scoreHTML = `<span class="match-vs">${match.score.us} : ${match.score.them}</span>`;
    }

    let opponentHTML = `<span class="opponent-team">${match.opponent}</span>`;
    if (match.type === "2") {
        opponentHTML = ""; // 자체전이면 상대팀 삭제
    }

    return `
        <div class="match-header">
            <span>${isUpcoming ? "다음 경기 일정" : "마지막 경기"}</span>
            <span class="match-type" style="color: black; font-size: 0.9em">${typeText}</span>
            <a href="matchRecord.html" class="match-link">전체 경기 일정 →</a>
        </div>
        <hr class="match-divider">
        <div class="match-info">
            <span class="match-date">${formatDate(match.date)}</span>
            <span class="match-league">${match.location || ""}</span>
            <div class="match-details">
                <div class="team-box">
                    <img src="https://raw.githubusercontent.com/YeosuUnited/DataSite/refs/heads/main/assets/images/Emblem.png" class="team-emblem">
                </div>
                ${scoreHTML}
                <div class="team-box">${opponentHTML}</div>
            </div>
        </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
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

window.onload = async function () {
    try {
        // 공통 요소 로드
        await loadCommonBody();
        await fetchData();
        initManagerPopup();
        
        const currentYear = new Date().getFullYear();
        const thisYearRecords = filterCurrentYearData(cachedData.recordAll, currentYear);
        
        await updateMatchCards(cachedData.matchesTotal);
        await createCards(cachedData.players, thisYearRecords);
        enableDragScroll();
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }

    document.getElementById('loader').style.display = 'none';
};
