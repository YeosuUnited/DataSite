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
        GK: "Goal Keeper",
        DF: "Defender",
        MF: "Midfielder",
        FW: "Foward"
    };

    // 포지션별 섹션 생성
    Object.keys(positionMapping).forEach(position => {
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
                    captainBadge.textContent = "C"; // "C" 글자 추가
                    captainBadge.classList.add('captain-badge'); // 클래스 추가

                    nameGroup.appendChild(playerName);
                    nameGroup.appendChild(captainBadge);
                }
                else if(player.role && player.role === "vice-captain"){
                    const captainBadge = document.createElement('div');
                    captainBadge.textContent = "VC"; // "C" 글자 추가
                    captainBadge.classList.add('viceCaptain-badge'); // 클래스 추가

                    nameGroup.appendChild(playerName);
                    nameGroup.appendChild(captainBadge);
                }
                else{
                    nameGroup.appendChild(playerName);
                }
                    
                // 텍스트를 묶어 추가
                playerText.appendChild(playerInfo);
                playerText.appendChild(nameGroup);
                card.appendChild(playerText);

                playerList.appendChild(card);
            }
        });

        section.appendChild(playerList);
        container.appendChild(section);
    });
}

function displayPlayerDetails(player) {
    const playerDetailsElement = document.getElementById('player-details');
    playerDetailsElement.innerHTML = ''; // 기존 내용 초기화

    playerDetailsElement.style.display = 'block'; // 상세 정보 표시
    document.getElementById('player-list').style.display = 'none'; // 선수 목록 숨김
    let thirdBar = document.getElementById('thirdBar');
    thirdBar.style.visibility = 'visible';
    thirdBar.style.opacity = '0';

    history.pushState(
                        { page: "playerDetails", number: player.number },
                        "", 
                        "#player" + player.number
                    );

    const imageContainer = document.createElement('div');
    imageContainer.classList.add('profileImg-container');
    const profileImg = loadPlayerProfileImage(player) || document.createElement('img'); // null 방지
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
    const searchInputElement = document.getElementById('search-input');
    const searchResultsElement = document.getElementById('search-results');
    const playerDetailsElement = document.getElementById('player-details');

    // 뒤로가기 버튼 감지하여 선수 목록으로 돌아가기
    window.addEventListener("popstate", function (event) {
        if (!event.state || event.state.page === "playerList") {
            document.getElementById('player-details').style.display = 'none';
            document.getElementById('player-list').style.display = 'block';
            let thirdBar = document.getElementById('thirdBar');
            thirdBar.style.visibility = 'visible';
            thirdBar.style.opacity = '1';
        }
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
        // 페이지 새로고침 시 기본 목록 표시
        if (!history.state) {
            history.replaceState({ page: "playerList" }, "", location.pathname);
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
    };
});
