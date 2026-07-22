## 🗺️ Road Damage Searching AI Pipeline

🎥 **기능 구현**

https://github.com/user-attachments/assets/adbadb06-0017-4a8f-84df-2373e2ceea73

---

> **블랙박스 이미지 기반 도로 파손 탐지 및 대용량 지리공간 데이터 비동기 처리 백엔드 시스템**
> <br>
> feat: 이미지 업로드, EXIF GPS 추출 및 DB/Redis 대기열 연동

본 프로젝트는 Node.js(Express) API 서버와 Python AI 워커 서버를 Redis 큐로 연결하여, 드론/블랙박스 이미지에서 GPS 지리 정보(EXIF)를 추출하고 도로 파손 상태를 비동기로 분석하는 고성능 GeoAI 백엔드 인프라입니다[cite: 5].

---

### 🚀 프로젝트 소개

도로 위 블랙박스 및 드론 영상에서 포트홀, 균열 등 도로 파손 정보를 실시간으로 감지하고, 이를 실제 지리 공간 데이터로 변환하여 지도 관제 센터에 시각화하는 **End-to-End Geo-AI 시스템**입니다. 
대용량 이미지 처리 시 발생하는 서버 블로킹 현상을 방지하기 위해 **Redis 비동기 메시지 큐**를 도입하였으며, **MySQL 8.0 Spatial Database**와 **Sequelize ORM**을 활용해 고속 공간 쿼리(R-Tree 인덱스)를 지원합니다[cite: 3, 5].

---

### 🛠️ 기술 스택

- **Backend API:** Node.js, Express, Sequelize ORM[cite: 5]
- **Database:** MySQL 8.0 (Spatial Database, GEOMETRY POINT, R-Tree Index)[cite: 3, 5]
- **Message Broker:** Redis (비동기 Task Queue, Producer-Consumer 패턴)[cite: 5]
- **AI Worker:** Python, YOLOv8, PIL, Exif-Parser[cite: 5]
- **Frontend / Client:** HTML/CSS/JS, Leaflet.js, EXIF-JS[cite: 5]

---

### ⚙️ 시스템 아키텍처 (워크플로우)

1. **이미지 업로드 및 EXIF 추출 (Client & Express):** 사용자가 웹 인터페이스를 통해 GPS 정보가 포함된 도로 이미지를 업로드. Multer 미들웨어를 통해 서버에 저장되며, Exif-Parser 및 EXIF-JS를 통해 이미지 내 위경도(GPS) 데이터를 실시간으로 추출[cite: 5].
2. **비동기 큐잉 (Node.js & Redis):** Express 서버는 즉각적인 응답(HTTP Response)을 반환하고, 분석 작업 메타데이터를 Redis 대기열(`LPUSH`)에 적재[cite: 5].
3. **분산 AI 연산 (Python Worker):** 백그라운드 파이썬 워커가 Redis 큐를 모니터링하다가 작업을 수신하여 YOLOv8 기반 도로 파손 객체 탐지 수행.
4. **공간 데이터베이스 적재 (MySQL Spatial):** 탐지된 객체 정보와 좌표를 Sequelize를 통해 MySQL Spatial Table(`damage_tasks`, `damage_objects`)에 저장[cite: 3, 5].
5. **실시간 렌더링 (Leaflet.js):** 클라이언트에서 지도 화면 영역(BBox)을 기준으로 공간 쿼리를 요청하여 관제 화면에 마커 시각화[cite: 5].

---

### 📂 핵심 데이터베이스 모델링 (Sequelize ORM)

#### 1. DamageTask (부모 테이블)
- 이미지 경로, 전체 태스크 상태, 그리고 촬영 위치의 지리 공간 좌표(`GEOMETRY POINT`)를 관리합니다[cite: 4].
- 테이블명: `damage_tasks`[cite: 4]

#### 2. DamageObject (자식 테이블)
- AI가 탐지한 개별 파손 객체(`objectType`), 신뢰도(`confidence`), 픽셀 바운딩 박스(`JSON`), 그리고 개별 공간 좌표(`GEOMETRY POINT`)를 저장합니다[cite: 3].
- 지도 상의 고속 검색을 위해 **R-Tree 공간 인덱스(`SPATIAL`)**가 적용되어 있습니다[cite: 3].
- 테이블명: `damage_objects`[cite: 3]

---

### 💡 주요 기능 및 구현 포인트

- **Multer 기반 이미지 업로드 API (`/api/images/upload`):** 안전한 파일 저장 및 정적 서빙 파이프라인 구축.
- **EXIF GPS 데이터 연동:** 이미지 파일 내부의 메타데이터를 파싱하여 별도의 추가 입력 없이 자동으로 지도 매핑 좌표 획득[cite: 5].
- **1:N 캐스케이드 관계 설정:** `DamageTask`와 `DamageObject` 간의 외래 키 관계를 설정하여 데이터 무결성 및 간편한 초기화 구조 확보.
- **데이터베이스 동기화 안정화:** Sequelize를 통한 마이그레이션 및 동기화 시 테이블 순서 및 관계 충돌 문제를 해결한 안정적인 서버 부팅 프로세스 구축.
