const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RoadDamage = sequelize.define(
    "RoadDamage",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      taskId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: "task_id",
      },
      imagePath: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "image_path", // 로컬 이미지 경로
      },
      // 핵심: 공간 데이터 타입인 POINT(위경도) 정의 (SRID 4326 = GPS 표준 좌표계)
      coordinates: {
        type: DataTypes.GEOMETRY("POINT", 4326),
        allowNull: false,
      },
      damageType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "damage_type", // 포트홀, Crack 등 균열 종류
      },
      confidence: {
        type: DataTypes.FLOAT,
        allowNull: true, // AI 추론 확신도 (0.0 ~ 1.0)
      },
      status: {
        type: DataTypes.ENUM(
          "QUEUED",
          "PROCESSING",
          "VERIFIED",
          "NEEDS_REVIEW",
        ),
        allowNull: false,
        defaultValue: "QUEUED", // 기본값은 대기열 진입
      },
    },
    {
      tableName: "road_damages",
      underscored: true, // camelCase 필드명을 DB의 snake_case 컬럼명으로 자동 매핑
      timestamps: true, // created_at, updated_at 자동 생성

      // 핵심 성능 최적화: 대용량 공간 데이터를 빠르게 조회하기 위한 R-Tree 공간 인덱스 설정
      indexes: [
        {
          type: "SPATIAL",
          name: "idx_spatial_coordinates",
          fields: ["coordinates"],
        },
      ],
    },
  );

  return RoadDamage;
};
