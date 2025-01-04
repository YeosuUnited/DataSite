let cachedData = null; // 캐싱 데이터를 저장
let token = null;

async function fetchData() {
    const now = new Date().getTime();
    const cachedLastUpdated = localStorage.getItem('lastUpdated');

    console.log(`[fetchData] 실행: 현재 시간 - ${now}, 캐시된 마지막 업데이트 시간 - ${cachedLastUpdated}`);

    toggleLoadingOverlay(true);

    if (!cachedLastUpdated || (now - cachedLastUpdated) > 60000) {
        try {
            console.log("데이터를 불러오는 중...");
            console.log('[fetchData] 데이터 새로 요청 중...');

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

            // 데이터를 전역 변수 및 localStorage에 저장
            cachedData = data;
            const lastUpdated = now;

            localStorage.setItem('cachedData', JSON.stringify(cachedData));
            localStorage.setItem('lastUpdated', lastUpdated);

        } catch (error) {
            console.error('Error fetching data:', error);
            useCachedData();
        } finally {
            toggleLoadingOverlay(false);
        }
    } else {
        useCachedData();
        toggleLoadingOverlay(false);
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

async function fetchLatestData() {
    const now = new Date().getTime();
    const cachedLastUpdated = localStorage.getItem('lastUpdated');

    try {
        const repoOwner = "YeosuUnited";
        const repoName = "DataSite";
        const files = [
            "assets/data/player_data.json",
            "assets/data/records_allTime.json",
            "assets/data/matches_total.json",
        ];

        const responses = await Promise.allSettled(
            files.map(async (filePath) => {
                const response = await fetch(
                    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                    {
                        headers: {
                            Authorization: `token ${token}`, // 토큰 사용
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
                }

                const fileData = await response.json();
                return JSON.parse(base64ToUtf8(fileData.content)); // Base64 디코딩 후 JSON 파싱
            })
        );

        responses.forEach((response, index) => {
            if (response.status === 'rejected') {
                console.warn(`파일 ${files[index]} 로드 실패:`, response.reason);
            }
        });

        cachedData = {
            players: responses[0].status === 'fulfilled' ? responses[0].value : cachedData.players,
            recordAll: responses[1].status === 'fulfilled' ? responses[1].value : cachedData.recordAll,
            matchesTotal: responses[2].status === 'fulfilled' ? responses[2].value : cachedData.matchesTotal,
        };

        console.log("[fetchLatestData] 최신 데이터를 성공적으로 불러왔습니다:", cachedData);
    } catch (error) {
        console.error("최신 데이터를 불러오는 중 오류가 발생했습니다:", error);
        alert("최신 데이터를 불러오는 데 실패했습니다. 다시 시도하세요.");
    }
}

function formatTime(date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

function useCachedData() {
    const cachedToken = localStorage.getItem('token');
    console.log("cachedToken : ", cachedToken);
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

        // createCards 호출 제거
        console.log('[useCachedData] 캐싱된 데이터:', cachedData);
    } else {
        console.log("데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

// 선수 데이터를 테이블에 추가하는 함수
function populatePlayerList(players) {
    const playerList = document.getElementById("player-list");
    playerList.innerHTML = ""; // 기존 내용 초기화

    if (!players || Object.keys(players).length === 0) {
        console.warn("[populatePlayerList] 선수 데이터가 비어있습니다.", players);
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = 4;
        emptyCell.textContent = "선수 데이터가 없습니다.";
        emptyRow.appendChild(emptyCell);
        playerList.appendChild(emptyRow);
        return;
    }

    // 등번호 오름차순으로 정렬
    const sortedPlayers = Object.keys(players).sort((a, b) => parseInt(a) - parseInt(b));

    sortedPlayers.forEach((number) => {
        const player = players[number];
        const row = document.createElement("tr");

        // 선수 이름 셀
        const nameCell = document.createElement("td");
        nameCell.style.textAlign = "left"; // 왼쪽 정렬
        nameCell.innerHTML = `
                        ${player.name} <span style="color: gray; font-size: 0.9em;">No.${number}</span>
                    `;
        row.appendChild(nameCell);

        // 출전 여부 (체크박스)
        const playingCell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = `playing_${number}`;
        playingCell.appendChild(checkbox);
        row.appendChild(playingCell);

        // 득점 입력란
        const goalsCell = document.createElement("td");
        const goalsInput = document.createElement("input");
        goalsInput.type = "number";
        goalsInput.name = `goals_${number}`; // 기존 name 유지
        goalsInput.id = `goals_${number}`;   // 고유한 ID 추가
        goalsInput.placeholder = "0";
        goalsInput.style.width = "50px";
        goalsInput.min = "0"; // 음수 입력 방지
        goalsCell.appendChild(goalsInput);
        row.appendChild(goalsCell);

        // 도움 입력란
        const assistsCell = document.createElement("td");
        const assistsInput = document.createElement("input");
        assistsInput.type = "number";
        assistsInput.name = `assists_${number}`; // 기존 name 유지
        assistsInput.id = `assists_${number}`;   // 고유한 ID 추가
        assistsInput.placeholder = "0";
        assistsInput.style.width = "50px";
        assistsInput.min = "0"; // 음수 입력 방지
        assistsCell.appendChild(assistsInput);
        row.appendChild(assistsCell);

        // 행 추가
        playerList.appendChild(row);
    });
}

document.querySelectorAll('input[name="match-type"]').forEach((radio) => {
    radio.addEventListener('change', function () {
        const selectedType = this.value;
        const opponentScoreField = document.getElementById('opponent-score'); // 상대팀 점수 입력 필드
        const opponentScoreLabel = opponentScoreField.previousElementSibling; // 상대팀 점수 라벨
        const playerList = document.getElementById('player-list');

        if (selectedType === '풋살' || selectedType === '자체전') {
            // 상대팀 점수 숨기기
            opponentScoreField.style.display = 'none';
            opponentScoreLabel.style.display = 'none';

            // 선수 목록에서 득점과 도움 숨기기
            playerList.querySelectorAll('tr').forEach((row) => {
                const goalsCell = row.querySelector('td:nth-child(3)');
                const assistsCell = row.querySelector('td:nth-child(4)');
                if (goalsCell) goalsCell.style.display = 'none';
                if (assistsCell) assistsCell.style.display = 'none';
            });
        } else if (selectedType === '축구') {
            // 상대팀 점수 표시
            opponentScoreField.style.display = '';
            opponentScoreLabel.style.display = '';

            // 선수 목록에서 득점과 도움 표시
            playerList.querySelectorAll('tr').forEach((row) => {
                const goalsCell = row.querySelector('td:nth-child(3)');
                const assistsCell = row.querySelector('td:nth-child(4)');
                if (goalsCell) goalsCell.style.display = '';
                if (assistsCell) assistsCell.style.display = '';
            });
        }
    });
});

// 페이지 로드 시 선수 목록을 불러오는 이벤트 추가
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('match-form-container').style.display = 'none';
    document.getElementById('match-modify-container').style.display = 'none';
    document.getElementById('player-add-form-container').style.display = 'none';

    const buttonContainer = document.getElementById('button-container');
    buttonContainer.classList.remove('horizontal-layout');
    buttonContainer.classList.add('grid');
    fetchData().then(() => {
        console.log("[DOMContentLoaded] 캐싱된 데이터 확인:", cachedData);
        if (cachedData && cachedData.players) {
            populatePlayerList(cachedData.players);
        } else {
            console.error("[DOMContentLoaded] 선수 데이터가 없습니다.");
        }
    });
});

// 경기 데이터를 저장하는 함수
async function uploadMatchData(matchData) {
    try {
        const filePath = "assets/data/matches_total.json";
        const repoOwner = "YeosuUnited";
        const repoName = "DataSite";

        // 기존 데이터 가져오기
        const { sha, content: currentContent } = await getGitHubFile(repoOwner, repoName, filePath);

        // 새로운 match 데이터를 기존 데이터에 추가
        const tempContent = { ...currentContent, temp: matchData };

        // 데이터 정렬 및 키 재설정
        const finalSortedContent = sortAndRekeyMatchData(tempContent);

        console.log("최종 정렬된 데이터:", finalSortedContent);

        // 데이터를 GitHub에 저장
        await saveGitHubFile(repoOwner, repoName, filePath, finalSortedContent, sha, "경기 데이터를 추가 및 정렬합니다.");

        // --- 업로드 후 최신 데이터 다시 가져오기 ---
        await fetchLatestData(); // 최신 데이터를 서버에서 다시 받아오기

        alert("경기 데이터가 성공적으로 저장되었습니다!");
    } catch (error) {
        console.error("Error saving match data:", error);
        alert("경기 데이터를 저장하는 중 오류가 발생했습니다.");
    }
}

// 경기 데이터를 저장하는 함수
async function uploadModifyMatchData(matchData) {
    try {
        const filePath = "assets/data/matches_total.json";
        const repoOwner = "YeosuUnited";
        const repoName = "DataSite";

        // 기존 데이터 가져오기
        const { sha, content: currentContent } = await getGitHubFile(repoOwner, repoName, filePath);

        // 기존 데이터에서 수정 대상 데이터 제거
        const filteredContent = Object.fromEntries(
            Object.entries(currentContent).filter(([key]) => key !== window.currentMatchKey)
        );

        // 새로운 match 데이터를 추가
        const tempContent = { ...filteredContent, temp: matchData };

        // 데이터 정렬 및 키 재설정
        const finalSortedContent = sortAndRekeyMatchData(tempContent);

        // 데이터를 GitHub에 저장
        await saveGitHubFile(repoOwner, repoName, filePath, finalSortedContent, sha, "경기 데이터를 수정 및 정렬합니다.");

        alert("경기 데이터가 성공적으로 저장되었습니다!");
    } catch (error) {
        console.error("Error saving match data:", error);
        alert("경기 데이터를 저장하는 중 오류가 발생했습니다.");
    }
}

async function uploadDeleteMatchData() {
    try {
        const filePath = "assets/data/matches_total.json";
        const repoOwner = "YeosuUnited";
        const repoName = "DataSite";

        // 기존 데이터 가져오기
        const { sha, content: currentContent } = await getGitHubFile(repoOwner, repoName, filePath);

        // 기존 데이터에서 삭제 대상 데이터 제거
        const filteredContent = Object.fromEntries(
            Object.entries(currentContent).filter(([key]) => key !== window.currentMatchKey)
        );

        // 데이터 정렬 및 키 재설정
        const finalSortedContent = sortAndRekeyMatchData(filteredContent);

        // 데이터를 GitHub에 저장
        await saveGitHubFile(repoOwner, repoName, filePath, finalSortedContent, sha, "경기 데이터를 삭제 및 정렬합니다.");

        alert("경기 데이터가 성공적으로 저장되었습니다!");
        console.log("파일 업데이트 성공:", await updateResponse.json());
    } catch (error) {
        console.error("Error saving match data:", error);
        alert("경기 데이터를 저장하는 중 오류가 발생했습니다.");
    }
}

async function uploadRecordData(recordData) {
    try {
        const filePath = "assets/data/records_allTime.json";
        const repoOwner = "YeosuUnited";
        const repoName = "DataSite";

        // 기존 데이터 가져오기
        const { sha } = await getGitHubFile(repoOwner, repoName, filePath);

        // 데이터를 GitHub에 저장
        await saveGitHubFile(repoOwner, repoName, filePath, recordData, sha, "새로운 기록 데이터를 업로드합니다.");

        alert("경기 데이터가 성공적으로 업로드되었습니다!");
    } catch (error) {
        console.error("Error uploading match data:", error);
        alert("경기 데이터를 업로드하는 중 오류가 발생했습니다.");
    }
}

async function uploadNewPlayerData(newPlayerData) {
    try {
        const filePath = "assets/data/player_data.json";
        const repoOwner = "YeosuUnited";
        const repoName = "DataSite";

        // 기존 파일 가져오기
        const { sha, content: existingData } = await getGitHubFile(repoOwner, repoName, filePath);

        // 새로운 선수 데이터를 기존 데이터에 추가
        const updatedData = { ...existingData, [newPlayerData.number]: newPlayerData };

        // 등번호 순으로 정렬
        const sortedData = Object.fromEntries(
            Object.entries(updatedData).sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
        );

        // 사진 업로드 처리
        const photoFile = document.getElementById("player-photo").files[0];
        if (photoFile) {
            const reader = new FileReader();
            reader.onload = async function (e) {
                const photoContent = e.target.result.split(",")[1]; // Base64 인코딩된 데이터
                await saveGitHubFile(
                    repoOwner,
                    repoName,
                    `assets/images/${newPlayerData.number}.png`,
                    photoContent,
                    null,
                    `Upload player photo for number ${newPlayerData.number}`
                );
            };
            reader.readAsDataURL(photoFile);
        }

        // 데이터를 GitHub에 저장
        await saveGitHubFile(repoOwner, repoName, filePath, sortedData, sha, "새로운 선수 데이터를 추가합니다.");

        alert("경기 데이터가 성공적으로 업로드되었습니다!");
    } catch (error) {
        console.error("Error uploading match data:", error);
        alert("경기 데이터를 업로드하는 중 오류가 발생했습니다.");
    }
}

async function uploadDeletePlayerData() {
    try {
        const filePath = "assets/data/player_data.json";
        const repoOwner = "YeosuUnited";
        const repoName = "DataSite";

        // 기존 파일 가져오기
        const { sha, content: existingData } = await getGitHubFile(repoOwner, repoName, filePath);

        // 기존 데이터에서 window.currentMatchKey와 동일한 matchKey 제거
        const filteredContent = Object.fromEntries(
            Object.entries(existingData).filter(([key]) => key !== nowClickPlayer.number)
        );
        
        // 사진 삭제 처리
        const photoPath = `assets/images/${nowClickPlayer.number}.png`;
        try {
            const photoFileData = await getGitHubFile(repoOwner, repoName, photoPath);
            if (photoFileData.sha) {
                await deleteGitHubFile(repoOwner, repoName, photoPath, photoFileData.sha, `Delete player photo for number ${nowClickPlayer.number}`);
            }
        } catch (error) {
            console.warn("사진 삭제 중 오류 발생 또는 사진이 존재하지 않습니다.", error);
        }

        // 데이터를 GitHub에 저장
        await saveGitHubFile(repoOwner, repoName, filePath, filteredContent, sha, "선수 데이터를 삭제합니다.");                

        alert("경기 데이터가 성공적으로 업로드되었습니다!");
    } catch (error) {
        console.error("Error uploading match data:", error);
        alert("경기 데이터를 업로드하는 중 오류가 발생했습니다.");
    }
}

async function uploadDeleteRecordData() {
    try {
        const filePath = "assets/data/records_allTime.json";
        const repoOwner = "YeosuUnited";
        const repoName = "DataSite";

        // 기존 파일 가져오기
        const { sha, content: existingData } = await getGitHubFile(repoOwner, repoName, filePath);

        // 기존 데이터에서 window.currentMatchKey와 동일한 matchKey 제거
        const filteredContent = Object.fromEntries(
            Object.entries(existingData).filter(([key]) => key !== nowClickPlayer.number)
        );

        // 데이터를 GitHub에 저장
        await saveGitHubFile(repoOwner, repoName, filePath, filteredContent, sha, "선수 데이터를 삭제합니다.");

        alert("경기 데이터가 성공적으로 업로드되었습니다!");
    } catch (error) {
        console.error("Error uploading match data:", error);
        alert("경기 데이터를 업로드하는 중 오류가 발생했습니다.");
    }
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

    // --- 삭제 후 최신 데이터 다시 가져오기 ---
    await fetchLatestData(); // 최신 데이터를 서버에서 다시 받아오기
    renderPlayerList();
    renderTotalMatches(cachedData.matchesTotal); // 최신 데이터를 기준으로 리스트 다시 렌더링
}

// 공통 유틸리티 함수: GitHub 파일 삭제
async function deleteGitHubFile(repoOwner, repoName, filePath, sha, message) {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
        method: "DELETE",
        headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message,
            sha,
        }),
    });

    if (!response.ok) {
        throw new Error(`파일 삭제에 실패했습니다: ${filePath}`);
    }

    console.log(`${filePath} 파일이 성공적으로 삭제되었습니다.`);
}

// 정렬 및 키 재설정 함수
function sortAndRekeyMatchData(data) {
    // 1. date 기준으로 오름차순 정렬
    const sortedByOldest = Object.entries(data).sort(([, a], [, b]) => new Date(a.date) - new Date(b.date));

    // 2. "match_숫자" 키 재설정
    const rekeyedContent = {};
    sortedByOldest.forEach(([key, value], index) => {
        const newKey = `match_${String(index + 1).padStart(5, '0')}`;
        rekeyedContent[newKey] = value;
    });

    // 3. date 기준으로 내림차순 정렬
    return Object.fromEntries(
        Object.entries(rekeyedContent).sort(([, a], [, b]) => new Date(b.date) - new Date(a.date))
    );
}

// 선수 데이터를 수집하여 반환하는 함수
function collectPlayerData() {
    const playerList = document.getElementById("player-list").querySelectorAll("tr");
    const players = [];
    let totalGoals = 0;

    playerList.forEach(row => {
        const playerName = row.querySelector("td:first-child").innerText.split(' ')[0].trim();
        const isPlaying = row.querySelector("input[type='checkbox']").checked;
        const playerGoals = parseInt(row.querySelector("input[name^='goals']").value, 10) || 0;

        if (isPlaying) players.push(playerName);
        totalGoals += playerGoals; // 득점 합산
    });

    return { players, totalGoals };
}

document.getElementById('add-match-button').addEventListener('click', function () {
    const buttonContainer = document.getElementById('button-container');
    buttonContainer.classList.remove('grid');
    buttonContainer.classList.add('horizontal-layout');

    resetMatchForm(); // 폼 리셋 함수
    document.getElementById('submit-match').style.display = 'block';
    document.getElementById('update-match').style.display = 'none';
    document.getElementById('delete-match').style.display = 'none';

    const playerListContainer = document.getElementById('player-list-container');
    if (playerListContainer) { playerListContainer.style.display = 'none'; }

    document.getElementById('cancel-match').style.display = 'none';

    document.getElementById('match-modify-container').style.display = 'none';
    document.getElementById('player-add-form-container').style.display = 'none'; // 폼 표시
    console.log("here");
    document.getElementById('match-form-container').style.display = 'block';
});

function resetMatchForm() {
    // 폼 자체를 리셋
    document.getElementById('match-form').reset();

    // 선수 목록 체크박스 및 득점/도움 필드 초기화
    const playerList = document.getElementById("player-list");
    playerList.querySelectorAll('tr').forEach(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        const goalsInput = row.querySelector('input[name^="goals"]');
        const assistsInput = row.querySelector('input[name^="assists"]');

        if (checkbox) checkbox.checked = false; // 체크 해제
        if (goalsInput) goalsInput.value = ''; // 득점 초기화
        if (assistsInput) assistsInput.value = ''; // 도움 초기화
    });

    console.log('폼이 초기화되었습니다.');
}

