const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DamageObject = sequelize.define(
    "DamageObject",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // 부모 테이블을 참조할 외래키
      taskId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "task_id",
      },
      objectType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "object_type",
      },
      confidence: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      // 지도에서 개별 파손을 빠르게 검색하기 위한 공간 데이터[cite: 13]
      coordinates: {
        type: DataTypes.GEOMETRY("POINT", 4326),
        allowNull: false,
      },
      // 프론트엔드 이미지 위에 박스를 그리기 위한 데이터 {x, y, w, h}
      boundingBox: {
        type: DataTypes.JSON,
        allowNull: true,
        field: "bounding_box",
      },
    },
    {
      tableName: "damage_objects",
      underscored: true,
      timestamps: true,
      // R-Tree 공간 인덱스 설정 (빠른 지도 검색용)[cite: 13]
      indexes: [
        {
          type: "SPATIAL",
          name: "idx_spatial_coordinates",
          fields: ["coordinates"],
        },
      ],
    },
  );

  return DamageObject;
};
