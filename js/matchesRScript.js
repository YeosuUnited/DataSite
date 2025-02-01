function renderRecentMatches(matches) {
    const matchContainer = document.getElementById('recentMatchesContainer');
    matchContainer.innerHTML = '';

    if (!matches || Object.keys(matches).length === 0) {
        matchContainer.innerHTML = '<p>최근 경기 데이터가 없습니다.</p>';
        return;
    }

    // matches 객체를 배열로 변환 후 정렬 (최근 날짜 기준)
    const sortedMatches = Object.entries(matches)
        .sort(([keyA, matchA], [keyB, matchB]) => new Date(matchB.date) - new Date(matchA.date))
        .slice(0, 10); // 상위 10개

    sortedMatches.forEach(([key, match], index) => {
        const matchBox = document.createElement('div');
        const rowClass = index % 2 === 0 ? 'light-row' : 'dark-row'; // 번갈아 색상 적용
        matchBox.className = `match-box ${rowClass}`;

        const [date, time] = key.split('_');
        const formattedDate = new Date(match.date).toLocaleDateString('ko-KR');
        const formattedTime = new Date(match.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

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

        matchBox.innerHTML = `
                                <div class="match-header">
                                    <span class="match-type" style="color: black; font-size: 0.9em">${typeText}</span>                                            
                                    <span class="match-location">${match.location || ""}</span>
                                    <button class="popup-button" data-key="${key}">상세정보</button>
                                </div>
                                <hr class="match-divider">
                                <div class="match-info">
                                    <span class="match-date">${formattedDate}</span>
                                    <span class="match-time">${formattedTime}</span>                                            
                                    <div class="match-details">
                                        <div class="team-box">
                                            <img src="https://raw.githubusercontent.com/YeosuUnited/DataSite/refs/heads/main/assets/images/Emblem.png" class="team-emblem">
                                        </div>
                                        ${scoreHTML}
                                        <div class="team-box">${opponentHTML}</div>
                                    </div>
                                </div>
                            `;
        matchContainer.appendChild(matchBox);
    });
}

function renderTotalMatches(matches) {
    const matchContainer = document.getElementById('allMatchesContainer');
    matchContainer.innerHTML = '';

    if (!matches || Object.keys(matches).length === 0) {
        matchContainer.innerHTML = '<p>최근 경기 데이터가 없습니다.</p>';
        return;
    }

    Object.entries(matches).forEach(([key, match], index) => {
        const matchBox = document.createElement('div');
        const rowClass = index % 2 === 0 ? 'light-row' : 'dark-row'; // 번갈아 색상 적용
        matchBox.className = `matchtotal-box ${rowClass}`;

        const [date, time] = key.split('_');
        const formattedDate = new Date(match.date).toLocaleDateString('ko-KR');
        const formattedTime = new Date(match.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

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

        matchBox.innerHTML = `
                                <div class="match-header">
                                    <span class="match-type" style="color: black; font-size: 0.9em">${typeText}</span>                                            
                                    <span class="match-location">${match.location || ""}</span>
                                    <button class="popup-button" data-key="${key}">상세정보</button>
                                </div>
                                <hr class="match-divider">
                                <div class="match-info">
                                    <span class="match-date">${formattedDate}</span>
                                    <span class="match-time">${formattedTime}</span>
                                    <div class="match-details">
                                        <div class="team-box">
                                            <img src="https://raw.githubusercontent.com/YeosuUnited/DataSite/refs/heads/main/assets/images/Emblem.png" class="team-emblem">
                                        </div>
                                        ${scoreHTML}
                                        <div class="team-box">${opponentHTML}</div>
                                    </div>
                                </div>
                            `;
        matchContainer.appendChild(matchBox);
    });
}

function openPopup() {
    const popup = document.querySelector('.popup');
    const overlay = document.querySelector('.overlay');

    if (popup && overlay) {
        popup.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden'; // 스크롤 막기
    } else {
        console.error('팝업 또는 오버레이 요소를 찾을 수 없습니다.');
    }
}

function closePopup() {
    const popup = document.querySelector('.popup');
    const overlay = document.querySelector('.overlay');

    if (popup && overlay) {
        popup.style.display = 'none';
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto'; // 스크롤 다시 활성화
    } else {
        console.error('팝업 또는 오버레이 요소를 찾을 수 없습니다.');
    }
}

function renderPopup(matchData, teamName) {
    if (!matchData) {
        console.error('경기 데이터가 제공되지 않았습니다.');
        return;
    }

    if (!teamName) {
        console.error('teamName이 제공되지 않았습니다.');
        return;
    }

    const popup = document.querySelector('.popup');
    if (!popup) {
        console.error('팝업 요소를 찾을 수 없습니다.');
        return;
    }

    popup.innerHTML = ''; // 이전 내용 제거

    // 날짜 포멧
    const formattedDate = new Date(matchData.date).toLocaleDateString('ko-KR'); // 예: "2024. 12. 17."
    const formattedTime = new Date(matchData.date).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
    }); // 예: "오후 9:07"

    // 날짜와 시간을 포함한 HTML 생성
    const dateNtimeHTML = `<span class="popup-date">${formattedDate}</span> <span class="popup-time">${formattedTime}</span>`;

    // 팝업 헤더 텍스트 설정
    let matchTypeText = "";
    if (matchData.type === "1") {
        matchTypeText = `<span style="font-size: 0.7em;">vs ${matchData.opponent}</span> <span style="font-size: 1.0em; font-weight: bold;">  풋살</span>`;
    } else if (matchData.type === "2") {
        matchTypeText = `<span style="font-size: 0.7em;">vs ${matchData.opponent}</span> <span style="font-size: 1.0em; font-weight: bold;">  자체전</span>`;
    } else if (matchData.type === "0") {
        const usScore = matchData.score.us;
        const themScore = matchData.score.them;
        const result = usScore > themScore ? "승" : usScore < themScore ? "패" : "무";
        matchTypeText = `<span style="font-size: 0.7em;">vs ${matchData.opponent}</span> <span style="font-size: 1.0em; font-weight: bold;">  ${usScore}:${themScore} (${result})</span>`;
    } else {
        matchTypeText = `<span style="font-size: 0.7em;">vs ${matchData.opponent}</span> 알 수 없음`;
    }

    // 팝업 헤더
    const header = `<h2 style="">${matchTypeText}</h2>`;

    // 선수별 골 및 어시스트 집계
    const playerStats = (Array.isArray(matchData.players) ? matchData.players : []).map(playerName => {
        const playerInfo = Object.values(cachedData.players).find(player => player.name === playerName);
        const position = playerInfo ? playerInfo.posi : "알 수 없음";
        const goals = matchData.type === "0" ? (matchData.goal || []).filter(name => name === playerName).length : null;
        const assists = matchData.type === "0" ? (matchData.assist || []).filter(name => name === playerName).length : null;
        return { name: playerName, position, goals, assists };
    });

    

    // 테이블 생성
    let playersTable = `<h3 class="styled-table-title">참여 선수 기록</h3>
                                <table class="styled-table" border="0" cellspacing="0" cellpadding="5">
`;

    // 테이블 헤더
    if (matchData.type === "0") {
        playersTable += `<thead>
                                    <tr>
                                        <th>선수명</th>
                                        <th>득점</th>
                                        <th>도움</th>
                                    </tr>
                                 </thead>`;
    }
    else {
        playersTable += `<thead>
                                        <tr>
                                            <th colspan="3">${matchData.type === "1" ? "풋살은 상세데이터를 제공하지 않습니다" : "자체전은 상세데이터를 제공하지 않습니다"}</th>
                                        </tr>
                                    </thead>`;
    }

    // 테이블 데이터
    if (matchData.type === "0") {
        // 정규 경기인 경우 득점/도움 표시
        playersTable += `<tbody>`;
        playerStats.forEach(({ name, position, goals, assists }, index) => {
            const rowClass = index % 2 === 0 ? "light-row" : "dark-row"; // 행 색상 번갈아가며 적용
            playersTable += `<tr class="${rowClass}">
                                        <td>${name} <span style="font-size: 0.85em; color: gray;">${position}</span></td>
                                        <td>${goals}</td>
                                        <td>${assists}</td>
                                     </tr> `;
        });
        playersTable += `</tbody>`;
    }
    else {
        // 풋살 및 자체전인 경우, 선수명만 표시
        playersTable += `<tbody>`;
        playerStats.forEach(({ name, position }, index) => {
            const rowClass = index % 2 === 0 ? "light-row" : "dark-row"; // 행 색상 번갈아가며 적용
            playersTable += ` <tr class="${rowClass}">
                                        <td>${name} <span style="font-size: 0.85em; color: gray;">${position}</span></td>
                                      </tr> `;
        });
        playersTable += `</tbody>`;
    }

    playersTable += `</table>`;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // 용병별 골 및 어시스트 집계
    const subPlayerStats = (Array.isArray(matchData.subP) ? matchData.subP : []).map(subPlayerName => {
        const goals = matchData.type === "0" ? (matchData.subGoal || []).filter(name => name === subPlayerName).length : null;
        const assists = matchData.type === "0" ? (matchData.subAssist || []).filter(name => name === subPlayerName).length : null;
        return { name: subPlayerName, goals, assists };
    });

    // 용병 테이블 생성
    
    let subPlayersTable = `<h3 class="styled-table-title">용병 출전 명단</h3>
                <table class="styled-table" border="0" cellspacing="0" cellpadding="5">`;
    console.log("용병있음", subPlayerStats);
    if (matchData.type === "0") {
        // 정규 경기: 득점/도움 표시
        subPlayersTable += `<thead>
                    <tr>
                        <th>용병명</th>
                        <th>득점</th>
                        <th>도움</th>
                    </tr>
                </thead>
                <tbody>`;
        subPlayerStats.forEach(({ name, goals, assists }, index) => {
            const rowClass = index % 2 === 0 ? "light-row" : "dark-row";
            subPlayersTable += `<tr class="${rowClass}">
                        <td>${name}</td>
                        <td>${goals || 0}</td>
                        <td>${assists || 0}</td>
                    </tr>`;
        });
        subPlayersTable += `</tbody>`;
    } else {
        // 풋살/자체전: 용병명만 표시
        subPlayersTable += `<tbody>`;
        subPlayerStats.forEach(({ name }, index) => {
            const rowClass = index % 2 === 0 ? "light-row" : "dark-row";
            subPlayersTable += `<tr class="${rowClass}">
                        <td>${name}</td>
                    </tr>`;
        });
        subPlayersTable += `</tbody>`;
    }

    subPlayersTable += `</table>`;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // 과거 경기 기록
    const historyHeader = "<h3 class='recent-matches-popup-head'>해당팀과의 최근 10경기</h3>";
    let historyList = "<ul class='recent-matches-popup'>";

    const opponentMatches = Object.entries(cachedData.matchesTotal)
        .filter(([key, match]) => match.opponent.replace(/\s/g, '').toLowerCase() === teamName.replace(/\s/g, '').toLowerCase())
        .sort(([_, matchA], [__, matchB]) => new Date(matchB.date) - new Date(matchA.date)); // 날짜 내림차순

    opponentMatches.forEach(([key, match]) => {
        const formattedDate = new Date(match.date).toLocaleDateString('ko-KR'); // 예: "2024. 12. 17."
        const formattedTime = new Date(match.date).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
        }); // 예: "오후 9:07"

        const location = match.location || "알 수 없음";

        let scoreText = "";
        if (match.type === "0" && match.score) {
            const usScore = match.score.us;
            const themScore = match.score.them;
            const result = usScore > themScore ? "승" : usScore < themScore ? "패" : "무";
            scoreText = `<span style="font-size: 0.9em;"><strong>${usScore} : ${themScore}</strong> (${result})</span>`;
        }

        historyList += `<li>
                                    <span style="font-size: 0.9em;">${formattedDate}</span> - <span style="color: gray; font-size: 0.8em;">${formattedTime} / ${location}</span>
                                    ${scoreText}
                                </li> `;
    });

    historyList += "</ul>";

    // 코멘트 추출
    const commentHeader = "<h3 class='recent-matches-popup-head'>해당팀과의 최근 경기 후 코멘트</h3>";
    const comments = Object.entries(cachedData.matchesTotal)
        .filter(([key, match]) =>
            match.comment && match.comment.trim() !== "" && // comment가 있는 경우
            match.opponent.replace(/\s/g, "").toLowerCase() === matchData.opponent.replace(/\s/g, "").toLowerCase() // 특정 팀과의 경기만
        )
        .sort(([aKey], [bKey]) => new Date(bKey.split('_')[0]) - new Date(aKey.split('_')[0])) // 날짜 정렬
        .slice(0, 10) // 최대 10개의 항목
        .map(([key, match]) => match.comment); // comment 값만 추출

    // HTML로 나열
    let commentList = "<ul class='recent-matches-popup'>";
    if (comments.length > 0) {
        comments.forEach(comment => {
            commentList += `<li><span style="font-size: 0.9em;">${comment}</span></li>`;
        });
    } else {
        commentList += "<li>없음</li>"; // comment가 없는 경우
    }
    commentList += "</ul>";

    // 팝업 HTML 업데이트
    popup.innerHTML = `<button class="close-button" onclick="closePopup()"><img src="https://raw.githubusercontent.com/YeosuUnited/DataSite/refs/heads/main/assets/images/btn_X.png" alt="닫기 버튼" /></button>
                                <div class="popup-timeNdate">
                                    ${dateNtimeHTML}
                                </div>
                                ${header}
                                ${playersTable}
                                ${subPlayersTable}
                                ${historyHeader}
                                ${historyList}
                                ${commentHeader}
                                ${commentList}`;

    openPopup();
}

