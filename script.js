let participants = [];
let isRacing = false;
let raceResults = [];
let obstacles = [];
let kartSlowedUntil = {}; // 카트별 감속 종료 시간
let kartBoostedUntil = {}; // 카트별 부스터 종료 시간
let kartStoppedUntil = {}; // 카트별 물폭탄으로 인한 정지 종료 시간
let kartWaterBombItems = {}; // 카트별 물폭탄 아이템 보유 여부
let kartWaterBombUsed = {}; // 카트별 물폭탄 사용 여부
let cameraTarget = null; // 카메라 타겟
let cameraTimer = null; // 카메라 전환 타이머
let boosterTimer = null; // 부스터 효과 타이머
let specialPlayerImage = null; // 고명섭 특별 이미지

const obstacleTypes = [
    { name: '고객지원', emoji: '📞', duration: 2000 },
    { name: '회의', emoji: '📊', duration: 2500 },
    { name: '12층면담', emoji: '👔', duration: 3000 }
];

const teamMembers = {
    engine: ['고명섭', '추세연', '이호용', '이지수', '홍창기', '장효재'],
    platform: ['강규황', '조은주', '박정은', '전현빈', '서현지', '황경하']
};

function addParticipant() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();
    
    if (name === '') {
        alert('이름을 입력해주세요!');
        return;
    }
    
    if (participants.includes(name)) {
        alert('이미 추가된 이름입니다!');
        return;
    }

    if (participants.length >= 12) {
        alert('최대 12명까지만 참가할 수 있습니다!');
        return;
    }
    
    // 고명섭 특별 처리
    if (name === '고명섭') {
        // 미리 준비된 i8 이미지 사용
        specialPlayerImage = './images/i8.png';
    }
    
    participants.push(name);
    nameInput.value = '';
    
    updateParticipantList();
    createKarts();
}

function removeParticipant(name) {
    participants = participants.filter(p => p !== name);
    updateParticipantList();
    createKarts();
}

function updateParticipantList() {
    const list = document.getElementById('participantList');
    list.innerHTML = '';
    
    participants.forEach(name => {
        const tag = document.createElement('div');
        tag.className = 'participant-tag';
        tag.innerHTML = `
            <span>${name}</span>
            <button class="remove-btn" onclick="removeParticipant('${name}')">×</button>
        `;
        list.appendChild(tag);
    });
    
    document.getElementById('startBtn').disabled = participants.length < 2;
}

function createKarts() {
    const track = document.getElementById('raceTrack');
    
    document.querySelectorAll('.kart').forEach(kart => kart.remove());
    document.querySelectorAll('.lane').forEach(lane => lane.remove());
    
    if (participants.length === 0) return;

    const trackWidth = track.offsetWidth;
    const laneWidth = Math.min(100, trackWidth / participants.length);
    
    participants.forEach((name, index) => {
        const lane = document.createElement('div');
        lane.className = 'lane';
        lane.style.left = `${index * laneWidth + (trackWidth - participants.length * laneWidth) / 2}px`;
        lane.style.width = `${laneWidth}px`;
        track.appendChild(lane);

        const kart = document.createElement('div');
        kart.className = 'kart';
        kart.id = `kart-${index}`;
        
        // 고명섭 특별 처리
        if (name === '고명섭' && specialPlayerImage) {
            kart.classList.add('special-player');
            kart.innerHTML = `
                <div class="special-image" style="background-image: url('${specialPlayerImage}')"></div>
                <div class="player-name">${name}</div>
            `;
        } else {
            kart.innerHTML = `
                <div class="windshield"></div>
                <div class="exhaust"></div>
                <span>${name}</span>
            `;
            
            const colors = [
                ['#e74c3c', '#c0392b'], // 빨강
                ['#3498db', '#2980b9'], // 파랑
                ['#2ecc71', '#27ae60'], // 초록
                ['#f39c12', '#e67e22'], // 주황
                ['#9b59b6', '#8e44ad'], // 보라
                ['#e91e63', '#c2185b']  // 핑크
            ];
            const colorPair = colors[index % colors.length];
            kart.style.background = `linear-gradient(145deg, ${colorPair[0]}, ${colorPair[1]})`;
        }
        
        kart.style.left = `${index * laneWidth + (trackWidth - participants.length * laneWidth) / 2 + laneWidth/2 - 35}px`;
        kart.style.top = '20px';
        
        // 물폭탄 아이템 시각적 표시
        if (kartWaterBombItems[index] && !kartWaterBombUsed[index]) {
            kart.classList.add('water-bomb-item');
        }
        
        track.appendChild(kart);
    });
}

