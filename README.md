# 테트리스 (교육용)

HTML, CSS, JavaScript만 사용하는 브라우저 테트리스 게임입니다.  
빌드 도구나 외부 라이브러리 없이 `index.html` 하나로 실행할 수 있으며, GitHub Pages에 바로 배포할 수 있습니다.

## 프로젝트 소개

입문자를 위한 프론트엔드 교육용 프로젝트로, 테트리스의 핵심 규칙을 단계적으로 구현했습니다.

- 10열 × 20행 게임 보드 (CSS Grid)
- 7종 테트로미노 (I, O, T, S, Z, J, L)
- 자동 낙하, 충돌 판정, 블록 고정
- 줄 삭제 및 점수 계산
- 키보드 조작 (이동·회전·soft/hard drop)
- 게임 오버 및 재시작

## 실행 방법

### 로컬에서 실행

1. 이 저장소를 클론하거나 폴더를 연다.
2. `index.html`을 더블클릭하거나 브라우저로 드래그한다.

또는 VS Code / Cursor에서 **Live Server** 확장으로 `index.html`을 연다.

### 온라인에서 실행 (GitHub Pages)

배포가 완료되면 아래 주소에서 플레이할 수 있습니다.

```
https://nike48520-oss.github.io/tetris-corsor/
```

> 저장소 이름이나 Pages 설정이 다르면 URL이 달라질 수 있습니다.

## 조작법

**시작** 버튼을 누른 뒤 키보드로 조작합니다.  
모든 이동·회전은 `canMove` 충돌 판정을 통과할 때만 적용됩니다.

| 키 | 동작 |
|---|---|
| `ArrowLeft` (←) | 왼쪽 이동 |
| `ArrowRight` (→) | 오른쪽 이동 |
| `ArrowDown` (↓) | 한 칸 빠르게 내리기 (soft drop) |
| `ArrowUp` (↑) | 블록 회전 (충돌 시 취소) |
| `Space` | 즉시 낙하 (hard drop) |

## 구현 기능

| 영역 | 내용 |
|---|---|
| 보드 | 10 × 20 그리드, CSS Grid 렌더링 |
| 블록 | I/O/T/S/Z/J/L 정의, 상단 중앙 스폰 |
| 낙하 | 800ms 자동 낙하, soft drop, hard drop |
| 충돌 | 벽·바닥·고정 블록 검사 (`canMove`) |
| 회전 | 시계 방향 90°, 충돌 시 롤백 |
| 줄 삭제 | 가득 찬 가로줄 삭제 후 보드 압축 |
| 점수 | 1줄 100 / 2줄 300 / 3줄 500 / 4줄 800 |
| 게임 오버 | 새 블록 스폰 불가 시 종료 |
| 재시작 | 보드·점수·타이머·상태 초기화 |

## 점수 규칙

| 한 번에 삭제한 줄 수 | 점수 |
|---|---|
| 1줄 | 100 |
| 2줄 | 300 |
| 3줄 | 500 |
| 4줄 | 800 |

## 게임 오버

블록을 고정한 뒤 새 블록을 생성했을 때 스폰 위치가 막혀 있으면 (`canMove` 실패) 게임 오버가 됩니다.  
자동 낙하가 멈추고 **재시작** 버튼으로 다시 시작할 수 있습니다.

## 품질 점검 방법

### 수동 플레이 테스트

1. **시작** 클릭 → 블록 생성 및 자동 낙하 확인
2. `←` `→` `↑` `↓` `Space` 각각 입력 → 이동·회전·낙하 확인
3. 가로 한 줄을 채움 → 줄 삭제 및 점수 증가 확인
4. 보드를 가득 채움 → "게임 오버" 표시 확인
5. **재시작** 클릭 → 보드·점수 초기화 확인

### 브라우저 콘솔 확인

1. `F12`로 개발자 도구를 연다.
2. **Console** 탭에서 빨간 에러가 없는지 확인한다.
3. **Network** 탭에서 `style.css`, `script.js`가 200으로 로드되는지 확인한다.

### Cursor 명령어 (선택)

프로젝트에 포함된 Cursor 명령으로 추가 점검이 가능합니다.

| 명령 | 용도 |
|---|---|
| `/code-review` | 코드 구조·함수 역할 리뷰 |
| `/review-game-logic` | 게임 로직·충돌 판정 검토 |
| `/bug-hunt` | 잠재 버그 탐색 |
| `/qa-playtest` | QA 시나리오 점검 |

## GitHub Pages 배포 방법

### 1. 배포할 파일 커밋·푸시

루트에 있는 게임 파일만 원격 저장소에 올립니다.

```bash
git add index.html style.css script.js README.md
git commit -m "Prepare Tetris game for GitHub Pages deployment"
git push origin main
```

### 2. GitHub Pages 설정

1. GitHub 저장소 → **Settings** → **Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / **Folder**: `/ (root)`
4. **Save** 클릭

### 3. 배포 확인

1~2분 후 `https://<사용자명>.github.io/tetris-corsor/` 에 접속한다.  
게임 보드가 보이고 **시작** 버튼이 동작하면 배포 성공입니다.

## 파일 구조

```
tetris-corsor/
├── index.html   # 게임 화면 구조
├── style.css    # 스타일
├── script.js    # 게임 로직
└── README.md    # 프로젝트 안내
```

## 기술 스택

- HTML5
- CSS3 (Grid, Flexbox)
- Vanilla JavaScript (ES6+)
- 빌드 도구·외부 라이브러리 없음