document.getElementById('modify-match-button').addEventListener('click', function () {
    const buttonContainer = document.getElementById('button-container');
    buttonContainer.classList.remove('grid');
    buttonContainer.classList.add('horizontal-layout');

    document.getElementById('match-form-container').style.display = 'none';
    renderTotalMatches(cachedData.matchesTotal); // renderTotalMatches 실행
    document.getElementById('player-add-form-container').style.display = 'none'; // 폼 표시

    const playerListContainer = document.getElementById('player-list-container');
    if (playerListContainer) { playerListContainer.style.display = 'none'; }

    document.getElementById('match-modify-container').style.display = 'block';
});

// "선수 추가" 버튼 클릭 이벤트
document.getElementById('add-player-button').addEventListener('click', function () {
    const buttonContainer = document.getElementById('button-container');
    buttonContainer.classList.remove('grid');
    buttonContainer.classList.add('horizontal-layout');

    document.getElementById('match-form-container').style.display = 'none';
    document.getElementById('match-modify-container').style.display = 'none';

    const playerListContainer = document.getElementById('player-list-container');
    if (playerListContainer) { playerListContainer.style.display = 'none'; }

    document.getElementById('player-add-form-container').style.display = 'block'; // 폼 표시

    resetPlayerAddForm(); // 폼 리셋 함수
    document.getElementById('modify-player-confirm').style.display = 'none';
    document.getElementById('add-player-submit').style.display = 'block';
    document.getElementById('delete-player-confirm').style.display = 'none';
});