function startRace() {
    if (isRacing || participants.length < 2) return;
    
    isRacing = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('result').style.display = 'none';
    raceResults = [];
    
    showCountdown();
}

function showCountdown() {
    const countdown = document.getElementById('countdown');
    countdown.style.display = 'block';
    
    let count = 3;
    countdown.textContent = count;
    
    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdown.textContent = count;
        } else if (count === 0) {
            countdown.textContent = 'GO!';
        } else {
            countdown.style.display = 'none';
            clearInterval(countInterval);
            runRace();
        }
    }, 1000);
}

function runRace() {
    const track = document.getElementById('raceTrack');
    const trackHeight = track.offsetHeight - 120;
    const karts = document.querySelectorAll('.kart');
    
    karts.forEach(kart => kart.classList.add('racing'));
    
    const kartProgress = participants.map(() => 0);
    const kartSpeeds = participants.map(() => Math.random() * 3 + 1);
    const finished = [];
    obstacles = [];
    kartSlowedUntil = {};
    kartBoostedUntil = {};
    kartStoppedUntil = {};
    kartWaterBombItems = {};
    kartWaterBombUsed = {};
    
    // 50% 확률로 물폭탄 아이템 부여
    participants.forEach((name, index) => {
        if (Math.random() < 0.5) {
            kartWaterBombItems[index] = true;
            kartWaterBombUsed[index] = false;
        }
    });
    
    // 방해물 생성 타이머
    const obstacleTimer = setInterval(() => {
        if (obstacles.length < 3) { // 최대 3개 방해물
            createObstacle();
        }
    }, 2000);
    
    // 부스터 효과 타이머 (5-8초마다 랜덤 발동)
    const startBoosterSystem = () => {
        const nextBoosterTime = 5000 + Math.random() * 3000; // 5-8초
        boosterTimer = setTimeout(() => {
            triggerRandomBooster(finished);
            startBoosterSystem(); // 재귀적으로 다음 부스터 예약
        }, nextBoosterTime);
    };
    startBoosterSystem();
    
    // 카메라 시스템 시작
    startCameraSystem();
    
    const raceInterval = setInterval(() => {
        const currentTime = Date.now();
        let allFinished = true;
        
        kartProgress.forEach((progress, index) => {
            if (finished.includes(index)) return;
            
            // 방해물로 인한 감속 확인
            const isSlowed = kartSlowedUntil[index] && currentTime < kartSlowedUntil[index];
            // 물폭탄으로 인한 정지 확인
            const isStopped = kartStoppedUntil[index] && currentTime < kartStoppedUntil[index];
            // 부스터로 인한 가속 확인
            const isBoosted = kartBoostedUntil[index] && currentTime < kartBoostedUntil[index];
            
            let speedMultiplier;
            if (isStopped) {
                speedMultiplier = 0; // 물폭탄으로 완전 정지
            } else if (isSlowed) {
                speedMultiplier = 0.3; // 감속
            } else if (isBoosted) {
                speedMultiplier = 2.5; // 부스터 가속
            } else {
                speedMultiplier = 0.6 + Math.random() * 0.3; // 기본 속도
            }
            
            kartProgress[index] += kartSpeeds[index] * speedMultiplier;
            
            const kart = document.getElementById(`kart-${index}`);
            kart.style.top = `${20 + kartProgress[index]}px`;
            
            // 방해물과 충돌 검사
            checkObstacleCollision(index, kartProgress[index]);
            
            // 물폭탄 발동 조건 검사
            checkWaterBombTrigger(index, kartProgress);
            
            // 상태 시각적 표시
            if (isStopped) {
                kart.classList.add('stopped');
                kart.classList.remove('slowed', 'boosted');
            } else if (isSlowed) {
                kart.classList.add('slowed');
                kart.classList.remove('boosted', 'stopped');
            } else if (isBoosted) {
                kart.classList.add('boosted');
                kart.classList.remove('slowed', 'stopped');
            } else {
                kart.classList.remove('slowed', 'boosted', 'stopped');
            }
            
            // 물폭탄 아이템 표시 업데이트
            if (kartWaterBombItems[index] && !kartWaterBombUsed[index]) {
                kart.classList.add('water-bomb-item');
            } else {
                kart.classList.remove('water-bomb-item');
            }
            
            if (kartProgress[index] >= trackHeight) {
                if (!finished.includes(index)) {
                    finished.push(index);
                    raceResults.push({
                        name: participants[index],
                        position: finished.length
                    });
                }
            } else {
                allFinished = false;
            }
        });
        
        // 방해물 제거 (트랙 밖으로 나간 것들)
        removeExpiredObstacles();
        
        if (allFinished) {
            clearInterval(raceInterval);
            clearInterval(obstacleTimer);
            if (boosterTimer) clearTimeout(boosterTimer);
            stopCameraSystem();
            finishRace();
        }
    }, 50);
}

