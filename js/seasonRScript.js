let recordAllData = null; // 선수 이름, 등번호, 포지션 정보를 담을 전역 변수
let playerInfoData = {};
let currentYear;
let availableYears = [];
let currentSortCriteria = '기본'; // 현재 정렬 기준을 저장하는 변수
let isSub = false; //정회원 정보라면 true, 용병이면 false
let currentSortColumn = 'goals';
let currentSortDirection = 'desc';
let isTotal = false;

// 포지션 분류를 위한 매핑 객체
const positionMapping = {
    FW: ["ST", "CF", "SS", "LWF", "RWF", "LW", "RW", "FW"],
    MF: ["CM", "LCM", "RCM", "CDM", "AM", "CAM", "RM", "LM", "DM", "MF"],
    DF: ["CB", "LCB", "RCB", "RB", "LB", "LWB", "RWB", "DF"],
    GK: ["GK"]
};

// 선수 데이터를 초기화하고 가공하는 함수
function initializePlayerInfoData(playersData) {
    if (!playersData) return console.error("선수 데이터가 없습니다.");

    playerInfoData = Object.fromEntries(
        Object.entries(playersData).map(([playerId, player]) => [
            playerId,
            {
                name: player.name || "",
                number: player.number || "",
                position: classifyPosition(player.posi || "")
            }
        ])
    );
}

// 포지션을 분류하는 함수
function classifyPosition(position) {
    position = position.toUpperCase();
    return Object.keys(positionMapping).find(key => positionMapping[key].includes(position)) || "MF";
}

function updateYearNavigationButtons() {
    const minYear = Math.min(...availableYears);
    const maxYear = Math.max(...availableYears);

    const prevButton = document.getElementById('prevYear');
    const nextButton = document.getElementById('nextYear');

    prevButton.disabled = currentYear <= minYear;
    nextButton.disabled = currentYear >= maxYear;
}

function initializeAvailableYears(data) {
    const allYears = Object.values(data.recordAll || {}).flatMap(player =>
        Object.keys(player || {}).map(Number)
    );

    availableYears = Array.from(new Set(allYears)).sort((a, b) => a - b);
    currentYear = availableYears.includes(new Date().getFullYear())
        ? new Date().getFullYear()
        : availableYears[0];

    document.getElementById('currentYear').textContent = currentYear;
    updateYearNavigationButtons();
}

function sortTable(a, b) {
    const column = currentSortColumn;
    if (a[column] !== b[column]) {
        // 기본 정렬 조건
        return currentSortDirection === 'desc' ? (b[column] || 0) - (a[column] || 0) : (a[column] || 0) - (b[column] || 0);
    }

    // 동점일 경우 우선순위 정렬 (득점 → 도움 → 공격P → 출전수)
    const tieBreakers = ['assists', 'attackP', 'matches'];
    for (const key of tieBreakers) {
        if (a[key] !== b[key]) {
            return currentSortDirection === 'desc' ? (b[key] || 0) - (a[key] || 0) : (a[key] || 0) - (b[key] || 0);
        }
    }

    // 모든 값이 같을 경우 순서 유지
    return 0;
}


function highlightSelectedColumn(columnIndex) {
    const allCells = document.querySelectorAll('.scrollable-table td, .scrollable-table th');
    allCells.forEach(cell => {
        cell.classList.remove('selected');
        cell.style.backgroundColor = 'white';
        cell.style.color = '';
    });

    const selectedCells = document.querySelectorAll(`.scrollable-table td:nth-child(${columnIndex}), .scrollable-table th:nth-child(${columnIndex})`);
    selectedCells.forEach(cell => {
        cell.classList.add('selected');
        cell.style.backgroundColor = 'white';
        cell.style.color = '#6495ED';
        cell.style.fontWeight = 'bold'; // 추가: 볼드 처리
    });
}