function resetPlayerAddForm() {
    // 사진 입력 초기화
    document.getElementById('player-photo').value = '';

    // 텍스트 입력 필드 초기화
    document.getElementById('player-name').value = '';
    document.getElementById('player-birth').value = '';
    document.getElementById('player-number').value = '';
    document.getElementById('player-position').value = '';
    document.getElementById('player-sub-position').value = '';
    document.getElementById('player-height').value = '';
    document.getElementById('player-weight').value = '';

    // 셀렉트 필드 초기화 (첫 번째 옵션 선택)
    document.getElementById('player-nationality').selectedIndex = 0;

    // 버튼 상태 초기화 (필요 시 추가 작업)
    document.getElementById('add-player-submit').disabled = false;
    document.getElementById('modify-player-confirm').disabled = false;
    document.getElementById('cancel-player-add').disabled = false;
    document.getElementById('delete-player-confirm').disabled = false;
}

// "선수 수정" 버튼 클릭 이벤트
document.getElementById('modify-player-button').addEventListener('click', function () {
    const buttonContainer = document.getElementById('button-container');
    buttonContainer.classList.remove('grid');
    buttonContainer.classList.add('horizontal-layout');

    document.getElementById('match-form-container').style.display = 'none';
    document.getElementById('match-modify-container').style.display = 'none';
    document.getElementById('player-add-form-container').style.display = 'none';

    renderPlayerList(); // 선수 리스트 렌더링
});

