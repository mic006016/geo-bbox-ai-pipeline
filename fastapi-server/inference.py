import os
from ultralytics import YOLO
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")


class DamageDetector:
  def __init__(self):
    print("커스텀 GeoAI YOLOv8 모델 로드 중...")
    self.model = YOLO(MODEL_PATH)
    print("✅ 커스텀 추론 엔진 준비 완료!")
    
  def detect_damages(self, image_path: str, lat: float, lon: float):
    if not os.path.exists(image_path):
      return {"success": False, "error": "파일 없음"}
    
    try:
      # YOLOv8 추론 실행
      results = self.model(image_path)
      detected_objects = []
  
      for box in results[0].boxes:
        x_center, y_center, w, h = box.xywh[0].tolist()
        conf = float(box.conf[0].item())
        cls_id = int(box.cls[0].item())
        
        label = self.model.names[cls_id]
                
        detected_objects.append({
          "objectType": label,
          "confidence": round(conf, 4),
          "longitude": float(lon),
          "latitude": float(lat),
          "boundingBox": {  # 나중에 사진 확대용
            "x": round(x_center, 2),
            "y": round(y_center, 2),
            "w": round(w, 2),
            "h": round(h, 2)
          }
        })
        
      return {"success": True, "objects": detected_objects}
    
    except Exception as e:
      return {"success": False, "error": str(e)}
    
# 싱글톤 인스턴스 생성
detector = DamageDetector()