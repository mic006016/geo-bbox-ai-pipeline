import torch
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import os

class DamageDetector:
  def __init__(self):
    print("EfficientNetV2-S 모델 및 가중치 로드 중...")
    self.weights = models.EfficientNet_V2_S_Weights.DEFAULT
    self.model = models.efficientnet_v2_s(weights=self.weights)
    self.model.eval()   # 추론 모드로 전환 (Dropout, BatchNorm 비활성화)
    
    # ImageNet 클래스 레이블 리스트 가져오기
    self.categories = self.weights.meta["categories"]
    
    # 이미지 전처리 파이프라인 (EfficientNetV2-S 표준 스펙 적용)
    # 384x384 크기 조정, 텐서 변환 및 정규화(Normalization) 포함
    self.transform = self.weights.transforms()
    print("✅ AI 추론 엔진 준비 완료!")
    
  def detect(self, image_path: str):
    if not os.path.exists(image_path):
      return {"success": False, "error": f"파일을 찾을 수 없습니다: {image_path}"}
    
    try:
      # 1. 이미지 로드 및 RGB 변환
      image = Image.open(image_path).convert("RGB")
      
      # 2. 전처리 적용 및 배치 차원 추가 (1, C, H, W)
      input_tensor = self.transform(image).unsqueeze(0)
      
      # 3. GPU 사용 설정
      input_tensor = input_tensor.to('cuda')
      self.model = self.model.to('cuda')
      
      # 4. 추론 실행 (기울기 계산 비활성화로 메모리 절약 및 속도 향상)
      with torch.no_grad():
        outputs = self.model(input_tensor)
        
      # 5. 소프트맥스를 적용하여 확률(Confidence) 계산
      probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
      
      # 6. 가장 높은 확률을 가진 탑 1 카테고리 추출
      top1_prob, top1_cat_idx = torch.top_keys = torch.max(probabilities, 0)
      
      confidence = top1_prob.item() * 100
      label = self.categories[top1_cat_idx.item()]
      
      return {
        "success": True,
        "label": label,
        "confidence": round(confidence, 2)
      }
      
    except Exception as e:
      return {"success": False, "error": str(e)}
    
detector = DamageDetector()