function displayPlayerRecord(data) {
    let fixedColumnHtml = '<table class="fixed-column"><tr><th>이름</th></tr>';
    data.forEach(player => {
        fixedColumnHtml += `
    <tr>
        <td>
            ${player.name}
            ${!isSub ? `<div style="color: gray; font-size: 10px; margin-top: 1px;">
                ${player.position} | No.${player.number}
            </div>` : ''}
        </td>
    </tr>`;
    });
    fixedColumnHtml += '</table>';

    let scrollableTableHtml = `
    <table class="scrollable-table">
    <tr>
        <th onclick="sortBy('goals', 1)">득점</th>
        <th onclick="sortBy('assists', 2)">도움</th>
        <th onclick="sortBy('attackP', 3)">공격P</th>
        <th onclick="sortBy('matches', 4)">경기수</th>
    </tr>`;

    data.forEach(player => {
        scrollableTableHtml += `
    <tr>
        <td>${player.goals}</td>
        <td>${player.assists}</td>
        <td>${player.attackP}</td>
        <td>${player.matches}</td>
    </tr>`;
    });

    scrollableTableHtml += '</table>';

    document.getElementById('fixedColumn').innerHTML = fixedColumnHtml;
    document.getElementById('scrollableTable').innerHTML = scrollableTableHtml;

    requestAnimationFrame(() => matchRowHeights());
}

function setAvailableYears() {
    if (!isSub) {
        const years = Object.values(recordAllData)
            .flatMap(playerRecords => Object.keys(playerRecords).map(Number));
        availableYears = [...new Set(years)].sort((a, b) => a - b); // 중복 제거 및 정렬
    }
    else {
        availableYears = Object.keys(cachedData.subPlayer).flatMap(playerName =>
            Object.keys(cachedData.subPlayer[playerName] || {}).map(Number)
        );
    }

    updateYearNavigationButtons(); // 버튼 상태 업데이트
    if (isTotal) document.getElementById('fromWhichYear').textContent = `${Math.min(...availableYears)}년부터 지금까지`;
    else document.getElementById('fromWhichYear').textContent = ``;
}

function filterDataByYear(records, year) {
    return Object.entries(records).map(([playerId, years]) => {
        const stats = years[year] || { goals: 0, assists: 0, attackP: 0, matches: 0 };
        return { playerId, ...stats };
    });
}

function sortBy(column, columnIndex) {
    const reverseMapping = {
        goals: '득점',
        assists: '도움',
        attackP: '공격P',
        matches: '경기수',
    };
    const criteria = reverseMapping[column] || '기본';
    setSortCriteria(criteria);
    highlightSelectedColumn(columnIndex);
}

function renderTable(year) {
    const data = isTotal
        ? isSub
            ? getTotalRecords(cachedData.subPlayer, null, true)
            : getTotalRecords(recordAllData, playerInfoData, false)
        : isSub
            ? transformSubPlayerData(cachedData.subPlayer, year)
            : getFilteredData(recordAllData, playerInfoData, year);

    // 정렬 데이터 준비
    const sortFunction = setSortCriteria;

    if (currentSortCriteria !== '기본') {
        sortFunction(currentSortCriteria); // 정렬 기준 유지
    } else {
        const sortedData = sortData(data);
        displayPlayerRecord(sortedData, isSub); // 데이터 표시
    }
}