let nowClickPlayer = null;

function renderPlayerList() {
    const container = document.createElement('div');
    container.id = 'player-list-container';
    container.style.padding = '20px';
    container.style.backgroundColor = '#f9f9f9';

    // 기존 내용 초기화
    const existingContainer = document.getElementById('player-list-container');
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
        const playerRow = document.createElement('div');
        playerRow.style.display = 'flex';
        playerRow.style.justifyContent = 'space-between';
        playerRow.style.padding = '10px 0';
        playerRow.style.borderBottom = '1px solid #ccc';

        const playerInfo = document.createElement('span');
        playerInfo.textContent = `${player.name} (등번호: ${number})`;

        const modifyButton = document.createElement('button');
        modifyButton.textContent = '수정';
        modifyButton.style.backgroundColor = '#4CAF50';
        modifyButton.style.color = 'white';
        modifyButton.style.border = 'none';
        modifyButton.style.padding = '5px 10px';
        modifyButton.style.cursor = 'pointer';
        modifyButton.style.borderRadius = '5px';

        modifyButton.addEventListener('click', () => {
            const playerListContainer = document.getElementById('player-list-container');
            if (playerListContainer) { playerListContainer.style.display = 'none'; }

            document.getElementById('player-add-form-container').style.display = 'block'; // 폼 표시

            document.getElementById('add-player-submit').style.display = 'none';
            document.getElementById('modify-player-confirm').style.display = 'block';
            document.getElementById('delete-player-confirm').style.display = 'block';

            console.log("player : ", player);

            nowClickPlayer = player;
            populatePlayerForm(nowClickPlayer); // 선수 데이터 폼에 채우기
        });

        playerRow.appendChild(playerInfo);
        playerRow.appendChild(modifyButton);
        container.appendChild(playerRow);
    });
}

