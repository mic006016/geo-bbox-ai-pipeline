const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("geo_db", "root", "1234", {
  host: "localhost",
  port: 3310,
  dialect: "mysql",
  logging: false,
});

// 모델 로드
const DamageTask = require("./DamageTask")(sequelize);
const DamageObject = require("./DamageObject")(sequelize);

// 1:N 관계 설정
DamageTask.hasMany(DamageObject, {
  foreignKey: "taskId",
  sourceKey: "taskId",
  onDelete: "CASCADE",
});
DamageObject.belongsTo(DamageTask, {
  foreignKey: "taskId",
  targetKey: "taskId",
});

// 전체 동기화
sequelize.sync({ alter: true }).then(() => {
  console.log("✅ DB 및 테이블 동기화 완료 (1:N 구조 세팅 성공)");
});

module.exports = { sequelize, DamageTask, DamageObject };
