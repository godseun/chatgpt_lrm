# LRM (로그 읽어주는 남자)

<br />

<img src="https://godseun.com/asset/lrm_logo.png" alt="logo" width="160" height="160" style="width: 30%; height: 30%; max-width: 340px; max-height: 340px; border-radius: 50%; box-shadow: inset 0 0 0 10px white, 0 0 0 10px white;" />


<br />

### **ChatGPT 기반의 WoW 유저를 위한 로그 분석 기반 성능 평가 자동화 서비스**

<br />

![Image](https://github.com/user-attachments/assets/dc4db549-78a8-48d9-9c44-6dc1ddf10692)

- **프로젝트 개요**
    
    월드 오브 워크래프트 유저의 전투 로그(Warcraft Logs)를 자동 분석하여 캐릭터의 딜링 성능과 생존력을 평가해주는 웹 API 서비스입니다.
    
- **주요 기능**
    - 캐릭터 이름과 서버명을 기반으로 전투 로그 자동 수집
    - 딜량 퍼포먼스, 생존률(포션/생석 사용률) 정량 분석
    - 평가 결과를 리포트 형태로 요약 제공
    - 실시간 API 호출 수, 처리 시간 로깅 및 최적화

![Image](https://github.com/user-attachments/assets/dc26cfae-0ef8-45b6-b95b-8d26bf776d9c)
  
- **기술 스택**
    
    Node.js, Express, GraphQL, Docker, Redis, NGINX, Certbot, Warcraft Logs Public API
    

- **기술 포인트**
    - 복잡한 GraphQL 쿼리를 동적으로 구성하여 병렬 분석 처리
    - Redis를 통한 캐싱으로 API 응답 속도 70% 이상 개선
    - Docker 기반 멀티 서비스 구성 (Node/NGINX/Redis/Certbot)
    - HTTPS 자동 갱신 구성으로 서비스 무중단 운영

    
  References
    - [와우 로그 API 문서](https://www.warcraftlogs.com/v2-api-docs/warcraft/)
    - [ChatGPT](https://chatgpt.com/)