function createObstacle() {
    const track = document.getElementById('raceTrack');
    const trackWidth = track.offsetWidth;
    const laneWidth = Math.min(100, trackWidth / participants.length);
    const startX = (trackWidth - participants.length * laneWidth) / 2;
    
    // 가장 앞서가는 카트의 위치 찾기 (Y값이 가장 큰 카트 = 가장 아래쪽/앞쪽으로 간 카트)
    let frontmostKartY = -Infinity;
    participants.forEach((name, index) => {
        const kart = document.getElementById(`kart-${index}`);
        if (kart) {
            const kartY = parseInt(kart.style.top) || 20;
            frontmostKartY = Math.max(frontmostKartY, kartY); // 가장 앞선(아래쪽) 카트
        }
    });
    
    // 가장 앞선 카트보다 50px 앞쪽에 방해물 생성
    const obstacleTargetY = frontmostKartY + 50;
    
    // 트랙 범위를 벗어나지 않도록 체크
    const trackHeight = track.offsetHeight - 120; // finish line 위치 고려
    if (obstacleTargetY >= trackHeight - 50) {
        return; // 결승선 근처에는 방해물 생성하지 않음
    }
    
    // 레이스 초반이라면 방해물 생성 안함
    if (frontmostKartY < 100) {
        return;
    }
    
    // 랜덤 레인 선택
    const randomLane = Math.floor(Math.random() * participants.length);
    const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    // 타겟 위치 기준으로 ±20px 범위에서 랜덤 생성
    const obstacleY = obstacleTargetY + (Math.random() - 0.5) * 40;
    
    const obstacle = document.createElement('div');
    obstacle.className = 'obstacle';
    obstacle.textContent = `${obstacleType.emoji} ${obstacleType.name}`;
    obstacle.style.left = `${startX + randomLane * laneWidth + laneWidth/2 - 60}px`;
    obstacle.style.top = `${Math.max(60, obstacleY)}px`; // 최소 시작선 아래에 생성
    
    const obstacleData = {
        element: obstacle,
        lane: randomLane,
        y: parseInt(obstacle.style.top),
        type: obstacleType,
        id: Date.now()
    };
    
    obstacles.push(obstacleData);
    track.appendChild(obstacle);
}

function checkObstacleCollision(kartIndex, kartY) {
    obstacles.forEach((obstacle, obstacleIndex) => {
        if (obstacle.lane === kartIndex) {
            const obstacleY = obstacle.y;
            const kartCurrentY = kartY + 20; // 카트 시작 위치 보정
            
            // 충돌 범위 확인 (카트와 방해물이 겹치는지)
            if (Math.abs(kartCurrentY - obstacleY) < 40) {
                // 충돌 발생!
                const currentTime = Date.now();
                kartSlowedUntil[kartIndex] = currentTime + obstacle.type.duration;
                
                // 방해물 제거 및 시각적 효과
                obstacle.element.classList.add('hit');
                setTimeout(() => {
                    if (obstacle.element.parentNode) {
                        obstacle.element.parentNode.removeChild(obstacle.element);
                    }
                    obstacles.splice(obstacleIndex, 1);
                }, 500);
            }
        }
    });
}

