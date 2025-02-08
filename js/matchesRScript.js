function renderRecentMatches(matches) {
    const matchContainer = document.getElementById('recentMatches-list');
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
        matchBox.classList.add('match-box'); // 이 줄 추가

        const [date, time] = key.split('_');
        const formattedDate = new Date(match.date).toLocaleDateString('ko-KR');
        const formattedTime = new Date(match.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const typeLabels = { "0": "축구", "1": "풋살", "2": "자체전" };
        const typeText = typeLabels[match.type] || "기타";
        if(typeText === "축구") {
            matchBox.style.backgroundColor = "#efefef";
        }
                
        let scoreHTML = `<span class="match-vs">VS</span>`;
        if (match.type === "0") {
            scoreHTML = `<span class="match-vs">${match.score.us} : ${match.score.them}</span>`;
        }

        let opponentHTML = `<span class="opponent-team">${match.opponent}</span>`;
        if (match.type === "2") {
            opponentHTML = `<img src="https://raw.githubusercontent.com/YeosuUnited/DataSite/refs/heads/main/assets/images/Emblem.png" class="team-emblem">`; // 자체전이면 우리팀 엠블럼 표시
        }

        matchBox.innerHTML = `
                                <hr class="match-divider">
                                <div class="match-header">                                                                                        
                                    <span class="match-date">${formattedDate}</span>
                                    <span class="match-time">${formattedTime}</span>                                            
                                    <span class="match-type">${typeText}</span>
                                    <span class="match-location">${match.location || ""}</span>                                            
                                </div>                                        
                                <div class="match-info">
                                    <div class="match-details">
                                        <div class="team-box">
                                            <img src="https://raw.githubusercontent.com/YeosuUnited/DataSite/refs/heads/main/assets/images/Emblem.png" class="team-emblem">
                                        </div>
                                        ${scoreHTML}
                                        <div class="team-box">${opponentHTML}</div>
                                    </div>
                                    <button class="popup-button" data-key="${key}">상세정보 ></button>
                                </div>
                            `;
        matchContainer.appendChild(matchBox);
    });
}