function convertTo24HourFormat(timeStr) {
    const period = timeStr.includes('오전') ? 'AM' : 'PM';
    const time = timeStr.replace(/오전|오후/g, '').trim(); // 예: 8시 -> 8
    const hours = parseInt(time.replace('시', ''), 10);

    // 오전/오후에 따라 시간 변환
    let formattedHours = hours;
    if (period === 'PM' && hours !== 12) {
        formattedHours += 12; // 오후에는 12 추가
    } else if (period === 'AM' && hours === 12) {
        formattedHours = 0; // 오전 12시는 0시
    }

    // HH:mm 형식으로 반환
    return `${String(formattedHours).padStart(2, '0')}:00`;
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

function toggleMenu() {
    const menu = document.getElementById('fullMenu');
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
}

function toggleMenu() {
    const menu = document.getElementById('fullMenu');
    if (menu.style.display === 'flex') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'flex';
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const recentButton = document.getElementById('recentButton');
    const allButton = document.getElementById('allButton');
    const searchButton = document.getElementById('searchButton'); // 검색 버튼 추가
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    

    function toggleButton(clickedButton, ...otherButtons) {
        clickedButton.classList.add('active');
        otherButtons.forEach(btn => btn.classList.remove('active'));
    }

    // 초기 UI 설정 (최근 10경기 표시, 모든 경기 숨기기)
    function initializeUI() {
        document.getElementById('recentMatchesContainer').style.display = 'block'; // 보이기
        document.getElementById('allMatchesContainer').style.display = 'none'; // 숨기기
        document.getElementById('searchContainer').style.display = 'none';
        document.getElementById('searchInput').style.display = 'none';
        document.getElementById('searchResults').style.display = 'none';
        recentButton.classList.add('active'); // "최근 10경기" 버튼 활성화
        fetchData(); // 데이터 로드
    }

    recentButton.addEventListener('click', function () {
        toggleButton(recentButton, allButton, searchButton);
        if (cachedData && cachedData.matchesTotal) {
            document.getElementById('recentMatchesContainer').style.display = 'block'; // 보이기
            document.getElementById('allMatchesContainer').style.display = 'none'; // 숨기기
            document.getElementById('searchContainer').style.display = 'none';
            document.getElementById('searchInput').style.display = 'none';
            document.getElementById('searchResults').style.display = 'none';
            document.getElementById('teamHistoryContainer').style.display = 'none'; // 숨기기
            renderRecentMatches(cachedData.matchesTotal); // renderRecentMatches 실행
        }
    });

    allButton.addEventListener('click', function () {
        toggleButton(allButton, recentButton, searchButton);
        if (cachedData && cachedData.matchesTotal) {
            document.getElementById('recentMatchesContainer').style.display = 'none'; // 숨기기
            document.getElementById('allMatchesContainer').style.display = 'block'; // 보이기
            document.getElementById('searchContainer').style.display = 'none';
            document.getElementById('searchInput').style.display = 'none';
            document.getElementById('searchResults').style.display = 'none';
            document.getElementById('teamHistoryContainer').style.display = 'none'; // 숨기기
            renderTotalMatches(cachedData.matchesTotal); // renderTotalMatches 실행
        }
    });

    searchButton.addEventListener('click', function () {
        toggleButton(searchButton, recentButton, allButton);
        document.getElementById('searchContainer').style.display = 'block';
        document.getElementById('searchInput').style.display = 'block';
        document.getElementById('searchResults').style.display = 'block';
        document.getElementById('teamHistoryContainer').style.display = 'block'; // 숨기기
        document.getElementById('recentMatchesContainer').style.display = 'none'; // 보이기
        document.getElementById('allMatchesContainer').style.display = 'none'; // 숨기기
    });

    recentButton.classList.add('active');

    // 검색 버튼 클릭 시
    searchButton.addEventListener('click', function () {
        toggleButton(searchButton, recentButton, allButton);
        document.getElementById('recentMatchesContainer').style.display = 'none';
        document.getElementById('allMatchesContainer').style.display = 'none';
        searchContainer.style.display = 'block';
    });

    // 검색 입력 이벤트
    searchInput.addEventListener('input', function () {
        const query = searchInput.value.trim().toLowerCase(); // 소문자로 변환
        if (!query) {
            searchResults.innerHTML = ''; // 검색 결과 초기화
            return;
        }

        // 검색 로직: 중복 제거한 결과 반환
        const results = Array.from(
            new Map(
                Object.entries(cachedData.matchesTotal)
                    .filter(([key, match]) => match.opponent && match.opponent.toLowerCase().includes(query))
                    .map(([key, match]) => [match.opponent, { key, opponent: match.opponent }]) // Map으로 중복 제거
            ).values()
        ).slice(0, 5); // 최대 5개

        // 결과를 표시
        searchResults.innerHTML = results.length
            ? results.map(result => `
                                                <div style="
                                                    padding: 5px 0px;
                                                    border: 2px solid #ddd;
                                                    border-radius: 5px;
                                                    margin-bottom: 5px;
                                                    cursor: pointer;
                                                    width: 90%;
                                                    max-width: 800px;
                                                    text-align: center;
                                                    margin: 0 auto;"
                                                    data-key="${result.key}">
                                                    ${result.opponent}
                                                </div>
                                            `).join('')
            : `<div style="
                                                    padding: 5px 10px;
                                                    color: gray;
                                                    text-align: center;">검색 결과가 없습니다.</div>`;

    });

    // 검색 결과 클릭 이벤트
    searchResults.addEventListener('click', function (event) {
        if (event.target && event.target.tagName === 'DIV') {
            const selectedTeam = event.target.innerText.trim(); // 선택한 팀 이름
            const selectedKey = event.target.dataset.key; // 경기 키 가져오기

            if (selectedTeam === '검색 결과가 없습니다.') return; // 클릭 방지
            searchInput.value = selectedTeam; // 검색창에 선택된 팀 이름 표시
            searchResults.innerHTML = ''; // 검색 결과 숨기기

            // 팀 히스토리 표시
            showTeamHistory(selectedTeam);
        }
    });

    // 검색창에서 Enter 키 이벤트 처리
    searchInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // 기본 엔터 동작 방지 (폼 제출 등)
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                searchResults.innerHTML = '<div style="color: gray; text-align: center;">검색어를 입력해주세요.</div>';
                return;
            }

            // 상대 팀 검색 및 결과 표시
            const results = Array.from(
                new Set(
                    Object.values(cachedData.matchesTotal)
                        .filter(match => match.opponent && match.opponent.toLowerCase().includes(query))
                        .map(match => match.opponent)
                )
            );

            if (results.length === 1) {
                // 결과가 하나일 때
                searchResults.innerHTML = ''; // 검색 결과 숨기기
                searchInput.value = results[0]; // 검색창에 첫 번째 결과 표시
                showTeamHistory(results[0]); // 해당 팀 히스토리 불러오기
            } else if (results.length > 1) {
                searchResults.innerHTML = results
                    .map(opponent => `
                    <div style="
                        padding: 5px 0px;
                        border: 2px solid #ddd;
                        border-radius: 5px;
                        margin-bottom: 5px;
                        cursor: pointer;
                        width: 90%;
                        max-width: 800px;
                        text-align: center;
                        margin: 0 auto;">${opponent}</div>
                `).join('');
            } else {
                searchResults.innerHTML = '<div style="color: gray; text-align: center;">검색 결과가 없습니다.</div>';
            }
        }
    });

    // 최근 10경기에서 "기록" 버튼 처리
    document.getElementById('recentMatchesContainer').addEventListener('click', function (event) {
        if (event.target.classList.contains('popup-button')) {
            handleMatchButtonClick(event.target.closest('.match-box'));
        }
    });

    // 모든 경기에서 "기록" 버튼 처리
    document.getElementById('allMatchesContainer').addEventListener('click', function (event) {
        if (event.target.classList.contains('popup-button')) {
            handleMatchButtonClick(event.target.closest('.matchtotal-box'));
        }
    });

    // 공통 처리 로직
    function handleMatchButtonClick(matchBox) {
        if (!matchBox) return;

        const matchDate = matchBox.querySelector('.match-date').innerText.trim();
        const matchTimeRaw = matchBox.querySelector('.match-time').innerText.trim();
        const matchTime = convertTo24HourFormat(matchTimeRaw);

        const matchKey = matchBox.querySelector('.popup-button').dataset.key;

        const matchData = cachedData.matchesTotal[matchKey];
        const teamName = matchData ? matchData.opponent : null; // teamName을 opponent로 설정

        if (matchData) {
            renderPopup(matchData, teamName);
        } else {
            console.error('선택된 경기 데이터를 찾을 수 없습니다:', matchKey);
        }
    }

    // 히스토리 및 코멘트를 표시하는 함수
    function showTeamHistory(teamName) {
        const teamHistoryContainer = document.getElementById('teamHistoryContainer');

        if (!cachedData) return;

        // matchesTotal 데이터에서 팀과의 기록 추출
        const opponentMatches = Object.entries(cachedData.matchesTotal)
            .filter(([key, match]) => match.opponent.replace(/\s/g, '').toLowerCase() === teamName.replace(/\s/g, '').toLowerCase())
            .sort(([_, matchA], [__, matchB]) => new Date(matchB.date) - new Date(matchA.date)); // 날짜 내림차순 정렬

        let historyList = "<ul class='recent-matches-popup'>";
        if (opponentMatches.length > 0) {
            opponentMatches.forEach(([key, match]) => {

                const matchDate = new Date(match.date);
                if (isNaN(matchDate.getTime())) {
                    console.error('Invalid match.date format:', match.date);
                    return;
                }

                // 날짜 및 시간 포맷팅
                const formattedDate = matchDate.toLocaleDateString('ko-KR`'); // 예: "2024. 12. 17."
                const formattedTime = matchDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                }); // 예: "오후 9:07"

                const location = match.location || "알 수 없음";

                let scoreText = "";
                if (match.type === "0" && match.score) {
                    const usScore = match.score.us;
                    const themScore = match.score.them;
                    const result = usScore > themScore ? "승" : usScore < themScore ? "패" : "무";
                    scoreText = ` - <strong>${usScore} : ${themScore}</strong> (${result})`;
                }

                historyList += `<li>
                                        ${formattedDate} - <span style="color: gray; font-size: 0.9em;">${formattedTime} / ${location}</span>
                                        ${scoreText}
                                    </li>`;
            });
        } else {
            historyList += "<li>경기 기록 없음</li>";
        }
        historyList += "</ul>";

        // 코멘트 추출
        const comments = opponentMatches
            .filter(([key, match]) => match.comment && match.comment.trim() !== "")
            .map(([key, match]) => match.comment);

        let commentList = "<ul class='recent-matches-popup'>";
        if (comments.length > 0) {
            comments.forEach(comment => {
                commentList += `<li>${comment}</li>`;
            });
        } else {
            commentList += "<li>코멘트 없음</li>";
        }
        commentList += "</ul>";

        // 컨테이너에 내용 업데이트
        teamHistoryContainer.innerHTML = `
                                                        <div style="text-align: center;"><span style="font-size: 1.2em; font-weight: bold;">vs ${teamName}</span></div>
                                                        <h3 class='recent-matches-popup-head'>역대 경기 기록</h3>
                                                        ${historyList}
                                                        <h3 class='recent-matches-popup-head'>코멘트</h3>
                                                        ${commentList}
                                                    `;
        teamHistoryContainer.style.display = 'block'; // 컨테이너 표시
    }

    document.querySelector('.close-button').addEventListener('click', closePopup);
    document.querySelector('.overlay').addEventListener('click', closePopup);

    initializeUI();
});

window.onload = async function () {
    try {
        await fetchData();

        renderRecentMatches(cachedData.matchesTotal);                
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }

    //관리자 관련
    const popup = document.getElementById('password-mangerPopup');
    const closeBtn = document.querySelector('.close-btn');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');

    const errorMessage = document.createElement('div');
    errorMessage.classList.add('error-message');
    popup.querySelector('.mangerPopup-content').appendChild(errorMessage);

    document.querySelector('.managerPage').addEventListener('click', () => {
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
        if (e.target.id === 'password-mangerPopup') {
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

    function clearPopup() {
        passwordInput.value = '';
        errorMessage.style.display = 'none';
    }

    const imgElements = document.querySelectorAll('img[data-image-name]');
    for (const imgElement of imgElements) {
        const imageUrl = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/${imgElement.dataset.imageName}.png`;
        try {
            const blobUrl = await getCachedImageUrl(imageUrl);
            imgElement.src = blobUrl;
        } catch (error) {
            imgElement.src = `https://raw.githubusercontent.com/YeosuUnited/DataSite/main/assets/images/default.png`;
        }
    }

    document.getElementById('loader').style.display = 'none';
}