function removeExpiredObstacles() {
    const track = document.getElementById('raceTrack');
    const trackHeight = track.offsetHeight;
    
    obstacles.forEach((obstacle, index) => {
        if (obstacle.y > trackHeight || obstacle.element.classList.contains('hit')) {
            if (obstacle.element.parentNode) {
                obstacle.element.parentNode.removeChild(obstacle.element);
            }
            obstacles.splice(index, 1);
        }
    });
}

function finishRace() {
    const karts = document.querySelectorAll('.kart');
    karts.forEach(kart => {
        kart.classList.remove('racing', 'slowed');
    });
    
    // 모든 방해물 제거
    document.querySelectorAll('.obstacle').forEach(obstacle => {
        if (obstacle.parentNode) {
            obstacle.parentNode.removeChild(obstacle);
        }
    });
    obstacles = [];
    kartSlowedUntil = {};
    kartBoostedUntil = {};
    kartStoppedUntil = {};
    kartWaterBombItems = {};
    kartWaterBombUsed = {};
    if (boosterTimer) clearTimeout(boosterTimer);
    stopCameraSystem();
    
    const loser = raceResults[raceResults.length - 1];
    
    showResult(loser.name);
    
    isRacing = false;
    document.getElementById('startBtn').disabled = false;
}

function showResult(winner) {
    const result = document.getElementById('result');
    
    let resultsHTML = '<div class="race-results"><h3>🏁 레이스 결과</h3>';
    raceResults.forEach((result, index) => {
        const positionClass = index === 0 ? 'first' : (index === raceResults.length - 1 ? 'last' : '');
        const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
        resultsHTML += `
            <div class="position ${positionClass}">
                <span>${medal} ${result.position}등: ${result.name}</span>
            </div>
        `;
    });
    resultsHTML += '</div>';
    
    result.innerHTML = `
        <div class="winner">🎯 ${winner} 🎯</div>
        <p><strong>꼴찌 당첨!</strong></p>
        <p>오늘 점심/커피는 ${winner}님이 쏴주세요! 😄</p>
        ${resultsHTML}
    `;
    result.style.display = 'block';
}

function startCameraSystem() {
    cameraTimer = setInterval(() => {
        focusOnSlowKart();
    }, 3000); // 3초마다 카메라 전환
}

function stopCameraSystem() {
    if (cameraTimer) {
        clearInterval(cameraTimer);
        cameraTimer = null;
    }
    resetCamera();
}

function focusOnSlowKart() {
    if (!isRacing || participants.length === 0) return;
    
    const currentTime = Date.now();
    let slowestKarts = [];
    
    // 아직 결승선에 도착하지 않은 카트들만 찾기
    const finished = raceResults.map(result => 
        participants.findIndex(name => name === result.name)
    );
    
    participants.forEach((name, index) => {
        // 이미 결승선에 도착한 카트는 제외
        if (finished.includes(index)) return;
        
        const kart = document.getElementById(`kart-${index}`);
        if (kart) {
            const kartY = parseInt(kart.style.top) || 0;
            const isSlowed = kartSlowedUntil[index] && currentTime < kartSlowedUntil[index];
            slowestKarts.push({ index, name, y: kartY, isSlowed });
        }
    });
    
    // 아직 완주하지 못한 카트가 없으면 카메라 작동 안함
    if (slowestKarts.length === 0) return;
    
    // Y 좌표가 가장 작은 (뒤떨어진) 카트들 정렬
    slowestKarts.sort((a, b) => a.y - b.y);
    
    // 꼴지 후보 선택 (뒤에서 1-2등만)
    const slowKarts = slowestKarts.slice(0, Math.min(2, slowestKarts.length));
    const targetKart = slowKarts[Math.floor(Math.random() * slowKarts.length)];
    
    if (targetKart && targetKart.index !== cameraTarget) {
        resetCamera();
        cameraTarget = targetKart.index;
        
        const kart = document.getElementById(`kart-${targetKart.index}`);
        const track = document.getElementById('raceTrack');
        const overlay = document.getElementById('cameraOverlay');
        
        // 카트 하이라이트
        kart.classList.add('camera-target');
        
        // 트랙 줌
        track.classList.add('camera-focus');
        
        // 오버레이 메시지
        let messages;
        if (targetKart.name === '고명섭') {
            messages = [
                `🎥 이게 ${targetKart.name}님의 진짜 실력인가요?`,
                `📹 고인물 ${targetKart.name}님이 왜 뒤에..?`,
                `🎬 ${targetKart.name}님의 역전 드라마 시작!`,
                `🔴 LIVE: 전설의 ${targetKart.name}님 부활?`
            ];
        } else {
            messages = [
                `🎥 ${targetKart.name}님이 뒤처지고 있습니다!`,
                `📹 꼴지 후보 ${targetKart.name}님을 주목하세요!`,
                `🎬 위기의 ${targetKart.name}님!`,
                `🔴 LIVE: ${targetKart.name}님 역전 가능할까요?`
            ];
        }
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        overlay.textContent = randomMessage;
        overlay.style.display = 'block';
        
        // 2초 후 카메라 리셋
        setTimeout(() => {
            resetCamera();
        }, 2000);
    }
}

