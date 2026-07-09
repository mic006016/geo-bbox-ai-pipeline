const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ExifParser = require("exif-parser");
const crypto = require("crypto");
const redis = require("redis");

module.exports = (sequelize) => {
  // DB 모델 가져오기
  const RoadDamage = sequelize.models.RoadDamage;

  // 1. 로컬 Redis 클라이언트 설정 및 연결
  const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  });

  redisClient
    .connect()
    .then(() => console.log("✅ Redis 대기열 큐에 성공적으로 연결되었습니다!"))
    .catch((err) => console.error("❌ Redis 연결 실패:", err));

  // Multer 저장소 설정
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
      );
    },
  });

  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("이미지 파일만 업로드 가능합니다."), false);
    },
  });

  // 2. 이미지 업로드 ➡️ GPS 추출 ➡️ DB 저장 ➡️ Redis 큐 푸시 API
  router.post("/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "업로드된 파일이 없습니다." });
      }

      const filePath = req.file.path;
      const buffer = fs.readFileSync(filePath);

      // EXIF 파싱
      const parser = ExifParser.create(buffer);
      const exifData = parser.parse();
      const lat = exifData.tags.GPSLatitude;
      const lon = exifData.tags.GPSLongitude;

      // Data-Centric 품질 검증: GPS가 없으면 얄짤없이 탈락
      if (!lat || !lon) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          message:
            "품질 검증 실패: 이미지에 GPS 지리 정보(EXIF)가 존재하지 않습니다.",
        });
      }

      const taskId = crypto.randomUUID();

      // ----------------------------------------------------
      // [A] MySQL 공간 데이터베이스에 데이터 기록 (Sequelize)
      // ----------------------------------------------------
      await RoadDamage.create({
        taskId: taskId,
        imagePath: filePath,
        // 중요: MySQL 공간 전용 포인트 데이터 규격에 맞춰 저장 (GeoJSON 형태)
        coordinates: {
          type: "Point",
          coordinates: [lon, lat], // ⚠️ 표준 GeoJSON은 [경도(X), 위도(Y)] 순서
        },
        status: "QUEUED",
      });

      // ----------------------------------------------------
      // [B] Redis Message Queue에 Task 푸시 (FastAPI 워커 전달용)
      // ----------------------------------------------------
      const taskPayload = {
        taskId: taskId,
        imagePath: filePath,
        latitude: lat,
        longitude: lon,
      };

      // 'image_queue'라는 이름의 Redis 리스트 왼쪽에 데이터를 밀어 넣음 (LPUSH)
      await redisClient.lPush("image_queue", JSON.stringify(taskPayload));
      console.log(
        `📌 [Queue Push] Task가 대기열에 추가되었습니다. ID: ${taskId}`,
      );

      // 3. 클라이언트에게 즉시 가벼운 성공 응답 반환 (202 Accepted)
      return res.status(202).json({
        success: true,
        message:
          "이미지 접수 및 대기열 등록 완료. 비동기 AI 분석이 시작됩니다.",
        taskId: taskId,
      });
    } catch (error) {
      console.error("❌ 업로드 파이프라인 에러:", error);
      return res
        .status(500)
        .json({ success: false, message: "서버 내부 오류" });
    }
  });

  return router;
};