function populatePlayerForm(player) {
    document.getElementById('player-add-form-container').style.display = 'block';

    document.getElementById('player-name').value = player.name;
    document.getElementById('player-birth').value = `${player.birth.slice(0, 4)}-${player.birth.slice(4, 6)}-${player.birth.slice(6, 8)}`; // YYYY-MM-DD 형식으로 변환
    document.getElementById('player-nationality').value = player.nation;
    document.getElementById('player-number').value = player.number;
    document.getElementById('player-position').value = player.posi;
    document.getElementById('player-sub-position').value = player.subPosi || '';
    document.getElementById('player-height').value = player.height;
    document.getElementById('player-weight').value = player.weight;

    // "선수 추가" 버튼 대신 "수정하기" 버튼 표시
    const addButton = document.getElementById('add-player-submit');
    const modifyButton = document.createElement('button');
    modifyButton.id = 'update-player-submit';
    modifyButton.textContent = '수정하기';
    modifyButton.style.backgroundColor = '#2196F3';
    modifyButton.style.color = 'white';
    modifyButton.style.border = 'none';
    modifyButton.style.padding = '10px';
    modifyButton.style.borderRadius = '5px';
    modifyButton.style.cursor = 'pointer';

    // "수정하기" 버튼 클릭 이벤트
    modifyButton.addEventListener('click', async () => {
        const updatedPlayer = {
            name: document.getElementById('player-name').value,
            birth: document.getElementById('player-birth').value,
            nation: document.getElementById('player-nationality').value,
            number: document.getElementById('player-number').value,
            posi: document.getElementById('player-position').value,
            subPosi: document.getElementById('player-sub-position').value,
            height: document.getElementById('player-height').value,
            weight: document.getElementById('player-weight').value,
        };

        cachedData.players[updatedPlayer.number] = updatedPlayer; // 데이터 업데이트
        alert('선수 데이터가 수정되었습니다.');
        document.getElementById('player-add-form-container').style.display = 'none';
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
                                                <button class="edit-button" data-key="${key}">수정</button>
                                        `;
        matchContainer.appendChild(matchBox);
    });
}

// 모든 경기에서 "수정" 버튼 처리
document.getElementById('allMatchesContainer').addEventListener('click', function (event) {
    if (event.target.classList.contains('edit-button')) {
        const matchKey = event.target.dataset.key;
        const matchData = cachedData.matchesTotal[matchKey];
        loadMatchDataToForm(matchData, matchKey);
    }
});

let originalMatchData = null; // 불러온 원본 데이터를 저장하는 변수

function loadMatchDataToForm(matchData, matchKey) {
    originalMatchData = JSON.parse(JSON.stringify(matchData)); // 원본 데이터 복사
    window.currentMatchKey = matchKey; // 현재 경기 키 저장

    // 경기 데이터를 폼에 채움
    document.querySelector(`input[name="match-type"][value="${matchData.type === "0" ? "축구" : matchData.type === "1" ? "풋살" : "자체전"}"]`).checked = true;
    document.getElementById('opponent-name').value = matchData.opponent;
    document.getElementById('opponent-score').value = matchData.score.them;
    document.getElementById('match-date').value = matchData.date;
    document.getElementById('match-location').value = matchData.location;
    document.getElementById('match-comment').value = matchData.comment;

    // 선수 데이터 채우기
    populatePlayerList(cachedData.players); // 기존 함수
    // 출전 여부, 득점, 도움 필드 채우기
    matchData.players.forEach(playerName => {
        // 이름 → 등번호 변환
        const playerEntry = Object.entries(cachedData.players).find(([key, player]) => player.name === playerName);
        if (playerEntry) {
            const playerNumber = playerEntry[0]; // 등번호

            // 출전 여부 체크박스 체크
            const checkbox = document.querySelector(`input[name="playing_${playerNumber}"]`);
            if (checkbox) checkbox.checked = true;

            // 득점 필드 채우기
            const goals = matchData.goal.filter(name => name === playerName).length; // 골 개수
            const goalsInput = document.querySelector(`input[name="goals_${playerNumber}"]`);
            if (goalsInput) goalsInput.value = goals;

            // 도움 필드 채우기
            const assists = matchData.assist.filter(name => name === playerName).length; // 도움 개수
            const assistsInput = document.querySelector(`input[name="assists_${playerNumber}"]`);
            if (assistsInput) assistsInput.value = assists;
        } else {
            console.warn(`선수 정보를 찾을 수 없습니다: ${playerName}`);
        }
    });

    // 화면 전환
    document.getElementById('match-modify-container').style.display = 'none';
    document.getElementById('player-add-form-container').style.display = 'none'; // 폼 표시
    document.getElementById('match-form-container').style.display = 'block';

    // 버튼 수정
    document.getElementById('submit-match').style.display = 'none';
    document.getElementById('update-match').style.display = 'block';
    document.getElementById('delete-match').style.display = 'block';
    document.getElementById('cancel-match').style.display = 'block';
}

document.getElementById('update-match').addEventListener('click', async function () {
    toggleLoadingOverlay(true);

    try {
        const { typeNumber, matchDate, year } = getMatchDetails();
        const opponentName = getOpponentName();
        // 선수 데이터 수집
        const { players, totalGoals } = collectPlayerData();
        const { goalPlayers, assistPlayers } = collectGoalAndAssistData(players, cachedData);

        const matchData = createMatchData(selectedType, matchDate, opponentName, players, goalPlayers, assistPlayers);

        //플레이 데이터 작업시작
        const playerList = document.querySelectorAll("#player-list tr");
        const nameToNumberMap = Object.fromEntries(Object.entries(cachedData.players).map(([number, info]) => [info.name, number]));
        const updatedRecordAll = processPlayerData(playerList, nameToNumberMap, { ...cachedData.recordAll }, year, originalMatchData);
        
        console.log("updatedRecordAll : ", updatedRecordAll);

        // 서버에 데이터 저장
        await uploadRecordData(updatedRecordAll); // recordAll 업데이트 저장
        await uploadModifyMatchData(matchData);

        resetUIModifyMatch();
        toggleLoadingOverlay(false);
    } catch (error) {
        console.error('Error during match submission:', error);
        alert('경기 데이터를 저장하는 중 오류가 발생했습니다.');
        toggleLoadingOverlay(false);
    }
});

document.getElementById('delete-match').addEventListener('click', async function () {
    toggleLoadingOverlay(true);

    try {
        const { typeNumber, matchDate, year } = getMatchDetails();
        const opponentName = getOpponentName();
        // 선수 데이터 수집
        const { players, totalGoals } = collectPlayerData();
        const playerList = document.querySelectorAll("#player-list tr");
        const nameToNumberMap = Object.fromEntries(Object.entries(cachedData.players).map(([number, info]) => [info.name, number]));
        const updatedRecordAll = processPlayerData(playerList, nameToNumberMap, { ...cachedData.recordAll }, year);

        // 서버에 데이터 저장
        await uploadRecordData(updatedRecordAll); // recordAll 업데이트 저장
        await uploadDeleteMatchData();

        resetUIModifyMatch();
        toggleLoadingOverlay(false);
    } catch (error) {
        console.error('Error during match submission:', error);
        alert('경기 데이터를 저장하는 중 오류가 발생했습니다.');
        toggleLoadingOverlay(false);
    }
});

document.getElementById('cancel-match').addEventListener('click', function () {
    resetUIModifyMatch();
    document.getElementById('player-add-form-container').style.display = 'none'; // 폼 표시
});

document.getElementById('submit-match').addEventListener('click', async function () {
    toggleLoadingOverlay(true);

    try {
        const { typeNumber, matchDate, year } = getMatchDetails();
        const opponentName = getOpponentName();
        const { players } = collectPlayerData();
        const { goalPlayers, assistPlayers } = collectGoalAndAssistData(players, cachedData);

        const matchData = createMatchData(typeNumber, matchDate, opponentName, players, goalPlayers, assistPlayers);
        const updatedRecordAll = processPlayerData(players, {}, { ...cachedData.recordAll }, year);

        // 서버에 데이터 저장
        await uploadRecordData(updatedRecordAll); // recordAll 업데이트 저장
        await uploadMatchData(matchData);

        resetUIModifyMatch();
        toggleLoadingOverlay(false);
    } catch (error) {
        console.error('Error during match submission:', error);
        alert(error.message);
        toggleLoadingOverlay(false);
    }
});

// 경기 종류 및 날짜 확인 함수
function getMatchDetails() {
    const selectedType = document.querySelector('input[name="match-type"]:checked')?.value;
    if (!selectedType) throw new Error('경기 종류를 선택해주세요');

    const typeMap = { "축구": "0", "풋살": "1", "자체전": "2" };
    const typeNumber = typeMap[selectedType];

    const matchDate = document.getElementById('match-date').value;
    if (!matchDate || isNaN(new Date(matchDate))) {
        throw new Error('유효한 경기 날짜를 입력해주세요');
    }
    return { typeNumber, matchDate: new Date(matchDate), year: new Date(matchDate).getFullYear() };
}

// 상대팀 이름 확인 함수
function getOpponentName() {
    const opponentName = document.getElementById('opponent-name').value.trim();
    if (!opponentName) throw new Error('상대팀 이름을 입력하세요');
    return opponentName;
}

// 선수 데이터 수집 함수
function collectGoalAndAssistData(players, cachedData) {
    const goalPlayers = [];
    const assistPlayers = [];

    players.forEach((player) => {
        const playerNumber = Object.entries(cachedData.players).find(([key, value]) => value.name === player)?.[0];
        if (!playerNumber) throw new Error(`선수 ${player}의 등번호를 찾을 수 없습니다.`);

        const goalsInput = document.querySelector(`#goals_${playerNumber}`);
        const assistsInput = document.querySelector(`#assists_${playerNumber}`);

        const goals = parseInt(goalsInput?.value || '0', 10);
        const assists = parseInt(assistsInput?.value || '0', 10);

        for (let i = 0; i < goals; i++) goalPlayers.push(player);
        for (let i = 0; i < assists; i++) assistPlayers.push(player);
    });

    return { goalPlayers, assistPlayers };
}