function resetCamera() {
    // 모든 카트에서 하이라이트 제거
    document.querySelectorAll('.kart').forEach(kart => {
        kart.classList.remove('camera-target');
    });
    
    // 트랙 줌 리셋
    const track = document.getElementById('raceTrack');
    track.classList.remove('camera-focus');
    
    // 오버레이 숨기기
    const overlay = document.getElementById('cameraOverlay');
    overlay.style.display = 'none';
    
    cameraTarget = null;
}

function triggerRandomBooster(finished) {
    if (!isRacing || participants.length === 0) return;
    
    // 아직 완주하지 않은 카트들만 대상
    const unfinishedKarts = [];
    participants.forEach((name, index) => {
        if (!finished.includes(index)) {
            unfinishedKarts.push(index);
        }
    });
    
    if (unfinishedKarts.length === 0) return;
    
    // 랜덤하게 카트 선택
    const randomKartIndex = unfinishedKarts[Math.floor(Math.random() * unfinishedKarts.length)];
    const currentTime = Date.now();
    
    // 이미 부스터나 감속 효과가 있는 카트는 제외
    if (kartBoostedUntil[randomKartIndex] && currentTime < kartBoostedUntil[randomKartIndex]) return;
    if (kartSlowedUntil[randomKartIndex] && currentTime < kartSlowedUntil[randomKartIndex]) return;
    
    // 부스터 효과 적용 (3초간)
    kartBoostedUntil[randomKartIndex] = currentTime + 3000;
    
    // 시각적 피드백
    showBoosterEffect(randomKartIndex);
}

function checkWaterBombTrigger(kartIndex, kartProgress) {
    // 물폭탄 아이템이 없거나 이미 사용했으면 무시
    if (!kartWaterBombItems[kartIndex] || kartWaterBombUsed[kartIndex]) return;
    
    const currentKartY = kartProgress[kartIndex];
    
    // 좌우 카트가 있는지 확인
    let leftKart = kartIndex - 1;
    let rightKart = kartIndex + 1;
    
    let hasAdjacentKart = false;
    
    // 왼쪽 카트 확인
    if (leftKart >= 0 && leftKart < participants.length) {
        const leftKartY = kartProgress[leftKart];
        // 같은 수준(±30px 범위)에 있는지 확인
        if (Math.abs(currentKartY - leftKartY) <= 30) {
            hasAdjacentKart = true;
        }
    }
    
    // 오른쪽 카트 확인
    if (rightKart >= 0 && rightKart < participants.length) {
        const rightKartY = kartProgress[rightKart];
        // 같은 수준(±30px 범위)에 있는지 확인
        if (Math.abs(currentKartY - rightKartY) <= 30) {
            hasAdjacentKart = true;
        }
    }
    
    // 인접한 카트가 있으면 물폭탄 발동
    if (hasAdjacentKart) {
        triggerWaterBomb(kartIndex);
    }
}

function triggerWaterBomb(kartIndex) {
    const currentTime = Date.now();
    kartWaterBombUsed[kartIndex] = true;
    
    // 좌우 카트 정지시키기
    const leftKart = kartIndex - 1;
    const rightKart = kartIndex + 1;
    
    if (leftKart >= 0 && leftKart < participants.length) {
        kartStoppedUntil[leftKart] = currentTime + 1000; // 1초간 정지
    }
    
    if (rightKart >= 0 && rightKart < participants.length) {
        kartStoppedUntil[rightKart] = currentTime + 1000; // 1초간 정지
    }
    
    // 물폭탄 시각적 효과
    showWaterBombEffect(kartIndex);
}

