const express = require("express");
require("dotenv").config();

const { sequelize } = require("./models/db");

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 기본 미들웨어 설정
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// 2. 라우터 설정 (db.js에서 가져온 sequelize 객체 주입)
const imageRouter = require("./routes/image")(sequelize);
app.use("/api/images", imageRouter);

const resultRouter = require("./routes/results")(sequelize);
app.use("/api/results", resultRouter);

const spatialRouter = require("./routes/spatial")(sequelize);
app.use("/api/spatial", spatialRouter);

app.get("/", (req, res) => {
  res.send("GeoAI 백엔드 서버 구동 중");
});

// 3. 데이터베이스 동기화 및 서버 시작 함수
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL 데이터베이스 연결 성공!");

    // 서버 구동
    app.listen(PORT, async () => {
      console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    });
  } catch (error) {
    console.error("❌ 서버 구동 실패:", error);
    process.exit(1);
  }
}

// 서버 실행
startServer();
