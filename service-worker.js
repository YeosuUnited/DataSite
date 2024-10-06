// 1분마다 데이터를 갱신하는 작업 설정
const REFRESH_INTERVAL = 60000; // 60초
let cachedData = {};

self.addEventListener('install', (event) => {
    console.log('Service Worker 설치됨');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker 활성화됨');
    event.waitUntil(self.clients.claim());
    scheduleDataFetch(); // 처음 서비스 워커가 활성화될 때 데이터 갱신 스케줄 설정
});

// 주기적으로 데이터를 가져오는 함수
function scheduleDataFetch() {
    setInterval(async () => {
        try {
            const [playerRecordResponse, matchRecordResponse, playerDataResponse] = await Promise.all([
                fetch('https://script.google.com/macros/s/AKfycbwr4inHtj2P_4NNIVBJCiPFWESOfa_pSKEdSJHjLIes0K_FjL25CYBky3VUsyOUi-9e/exec?sheet=PlayerRecord'),
                fetch('https://script.google.com/macros/s/AKfycbwr4inHtj2P_4NNIVBJCiPFWESOfa_pSKEdSJHjLIes0K_FjL25CYBky3VUsyOUi-9e/exec?sheet=MatchRecord'),
                fetch('https://script.google.com/macros/s/AKfycbwr4inHtj2P_4NNIVBJCiPFWESOfa_pSKEdSJHjLIes0K_FjL25CYBky3VUsyOUi-9e/exec?sheet=PlayerData')
            ]);

            if (!playerRecordResponse.ok || !matchRecordResponse.ok || !playerDataResponse.ok) {
                throw new Error('데이터 응답 실패');
            }

            const [playerRecord, matchRecord, playerData] = await Promise.all([
                playerRecordResponse.json(),
                matchRecordResponse.json(),
                playerDataResponse.json()
            ]);

            cachedData = { playerRecord, matchRecord, playerData };

            console.log('데이터가 성공적으로 갱신되었습니다:', cachedData);

        } catch (error) {
            console.error('데이터 갱신 중 오류 발생:', error);
        }
    }, REFRESH_INTERVAL); // 1분마다 실행
}

