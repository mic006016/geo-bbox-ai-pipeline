const express = require("express");
const router = express.Router();

module.exports = (sequelize) => {
  // 💡 부모 테이블(DamageTask)과 자식 테이블(DamageObject) 분리
  const DamageTask = sequelize.models.DamageTask;
  const DamageObject = sequelize.models.DamageObject;

  router.post("/save", async (req, res) => {
    const t = await sequelize.transaction(); // 동시성 제어 트랜잭션
    try {
      const { taskId, status, detectedObjects } = req.body;

      // 1. 부모 테이블 상태 업데이트 (QUEUED -> COMPLETED)
      await DamageTask.update(
        { status: status },
        { where: { taskId: taskId }, transaction: t },
      );

      // 2. 파손 객체가 존재할 경우 자식 테이블에 벌크 인서트
      if (
        status === "COMPLETED" &&
        detectedObjects &&
        detectedObjects.length > 0
      ) {
        const recordsToInsert = detectedObjects.map((obj) => ({
          taskId: taskId,
          objectType: obj.objectType,
          confidence: obj.confidence,
          // 차량의 단일 GPS 위치 (모든 파손 객체가 동일한 GPS를 공유)
          coordinates: {
            type: "Point",
            coordinates: [obj.longitude, obj.latitude],
          },
          // 프론트엔드 이미지 시각화용 픽셀 박스
          boundingBox: obj.boundingBox,
        }));

        await DamageObject.bulkCreate(recordsToInsert, { transaction: t });
      }

      await t.commit();
      console.log(
        `✅ Task ID: ${taskId} - ${detectedObjects ? detectedObjects.length : 0}개 객체 적재 완료`,
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      await t.rollback();
      console.error("❌ 결과 적재 실패:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
