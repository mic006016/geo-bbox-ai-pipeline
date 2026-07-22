import os
import json
import time
import redis
import requests
from dotenv import load_dotenv
from inference import detector

# 환경 변수 로드
load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 16379))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def start_worker():
    # 1. Redis 연결 설정
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
        r.ping()
        print(f"✅ Redis 큐에 연결! ({REDIS_HOST}:{REDIS_PORT})")
    except Exception as e:
        print(f"❌ Redis 연결 실패: {e}")
        return

    print("🚀 'image_queue' 대기열 감시 시작...")

    # 2. 무한 루프로 큐 감시 (Blocking 팝 활용)
    while True:
        try:
            # blpop은 데이터가 들어올 때까지 프로세스를 대기(Block) 
            # 소켓 타임아웃 방지를 위해 10초 주기로 대기 (timeout=0은 무한 대기)
            task_data = r.blpop("image_queue", timeout=10)
            
            if task_data:
                queue_name, payload_str = task_data
                payload = json.loads(payload_str)
                
                task_id = payload.get("taskId")
                relative_image_path = payload.get("imagePath")
                
                # Node.js 로직(EXIF 파싱)에서 보내는 GPS 좌표 가져오기                
                lat = payload.get("latitude")
                lon = payload.get("longitude")
                                
                # 실제 이미지 파일 절대 경로
                absolute_image_path = os.path.join(BASE_DIR, "express-server", relative_image_path)
                

                print("\n==================================================")
                print(f"[Queue Pop] 새로운 작업 수신 완료! Task ID: {task_id}")
                print(f"🌍 GPS 위치: 위도 {lat}, 경도 {lon}")
                print(f"📂 이미지 절대 경로: {absolute_image_path}")
                print("==================================================")
                
                # [AI 모델 추론구간]
                result = detector.detect_damages(absolute_image_path, lat, lon)
                
                if result["success"]:
                    result_payload = {
                        "taskId": task_id,
                        "status": "COMPLETED",
                        "detectedObjects": result["objects"]
                    }
                else:
                    print(f"⚠️ YOLO 분석 실패: {result.get('error')}")
                    result_payload = {
                        "taskId": task_id, 
                        "status": "FAILED", 
                        "detectedObjects": []
                    }
                    
                # Express API 서버로 결과 전송
                response = requests.post("http://localhost:3000/api/results/save", json=result_payload)
                
                if response.status_code in [200, 201]:
                    print(f"✅ [Task 완료] {len(result.get('objects', []))}개 파손 상황 전송 성공!")
                else:
                    print(f"⚠️ [전송 실패] 백엔드 응답 코드: {response.status_code}")
                    
        except redis.ConnectionError:
            print("❌ Redis 서버와의 연결이 끊어졌습니다. 5초 후 재시도합니다...")
            time.sleep(5)
        except Exception as e:
            print(f"❌ 워커 루프 중 예기치 않은 예외 발생: {e}")
            time.sleep(1)

if __name__ == "__main__":
    start_worker()