// 경기 데이터 객체 생성 함수
function createMatchData(selectedType, matchDate, opponentName, players, goalPlayers, assistPlayers) {
    const opponentScore = selectedType === "풋살" || selectedType === "자체전" ? 0 : parseInt(document.getElementById('opponent-score').value || '0', 10);
    const usScore = selectedType === "풋살" || selectedType === "자체전" ? 0 : goalPlayers.length;

    return {
        date: matchDate,
        type: selectedType,
        opponent: opponentName,
        players,
        score: { us: usScore, them: opponentScore },
        location: document.getElementById('match-location').value,
        goal: goalPlayers,
        assist: assistPlayers,
        comment: document.getElementById('match-comment').value,
    };
}

// 공통 서버 데이터 업데이트 함수
async function updateRecordData(players, goalPlayers, assistPlayers, updatedRecordAll, year) {
    const nameToNumberMap = Object.fromEntries(
        Object.entries(cachedData.players).map(([number, info]) => [info.name, number])
    );

    players.forEach((playerName) => {
        const playerNumber = nameToNumberMap[playerName];
        if (!playerNumber) throw new Error(`선수 ${playerName}의 등번호를 찾을 수 없습니다.`);

        const playerRecord = updatedRecordAll[playerNumber] || {};

        // 만약 year 데이터가 없으면 로직을 중단하고 팝업을 띄우도록 처리
        if (!playerRecord[year]) {
            // 브라우저 팝업
            alert('데이터에 문제가 있으니 페이지를 새로고침이 필요합니다.');
            // 페이지 새로고침
            location.reload();

            // 함수 전체 로직을 중단하려면 아래와 같이 처리
            throw new Error(`연도 ${year} 데이터가 존재하지 않습니다. 페이지를 새로고침하세요.`);
        }

        const yearData = playerRecord[year];

        const playerGoals = goalPlayers.filter((name) => name === playerName).length;
        const playerAssists = assistPlayers.filter((name) => name === playerName).length;

        yearData.goals += playerGoals;
        yearData.assists += playerAssists;
        yearData.attackP += playerGoals + playerAssists;
        yearData.matches += 1;

        playerRecord[year] = yearData;
        updatedRecordAll[playerNumber] = playerRecord;
    });

    return updatedRecordAll;
}

