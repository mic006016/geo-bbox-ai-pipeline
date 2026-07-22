const express = require("express");
const router = express.Router();

module.exports = (sequelize) => {
  const DamageObject = sequelize.models.DamageObject;
  const DamageTask = sequelize.models.DamageTask;
  /**
   * GET /api/spatial/bbox
   * 화면 사각형 범위(Bounding Box) 내의 데이터를 공간 인덱스를 활용해 조회
   * 쿼리 파라미터: minLon, minLat, maxLon, maxLat
   */
  router.get("/bbox", async (req, res) => {
    try {
      const { minLon, minLat, maxLon, maxLat } = req.query;

      if (!minLon || !minLat || !maxLon || !maxLat) {
        return res.status(400).json({
          success: false,
          message:
            "minLon, minLat, maxLon, maxLat 쿼리 파라미터가 모두 필요합니다.",
        });
      }

      // 사각형 바운딩 박스를 구성하는 5개의 점 (시작점으로 돌아오는 닫힌 폴리곤)
      // ⚠️ MySQL 8.0+ 버전의 SRID 4326 지리 좌표계: WKT 파싱 시 [위도(Lat) 경도(Lon)] 순서 주의
      // SRID 0 표준에 맞춰 [경도(Lon) 위도(Lat)] 순서로 폴리곤 축 정렬
      const wktPolygon = `POLYGON((
        ${minLon} ${minLat},
        ${minLon} ${maxLat},
        ${maxLon} ${maxLat},
        ${maxLon} ${minLat},
        ${minLon} ${minLat}
      ))`;

      // ST_Within 또는 ST_Contains 공간 함수를 활용하여 공간 인덱스(R-Tree) 태우기
      // coordinates가 주어진 폴리곤 영역 내에(ST_Within) 포함되는지 검사
      // 💡 DB 컬럼이 SRID 0이므로, ST_GeomFromText의 두 번째 인자도 0으로 맞춤
      const objects = await DamageObject.findAll({
        where: sequelize.literal(
          `ST_Within(DamageObject.coordinates, ST_GeomFromText('${wktPolygon}', 0))`,
        ),
        include: [
          {
            model: DamageTask,
            attributes: ["status"],
          },
        ],
      });

      // 글로벌 GIS 표준인 GeoJSON FeatureCollection 규격으로 래핑
      const geojsonOutput = {
        type: "FeatureCollection",
        features: objects.map((obj) => ({
          type: "Feature",
          geometry: obj.coordinates, // Sequelize가 자동으로 GeoJSON Point 객체 형태로 반환
          properties: {
            id: obj.id,
            taskId: obj.taskId,
            objectType: obj.objectType,
            confidence: obj.confidence,
            status: obj.DamageTask ? obj.DamageTask.status : "COMPLETED",
            createdAt: obj.createdAt,
          },
        })),
      };

      return res.status(200).json(geojsonOutput);
    } catch (error) {
      console.error("❌ 공간 범위 조회 실패:", error);
      // 프론트엔드가 파싱 에러(Invalid GeoJSON)를 뱉지 않도록 빈 FeatureCollection을 반환하는 방어 코드
      return res.status(200).json({ type: "FeatureCollection", features: [] });
    }
  });

  // 💡 DB 전체 데이터 초기화 (테스트용) API
  router.delete("/reset", async (req, res) => {
    try {
      // 1. 자식 테이블(파손 객체)을 먼저 삭제
      await DamageObject.destroy({ where: {} });

      // 2. 그 다음 부모 테이블(작업 내역)을 삭제
      await DamageTask.destroy({ where: {} });

      console.log("DB 데이터 전체(Task, Object) 초기화 완료");
      return res.status(200).json({ success: true, message: "초기화 완료" });
    } catch (error) {
      console.error("❌ 초기화 실패:", error);
      return res.status(500).json({ success: false, message: "서버 오류" });
    }
  });

  return router;
};