function renderTotalMatches(matches) {
    const matchContainer = document.getElementById('totalMatches-list');
    matchContainer.innerHTML = '';

    if (!matches || Object.keys(matches).length === 0) {
        matchContainer.innerHTML = '<p>최근 경기 데이터가 없습니다.</p>';
        return;
    }

    Object.entries(matches).forEach(([key, match], index) => {
        const matchBox = document.createElement('div');
        matchBox.classList.add('matchtotal-box'); // 이 줄 추가

        const [date, time] = key.split('_');
        const formattedDate = new Date(match.date).toLocaleDateString('ko-KR');
        const formattedTime = new Date(match.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const typeLabels = { "0": "축구", "1": "풋살", "2": "자체전" };
        const typeText = typeLabels[match.type] || "기타";
        if(typeText === "축구") {
            matchBox.style.backgroundColor = "#efefef";
        }
                
        let scoreHTML = `<span class="match-vs">VS</span>`;
        if (match.type === "0") {
            scoreHTML = `<span class="match-vs">${match.score.us} : ${match.score.them}</span>`;
        }

        let opponentHTML = `<span class="opponent-team">${match.opponent}</span>`;
        if (match.type === "2") {
            opponentHTML = `<img src="https://raw.githubusercontent.com/YeosuUnited/DataSite/refs/heads/main/assets/images/Emblem.png" class="team-emblem">`; // 자체전이면 우리팀 엠블럼 표시
        }

        matchBox.innerHTML = `
                                <hr class="match-divider">
                                <div class="match-header">                                                                                        
                                    <span class="match-date">${formattedDate}</span>
                                    <span class="match-time">${formattedTime}</span>                                            
                                    <span class="match-type">${typeText}</span>
                                    <span class="match-location">${match.location || ""}</span>                                            
                                </div>                                        
                                <div class="match-info">
                                    <div class="match-details">
                                        <div class="team-box">
                                            <img src="https://raw.githubusercontent.com/YeosuUnited/DataSite/refs/heads/main/assets/images/Emblem.png" class="team-emblem">
                                        </div>
                                        ${scoreHTML}
                                        <div class="team-box">${opponentHTML}</div>
                                    </div>
                                    <button class="popup-button" data-key="${key}">상세정보 ></button>
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

function renderYearSelection() {
    let selectYearDiv = document.getElementById('select-year');
    if (!selectYearDiv) {
        selectYearDiv = document.createElement('div');
        selectYearDiv.id = 'select-year';
        // 드래그 스크롤용 스타일 + 스크롤바 숨기기
        selectYearDiv.style.overflowX = 'auto';
        selectYearDiv.style.whiteSpace = 'nowrap';
        // IE, Edge용 스크롤바 숨기기
        selectYearDiv.style.msOverflowStyle = 'none';
        // Firefox용
        selectYearDiv.style.scrollbarWidth = 'none';
        selectYearDiv.style.borderBottom = '1px solid #275AB3';
        // .list-type 바로 아래에 삽입 (위치 필요에 따라 조정)
        const listTypeDiv = document.querySelector('.list-type');
        listTypeDiv.parentNode.insertBefore(selectYearDiv, listTypeDiv.nextSibling);
    } else {
        // 이미 존재하면 강제로 보이게 함
        selectYearDiv.style.display = "block";
        selectYearDiv.innerHTML = '';
    }

    // cachedData.matchesTotal의 모든 날짜를 순회하여 년도 집합 생성
    const yearsSet = new Set();
    Object.values(cachedData.matchesTotal).forEach(match => {
        if (match.date) {
            const year = new Date(match.date).getFullYear();
            yearsSet.add(year);
        }
    });
    // 내림차순 정렬 (최근 년도부터)
    const yearsArray = Array.from(yearsSet).sort((a, b) => b - a);

    // '전체' 버튼 추가
    const allBtn = document.createElement('button');
    allBtn.textContent = '전체';
    allBtn.className = 'year-button active'; // 기본 active
    allBtn.style.marginRight = '10px';
    allBtn.addEventListener('click', function() {
        // active 버튼 전환
        document.querySelectorAll('.year-button').forEach(btn => btn.classList.remove('active'));
        allBtn.classList.add('active');
        // 전체 경기 데이터를 다시 렌더링
        renderTotalMatches(cachedData.matchesTotal);
    });
    selectYearDiv.appendChild(allBtn);

    // 각 년도 버튼 추가
    yearsArray.forEach(year => {
        const btn = document.createElement('button');
        btn.textContent = year;
        btn.className = 'year-button';
        btn.style.marginRight = '10px';
        btn.addEventListener('click', function() {
            document.querySelectorAll('.year-button').forEach(btn => btn.classList.remove('active'));
            btn.classList.add('active');
            // 해당 년도에 해당하는 경기만 필터링
            const filteredMatches = Object.entries(cachedData.matchesTotal).reduce((acc, [key, match]) => {
                const matchYear = new Date(match.date).getFullYear();
                if (matchYear === year) {
                    acc[key] = match;
                }
                return acc;
            }, {});
            renderTotalMatches(filteredMatches);
        });
        selectYearDiv.appendChild(btn);
    });

    // 드래그 스크롤 활성화
    enableDragScroll(selectYearDiv);
}

function enableDragScroll(container) {
    let isDown = false;
    let startX;
    let scrollLeft;
  
    container.addEventListener('mousedown', (e) => {
        isDown = true;
        container.classList.add('active'); // 필요 시 active 스타일 추가
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
  
    container.addEventListener('mouseleave', () => {
        isDown = false;
        container.classList.remove('active');
    });
  
    container.addEventListener('mouseup', () => {
        isDown = false;
        container.classList.remove('active');
    });
  
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2; // 스크롤 속도 조절
        container.scrollLeft = scrollLeft - walk;
    });
  
    // 터치 이벤트도 추가 (모바일 지원)
    container.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
  
    container.addEventListener('touchend', () => {
        isDown = false;
    });
  
    container.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - container.offsetLeft;
        const walk = (x - startX) * 2;
        container.scrollLeft = scrollLeft - walk;
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const recentButton = document.getElementById('recentButton');
    const allButton = document.getElementById('allButton');
    const searchInput = document.querySelector(".search-container input");
    const searchResults = document.getElementById('searchResults');
    const recentMatchesList = document.getElementById('recentMatches-list');
    const totalMatchesList = document.getElementById('totalMatches-list');

    // 기본: 최근 10경기 버튼 active
    recentButton.classList.add("active");
    allButton.classList.remove("active");
    recentMatchesList.style.display = "block";
    totalMatchesList.style.display = "none";

    recentButton.addEventListener("click", () => {
        recentButton.classList.add("active");
        allButton.classList.remove("active");
        recentMatchesList.style.display = "block";
        totalMatchesList.style.display = "none";
        searchResults.style.display = "none";
        // select-year 영역 숨김
        const selectYear = document.getElementById('select-year');
        if (selectYear) {
            selectYear.style.display = "none";
        }
    });
    allButton.addEventListener("click", () => {
        allButton.classList.add("active");
        recentButton.classList.remove("active");
        recentMatchesList.style.display = "none";
        totalMatchesList.style.display = "block";
        searchResults.style.display = "none";
        // 전체 경기 모드에서는 select-year 영역 보이기
        const selectYear = document.getElementById('select-year');
        if (selectYear) {
             selectYear.style.display = "block";
        } else {
             renderYearSelection();
        }
    });

    searchInput.addEventListener("input", function() {
        const query = this.value.trim().toLowerCase();
        const searchList = document.getElementById('searchResults');
        // select-year 영역
        let selectYear = document.getElementById('select-year');

        if (!query) {
            // 검색어 없으면 검색 결과 숨김
            searchList.style.display = "none";
            // active 상태에 따라 리스트 보이기
            if (recentButton.classList.contains("active")) {
                recentMatchesList.style.display = "block";
                totalMatchesList.style.display = "none";
                if (selectYear) {
                    selectYear.style.display = "none";
                }
            } else {
                recentMatchesList.style.display = "none";
                totalMatchesList.style.display = "block";
                // 전체 경기 모드: select-year 영역 보이도록 처리
                if (selectYear) {
                    selectYear.style.display = "block";
                } else {
                    renderYearSelection();
                }
            }
            return;
        }

        // 검색어가 있으면 기존 리스트와 select-year 영역 숨기고, 검색 결과 표시
        recentMatchesList.style.display = "none";
        totalMatchesList.style.display = "none";
        if (selectYear) {
            selectYear.style.display = "none";
        }
        searchList.style.display = "block";

        // 중복 제거한 결과 반환 (최대 제한 없음)
        const results = Array.from(
            new Map(
                Object.entries(cachedData.matchesTotal)
                    .filter(([key, match]) => match.opponent && match.opponent.toLowerCase().includes(query))
                    .map(([key, match]) => [match.opponent, { key, opponent: match.opponent }])
            ).values()
        );

        searchList.innerHTML = results.length
            ? results.map(result => `
                <div class="search-item" data-key="${result.key}">
                    ${result.opponent}
                </div>
            `).join('')
            : ` <div class="search-empty">
                    검색 결과가 없습니다.
                </div>`;
    });

    // 검색 결과 클릭 이벤트 처리
    searchResults.addEventListener('click', function (event) {
        if (event.target && event.target.tagName === 'DIV') {
            const selectedTeam = event.target.innerText.trim();
            const selectedKey = event.target.dataset.key;
            if (selectedTeam === '검색 결과가 없습니다.') return;
            searchInput.value = selectedTeam;
            searchResults.innerHTML = '';
            showTeamHistory(selectedTeam);
        }
    });

    // 검색창에서 Enter 키 이벤트 처리
    searchInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                searchResults.innerHTML = '<div style="color: gray; text-align: center;">검색어를 입력해주세요.</div>';
                return;
            }
            const results = Array.from(
                new Set(
                    Object.values(cachedData.matchesTotal)
                        .filter(match => match.opponent && match.opponent.toLowerCase().includes(query))
                        .map(match => match.opponent)
                )
            );
            if (results.length === 1) {
                searchResults.innerHTML = '';
                searchInput.value = results[0];
                showTeamHistory(results[0]);
            } else if (results.length > 1) {
                searchResults.innerHTML = results
                    .map(opponent => `
                        <div style="
                            padding: 5px 0;
                            border: 2px solid #ddd;
                            border-radius: 5px;
                            margin-bottom: 5px;
                            cursor: pointer;
                            width: 100%;
                            text-align: left;"
                        >${opponent}</div>
                    `).join('');
            } else {
                searchResults.innerHTML = '<div style="color: gray; text-align: center;">검색 결과가 없습니다.</div>';
            }
        }
    });

    // 기타 기존 이벤트 리스너들...
    document.getElementById('recentMatches-list').addEventListener('click', function (event) {
        if (event.target.classList.contains('popup-button')) {
            handleMatchButtonClick(event.target.closest('.match-box'));
        }
    });

    document.getElementById('totalMatches-list').addEventListener('click', function (event) {
        if (event.target.classList.contains('popup-button')) {
            handleMatchButtonClick(event.target.closest('.matchtotal-box'));
        }
    });

    function handleMatchButtonClick(matchBox) {
        if (!matchBox) return;
        const matchDate = matchBox.querySelector('.match-date').innerText.trim();
        const matchTimeRaw = matchBox.querySelector('.match-time').innerText.trim();
        const matchTime = convertTo24HourFormat(matchTimeRaw);
        const matchKey = matchBox.querySelector('.popup-button').dataset.key;
        const matchData = cachedData.matchesTotal[matchKey];
        const teamName = matchData ? matchData.opponent : null;
        if (matchData) {
            renderPopup(matchData, teamName);
        } else {
            console.error('선택된 경기 데이터를 찾을 수 없습니다:', matchKey);
        }
    }

    function showTeamHistory(teamName) {
        const teamHistoryContainer = document.getElementById('teamHistoryContainer');
        if (!cachedData) return;
        const opponentMatches = Object.entries(cachedData.matchesTotal)
            .filter(([key, match]) => match.opponent.replace(/\s/g, '').toLowerCase() === teamName.replace(/\s/g, '').toLowerCase())
            .sort(([_, matchA], [__, matchB]) => new Date(matchB.date) - new Date(matchA.date));
        let historyList = "<ul class='recent-matches-popup'>";
        if (opponentMatches.length > 0) {
            opponentMatches.forEach(([key, match]) => {
                const matchDate = new Date(match.date);
                if (isNaN(matchDate.getTime())) {
                    console.error('Invalid match.date format:', match.date);
                    return;
                }
                const formattedDate = matchDate.toLocaleDateString('ko-KR');
                const formattedTime = matchDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                });
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

        teamHistoryContainer.innerHTML = `
            <div style="text-align: center;"><span style="font-size: 1.2em; font-weight: bold;">vs ${teamName}</span></div>
            <h3 class='recent-matches-popup-head'>역대 경기 기록</h3>
            ${historyList}
            <h3 class='recent-matches-popup-head'>코멘트</h3>
            ${commentList}
        `;
        teamHistoryContainer.style.display = 'block';
    }

    document.querySelector('.close-button').addEventListener('click', closePopup);
    document.querySelector('.overlay').addEventListener('click', closePopup);
});

window.onload = async function () {
    try {
        // 공통 요소 로드
        await loadCommonBody();
        await fetchData();
        initManagerPopup();

        renderRecentMatches(cachedData.matchesTotal);    
        renderTotalMatches(cachedData.matchesTotal);
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }            

    document.getElementById('loader').style.display = 'none';
}