// 선수 데이터 업데이트 함수
function processPlayerData(playerList, nameToNumberMap, updatedRecordAll, year, originalMatchData = null) {
    playerList.forEach(row => {
        const playerName = row.querySelector("td:first-child").innerText.split(' ')[0].trim();
        const isPlaying = row.querySelector("input[type='checkbox']").checked;
        const goals = parseInt(row.querySelector("input[name^='goals']").value || '0', 10);
        const assists = parseInt(row.querySelector("input[name^='assists']").value || '0', 10);

        const playerNumber = nameToNumberMap[playerName];
        if (!playerNumber) {
            console.warn(`선수 ${playerName}의 등번호를 찾을 수 없습니다.`);
            return;
        }

        const playerRecord = updatedRecordAll[playerNumber] || {};
        const yearData = playerRecord[year] || { goals: 0, assists: 0, attackP: 0, matches: 0 };

        if (originalMatchData) {
            const originalGoals = originalMatchData.goal.filter(name => name === playerName).length;
            const originalAssists = originalMatchData.assist.filter(name => name === playerName).length;
            const wasPlaying = originalMatchData.players.includes(playerName);

            yearData.goals += goals - originalGoals;
            yearData.assists += assists - originalAssists;
            yearData.attackP += (goals + assists) - (originalGoals + originalAssists);
            yearData.matches += isPlaying && !wasPlaying ? 1 : !isPlaying && wasPlaying ? -1 : 0;
        } else {
            yearData.goals += goals;
            yearData.assists += assists;
            yearData.attackP += goals + assists;
            yearData.matches += isPlaying ? 1 : 0;
        }

        updatedRecordAll[playerNumber] = { ...playerRecord, [year]: yearData };
    });

    return updatedRecordAll;
}

