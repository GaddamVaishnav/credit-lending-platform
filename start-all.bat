@echo off
echo ========================================
echo   Credit Platform - Starting Up
echo ========================================
echo.
echo [1/3] Starting Docker containers...
docker start credit-mysql credit-redis credit-kafka credit-zookeeper credit-mongo credit-eureka
echo.
echo [2/3] Waiting 35 seconds for MySQL to initialize...
timeout /t 35 /nobreak
echo.
echo [3/3] Fixing MySQL permissions...
docker exec credit-mysql mysql -u root -proot -e "GRANT ALL PRIVILEGES ON *.* TO 'credit_user'@'%%' WITH GRANT OPTION; FLUSH PRIVILEGES;"
echo.
echo ========================================
echo   All containers ready!
echo ========================================
echo.
echo Now open 6 terminals and run:
echo   Terminal 1: cd onboarding-service   ^&^& mvn spring-boot:run
echo   Terminal 2: cd loan-service          ^&^& mvn spring-boot:run
echo   Terminal 3: cd disbursement-service  ^&^& mvn spring-boot:run
echo   Terminal 4: cd repayment-service     ^&^& mvn spring-boot:run
echo   Terminal 5: cd notification-service  ^&^& mvn spring-boot:run
echo   Terminal 6: cd api-gateway           ^&^& mvn spring-boot:run
echo.
echo   Frontend: cd frontend ^&^& npx ng serve
echo.
echo   Dashboard: http://localhost:4200
echo   Eureka:    http://localhost:8761
echo ========================================
pause
