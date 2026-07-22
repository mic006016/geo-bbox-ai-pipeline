const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DamageTask = sequelize.define(
    "DamageTask",
    {
      taskId: {
        type: DataTypes.STRING(50),
        primaryKey: true, // taskId를 기본키로 사용
        allowNull: false,
        field: "task_id",
      },
      imagePath: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "image_path",
      },
      // 차량의 GPS 위치 (사진이 찍힌 위치)
      coordinates: {
        type: DataTypes.GEOMETRY("POINT", 4326),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("QUEUED", "PROCESSING", "COMPLETED", "FAILED"),
        allowNull: false,
        defaultValue: "QUEUED",
      },
    },
    {
      tableName: "damage_tasks",
      underscored: true,
      timestamps: true,
    },
  );

  return DamageTask;
};
