// routes/results.js
const express = require("express");
const router = express.Router();

module.exports = (sequelize) => {
  // sequelize 객체를 통해 모델에 접근
  // sequelize.models.RoadDamage 가져오기
  const Analysis = sequelize.models.RoadDamage;

  router.post("/save", async (req, res) => {
    console.log("받은 데이터:", req.body);

    try {
      const { taskId, resultLabel, confidence } = req.body;

      const updated = await Analysis.update(
        {
          damageType: resultLabel,
          confidence: confidence,
          status: "VERIFIED",
        },
        { where: { taskId: taskId } },
      );

      if (updated[0] === 0) {
        return res
          .status(404)
          .json({ success: false, message: "해당 taskId를 찾을 수 없습니다." });
      }

      console.log(`✅ DB 업데이트 완료: ${taskId}`);
      res.status(200).json({ success: true, message: "분석 결과 저장 완료" });
    } catch (error) {
      console.error("❌ DB 업데이트 실패:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
