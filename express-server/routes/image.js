const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ExifParser = require("exif-parser");
const crypto = require("crypto");
const redis = require("redis");

module.exports = (sequelize) => {
  // 부모 테이블 (업로드 이력 및 단일 GPS 위치 저장)
  const DamageTask = sequelize.models.DamageTask;

  const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  });
  redisClient.connect().catch(console.error);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
      cb(
        null,
        Date.now() +
          "-" +
          Math.round(Math.random() * 1e9) +
          path.extname(file.originalname),
      );
    },
  });
  const upload = multer({ storage: storage });

  router.post("/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ success: false, message: "파일 없음" });

      const filePath = req.file.path;
      const buffer = fs.readFileSync(filePath);

      // EXIF 파싱 및 GPS 추출 (블랙박스/스마트폰)
      const parser = ExifParser.create(buffer);
      const exifData = parser.parse();
      const lat = exifData.tags.GPSLatitude;
      const lon = exifData.tags.GPSLongitude;

      if (!lat || !lon) {
        fs.unlinkSync(filePath);
        return res
          .status(400)
          .json({ success: false, message: "GPS 지리 정보(EXIF)가 없습니다." });
      }

      const taskId = crypto.randomUUID();

      // 1. DB에 '작업(Task)' 정보와 차량의 단일 GPS 위치 저장
      await DamageTask.create({
        taskId: taskId,
        imagePath: filePath,
        coordinates: { type: "Point", coordinates: [lon, lat] }, // [경도, 위도]
        status: "QUEUED",
      });

      // 2. 파이썬 워커(worker.py)로 단일 GPS 좌표 넘김
      const taskPayload = {
        taskId,
        imagePath: filePath,
        latitude: lat,
        longitude: lon,
      };
      await redisClient.lPush("image_queue", JSON.stringify(taskPayload));

      return res
        .status(202)
        .json({ success: true, taskId: taskId, message: "대기열 등록 완료" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "서버 오류" });
    }
  });

  return router;
};
