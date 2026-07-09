## 드론 이미지 기반 도로 파손 탐지 및 대용량 지리공간(GeoAI) 데이터 비동기 처리 백엔드 파이프라인

feat: 이미지 업로드, EXIF GPS 추출 및 DB/Redis 대기열 연동

- Multer 기반 이미지 업로드 API 구현 (/api/images/upload)
- Exif-Parser를 활용한 이미지 내 GPS 위경도 데이터 검증 및 실시간 추출 로직 추가
- Sequelize 기반 MySQL 공간 데이터(POINT) 모델 정의 및 R-Tree 공간 인덱스 설정
- Node.js와 Python 워커 간 비동기 처리를 위한 Redis 리스트 기반 Task Queue(LPUSH) 연동