function toggleSortMenu() {
    const menu = document.getElementById('sortMenu');

    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    } else {
        const criteria = document.getElementById('sortCriteria');
        const rect = criteria.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY}px`; // 기준 텍스트 아래
        menu.style.left = `${rect.left + window.scrollX}px`; // 기준 텍스트 왼쪽 정렬
        menu.style.display = 'block';
    }
}       

// 수정된 정렬 로직
function setSortCriteria(criteria) {
    if ((criteria === '포지션' || criteria === '등번호') && isSub) criteria = '기본';

    const sortCriteriaElement = document.getElementById('sortCriteria');
    sortCriteriaElement.textContent = criteria;
    currentSortCriteria = criteria;
                
    const data = isTotal
        ? isSub
            ? getTotalRecords(cachedData.subPlayer, null, true)
            : getTotalRecords(recordAllData, playerInfoData, false)
        : isSub
            ? cachedData.subPlayer
            : getProcessedData(recordAllData, playerInfoData, currentYear);

    let sortedData;
    let columnIndex;

    if (criteria === '기본') {
        sortedData = sortData(data);
        columnIndex = 1;
    } else if (criteria === '포지션' && !isSub) {
        const positionOrder = { FW: 1, MF: 2, DF: 3, GK: 4 };
        sortedData = sortDataByCriteria(data, criteria, null, positionOrder);
    } else if (['득점', '도움', '공격P', '경기수'].includes(criteria)) {
        const columnMapping = {
            '득점': 'goals',
            '도움': 'assists',
            '공격P': 'attackP',
            '경기수': 'matches',
        };
        const columnKey = columnMapping[criteria];

        if (isSub && !isTotal) {
            // 용병 데이터를 정렬하기 위한 로직
            const subPlayerData = Object.keys(data).map(playerName => {
                const playerData = data[playerName][currentYear] || {};
                return {
                    name: playerName,
                    goals: playerData.goals || 0,
                    assists: playerData.assists || 0,
                    attackP: playerData.attackP || 0,
                    matches: playerData.matches || 0,
                };
            });
            sortedData = sortDataByCriteria(subPlayerData, criteria, columnKey);
        } else {
            sortedData = sortDataByCriteria(data, criteria, columnKey);
        }

        columnIndex = { 'goals': 1, 'assists': 2, 'attackP': 3, 'matches': 4 }[columnKey];
    } else if (criteria === '등번호' && !isSub) {
        sortedData = sortDataByCriteria(data, criteria);
    } else {
        return;
    }

    displayPlayerRecord(sortedData);
    if (columnIndex != null) highlightSelectedColumn(columnIndex);
    toggleSortMenu();
}

// 공통 데이터 필터링 함수
function getProcessedData(recordAllData, playerInfoData, currentYear) {
    return Object.keys(recordAllData).map(playerId => {
        const yearStats = recordAllData[playerId]?.[currentYear] || {
            assists: 0,
            attackP: 0,
            goals: 0,
            matches: 0,
        };

        return {
            name: playerInfoData[playerId]?.name || `Player ${playerId}`,
            position: playerInfoData[playerId]?.position || 'Unknown',
            number: parseInt(playerInfoData[playerId]?.number || '0', 10),
            ...yearStats,
        };
    });
}

// 공통 데이터 정렬 함수
function sortDataByCriteria(data, criteria, columnKey = null, positionOrder = null) {
    if (criteria === '포지션') {
        return data.sort((a, b) => {
            const posCompare = positionOrder[a.position] - positionOrder[b.position];
            if (posCompare !== 0) return posCompare;

            return (
                b.goals - a.goals ||
                b.assists - a.assists ||
                b.attackP - a.attackP ||
                b.matches - a.matches
            );
        });
    } else if (columnKey) {
        return data.sort((a, b) => b[columnKey] - a[columnKey]);
    } else if (criteria === '등번호') {
        return data.sort((a, b) => a.number - b.number);
    }
    return data; // 기본 정렬
}

function getFilteredData(recordAll, players, year) {
    return Object.keys(recordAll).map(playerId => {
        const yearStats = recordAll[playerId]?.[year] || {
            assists: 0,
            attackP: 0,
            goals: 0,
            matches: 0,
        };

        return {
            name: playerInfoData[playerId]?.name || `Player ${playerId}`,
            position: playerInfoData[playerId]?.position || 'Unknown', // 포지션 추가
            number: playerInfoData[playerId]?.number || 'N/A', // 등번호 추가
            goals: yearStats.goals,
            assists: yearStats.assists,
            attackP: yearStats.attackP,
            matches: yearStats.matches,
        };
    });
}

function sortData(data) {
    return data.sort((a, b) => {
        const compare = (key) => (b[key] || 0) - (a[key] || 0);

        // 득점 -> 도움 -> 공격P -> 출전수 순으로 정렬
        return (
            compare('goals') ||
            compare('assists') ||
            compare('attackP') ||
            compare('matches')
        );
    });
}

function transformSubPlayerData(subPlayerData, year) {
    if (!availableYears.includes(year)) {
        year = Math.max(...availableYears); // 최신 연도로 설정
        currentYear = year;
        document.getElementById('currentYear').textContent = currentYear;
        updateYearNavigationButtons(); // 버튼 상태 업데이트
    }

    return Object.keys(subPlayerData).map(playerName => {
        const yearStats = subPlayerData[playerName][year] || {
            goals: 0,
            assists: 0,
            attackP: 0,
            matches: 0,
        };

        return {
            name: playerName, // 선수 이름 추가
            goals: yearStats.goals,
            assists: yearStats.assists,
            attackP: yearStats.attackP,
            matches: yearStats.matches,
        };
    });
}

function matchRowHeights() {
    const fixedRows = document.querySelectorAll('.fixed-column tr');
    const scrollableRows = document.querySelectorAll('.scrollable-table tr');

    fixedRows.forEach((row, index) => {
        const fixedHeight = row.getBoundingClientRect().height;
        const scrollableHeight = scrollableRows[index].getBoundingClientRect().height;
        const maxHeight = Math.max(fixedHeight, scrollableHeight);

        row.style.height = `${maxHeight}px`;
        scrollableRows[index].style.height = `${maxHeight}px`;
    });
}

function renderYearData(year) {
    // 현재 연도의 데이터를 필터링
    const filteredData = getFilteredData(playerInfoData, recordAllData);

    // 필터링된 데이터를 정렬
    const sortedData = sortData(filteredData);

    // 테이블에 데이터 표시
    displayPlayerRecord(sortedData);
}

function changeYear(direction) {
    const minYear = Math.min(...availableYears);
    const maxYear = Math.max(...availableYears);

    if (direction === 'prev' && currentYear > minYear) {
        currentYear--;
    } else if (direction === 'next' && currentYear < maxYear) {
        currentYear++;
    }

    document.getElementById('currentYear').textContent = currentYear;

    updateYearNavigationButtons(); // 버튼 상태 업데이트
    renderTable(currentYear);
}

// 정렬 메뉴 업데이트 함수
function updateSortMenu() {
    const sortMenu = document.getElementById('sortMenu');
    const sortOptions = [
        { criteria: '기본', label: '기본' },
        { criteria: '득점', label: '득점' },
        { criteria: '도움', label: '도움' },
        { criteria: '공격P', label: '공격P' },
        { criteria: '경기수', label: '경기수' }
    ];

    if (!isSub) {
        // 정회원 모드일 때 "포지션"과 "등번호" 옵션 추가
        sortOptions.splice(1, 0, { criteria: '포지션', label: '포지션' });
        sortOptions.splice(2, 0, { criteria: '등번호', label: '등번호' });
    }

    // 메뉴 업데이트
    sortMenu.innerHTML = sortOptions
        .map(option => `<span style="cursor: pointer;" onclick="setSortCriteria('${option.criteria}')">${option.label}</span><br>`)
        .join('');
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

function getTotalRecords(records, playerInfo, isSub) {
    const totalRecords = {};

    if (isSub) {
        // 용병 데이터 처리
        Object.entries(records).forEach(([playerName, yearlyStats]) => {
            if (!totalRecords[playerName]) {
                totalRecords[playerName] = { goals: 0, assists: 0, attackP: 0, matches: 0, name: playerName };
            }

            Object.values(yearlyStats).forEach(stats => {
                totalRecords[playerName].goals += stats.goals || 0;
                totalRecords[playerName].assists += stats.assists || 0;
                totalRecords[playerName].attackP += stats.attackP || 0;
                totalRecords[playerName].matches += stats.matches || 0;
            });
        });
    } else {
        // 정회원 데이터 처리
        Object.entries(records).forEach(([playerId, yearlyStats]) => {
            if (!totalRecords[playerId]) {
                totalRecords[playerId] = { goals: 0, assists: 0, attackP: 0, matches: 0, name: '', position: '', number: '' };
            }

            Object.values(yearlyStats).forEach(stats => {
                totalRecords[playerId].goals += stats.goals || 0;
                totalRecords[playerId].assists += stats.assists || 0;
                totalRecords[playerId].attackP += stats.attackP || 0;
                totalRecords[playerId].matches += stats.matches || 0;
            });

            // 선수 기본 정보 추가
            totalRecords[playerId].name = playerInfo[playerId]?.name || `Player ${playerId}`;
            totalRecords[playerId].position = playerInfo[playerId]?.position || 'Unknown';
            totalRecords[playerId].number = playerInfo[playerId]?.number || 'N/A';
        });
    }

    // 객체를 배열로 변환하여 반환
    return Object.values(totalRecords);
}

let officialButton;
let yearButton;

document.addEventListener("DOMContentLoaded", function () {
    const logo = document.getElementById('logo');
    const subButton = document.getElementById('subButton');
    const totalYearButton = document.getElementById('totalButton');

    officialButton = document.getElementById('officialButton');
    yearButton = document.getElementById('everyYearButton');

    if (logo) {
        logo.addEventListener('click', function () {
            window.location.href = 'index.html'; // 이동할 페이지 경로
        });
    }

    // "정회원" 버튼 클릭 이벤트
    officialButton.addEventListener('click', function () {
        isSub = false;
        officialButton.classList.add('active'); // 버튼 활성화 스타일 적용
        subButton.classList.remove('active'); // 다른 버튼 비활성화
        setAvailableYears();
        updateSortMenu(); // 정렬 메뉴 업데이트
        renderTable(currentYear);
    });

    // "용병" 버튼 클릭 이벤트
    subButton.addEventListener('click', function () {
        isSub = true;
        subButton.classList.add('active'); // 버튼 활성화 스타일 적용
        officialButton.classList.remove('active'); // 다른 버튼 비활성화
        setAvailableYears();
        updateSortMenu(); // 정렬 메뉴 업데이트
        renderTable(currentYear);
    });

    totalYearButton.addEventListener('click', function () {
        isTotal = true;
        setAvailableYears();
        const totalRecords = isSub
            ? getTotalRecords(cachedData.subPlayer, null, true)
            : getTotalRecords(recordAllData, playerInfoData, false);

        // 합산된 데이터를 테이블로 렌더링
        displayPlayerRecord(totalRecords);

        // 버튼 활성화 상태 업데이트
        document.querySelectorAll('.text-button').forEach(button => button.classList.remove('active'));
        this.classList.add('active');

        // 연도 네비게이션 비활성화 처리
        const yearNavigation = document.querySelector('.year-navigation');
        yearNavigation.classList.add('disabled'); // CSS 클래스 추가
        Array.from(yearNavigation.querySelectorAll('button')).forEach(button => {
            button.disabled = true; // 클릭 비활성화
        });
    });

    yearButton.addEventListener('click', function () {
        isTotal = false;
        setAvailableYears();
        updateSortMenu(); // 정렬 메뉴 업데이트
        renderTable(currentYear);

        // 버튼 활성화 상태 업데이트
        document.querySelectorAll('.text-button').forEach(button => button.classList.remove('active'));
        this.classList.add('active');

        // 연도 네비게이션 활성화 처리
        const yearNavigation = document.querySelector('.year-navigation');
        yearNavigation.classList.remove('disabled'); // CSS 클래스 제거
        Array.from(yearNavigation.querySelectorAll('button')).forEach(button => {
            button.disabled = false; // 클릭 활성화
        });

        updateYearNavigationButtons();                
    });
});

document.addEventListener('click', function (event) {
    const sortMenu = document.getElementById('sortMenu');
    const sortCriteria = document.getElementById('sortCriteria');

    // 클릭한 대상이 정렬 기준 또는 팝업 메뉴 내부인지 확인
    if (sortMenu.style.display === 'block' && !sortMenu.contains(event.target) && event.target !== sortCriteria) {
        sortMenu.style.display = 'none'; // 팝업 닫기
    }
});



window.onload = async function () {
    const prevYearButton = document.getElementById('prevYear');
    const nextYearButton = document.getElementById('nextYear');
    const currentYearElement = document.getElementById('currentYear');

    try {
        await fetchData();

        recordAllData = cachedData.recordAll;
        initializePlayerInfoData(cachedData.players);
        
        if (cachedData?.recordAll) {
            setAvailableYears();
            currentYear = availableYears.includes(new Date().getFullYear())
                ? new Date().getFullYear()
                : availableYears[0];

            document.getElementById('currentYear').textContent = currentYear;

            // 데이터 준비 후 정회원 버튼 클릭 처리
            officialButton.click();

            yearButton.click();
            // 첫 렌더링                    
            highlightSelectedColumn(1);

            // 버튼 클릭 이벤트
            prevYearButton.addEventListener('click', () => changeYear('prev'));
            nextYearButton.addEventListener('click', () => changeYear('next'));

            // 초기 버튼 상태 업데이트
            updateYearNavigationButtons();

        } else {
            console.log("데이터를 불러오는 중 오류가 발생했습니다.");
        }
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }

    //관리자 관련
    const popup = document.getElementById('password-popup');
    const closeBtn = document.querySelector('.close-btn');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');

    const errorMessage = document.createElement('div');
    errorMessage.classList.add('error-message');
    popup.querySelector('.popup-content').appendChild(errorMessage);

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

    function clearPopup() {
        passwordInput.value = '';
        errorMessage.style.display = 'none';
    }

    document.getElementById('loader').style.display = 'none';
};