// 공통 UI 초기화 함수
function resetUIModifyMatch() {
    document.getElementById('match-form').reset();
    document.getElementById('player-list').innerHTML = '';
    const buttonContainer = document.getElementById('button-container');
    buttonContainer.classList.remove('horizontal-layout');
    buttonContainer.classList.add('grid');
    document.getElementById('match-form-container').style.display = 'none';
}

// "추가하기" 버튼 클릭 이벤트
document.getElementById('add-player-submit').addEventListener('click', async function () {
    toggleLoadingOverlay(true);

    const photoInput = document.getElementById('player-photo');
    const playerName = document.getElementById('player-name').value.trim();
    const playerBirth = document.getElementById('player-birth').value.replace(/-/g, '');
    const playerNationality = document.getElementById('player-nationality').value;
    const playerNumber = document.getElementById('player-number').value;
    const playerPosition = document.getElementById('player-position').value.trim();
    const playerSubPosition = document.getElementById('player-sub-position').value.trim();
    const playerHeight = parseFloat(document.getElementById('player-height').value);
    const playerWeight = parseFloat(document.getElementById('player-weight').value);

    if (!validateInputs(photoInput, playerName, playerBirth, playerNationality, playerPosition, playerHeight, playerWeight, playerNumber)) {
        toggleLoadingOverlay(false);
        return;
    }

    if (isDuplicateNumber(playerNumber)) {
        alert('이미 사용 중인 등번호입니다. 다른 번호를 입력해주세요.');
        toggleLoadingOverlay(false);
        return;
    }

    const newPlayerData = createPlayerData(playerName, playerBirth, playerNationality, playerNumber, playerPosition, playerSubPosition, playerHeight, playerWeight);

    await uploadNewPlayerData(newPlayerData);
    await fetchLatestData(); // 최신 데이터를 서버에서 다시 받아오기
    renderPlayerList();
    alert('선수 추가가 완료되었습니다!');

    resetUIFromModifyPlayer();            
    toggleLoadingOverlay(false);
});

// "삭제하기" 버튼 클릭 이벤트
document.getElementById('delete-player-confirm').addEventListener('click', async function () {
    toggleLoadingOverlay(true);

    await uploadDeleteRecordData();
    await uploadDeletePlayerData();
    alert('선수 삭제가 완료되었습니다!');

    resetUIFromModifyPlayer();
    toggleLoadingOverlay(false);
});

// 입력값 유효성 검사 함수
function validateInputs(photoInput, playerName, playerBirth, playerNationality, playerPosition, playerHeight, playerWeight, playerNumber) {
    const photoFileName = photoInput.files[0]?.name || '';
    if (photoFileName && !/^[0-9]+\.png$/.test(photoFileName)) {
        alert('파일명은 숫자.png 형식이어야 합니다.');
        return false;
    }

    if (!playerName || !playerBirth || !playerNationality || !playerPosition || !playerHeight || !playerWeight || isNaN(playerNumber)) {
        alert('모든 필드를 정확히 입력해주세요.');
        return false;
    }

    return true;
}

// 오버레이 활성화 및 비활성화 함수
function toggleLoadingOverlay(isActive) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (isActive) { loadingOverlay.classList.add('active'); }
    else { loadingOverlay.classList.remove('active'); }
}

// 등번호 중복 검사 함수
function isDuplicateNumber(playerNumber) {
    return Object.values(cachedData.players).some(player => parseInt(player.number, 10) === playerNumber);
}

// 공통 선수 데이터 생성 함수
function createPlayerData(playerName, playerBirth, playerNationality, playerNumber, playerPosition, playerSubPosition, playerHeight, playerWeight) {
    return {
        name: playerName,
        birth: playerBirth,
        nation: playerNationality,
        number: playerNumber,
        posi: playerPosition,
        subPosi: playerSubPosition,
        height: playerHeight,
        weight: playerWeight,
    };
}

// 폼 초기화 및 화면 복원 함수
function resetUIFromModifyPlayer() {
    document.getElementById('player-add-form').reset();
    document.getElementById('player-add-form-container').style.display = 'none';

    const buttonContainer = document.getElementById('button-container');
    buttonContainer.classList.remove('horizontal-layout');
    buttonContainer.classList.add('grid');
}

// "취소하기" 버튼 클릭 이벤트
document.getElementById('cancel-player-add').addEventListener('click', function () {
    document.getElementById('player-add-form').reset(); // 폼 초기화
    document.getElementById('player-add-form-container').style.display = 'none'; // 폼 숨기기

    // 최초 화면 셋팅 복원
    const buttonContainer = document.getElementById('button-container');
    buttonContainer.classList.remove('horizontal-layout');
    buttonContainer.classList.add('grid');
});

// UTF-8 문자열을 Base64로 변환
function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

// Base64 문자열을 UTF-8로 변환
function base64ToUtf8(str) {
    return decodeURIComponent(escape(atob(str)));
}
