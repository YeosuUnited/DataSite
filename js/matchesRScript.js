
        let cachedData = null; // 캐싱 데이터를 저장
        let currentMatchData = null; // 현재 선택된 경기 데이터를 저장
        let token = null;

        async function fetchData() {
            const now = new Date().getTime();
            const cachedLastUpdated = localStorage.getItem('lastUpdated');

            if (!cachedLastUpdated || (now - cachedLastUpdated) > 60000) {
                try {
                    document.getElementById('status').innerText = '데이터를 불러오는 중...';

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

                    document.getElementById('status').innerText = '데이터 로딩 완료.';
                    updateTimeInfo(lastUpdated);
                    renderRecentMatches(data.matchesTotal);

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
            console.log("cachedToken : ", cachedToken);
            if (cachedToken) {
                token = cachedToken;
            }
            else {
                document.getElementById('status').innerText = '데이터를 불러오는 중 오류가 발생했습니다.';
            }
            const cached = localStorage.getItem('cachedData');
            if (cached) {
                try {
                    const parsedData = JSON.parse(cached);
                    if (parsedData && parsedData.matchesTotal) {
                        cachedData = parsedData; // cachedData를 초기화
                        document.getElementById('status').innerText = '서버 문제로 캐싱된 데이터를 사용 중입니다.';
                        const lastUpdated = parseInt(localStorage.getItem('lastUpdated'), 10);
                        updateTimeInfo(lastUpdated);
                        renderRecentMatches(cachedData.matchesTotal); // 데이터 렌더링
                    } else {
                        throw new Error('캐싱된 데이터가 올바르지 않습니다.');
                    }
                } catch (error) {
                    console.error('캐싱된 데이터 파싱 중 오류:', error);
                    document.getElementById('status').innerText = '캐싱된 데이터가 손상되었습니다.';
                }
            } else {
                document.getElementById('status').innerText = '캐싱된 데이터가 없습니다.';
            }
        }

        function updateTimeInfo(lastUpdated) {
            const lastUpdatedTime = new Date(lastUpdated);
            document.getElementById('lastUpdate').innerText = `최근 데이터 갱신 시간: ${formatTime(lastUpdatedTime)}`;
        }

        function formatTime(date) {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const period = hours < 12 ? '오전' : '오후';
            const formattedHours = hours % 12 || 12;
            return `${period} ${formattedHours}시${minutes ? ` ${minutes}분` : ''}`;
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

            console.log(`${filePath} 파일이 성공적으로 저장되었습니다.`);
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

                const formattedDate = new Date(match.date).toLocaleDateString('ko-KR');
                const formattedTime = new Date(match.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

                const matchType = match.type === "1" ? '풋살' : match.type === "2" ? '자체전' : '경기';

                let scoreText = '';
                if (match.type === "0") {
                    const usScore = match.score.us;
                    const themScore = match.score.them;
                    const result = usScore > themScore ? '승' : usScore < themScore ? '패' : '무';
                    scoreText = `<span>${usScore}</span> : <span>${themScore}</span> (<span>${result}</span>)`;
                }

                matchBox.innerHTML = `
                                            <div class="date-time">
                                                <div class="date">${formattedDate}</div>
                                                <div class="time">${formattedTime}</div>
                                            </div>
                                            <div class="opponent-location">
                                                <div class="opponent">${match.opponent}</div>
                                                <div class="location">${match.location}</div>
                                                ${scoreText ? `<div class="score">${scoreText}</div>` : `<div class="score">${matchType}</div>`}
                                            </div>
                                            <button class="popup-button" data-key="${key}">기록</button>
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
                const formattedTime = new Date(match.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

                const matchType = match.type === "1" ? '풋살' : match.type === "2" ? '자체전' : '경기';

                let scoreText = '';
                if (match.type === "0") {
                    const usScore = match.score.us;
                    const themScore = match.score.them;
                    const result = usScore > themScore ? '승' : usScore < themScore ? '패' : '무';
                    scoreText = `<span>${usScore}</span> : <span>${themScore}</span> (<span>${result}</span>)`;
                }

                matchBox.innerHTML = `
                                            <div class="date-time">
                                                <div class="date">${formattedDate}</div>
                                                <div class="time">${formattedTime}</div>
                                            </div>
                                            <div class="opponent-location">
                                                <div class="opponent">${match.opponent}</div>
                                                <div class="location">${match.location}</div>
                                                ${scoreText ? `<div class="score">${scoreText}</div>` : `<div class="score">${matchType}</div>`}
                                            </div>
                                            <button class="popup-button" data-key="${key}">기록</button>
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
            const header = `<h2>${matchTypeText}</h2>`;

            // 선수별 골 및 어시스트 집계
            const playerStats = matchData.players.map(playerName => {
                const playerInfo = Object.values(cachedData.players).find(player => player.name === playerName);
                const position = playerInfo ? playerInfo.posi : "알 수 없음";
                const goals = matchData.type === "0" ? matchData.goal.filter(name => name === playerName).length : null; // 경기 타입이 "0"일 때만 득점 계산
                const assists = matchData.type === "0" ? matchData.assist.filter(name => name === playerName).length : null; // 경기 타입이 "0"일 때만 도움 계산
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

        document.addEventListener("DOMContentLoaded", function () {
            const logoElement = document.getElementById('logo');
            const recentButton = document.getElementById('recentButton');
            const allButton = document.getElementById('allButton');
            const searchButton = document.getElementById('searchButton'); // 검색 버튼 추가
            const searchContainer = document.getElementById('searchContainer');
            const searchInput = document.getElementById('searchInput');
            const searchResults = document.getElementById('searchResults');

            logoElement.addEventListener('click', function () {
                window.location.href = 'index.html';
            });

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
                console.log("검색 버튼 클릭됨 - 추가 기능 구현 필요");
            });

            recentButton.classList.add('active');
            window.onload = fetchData;

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

                const matchDate = matchBox.querySelector('.date').innerText.trim();
                const matchTimeRaw = matchBox.querySelector('.time').innerText.trim();
                const matchTime = convertTo24HourFormat(matchTimeRaw);

                const matchKey = matchBox.querySelector('.popup-button').dataset.key;
                console.log('생성된 matchKey:', matchKey);

                const matchData = cachedData.matchesTotal[matchKey];
                const teamName = matchData ? matchData.opponent : null; // teamName을 opponent로 설정
                console.log('teamName:', teamName);

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
                        const formattedDate = matchDate.toLocaleDateString('ko-KR'); // 예: "2024. 12. 17."
                        const formattedTime = matchDate.toLocaleTimeString('ko-KR', {
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

            // 페이지 로드 시 초기화
            initializeUI();
        });
