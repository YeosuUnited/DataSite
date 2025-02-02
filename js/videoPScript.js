// 유튜브 ID 추출 함수
function extractYouTubeID(url) {
    const regex = /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function getYouTubeTitle(videoID) {
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoID}`);
        const data = await response.json();
        return "      " + (data.title || "영상 제목 없음");
    } catch (error) {
        console.error("제목을 가져오는데 실패했습니다.", error);
        return "       영상 제목 없음";
    }
}

// 영상 리스트 생성 함수
async function createVideoList(category, videoArray) {
    const videoContainer = document.createElement("div");
    videoContainer.classList.add("video-category");
    videoContainer.setAttribute("data-category", category);  // ✅ data-category 속성 추가
    
    const title = document.createElement("h2");
    title.textContent = category === "reco" ? "RECOMMENDED" : "OUR GAMES";
    title.classList.add("video-list-titleTxt");
    videoContainer.appendChild(title);
    
    const videoList = document.createElement("div");
    videoList.classList.add("video-list");
    
    for (const url of videoArray) {
        const videoID = extractYouTubeID(url);
        if (!videoID) continue;

        const videoItem = document.createElement("div");
        videoItem.classList.add("video-item");

        videoItem.addEventListener("click", () => {
            window.open(url, "_blank");
        });

        const thumbnail = document.createElement("div");
        thumbnail.classList.add("video-thumbnail");
        thumbnail.innerHTML = `
            <img src="https://img.youtube.com/vi/${videoID}/hqdefault.jpg" alt="영상 썸네일">
        `;

        const titleText = document.createElement("div");
        titleText.classList.add("video-title");
        titleText.textContent = await getYouTubeTitle(videoID);

        videoItem.appendChild(thumbnail);
        videoItem.appendChild(titleText);
        videoList.appendChild(videoItem);
    }
    
    videoContainer.appendChild(videoList);
    document.querySelector(".container").appendChild(videoContainer);
}

async function loadVideos() {
    const videoListContainer = document.getElementById("video-list");
    videoListContainer.innerHTML = ""; // 기존 목록 초기화

    await createVideoList("reco", cachedData.youtubeLink.reco);
    await createVideoList("our", cachedData.youtubeLink.our);
}

document.addEventListener("DOMContentLoaded", () => {
    const allCategory = document.querySelector(".categories div:nth-child(1)");
    const recoCategory = document.querySelector(".categories div:nth-child(2)");
    const ourCategory = document.querySelector(".categories div:nth-child(3)");

    allCategory.classList.add("active");

    allCategory.addEventListener("click", () => {
        document.querySelectorAll(".video-category").forEach(el => el.style.display = "block");
    });
    recoCategory.addEventListener("click", () => {
        document.querySelector(".video-category[data-category='reco']").style.display = "block";
        document.querySelector(".video-category[data-category='our']").style.display = "none";
    });
    ourCategory.addEventListener("click", () => {
        document.querySelector(".video-category[data-category='reco']").style.display = "none";
        document.querySelector(".video-category[data-category='our']").style.display = "block";
    });

    document.querySelector(".search-container input").addEventListener("input", function() {
        const searchText = this.value.trim().toLowerCase();
        const hasInput = searchText.length > 0;

        document.querySelectorAll(".video-item").forEach(item => {
            const title = item.querySelector(".video-title").textContent.trim().toLowerCase();
            item.style.display = title.includes(searchText) ? "block" : "none";
        });

        document.querySelectorAll(".video-category h2").forEach(title => {
            title.style.display = hasInput ? "none" : "block";
        });
    });

    document.querySelectorAll(".categories div").forEach(category => {
        category.addEventListener("click", function() {
            document.querySelectorAll(".categories div").forEach(item => item.classList.remove("active"));
            this.classList.add("active");
        });
    });
});

window.onload = async function () {
    try {
        await fetchData();     

        // 공통 요소 로드
        await loadCommonBody();

        initManagerPopup();
        
        if (cachedData && cachedData.youtubeLink) {
            console.log("youtubeLink 데이터 확인:", cachedData.youtubeLink);
            console.log("추천 영상:", cachedData.youtubeLink.reco);
        } else {
            console.error("🚨 cachedData.youtubeLink가 정의되지 않았습니다!");
        }

        loadVideos();
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }

    document.getElementById('loader').style.display = 'none';
}