function showWaterBombEffect(kartIndex) {
    const overlay = document.getElementById('cameraOverlay');
    const kartName = participants[kartIndex];
    
    const waterBombMessages = [
        `💧 ${kartName}님의 물폭탄 발동!`,
        `🌊 ${kartName}님이 물폭탄을 터뜨렸습니다!`,
        `💦 ${kartName}님의 물세례!`,
        `🎯 ${kartName}님의 정확한 물폭탄!`
    ];
    
    const randomMessage = waterBombMessages[Math.floor(Math.random() * waterBombMessages.length)];
    overlay.textContent = randomMessage;
    overlay.style.display = 'block';
    overlay.style.background = 'rgba(30, 144, 255, 0.9)';
    
    // 2초 후 메시지 숨김
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.background = 'rgba(0, 0, 0, 0.8)'; // 원래 색상으로 복원
    }, 2000);
}

function showBoosterEffect(kartIndex) {
    const overlay = document.getElementById('cameraOverlay');
    const kartName = participants[kartIndex];
    
    let boosterMessages;
    if (kartName === '고명섭') {
        boosterMessages = [
            `👑 ${kartName}님의 전설적인 부스터!`,
            `⭐ 고인물 ${kartName}님의 진짜 실력!`,
            `🔥 ${kartName}님 치트키 발동!`,
            `💫 신의 한 수! ${kartName}님!`
        ];
    } else {
        boosterMessages = [
            `🚀 ${kartName}님 부스터 발동!`,
            `⚡ ${kartName}님이 가속합니다!`,
            `🏆 ${kartName}님 스피드 업!`,
            `💨 ${kartName}님 터보 모드!`
        ];
    }
    
    const randomMessage = boosterMessages[Math.floor(Math.random() * boosterMessages.length)];
    overlay.textContent = randomMessage;
    overlay.style.display = 'block';
    overlay.style.background = 'rgba(255, 193, 7, 0.9)';
    
    // 2초 후 메시지 숨김
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.background = 'rgba(0, 0, 0, 0.8)'; // 원래 색상으로 복원
    }, 2000);
}

function clearAllParticipants() {
    if (isRacing) {
        alert('레이스 중에는 참가자를 삭제할 수 없습니다!');
        return;
    }
    
    if (participants.length === 0) {
        alert('삭제할 참가자가 없습니다!');
        return;
    }
    
    if (confirm('모든 참가자를 삭제하시겠습니까?')) {
        participants = [];
        specialPlayerImage = null;
        kartWaterBombItems = {};
        kartWaterBombUsed = {};
        updateParticipantList();
        createKarts();
        alert('모든 참가자가 삭제되었습니다!');
    }
}

function addTeamMembers(teamType) {
    if (isRacing) {
        alert('레이스 중에는 참가자를 추가할 수 없습니다!');
        return;
    }

    const members = teamMembers[teamType];
    const teamName = teamType === 'engine' ? '엔진팀' : '플랫폼팀';
    
    let addedCount = 0;
    let duplicateCount = 0;
    let maxReachedCount = 0;

    for (const member of members) {
        // 이미 추가된 멤버 체크
        if (participants.includes(member)) {
            duplicateCount++;
            continue;
        }

        // 최대 인원 체크
        if (participants.length >= 12) {
            maxReachedCount = members.length - addedCount - duplicateCount;
            break;
        }

        // 고명섭 특별 처리
        if (member === '고명섭') {
            specialPlayerImage = './images/i8.png';
        }

        participants.push(member);
        addedCount++;
    }

    // 결과 메시지
    let message = `${teamName} ${addedCount}명이 추가되었습니다!`;
    if (duplicateCount > 0) {
        message += `\n(이미 추가된 멤버 ${duplicateCount}명 제외)`;
    }
    if (maxReachedCount > 0) {
        message += `\n(최대 인원 초과로 ${maxReachedCount}명 추가 불가)`;
    }

    alert(message);
    
    updateParticipantList();
    createKarts();
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('nameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addParticipant();
        }
    });

    window.addEventListener('resize', createKarts);
});